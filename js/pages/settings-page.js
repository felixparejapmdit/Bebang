/* ============================================================
   SettingsPage — account & sync, business profile (used on printouts),
   preferences, expense categories, workers, app install/update,
   data-health checks, and backup / restore / reset.
   ============================================================ */
class SettingsPage extends BasePage {
    render() {
        const d = this.data, s = d.settings;
        const theme = this.app.themeMode;
        const cloud = this.app.store.configured;
        const user = this.app.auth.user;
        return `
            ${this.ui.pageHeader('Settings', `Version ${APP_VERSION} · ${cloud ? 'Live multi-device sync' : 'Local-only mode (this browser)'}`)}
            <div class="settings-grid">
                <div id="account-sync-card" class="glass-panel settings-card p-4 sm:p-6">
                    <h3 class="text-white">Account & Sync</h3>
                    <p class="card-sub">${cloud ? 'Everyone who signs in with the shared login sees the same live data.' : 'Sync is not configured — data is stored in this browser only.'}</p>
                    ${cloud ? `
                        <div class="glass-item p-3 rounded-lg flex items-center justify-between gap-3 mb-3">
                            <div class="min-w-0"><p class="text-xs text-secondary">Signed in as</p><p class="text-white font-semibold truncate">${Utils.esc((user && user.email) || '—')}</p></div>
                            <span id="settings-net-badge">${navigator.onLine ? this.ui.badge('Online · syncing', 'green') : this.ui.badge('Offline · changes queued', 'amber')}</span>
                        </div>
                        <p class="text-xs text-secondary mb-4">Photos (Attach Photo) stay on the device that took them and are not synced.</p>
                        <button onclick="App.auth.signOut()" class="dt-btn">${this.ui.icon('user', '')}Sign Out</button>
                    ` : `<p class="text-sm text-secondary">See <code>PLAN.md</code> for the Firebase setup steps to turn on live multi-device sync.</p>`}
                </div>

                <form id="business-profile-card" class="glass-panel settings-card p-4 sm:p-6" onsubmit="event.preventDefault(); App.settings.saveProfile()">
                    <h3 class="text-white">Business Profile</h3>
                    <p class="card-sub">Shown in the header and on every printed report, receipt and payslip.</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${this.ui.field('Business Name', `<input id="set-businessName" class="field-input" value="${Utils.esc(s.businessName)}" required>`, 'sm:col-span-2')}
                        ${this.ui.field('Tagline', `<input id="set-businessTagline" class="field-input" value="${Utils.esc(s.businessTagline)}">`, 'sm:col-span-2')}
                        ${this.ui.field('Address', `<input id="set-address" class="field-input" value="${Utils.esc(s.address)}">`, 'sm:col-span-2')}
                        ${this.ui.field('Phone', `<input id="set-phone" type="tel" class="field-input" value="${Utils.esc(s.phone)}">`)}
                        ${this.ui.field('Email', `<input id="set-email" type="email" class="field-input" value="${Utils.esc(s.email)}">`)}
                    </div>
                    <button type="submit" class="dt-btn dt-btn-primary mt-4">${this.ui.icon('check', '')}Save Profile</button>
                </form>

                <form id="preferences-card" class="glass-panel settings-card p-4 sm:p-6" onsubmit="event.preventDefault(); App.settings.savePreferences()">
                    <h3 class="text-white">Preferences</h3>
                    <p class="card-sub">Theme is saved per device; the rest applies to everyone.</p>
                    <div class="flex items-center justify-between gap-3 mb-4">
                        <span class="text-sm text-white">Theme</span>
                        <div class="seg" role="group" aria-label="Theme">
                            ${[['dark', 'Dark'], ['light', 'Light'], ['system', 'System']].map(([k, l]) => `<button type="button" class="${theme === k ? 'active' : ''}" onclick="App.setTheme('${k}')">${l}</button>`).join('')}
                        </div>
                    </div>
                    <div class="flex items-center justify-between gap-3 mb-4">
                        <span class="text-sm text-white">Welcome screen on open <span class="block text-xs text-secondary">Greeting with today's numbers after you sign in</span></span>
                        <span class="flex items-center gap-2">
                            <button type="button" class="dt-btn" onclick="App.welcome.show()">Preview</button>
                            <button type="button" role="switch" aria-checked="${this.app.welcome.enabled}" aria-label="Show welcome screen" class="switch ${this.app.welcome.enabled ? 'on' : ''}" onclick="App.welcome.setEnabled(!App.welcome.enabled); this.classList.toggle('on', App.welcome.enabled); this.setAttribute('aria-checked', App.welcome.enabled)"></button>
                        </span>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${this.ui.field('Default low-stock level', `<input id="set-lowStockThreshold" type="number" min="0" step="any" class="field-input" value="${Utils.esc(s.lowStockThreshold)}">`)}
                        ${this.ui.field('Table rows per page', `<select id="set-tablePageSize" class="field-input">${this.ui.options([10, 25, 50, 100], s.tablePageSize)}</select>`)}
                        ${this.ui.field('Default report period', `<select id="set-defaultReportPeriod" class="field-input">${this.ui.options([{ value: 'today', label: 'Today' }, { value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }, { value: 'quarter', label: 'This Quarter' }, { value: 'year', label: 'This Year' }, { value: 'all', label: 'All Time' }], s.defaultReportPeriod)}</select>`)}
                        ${this.ui.field('Backup reminder (days, 0 = off)', `<input id="set-backupReminderDays" type="number" min="0" step="1" class="field-input" value="${Utils.esc(s.backupReminderDays)}">`)}
                    </div>
                    <p class="field-hint mt-2">Items can override the low-stock level individually (Inventory → Edit → Reorder Level).</p>
                    <div class="flex flex-wrap gap-2 mt-4">
                        <button type="submit" class="dt-btn dt-btn-primary">${this.ui.icon('check', '')}Save Preferences</button>
                        <button type="button" class="dt-btn" onclick="App.toggleSidebar()">${this.ui.icon('menu', '')}Toggle compact sidebar</button>
                    </div>
                </form>

                <div class="glass-panel settings-card p-4 sm:p-6">
                    <h3 class="text-white">Expense Categories</h3>
                    <p class="card-sub">Used in the expense form and reports.</p>
                    <div class="flex flex-wrap gap-2 mb-4">
                        ${s.expenseCategories.map((c, i) => `<span class="badge badge-blue text-xs py-1">${Utils.esc(c)} <button type="button" onclick="App.settings.removeCategory(${i})" class="ml-1 opacity-70 hover:opacity-100" aria-label="Remove ${Utils.esc(c)}">×</button></span>`).join('')}
                    </div>
                    <form class="flex gap-2" onsubmit="event.preventDefault(); App.settings.addCategory()">
                        <input id="new-category" class="field-input flex-1" placeholder="New category…">
                        <button type="submit" class="dt-btn dt-btn-primary">${this.ui.icon('plus', '')}Add</button>
                    </form>
                </div>

                <div id="worker-management-card" class="lg:col-span-2 min-w-0">
                    ${this.tables.render({
                        id: 'workers', title: 'Worker Management', subtitle: 'Workers appear in Manufacturing dropdowns; their rate drives Payroll. Renaming a worker updates all of their past records.',
                        rows: d.workers, defaultSort: { key: 'name', dir: 'asc' }, exportName: 'workers', emptyText: 'No workers added yet.',
                        addButton: { label: 'Add Worker', onclick: "App.records.create('worker')" },
                        columns: [
                            { key: 'name', label: 'Name', render: r => `<span class="text-white font-semibold">${Utils.esc(r.name)}</span>` },
                            { key: 'rate', label: 'Rate (₱/splint)', align: 'right', value: r => r.rate || 0, render: r => `₱<span class="editable-field" contenteditable="true" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" onblur="App.settings.updateWorkerRate('${r.id}', this)">${(r.rate || 0).toFixed(2)}</span>` },
                            { key: 'phone', label: 'Phone', value: r => r.phone || '' },
                            { key: 'splints', label: 'Splints Remitted', align: 'right', value: r => d.manufacturingOrders.filter(m => m.workerName === r.name && m.status === 'Completed').reduce((a, m) => a + Utils.num(m.qty), 0), format: 'number', total: 'sum' }
                        ],
                        actions: r => this.ui.editDeleteBtns(`App.records.edit('worker', '${r.id}')`, `App.records.remove('worker', '${r.id}')`, 'worker')
                    })}
                </div>

                <div id="app-card" class="glass-panel settings-card p-4 sm:p-6">${this.appCardHtml()}</div>

                <div id="data-health-card" class="glass-panel settings-card p-4 sm:p-6">
                    <h3 class="text-white">Data Health</h3>
                    <p class="card-sub">Checks that stock numbers, references and IDs are all consistent.</p>
                    <div id="health-output">${this.healthHtml()}</div>
                </div>

                <div id="backup-card" class="glass-panel settings-card p-4 sm:p-6 lg:col-span-2 2xl:col-span-1">
                    <h3 class="text-white">Data Backup & Restore</h3>
                    <p class="card-sub">${cloud ? 'Data is synced to the cloud, but a periodic backup file is still recommended.' : '<span class="text-red-300 font-semibold">Your data is only stored in this browser.</span> Export it regularly.'}
                        Last backup: <strong class="text-white">${s.lastBackupAt ? new Date(s.lastBackupAt).toLocaleString('en-PH') : 'never'}</strong></p>
                    <div class="mb-4">
                        <span class="field-label">Local Storage Usage</span>
                        <div class="w-full bg-white/10 rounded-full h-2.5 mt-1"><div id="storage-bar" class="bg-primary h-2.5 rounded-full" style="width: 0%"></div></div>
                        <p id="storage-text" class="text-xs text-secondary text-right mt-1">Calculating...</p>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button onclick="App.settings.exportBackup()" class="bg-accent font-bold w-full py-2 rounded-lg">Export Data (JSON)</button>
                        <input type="file" id="import-file" accept=".json,application/json" class="hidden" onchange="App.settings.importBackup(event)">
                        <button onclick="document.getElementById('import-file').click()" class="bg-gray-500 text-white font-bold w-full py-2 rounded-lg">Restore Data (JSON)</button>
                    </div>
                    <div class="mt-5 border-t border-red-500/30 pt-4">
                        <button id="factory-reset-button" onclick="App.settings.factoryReset()" class="bg-red-700 text-white font-bold w-full py-2 rounded-lg text-sm">Factory Reset (Delete All Data)</button>
                        <p class="text-xs text-secondary text-center mt-2">Clears everything — including the item catalog — and starts from zero.${cloud ? ' <strong>Affects every synced device.</strong>' : ''}</p>
                    </div>
                    <div class="mt-4 border-t border-yellow-500/30 pt-4">
                        <button id="clear-cache-button" onclick="App.settings.clearCache()" class="bg-yellow-700 text-white font-bold w-full py-2 rounded-lg text-sm">Clear Cache & Reload Defaults</button>
                        <p class="text-xs text-secondary text-center mt-2">Deletes this browser's local database and reloads${cloud ? ' (shared cloud data is not touched)' : ' with the built-in starting catalog'}. Use it if lists look outdated after an app update — <strong>not</strong> the same as Factory Reset.</p>
                    </div>
                </div>
            </div>`;
    }

    afterRender() { this.updateStorageUsage(); }

    appCardHtml() {
        const pwa = this.app.pwa;
        const status = pwa.isStandalone ? this.ui.badge('Installed · running as app', 'green') : pwa.canInstall ? this.ui.badge('Ready to install', 'blue') : this.ui.badge(pwa.supported ? 'Browser tab' : 'Open via web to install', 'gray');
        return `
            <h3 class="text-white">App & Offline</h3>
            <p class="card-sub">Install Bebang BMS on your phone, tablet or computer — it opens full-screen and works offline.</p>
            <div class="glass-item p-3 rounded-lg flex items-center justify-between gap-3 mb-4">
                <span class="text-sm text-white">Status</span>${status}
            </div>
            <div class="flex flex-wrap gap-2">
                ${pwa.isStandalone ? '' : `<button type="button" onclick="App.pwa.install()" class="dt-btn dt-btn-primary">${this.ui.icon('install', '')}Install App</button>`}
                <button type="button" onclick="App.pwa.checkForUpdate()" class="dt-btn">${this.ui.icon('sync', '')}Check for Updates</button>
                <button type="button" onclick="App.tour.start()" class="dt-btn">${this.ui.icon('info', '')}Replay Tour</button>
            </div>
            <p class="field-hint mt-3">Keyboard: Ctrl/⌘ + 1–9 switches tabs · Esc closes dialogs.</p>`;
    }
    refreshAppCard() { const el = document.getElementById('app-card'); if (el) el.innerHTML = this.appCardHtml(); }

    // ---------- Data health ----------
    healthChecks() {
        const d = this.data;
        const summary = this.stock.stockSummary();
        const mismatched = summary.filter(s => s.exists && Math.abs(s.diff) > 1e-9);
        const negative = d.inventory.filter(i => i.stock < 0);
        const ids = new Set(d.inventory.map(i => i.id));
        const orphan = [
            ...d.salesOrders.flatMap(so => so.items.filter(l => !ids.has(l.inv_id)).map(() => so.id)),
            ...d.manufacturingOrders.filter(m => !ids.has(m.productId)).map(m => m.id),
            ...d.issuances.filter(i => !ids.has(i.materialId)).map(i => i.id)
        ];
        const dupIds = [];
        ['purchaseOrders', 'salesOrders', 'manufacturingOrders', 'issuances', 'manualAdjustments', 'expenses', 'payrollPayments'].forEach(k => {
            const seen = new Set();
            d[k].forEach(r => { if (seen.has(r.id)) dupIds.push(`${k}:${r.id}`); seen.add(r.id); });
        });
        const workerNames = new Set(d.workers.map(w => w.name));
        const unknownWorkers = [...new Set([...d.manufacturingOrders, ...d.issuances].map(r => r.workerName).filter(n => n && !workerNames.has(n)))];
        return { mismatched, negative, orphan, dupIds, unknownWorkers };
    }
    healthHtml() {
        const h = this.healthChecks();
        const row = (ok, label, detail, action = '') => `
            <div class="glass-item p-2.5 rounded-lg flex items-center justify-between gap-2 text-sm mb-2">
                <span class="min-w-0"><span class="${ok ? 'text-green-400' : 'text-accent'} font-bold">${ok ? '✓' : '!'}</span> <span class="text-white">${label}</span>${detail ? `<span class="block text-xs text-secondary truncate">${detail}</span>` : ''}</span>
                ${action}
            </div>`;
        return `
            ${row(!h.mismatched.length, 'Stock matches ledger', h.mismatched.length ? `${h.mismatched.length} item(s): ${Utils.esc(h.mismatched.slice(0, 4).map(s => s.itemName).join(', '))}` : '', h.mismatched.length ? `<button class="dt-btn" onclick="App.reports.view='stock'; App.navigate('reports')">Review</button>` : '')}
            ${row(!h.negative.length, 'No negative stock', h.negative.length ? Utils.esc(h.negative.map(i => `${i.name} (${Utils.formatNumber(i.stock, 4)})`).join(', ')) : '', h.negative.length ? `<button class="dt-btn" onclick="App.navigate('inventory')">Fix</button>` : '')}
            ${row(!h.orphan.length, 'All records point to existing items', h.orphan.length ? `${h.orphan.length} record(s) reference deleted items (kept as history)` : '')}
            ${row(!h.dupIds.length, 'No duplicate record IDs', h.dupIds.length ? Utils.esc(h.dupIds.slice(0, 5).join(', ')) : '', h.dupIds.length ? `<button class="dt-btn" onclick="App.settings.fixDuplicateIds()">Fix</button>` : '')}
            ${row(!h.unknownWorkers.length, 'All workers on record exist', h.unknownWorkers.length ? `Not in worker list: ${Utils.esc(h.unknownWorkers.join(', '))}` : '')}
            <button type="button" class="dt-btn mt-1" onclick="document.getElementById('health-output').innerHTML = App.settings.healthHtml(); App.ui.toast('Data health re-checked.', 'info')">${this.ui.icon('sync', '')}Re-run Checks</button>`;
    }
    async fixDuplicateIds() {
        const d = this.data;
        const prefixes = { purchaseOrders: 'PO', salesOrders: 'SO', manufacturingOrders: 'MO', issuances: 'ISS', manualAdjustments: 'ADJ', expenses: 'EXP', payrollPayments: 'PAY' };
        let fixed = 0;
        Object.entries(prefixes).forEach(([k, p]) => {
            const seen = new Set();
            d[k].forEach(r => {
                if (seen.has(r.id)) { r.id = Utils.nextId(p, d[k], p === 'EXP' ? 4 : 3); fixed++; }
                seen.add(r.id);
            });
        });
        await this.app.saveAndRerender();
        this.ui.toast(`${fixed} duplicate ID(s) renumbered.`);
    }

    // ---------- Profile / preferences ----------
    async saveProfile() {
        const s = this.data.settings;
        ['businessName', 'businessTagline', 'address', 'phone', 'email'].forEach(k => { s[k] = this.val(`set-${k}`); });
        if (!s.businessName) s.businessName = DEFAULT_SETTINGS.businessName;
        this.app.applyBranding();
        await this.app.saveAndRerender();
        this.ui.toast('Business profile saved.');
    }
    async savePreferences() {
        const s = this.data.settings;
        s.lowStockThreshold = Math.max(0, Utils.num(this.val('set-lowStockThreshold'), 10));
        s.tablePageSize = Utils.num(this.val('set-tablePageSize'), 25);
        s.defaultReportPeriod = this.val('set-defaultReportPeriod') || 'month';
        s.backupReminderDays = Math.max(0, Math.round(Utils.num(this.val('set-backupReminderDays'), 7)));
        this.app.reports.period = s.defaultReportPeriod;
        await this.app.saveAndRerender();
        this.ui.toast('Preferences saved.');
    }
    async addCategory() {
        const name = this.val('new-category');
        const cats = this.data.settings.expenseCategories;
        if (!name) return;
        if (cats.some(c => Utils.sameText(c, name))) return this.ui.toast('That category already exists.', 'error');
        cats.push(name);
        await this.app.saveAndRerender();
        this.ui.toast(`Category "${name}" added.`);
    }
    async removeCategory(i) {
        const cats = this.data.settings.expenseCategories;
        const name = cats[i];
        if (cats.length <= 1) return this.ui.toast('Keep at least one category.', 'error');
        const used = this.data.expenses.filter(e => e.category === name).length;
        if (!(await this.ui.confirm({ title: `Remove "${name}"?`, tone: 'danger', confirmLabel: 'Remove', message: 'This category will no longer appear in the expense form.', details: used ? [`${used} existing expense(s) keep this category label`] : [] }))) return;
        cats.splice(i, 1);
        await this.app.saveAndRerender();
    }
    async updateWorkerRate(workerId, el) {
        const w = this.data.workers.find(x => x.id === workerId);
        if (!w) return;
        const rate = Utils.num(el.innerText, NaN);
        if (!Number.isFinite(rate) || rate < 0) { el.innerText = (w.rate || 0).toFixed(2); return this.ui.toast('Invalid rate. Please enter a valid number.', 'error'); }
        if (rate === (w.rate || 0)) return;
        w.rate = rate;
        await this.app.saveAndRerender();
        this.ui.toast(`${w.name}'s rate updated to ${Utils.formatCurrency(rate)} / splint.`);
    }

    async updateStorageUsage() {
        const text = document.getElementById('storage-text');
        const bar = document.getElementById('storage-bar');
        if (!text) return;
        if (!(navigator.storage && navigator.storage.estimate)) { text.textContent = 'Storage estimation not supported.'; return; }
        try {
            const { usage, quota } = await navigator.storage.estimate();
            const pct = quota ? (usage / quota) * 100 : 0;
            if (bar) bar.style.width = `${Math.max(pct, 0.5)}%`;
            text.textContent = `Used ${(usage / 1048576).toFixed(2)} MB of ${(quota / 1073741824).toFixed(2)} GB (${pct.toFixed(2)}%)`;
        } catch (e) {
            text.textContent = 'Could not estimate storage.';
        }
    }

    // ---------- Backup / restore / reset ----------
    async exportBackup() {
        const payload = { ...this.data, exportedAt: new Date().toISOString(), appVersion: APP_VERSION };
        Utils.downloadFile(`beb_biz_backup_v1_${Utils.today()}.json`, JSON.stringify(payload), 'application/json');
        this.data.settings.lastBackupAt = new Date().toISOString();
        await this.app.saveAndRerender();
        this.ui.toast('Backup exported — check your downloads folder.');
    }
    importBackup(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const incoming = JSON.parse(e.target.result);
                if (!incoming.inventory || !incoming.customers) return this.ui.alert({ title: 'Not a backup file', tone: 'danger', icon: 'alert', message: `"${file.name}" doesn't look like a Bebang BMS backup. Choose a file created with "Export Data (JSON)".` });
                const counts = `${incoming.inventory.length} items, ${(incoming.salesOrders || []).length} sales, ${(incoming.purchaseOrders || []).length} POs, ${(incoming.workers || []).length} workers`;
                if (!(await this.ui.confirm({
                    title: 'Restore this backup?', icon: 'upload', tone: 'warning', confirmLabel: 'Restore Backup',
                    message: `${file.name}${incoming.exportedAt ? ` — exported ${new Date(incoming.exportedAt).toLocaleString('en-PH')}` : ''}`,
                    details: [`${incoming.inventory.length} inventory items`, `${(incoming.salesOrders || []).length} sales · ${(incoming.purchaseOrders || []).length} purchase orders`, `${(incoming.workers || []).length} workers · ${(incoming.expenses || []).length} expenses`],
                    warnings: [`This completely replaces ALL current data${this.app.store.configured ? ' for every synced device' : ''}.`]
                }))) return;
                this.app.store.applyIncoming(incoming, incoming.imageAttachments || this.data.imageAttachments);
                delete this.data.exportedAt;
                delete this.data.appVersion;
                await this.app.store.save();
                this.app.render('dashboard');
                this.ui.alert({ title: 'Backup restored', tone: 'success', message: `All data was restored from ${file.name} (${counts}).` });
            } catch (err) {
                console.error('Import error:', err);
                this.ui.alert({ title: "Couldn't read the file", tone: 'danger', icon: 'alert', message: 'The file is damaged or is not a valid JSON backup.' });
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
    async factoryReset() {
        const d = this.data;
        if (!(await this.ui.confirm({
            title: 'Factory reset — delete everything?', tone: 'danger', confirmLabel: 'Delete Everything', cancelLabel: 'Cancel', requireText: 'DELETE',
            message: `Every record is permanently deleted${this.app.store.configured ? ' for every device using the shared login' : ''} and the app starts from zero — including the item catalog.`,
            details: [`${d.inventory.length} inventory items`, `${d.salesOrders.length} sales · ${d.purchaseOrders.length} purchase orders`, `${d.workers.length} workers · ${d.payrollPayments.length} payroll payments · ${d.expenses.length} expenses`],
            note: 'This cannot be undone. Export a backup first if you might need this data.'
        }))) return this.ui.toast('Factory reset cancelled.', 'info');
        await this.app.store.factoryReset();
        this.app.render('dashboard');
        this.ui.alert({ title: 'Factory reset complete', tone: 'success', message: 'All data was cleared. The app is back to zero.' });
    }
    async clearCache() {
        if (!(await this.ui.confirm({
            title: 'Clear cache & reload?', icon: 'sync', tone: 'warning', confirmLabel: 'Clear & Reload',
            message: this.app.store.configured
                ? "This browser's local copy of the app data is deleted and the app reloads. Shared cloud data is not touched."
                : "All data stored for this app in this browser is deleted, and the app reloads with the built-in starting catalog.",
            note: 'Use this if item lists look outdated after an app update. Not the same as Factory Reset.'
        }))) return;
        try {
            await this.app.store.deleteLocalDatabase();
            this.ui.toast('Local data cleared. Reloading…', 'info');
            setTimeout(() => location.reload(), 900);
        } catch (err) {
            this.ui.alert({ title: "Couldn't clear the cache", tone: 'danger', icon: 'alert', message: err.message });
        }
    }
}
