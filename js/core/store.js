/* ============================================================
   CloudSync — owns the Firebase app/auth/Firestore handles. When FIREBASE_CONFIG
   still has "YOUR_..." placeholders, `configured` is false and the whole app
   runs local-only (IndexedDB via localforage), exactly like the original file.
   ============================================================ */
class CloudSync {
    constructor(config) {
        this.config = config;
        this.configured = typeof firebase !== 'undefined' &&
            Object.values(config || {}).every(v => v && !String(v).startsWith('YOUR_'));
        this.auth = null;
        this.db = null;
        if (!this.configured) return;
        firebase.initializeApp(config);
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        // Cache locally so the app keeps working offline (reads from cache, queues writes).
        this.db.enablePersistence({ synchronizeTabs: true }).catch(err => {
            console.warn('Firestore offline persistence unavailable:', err.code);
        });
    }
    get user() { return this.auth ? this.auth.currentUser : null; }
    get sharedDoc() { return this.db.collection('business').doc('main'); }
}

/* ============================================================
   DataStore — the single source of truth for `data`, plus loading, migrating
   and saving it (Firestore shared doc when configured, IndexedDB otherwise).
   Photos (imageAttachments) always stay on this device only.
   ============================================================ */
class DataStore {
    constructor(cloud) {
        this.cloud = cloud;
        this.data = structuredClone(initialData);
        this.local = null;
        this.pendingRemote = null;   // cloud update held back while the user is typing
        this._lastSyncedJson = null;
        this._firstSnapshot = true;
    }

    get configured() { return this.cloud.configured; }

    /**
     * Loads data and keeps it live. `onData(isFirst)` fires after every change that
     * arrives (the initial load, and later updates from other devices).
     */
    async init(onData) {
        this.local = localforage.createInstance({ name: STORE_NAME, version: DB_VERSION, storeName: DATA_KEY });
        if (!this.configured) return this._initLocalOnly(onData);

        const localSnapshot = await this.local.getItem(DATA_KEY).catch(() => null);
        const localImages = (localSnapshot && localSnapshot.imageAttachments) || [];
        this._subscribe(localSnapshot, localImages, onData, 0);
    }

    async _initLocalOnly(onData) {
        try {
            const stored = await this.local.getItem(DATA_KEY);
            if (stored) {
                this.applyIncoming(stored, stored.imageAttachments);
            } else {
                this.applyIncoming(structuredClone(initialData), []);
                await this.local.setItem(DATA_KEY, this.data);
            }
        } catch (error) {
            console.error('Error initializing DB:', error);
            window.App?.ui.toast('Database error. Data might not save.', 'error');
        }
        onData(true);
    }

    // Retries 'permission-denied' with backoff: right after sign-in that error is almost always
    // a brief race between Auth and Firestore's credential provider, not a real rejection.
    _subscribe(localSnapshot, localImages, onData, retryCount) {
        this.cloud.sharedDoc.onSnapshot(async (snap) => {
            if (this._firstSnapshot) {
                this._firstSnapshot = false;
                if (!snap.exists) {
                    await this._seedShared(localSnapshot);
                    return; // our own set() re-triggers this listener with exists:true
                }
            }
            const incoming = snap.data();
            const json = JSON.stringify(incoming);
            if (json === this._lastSyncedJson) return; // echo of our own save — nothing new
            this._lastSyncedJson = json;
            const isFirst = !this._loaded;
            if (isFirst) {
                this._loaded = true;
                this.applyIncoming(incoming, localImages);
            } else {
                this.pendingRemote = incoming;
            }
            onData(isFirst);
        }, (error) => {
            if (error.code === 'permission-denied' && retryCount < 4) {
                setTimeout(() => this._subscribe(localSnapshot, localImages, onData, retryCount + 1), 400 * (retryCount + 1));
                return;
            }
            console.error('Firestore sync error:', error);
            window.App?.ui.toast('Lost connection to the shared database. Showing the last synced copy.', 'error');
        });
    }

    /** Folds in a cloud update that arrived while the user was typing. Returns true if one was applied. */
    consumePendingRemote() {
        if (!this.pendingRemote) return false;
        this.applyIncoming(this.pendingRemote, this.data.imageAttachments);
        this.pendingRemote = null;
        return true;
    }

    // First device to connect to an empty shared database: upload local data, or start clean.
    async _seedShared(localSnapshot) {
        const hasRealLocalData = localSnapshot && (
            (localSnapshot.salesOrders && localSnapshot.salesOrders.length) ||
            (localSnapshot.workers && localSnapshot.workers.length) ||
            (localSnapshot.purchaseOrders && localSnapshot.purchaseOrders.length) ||
            (localSnapshot.inventory && localSnapshot.inventory.some(i => i.stock > 0))
        );
        let seed;
        if (hasRealLocalData && await window.App.ui.confirm({
            title: 'Set up the shared database', icon: 'sync', tone: 'info',
            message: "No shared data exists yet, but this device already has data from before (orders, stock or workers).\nUpload it as the starting point everyone will see, or start fresh from the built-in catalog?",
            confirmLabel: "Upload this device's data", cancelLabel: 'Start fresh'
        })) {
            seed = { ...structuredClone(initialData), ...localSnapshot };
        } else {
            seed = structuredClone(initialData);
        }
        seed.costingRows = seed.costingRows || structuredClone(DEFAULT_COSTING);
        seed.rawMaterialPriceRows = seed.rawMaterialPriceRows || structuredClone(DEFAULT_RAW_MATERIAL_PRICES);
        delete seed.imageAttachments;
        await this.cloud.sharedDoc.set(JSON.parse(JSON.stringify(seed)));
    }

    /**
     * Applies a full data object (Firestore, local storage, or an imported backup), running
     * every backward-compatible migration this app has ever needed. Used by all load paths.
     */
    applyIncoming(incoming, imageAttachments) {
        const d = { ...structuredClone(initialData), ...incoming };
        if (!Array.isArray(d.inventory)) d.inventory = structuredClone(initialData.inventory);
        if (!d.salesOrders) d.salesOrders = incoming.orders || [];
        if (!d.manufacturingOrders) d.manufacturingOrders = incoming.productionLog ? incoming.productionLog.map(p => ({ ...p, status: 'Completed' })) : [];
        ['customers', 'purchaseOrders', 'issuances', 'workers', 'manualAdjustments', 'payrollPayments', 'expenses', 'salesOrders', 'manufacturingOrders']
            .forEach(k => { if (!Array.isArray(d[k])) d[k] = []; });
        if (!d.costingRows) d.costingRows = structuredClone(DEFAULT_COSTING);
        if (!d.rawMaterialPriceRows) d.rawMaterialPriceRows = structuredClone(DEFAULT_RAW_MATERIAL_PRICES);
        d.settings = { ...structuredClone(DEFAULT_SETTINGS), ...(incoming.settings || {}) };
        if (!Array.isArray(d.settings.expenseCategories) || !d.settings.expenseCategories.length) {
            d.settings.expenseCategories = [...DEFAULT_SETTINGS.expenseCategories];
        }

        d.inventory.forEach(item => {
            if (!item.price_last_updated) item.price_last_updated = '2025-01-01';
            if (item.type === 'finished') item.type = 'splint';
            if (!item.units) item.units = item.type === 'splint' ? 'pcs' : 'units';
            if (item.type === 'splint' && !Array.isArray(item.bom)) item.bom = [];
            item.stock = Utils.round(item.stock);
        });
        d.workers.forEach(w => {
            if (!w.id) w.id = Utils.uuid();
            if (w.rate === undefined) w.rate = 0;
        });
        d.customers.forEach(c => { if (!c.id) c.id = `CUST-${Utils.uuid()}`; });
        d.expenses.forEach(e => {
            if (!e.id) e.id = Utils.nextId('EXP', d.expenses, 4);
            if (!e.category) e.category = 'Other';
            e.amount = Utils.num(e.amount);
        });
        d.payrollPayments.forEach(p => { if (!p.id) p.id = Utils.nextId('PAY', d.payrollPayments); });
        // Link payroll expenses back to their payment (older data only matched them by description).
        d.expenses.filter(e => e.category === 'Payroll' && !e.paymentId).forEach(e => {
            const pay = d.payrollPayments.find(p => p.date === e.date && p.amount === e.amount && `Payroll: ${p.workerName}` === e.description &&
                !d.expenses.some(x => x.paymentId === p.id));
            if (pay) e.paymentId = pay.id;
        });

        d.imageAttachments = imageAttachments || [];
        this.data = d;
    }

    async save() {
        try {
            if (this.configured && this.cloud.user) {
                const { imageAttachments, ...syncable } = this.data;
                // JSON round-trip drops `undefined` values, which Firestore rejects outright.
                const clean = JSON.parse(JSON.stringify(syncable));
                this._lastSyncedJson = JSON.stringify(clean);
                await this.cloud.sharedDoc.set(clean);
                await this.local.setItem(DATA_KEY, { imageAttachments });
            } else {
                await this.local.setItem(DATA_KEY, this.data);
            }
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            window.App?.ui.toast(this.configured
                ? 'Could not sync — check your internet connection. Your change is kept on this device and will sync once reconnected.'
                : 'Could not save data to this browser.', 'error');
            return false;
        }
    }

    /** Empties everything (catalog included) to true zero, keeping settings. */
    async factoryReset() {
        const settings = this.data.settings;
        this.data = structuredClone(emptyData);
        this.data.settings = settings;
        this.data.costingRows = [];
        this.data.rawMaterialPriceRows = [];
        await this.save();
    }

    /** Deletes this browser's whole IndexedDB database so the next load re-seeds the built-in catalog. */
    deleteLocalDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(STORE_NAME);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(new Error('Error clearing local data. Please try again.'));
            request.onblocked = () => reject(new Error('Could not clear data — close any other tabs with this app open, then try again.'));
        });
    }
}
