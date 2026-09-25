/* ============================================================
   AccessService — approval-based access on top of Firebase Auth.
   Every account that signs in (Google, or the email login) gets a record in
   Firestore `users/{uid}` with a status:
       pending  → waiting for the admin      approved → can use the app
       rejected → request declined           revoked  → access removed later
   Admins (ADMIN_EMAILS in js/config/firebase-config.js, verified email) are
   approved automatically and manage everyone else in Settings → User Access.
   `invites/{email}` lets the admin pre-approve someone before they sign in.
   Firestore Security Rules (firestore.rules) enforce the same thing server-side.
   ============================================================ */
class AccessService {
    static STATUS = {
        pending: { label: 'Pending', color: 'amber' },
        approved: { label: 'Approved', color: 'green' },
        rejected: { label: 'Declined', color: 'red' },
        revoked: { label: 'Revoked', color: 'gray' }
    };

    constructor(app, cloud) {
        this.app = app;
        this.cloud = cloud;
        this.record = null;        // the signed-in user's own users/{uid} record
        this.users = [];           // admin: every access record (live)
        this.invites = [];         // admin: pre-approved emails (live)
        this.rulesMissing = false; // admin fallback when firestore.rules isn't deployed yet
        this._unsubs = [];
        this._knownPending = null;
    }

    get enabled() { return this.cloud.configured; }
    get db() { return this.cloud.db; }
    static isAdminEmail(email) { return (ADMIN_EMAILS || []).map(e => e.toLowerCase()).includes(String(email || '').toLowerCase()); }
    /** Admin = listed email AND verified by the provider (Google verifies Gmail addresses). */
    isAdminUser(user) { return !!(user && user.emailVerified && AccessService.isAdminEmail(user.email)); }
    get isAdmin() { return this.isAdminUser(this.cloud.user); }
    get pendingCount() { return this.users.filter(u => u.status === 'pending').length; }

    userRef(uid) { return this.db.collection('users').doc(uid); }
    inviteRef(email) { return this.db.collection('invites').doc(String(email).trim().toLowerCase()); }
    providerOf(user) {
        const p = (user.providerData && user.providerData[0] && user.providerData[0].providerId) || 'password';
        return p === 'google.com' ? 'google' : p === 'password' ? 'email' : p;
    }
    now() { return new Date().toISOString(); }

    /**
     * Makes sure the signed-in account has an access record (creating a pending request the first
     * time) and returns it. Throws on permission problems so the caller can show a helpful screen.
     */
    async ensureRecord(user) {
        const ref = this.userRef(user.uid);
        const admin = this.isAdminUser(user);
        const profile = { email: user.email || '', displayName: user.displayName || '', photoURL: user.photoURL || '', provider: this.providerOf(user), lastSeenAt: this.now() };
        const snap = await ref.get();
        if (!snap.exists) {
            let invited = false;
            if (!admin && user.email && user.emailVerified) {
                try { invited = (await this.inviteRef(user.email).get()).exists; } catch (e) { invited = false; }
            }
            const rec = {
                uid: user.uid, ...profile, role: admin ? 'admin' : 'user',
                status: admin || invited ? 'approved' : 'pending',
                requestedAt: this.now(),
                ...(admin || invited ? { decidedAt: this.now(), decidedBy: admin ? 'auto (admin)' : 'invitation' } : {})
            };
            await ref.set(rec);
            return rec;
        }
        const rec = snap.data();
        const update = { ...profile };
        if (admin && (rec.status !== 'approved' || rec.role !== 'admin')) Object.assign(update, { status: 'approved', role: 'admin', decidedAt: this.now(), decidedBy: 'auto (admin)' });
        await ref.update(update).catch(() => { /* lastSeen is best-effort */ });
        return { ...rec, ...update };
    }

    /** Live updates of the signed-in account's own record (approval happens while they wait). */
    watchSelf(uid, onChange, onError) {
        this.stopSelf();
        // includeMetadataChanges: also hear the moment the server confirms our own write.
        this._selfUnsub = this.userRef(uid).onSnapshot({ includeMetadataChanges: true }, snap => {
            // Only trust server-confirmed data: a local, not-yet-accepted write (e.g. someone
            // tampering with their own status) must never flash the app open.
            if (snap.metadata.hasPendingWrites) return;
            const rec = snap.exists ? snap.data() : null;
            const key = JSON.stringify(rec);
            if (key === this._lastSelfKey) return; // metadata-only change, nothing new
            this._lastSelfKey = key;
            this.record = rec;
            onChange(this.record);
        }, onError);
    }
    stopSelf() { if (this._selfUnsub) { this._selfUnsub(); this._selfUnsub = null; } this._lastSelfKey = undefined; }

    async checkNow(uid) {
        const snap = await this.userRef(uid).get({ source: 'server' });
        this.record = snap.exists ? snap.data() : null;
        return this.record;
    }
    /** A declined user may ask again (the rules allow only rejected → pending on their own record). */
    async requestAgain(uid) {
        await this.userRef(uid).update({ status: 'pending', requestedAt: this.now(), note: '' });
    }

    // ---------------- admin ----------------
    startAdmin() {
        this.stopAdmin();
        this._unsubs.push(this.db.collection('users').onSnapshot(qs => {
            const list = qs.docs.map(d => ({ uid: d.id, ...d.data() }));
            const pending = list.filter(u => u.status === 'pending');
            if (this._knownPending) {
                pending.filter(u => !this._knownPending.has(u.uid)).forEach(u => {
                    this.app.ui.toast(`New access request from ${u.displayName || u.email}.`, 'info', { duration: 8000, actionLabel: 'Review', onAction: () => this.app.navigate('settings/users') });
                });
            }
            this._knownPending = new Set(pending.map(u => u.uid));
            this.users = list;
            this.app.onAccessListChanged();
        }, err => console.warn('Access list unavailable:', err.code)));
        this._unsubs.push(this.db.collection('invites').onSnapshot(qs => {
            this.invites = qs.docs.map(d => ({ email: d.id, ...d.data() }));
            this.app.onAccessListChanged();
        }, err => console.warn('Invites unavailable:', err.code)));
    }
    stopAdmin() { this._unsubs.forEach(u => u()); this._unsubs = []; this._knownPending = null; }

    async setStatus(uid, status, note = '') {
        const me = this.cloud.user;
        await this.userRef(uid).update({ status, note, decidedAt: this.now(), decidedBy: me ? me.email : 'admin' });
    }
    async removeRecord(uid) { await this.userRef(uid).delete(); }
    async invite(email, note = '') {
        const me = this.cloud.user;
        await this.inviteRef(email).set({ note, invitedAt: this.now(), invitedBy: me ? me.email : 'admin' });
    }
    async removeInvite(email) { await this.inviteRef(email).delete(); }
}
