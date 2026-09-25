/* ============================================================
   SettingsPage — split into sections, each its own page reachable from the
   sidebar's Settings dropdown (and #settings/<section> links):
     overview · account · profile · preferences · workers · suppliers ·
     categories · app · health · backup
   Every section offers full management (add / edit / delete / reset).
   ============================================================ */
class SettingsPage extends BasePage {
    static SECTIONS = [
        { key: 'account', label: 'Account & Sync', icon: 'user', desc: 'Who is signed in, sync status, your display name, log out.' },
        { key: 'users', label: 'User Access', icon: 'key', desc: 'Approve or decline Google sign-in requests, revoke access, pre-approve emails.', adminOnly: true },
        { key: 'profile', label: 'Business Profile', icon: 'building', desc: 'Business name, address and contacts used on every printout.' },
        { key: 'preferences', label: 'Preferences', icon: 'settings', desc: 'Theme, stock alerts, table size, report defaults, reminders.' },
        { key: 'workers', label: 'Workers', icon: 'users', desc: 'Add, edit, deactivate or remove workers and their pay rates.' },
        { key: 'suppliers', label: 'Suppliers', icon: 'truck', desc: 'Your supplier directory for purchase orders.' },
        { key: 'categories', label: 'Expense Categories', icon: 'tag', desc: 'Add, rename, reorder or remove expense categories.' },
        { key: 'app', label: 'App & Offline', icon: 'install', desc: 'Install the app, check for updates, storage, tour.' },
        { key: 'health', label: 'Data Health', icon: 'shield', desc: 'Consistency checks for stock, references and IDs, with fixes.' },
        { key: 'backup', label: 'Backup & Restore', icon: 'database', desc: 'Export / restore backups, CSV exports, reset tools.' }
    ];

    constructor(app) {
        super(app);
        this.view = 'overview';
    }

    // ---------- routing (#settings/<section>) ----------
    get sections() { return SettingsPage.SECTIONS.filter(s => !s.adminOnly || this.app.access.isAdmin); }
    section(key) { return this.sections.find(s => s.key === key); }
    setRoute(sub) { this.view = sub && this.section(sub) ? sub : 'overview'; }
    routeSuffix() { return this.view === 'overview' ? '' : this.view; }
    open(key) { this.app.navigate(`settings/${key || 'overview'}`); }

    render() {
        if (this.view !== 'overview' && !this.section(this.view)) this.view = 'overview';
        const sec = this.section(this.view);
        const body = {
            users: () => this.usersView(),
            account: () => this.accountView(), profile: () => this.profileView(), preferences: () => this.preferencesView(),
            workers: () => this.workersView(), suppliers: () => this.suppliersView(), categories: () => this.categoriesView(),
            app: () => this.appView(), health: () => this.healthView(), backup: () => this.backupView()
        }[this.view] || (() => this.overviewView());
        const crumb = sec ? `<button type="button" class="hover:underline" onclick="App.settings.open('overview')">Settings</button> <span class="opacity-50">›</span> ${sec.label}` : `Version ${APP_VERSION} · ${this.app.store.configured ? 'Live multi-device sync' : 'Local-only mode (this browser)'}`;
        return `
            ${this.ui.pageHeader(sec ? sec.label : 'Settings', crumb)}
            <div class="sub-nav settings-subnav no-print">
                <button type="button" onclick="App.settings.open('overview')" class="sub-nav-button ${this.view === 'overview' ? 'active' : ''}">Overview</button>
                ${this.sections.map(s => `<button type="button" onclick="App.settings.open('${s.key}')" class="sub-nav-button ${this.view === s.key ? 'active' : ''}">${s.label}${s.key === 'users' && this.app.access.pendingCount ? ` <span class="nav-sub-badge">${this.app.access.pendingCount}</span>` : ''}</button>`).join('')}
            </div>
            ${sec ? `<p class="text-sm text-secondary -mt-3 mb-5">${sec.desc}</p>` : ''}
            ${body()}`;
    }

    afterRender() {
        if (this.view === 'users') this.ui.animateMetrics();
        if (this.view === 'app') this.updateStorageUsage();
        if (this.view === 'profile') this.previewLetterhead();
    }

    // ================= OVERVIEW =================
    overviewView() {
        const d = this.data, s = d.settings;
        const h = this.healthChecks();
        const issues = [h.mismatched, h.negative, h.dupIds, h.unknownWorkers].filter(x => x.length).length;
        const user = this.app.auth.user;
        const stat = {
            account: user ? user.email : (this.app.store.configured ? 'Not signed in' : 'Local mode · this device'),
            profile: s.businessName,
            preferences: `${{ dark: 'Dark', light: 'Light', system: 'Auto' }[this.app.themeMode] || 'Dark'} theme · low stock ≤ ${s.lowStockThreshold}`,
            workers: `${d.workers.filter(w => w.active !== false).length} active · ${d.workers.length} total`,
            suppliers: `${d.suppliers.filter(x => x.active !== false).length} active · ${d.suppliers.length} total`,
            categories: `${s.expenseCategories.length} categories`,
            app: this.app.pwa.isStandalone ? 'Installed as an app' : `Version ${APP_VERSION}`,
            health: issues ? `${issues} check(s) need attention` : 'All checks passed',
            backup: s.lastBackupAt ? `Last backup ${new Date(s.lastBackupAt).toLocaleDateString('en-PH')}` : 'No backup yet',
            users: this.app.access.pendingCount ? `${this.app.access.pendingCount} request(s) waiting for you` : `${this.app.access.users.filter(u => u.status === 'approved').length} approved user(s)`
        };
        const warn = { health: issues > 0, backup: !s.lastBackupAt && !this.app.store.configured, users: this.app.access.pendingCount > 0 };
        return `
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                ${this.sections.map(sec => `
                    <button type="button" onclick="App.settings.open('${sec.key}')" class="settings-tile glass-panel text-left" id="settings-tile-${sec.key}">
                        <span class="settings-tile-icon">${this.ui.icon(sec.icon, '')}</span>
                        <span class="min-w-0 flex-1">
                            <span class="block text-base font-bold text-white">${sec.label}</span>
                            <span class="block text-xs text-secondary mt-0.5">${sec.desc}</span>
                            <span class="block text-xs mt-2 font-semibold ${warn[sec.key] ? 'text-accent' : 'text-secondary'} truncate">${Utils.esc(stat[sec.key])}</span>
                        </span>
                        <span class="text-secondary text-lg">›</span>
                    </button>`).join('')}
            </div>`;
    }

    // ================= USER ACCESS (admin) =================
    usersView() {
        const acc = this.app.access;
        if (!acc.isAdmin) return this.ui.emptyNote('Only the administrator can manage user access.');
        const order = { pending: 0, approved: 1, rejected: 2, revoked: 3 };
        const count = (st) => acc.users.filter(u => u.status === st).length;
        const avatar = (u) => u.photoURL
            ? `<img src="${Utils.esc(u.photoURL)}" alt="" class="thumb !w-9 !h-9 rounded-full" referrerpolicy="no-referrer">`
            : `<span class="thumb thumb-empty !w-9 !h-9 rounded-full text-sm font-bold text-white">${Utils.esc((u.displayName || u.email || '?').charAt(0).toUpperCase())}</span>`;
        const btn = (label, cls, call) => `<button type="button" class="dt-btn ${cls}" onclick="${call}">${label}</button>`;
        return `
            ${acc.rulesMissing ? `<div class="glass-panel p-4 mb-5 text-sm text-accent">${this.ui.icon('alert', 'w-4 h-4 inline -mt-0.5')} <strong>Security rules not published yet.</strong> Requests can't be saved or listed until the rules in <code>firestore.rules</code> are published (Firebase Console → Firestore Database → Rules). See PLAN.md for the steps.</div>` : ''}
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                ${this.ui.metricCard('Waiting for Approval', count('pending'), { currency: false, color: count('pending') ? 'text-accent' : 'text-white', index: 2, icon: 'history' })}
                ${this.ui.metricCard('Approved Users', count('approved'), { currency: false, color: 'text-green-400', index: 1, icon: 'check' })}
                ${this.ui.metricCard('Declined / Revoked', count('rejected') + count('revoked'), { currency: false, index: 4, icon: 'power' })}
                ${this.ui.metricCard('Pre-approved Emails', acc.invites.length, { currency: false, index: 3, icon: 'key' })}
            </div>
            <div id="access-requests">${this.tables.render({
                id: 'access-users', title: 'Access Requests & Users', subtitle: 'Everyone who has signed in. New Google sign-ins wait here until you approve them — they are let in automatically.',
                rows: acc.users, defaultSort: { key: 'status', dir: 'asc' }, exportName: 'app_users', emptyText: 'No one has signed in yet.',
                filters: [{ key: 'st', label: 'All statuses', options: Object.entries(AccessService.STATUS).map(([value, v]) => ({ value, label: v.label })), test: (r, v) => r.status === v }],
                searchText: r => `${r.email} ${r.displayName}`,
                columns: [
                    { key: 'user', label: 'User', value: r => r.displayName || r.email, render: r => `<span class="flex items-center gap-3">${avatar(r)}<span class="min-w-0"><span class="block text-white font-semibold">${Utils.esc(r.displayName || '—')}${r.role === 'admin' ? ' ' + this.ui.badge('Admin', 'violet') : ''}</span><span class="block text-xs text-secondary">${Utils.esc(r.email)}</span></span></span>` },
                    { key: 'provider', label: 'Sign-in', value: r => r.provider === 'google' ? 'Google' : r.provider === 'email' ? 'Email' : (r.provider || '—') },
                    { key: 'status', label: 'Status', value: r => (AccessService.STATUS[r.status] || {}).label || r.status, sortValue: r => `${order[r.status] ?? 9}-${9999999999999 - Date.parse(r.requestedAt || 0)}`, render: r => this.ui.badge((AccessService.STATUS[r.status] || { label: r.status }).label, (AccessService.STATUS[r.status] || { color: 'gray' }).color) },
                    { key: 'requestedAt', label: 'Requested', value: r => r.requestedAt || '', render: r => `<span class="text-secondary">${Utils.formatDateTime(r.requestedAt)}</span>` },
                    { key: 'lastSeenAt', label: 'Last Seen', value: r => r.lastSeenAt || '', render: r => `<span class="text-secondary">${Utils.formatDateTime(r.lastSeenAt)}</span>` },
                    { key: 'decision', label: 'Decision', wrap: true, value: r => r.decidedBy ? `${r.decidedBy} ${r.decidedAt || ''}` : '', render: r => r.decidedAt ? `<span class="text-xs text-secondary">${Utils.esc(r.decidedBy || '')} · ${Utils.formatDateTime(r.decidedAt)}${r.note ? `<br>“${Utils.esc(r.note)}”` : ''}</span>` : '<span class="text-secondary">—</span>' }
                ],
                actions: r => r.role === 'admin' ? '<span class="text-xs text-secondary">administrator</span>' : `<div class="row-actions">
                    ${r.status === 'pending' ? btn('Approve', 'dt-btn-primary', `App.settings.approveUser('${r.uid}')`) + btn('Decline', '', `App.settings.declineUser('${r.uid}')`) : ''}
                    ${r.status === 'approved' ? btn('Revoke', '', `App.settings.revokeUser('${r.uid}')`) : ''}
                    ${['rejected', 'revoked'].includes(r.status) ? btn('Approve', 'dt-btn-primary', `App.settings.approveUser('${r.uid}')`) : ''}
                    ${this.ui.iconBtn(`App.settings.deleteUser('${r.uid}')`, 'trash', 'Delete this record', { danger: true })}</div>`
            })}</div>
            <div class="mt-6">${this.tables.render({
                id: 'access-invites', title: 'Pre-approved Emails', subtitle: 'People on this list are let in immediately the first time they sign in with Google — no waiting.',
                rows: acc.invites, defaultSort: { key: 'invitedAt', dir: 'desc' }, exportName: 'preapproved_emails', emptyText: 'No pre-approved emails.',
                addButton: { label: 'Pre-approve Email', onclick: 'App.settings.addInvite()' },
                columns: [
                    { key: 'email', label: 'Email', render: r => `<span class="text-white">${Utils.esc(r.email)}</span>` },
                    { key: 'note', label: 'Note', value: r => r.note || '' },
                    { key: 'invitedAt', label: 'Added', value: r => r.invitedAt || '', render: r => `<span class="text-secondary">${Utils.formatDateTime(r.invitedAt)} · ${Utils.esc(r.invitedBy || '')}</span>` },
                    { key: 'joined', label: 'Signed In?', value: r => acc.users.some(u => Utils.sameText(u.email, r.email)) ? 'Yes' : 'Not yet', render: r => acc.users.some(u => Utils.sameText(u.email, r.email)) ? this.ui.badge('Yes', 'green') : this.ui.badge('Not yet', 'gray') }
                ],
                actions: r => `<div class="row-actions">${this.ui.iconBtn(`App.settings.editInvite('${Utils.esc(r.email)}')`, 'edit', 'Edit note')}${this.ui.iconBtn(`App.settings.removeInvite('${Utils.esc(r.email)}')`, 'trash', 'Remove', { danger: true })}</div>`
            })}</div>`;
    }
    accessUser(uid) { return this.app.access.users.find(u => u.uid === uid); }
    async approveUser(uid) {
        const u = this.accessUser(uid);
        try { await this.app.access.setStatus(uid, 'approved'); this.ui.toast(`${u ? (u.displayName || u.email) : 'User'} approved — they're being signed in now.`); }
        catch (err) { this.ui.toast(`Couldn't approve: ${err.message}`, 'error'); }
    }
    declineUser(uid) {
        const u = this.accessUser(uid);
        this.app.modal.open({
            title: `Decline ${u ? (u.displayName || u.email) : 'request'}?`, cols: 1, submitLabel: 'Decline Request', danger: true,
            subtitle: 'They will see that their request was declined, with your note if you add one. They can ask again later.',
            fields: [{ key: 'note', label: 'Note to the person (optional)', type: 'textarea', value: '' }],
            onSubmit: async (v) => { await this.app.access.setStatus(uid, 'rejected', v.note); this.ui.toast('Request declined.'); }
        });
    }
    async revokeUser(uid) {
        const u = this.accessUser(uid);
        if (!(await this.ui.confirm({ title: `Revoke access for ${u ? (u.displayName || u.email) : 'this user'}?`, tone: 'danger', icon: 'power', confirmLabel: 'Revoke Access', message: "They're signed out of the app right away and can't get back in unless you approve them again.", details: u ? [u.email] : [] }))) return;
        try { await this.app.access.setStatus(uid, 'revoked'); this.ui.toast('Access revoked.'); }
        catch (err) { this.ui.toast(`Couldn't revoke: ${err.message}`, 'error'); }
    }
    async deleteUser(uid) {
        const u = this.accessUser(uid);
        if (!(await this.ui.confirm({ title: 'Delete this access record?', tone: 'danger', confirmLabel: 'Delete', message: `${u ? `${u.displayName || ''} ${u.email}`.trim() : 'This user'} is removed from the list.`, details: ['If they sign in again, a new request is created and waits for your approval', 'Business data is not affected'] }))) return;
        try { await this.app.access.removeRecord(uid); this.ui.toast('Access record deleted.'); }
        catch (err) { this.ui.toast(`Couldn't delete: ${err.message}`, 'error'); }
    }
    addInvite() {
        this.app.modal.open({
            title: 'Pre-approve an Email', cols: 1, submitLabel: 'Pre-approve',
            subtitle: 'When this person signs in with Google for the first time, they go straight in.',
            fields: [{ key: 'email', label: 'Google account email', type: 'email', required: true, placeholder: 'name@gmail.com' }, { key: 'note', label: 'Note (optional)', type: 'text', placeholder: 'e.g. New staff — packing' }],
            onSubmit: async (v, modal) => {
                const email = v.email.toLowerCase();
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { modal.setError('Enter a valid email address.'); return false; }
                if (this.app.access.invites.some(i => i.email === email)) { modal.setError('That email is already pre-approved.'); return false; }
                await this.app.access.invite(email, v.note);
                const existing = this.app.access.users.find(u => Utils.sameText(u.email, email) && u.status === 'pending');
                if (existing) await this.app.access.setStatus(existing.uid, 'approved', 'Pre-approved');
                this.ui.toast(`${email} pre-approved${existing ? ' — their waiting request was approved too' : ''}.`);
            }
        });
    }
    editInvite(email) {
        const inv = this.app.access.invites.find(i => i.email === email);
        if (!inv) return;
        this.app.modal.open({
            title: `Edit ${email}`, cols: 1,
            fields: [{ key: 'note', label: 'Note', type: 'text', value: inv.note || '' }],
            onSubmit: async (v) => { await this.app.access.invite(email, v.note); this.ui.toast('Note updated.'); }
        });
    }
    async removeInvite(email) {
        if (!(await this.ui.confirm({ title: 'Remove pre-approval?', tone: 'danger', confirmLabel: 'Remove', message: `${email} will need your approval if they sign in for the first time.`, note: 'People who already signed in keep their current access.' }))) return;
        try { await this.app.access.removeInvite(email); this.ui.toast('Pre-approval removed.'); }
        catch (err) { this.ui.toast(`Couldn't remove: ${err.message}`, 'error'); }
    }

    // ================= ACCOUNT =================
    accountView() {
        const cloud = this.app.store.configured, user = this.app.auth.user;
        const localName = this.app.localDisplayName;
        return `
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
                        <div class="flex flex-wrap gap-2">
                            <button onclick="App.auth.signOut()" class="dt-btn">${this.ui.icon('logout', '')}Log out</button>
                            <button onclick="App.auth.sendResetForCurrent()" class="dt-btn">${this.ui.icon('info', '')}Email a password reset</button>
                        </div>
                    ` : `<p class="text-sm text-secondary">See <code>PLAN.md</code> for the Firebase setup steps to turn on live multi-device sync.</p>`}
                </div>
                <form id="display-name-card" class="glass-panel settings-card p-4 sm:p-6" onsubmit="event.preventDefault(); App.settings.saveDisplayName()">
                    <h3 class="text-white">Your Name on This Device</h3>
                    <p class="card-sub">Shown in the sidebar and the welcome greeting. Saved only on this device, since the login is shared.</p>
                    ${this.ui.field('Display name', `<input id="set-displayName" class="field-input" maxlength="40" placeholder="${Utils.esc(this.app.userDisplayName() || 'e.g. Felix')}" value="${Utils.esc(localName)}">`)}
                    <div class="flex flex-wrap gap-2 mt-4">
                        <button type="submit" class="dt-btn dt-btn-primary">${this.ui.icon('check', '')}Save Name</button>
                        ${localName ? `<button type="button" class="dt-btn" onclick="App.settings.clearDisplayName()">${this.ui.icon('trash', '')}Remove Name</button>` : ''}
                    </div>
                </form>
            </div>`;
    }
    async saveDisplayName() {
        const name = this.val('set-displayName');
        if (!name) return this.ui.toast('Type a name first, or use Remove Name.', 'error');
        this.app.setLocalDisplayName(name);
        this.app.render('settings', { skipAnimation: true, keepScroll: true });
        this.ui.toast(`Display name set to ${name}.`);
    }
    async clearDisplayName() {
        if (!(await this.ui.confirm({ title: 'Remove display name?', tone: 'warning', confirmLabel: 'Remove', message: 'The sidebar and greeting will go back to using the name from the account email.' }))) return;
        this.app.setLocalDisplayName('');
        this.app.render('settings', { skipAnimation: true, keepScroll: true });
        this.ui.toast('Display name removed.');
    }

    // ================= BUSINESS PROFILE =================
    profileView() {
        const s = this.data.settings;
        return `
            <div class="settings-grid">
                <form id="business-profile-card" class="glass-panel settings-card p-4 sm:p-6" onsubmit="event.preventDefault(); App.settings.saveProfile()" oninput="App.settings.previewLetterhead()">
                    <h3 class="text-white">Business Details</h3>
                    <p class="card-sub">Shown in the header and on every printed report, receipt and payslip.</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${this.ui.field('Business Name *', `<input id="set-businessName" class="field-input" value="${Utils.esc(s.businessName)}" required>`, 'sm:col-span-2')}
                        ${this.ui.field('Tagline', `<input id="set-businessTagline" class="field-input" value="${Utils.esc(s.businessTagline)}">`, 'sm:col-span-2')}
                        ${this.ui.field('Address', `<input id="set-address" class="field-input" value="${Utils.esc(s.address)}">`, 'sm:col-span-2')}
                        ${this.ui.field('Phone', `<input id="set-phone" type="tel" class="field-input" value="${Utils.esc(s.phone)}">`)}
                        ${this.ui.field('Email', `<input id="set-email" type="email" class="field-input" value="${Utils.esc(s.email)}">`)}
                    </div>
                    <div class="flex flex-wrap gap-2 mt-4">
                        <button type="submit" class="dt-btn dt-btn-primary">${this.ui.icon('check', '')}Save Profile</button>
                        <button type="button" class="dt-btn" onclick="App.settings.resetProfile()">${this.ui.icon('sync', '')}Reset to Defaults</button>
                    </div>
                </form>
                <div class="glass-panel settings-card p-4 sm:p-6">
                    <h3 class="text-white">Printout Preview</h3>
                    <p class="card-sub">How the letterhead looks on reports, receipts and payslips.</p>
                    <div id="letterhead-preview" class="letterhead-preview"></div>
                    <button type="button" class="dt-btn mt-4" onclick="App.settings.printTestPage()">${this.ui.icon('print', '')}Print Test Page</button>
                </div>
            </div>`;
    }
    profileFromForm() {
        const s = {};
        ['businessName', 'businessTagline', 'address', 'phone', 'email'].forEach(k => { s[k] = this.val(`set-${k}`); });
        return s;
    }
    previewLetterhead() {
        const box = document.getElementById('letterhead-preview');
        if (!box) return;
        const s = { ...this.data.settings, ...this.profileFromForm() };
        const contact = [s.address, s.phone, s.email].filter(Boolean).map(Utils.esc).join(' · ');
        box.innerHTML = `
            <div style="font-size: 1.05rem; font-weight: 800;">${Utils.esc(s.businessName || DEFAULT_SETTINGS.businessName)}</div>
            ${s.businessTagline ? `<div style="font-size: 0.8rem;">${Utils.esc(s.businessTagline)}</div>` : ''}
            ${contact ? `<div style="font-size: 0.72rem; color: #555;">${contact}</div>` : '<div style="font-size: 0.72rem; color: #999;">(add an address, phone or email)</div>'}
            <div style="border-top: 2px solid #222; margin-top: 8px; padding-top: 8px; font-weight: 700; font-size: 0.85rem;">Sample Report Title</div>`;
    }
    async saveProfile() {
        const s = this.data.settings;
        Object.assign(s, this.profileFromForm());
        if (!s.businessName) s.businessName = DEFAULT_SETTINGS.businessName;
        this.app.applyBranding();
        await this.app.saveAndRerender();
        this.ui.toast('Business profile saved.');
    }
    async resetProfile() {
        if (!(await this.ui.confirm({ title: 'Reset business profile?', tone: 'warning', icon: 'sync', confirmLabel: 'Reset Profile', message: 'The name and tagline go back to the defaults, and the address, phone and email are cleared.' }))) return;
        ['businessName', 'businessTagline', 'address', 'phone', 'email'].forEach(k => { this.data.settings[k] = DEFAULT_SETTINGS[k]; });
        this.app.applyBranding();
        await this.app.saveAndRerender();
        this.ui.toast('Business profile reset.');
    }
    printTestPage() {
        this.app.printer.print('Test Page', this.app.printer.summaryTable([['Sample line', Utils.formatCurrency(1234.5)], ['Total', Utils.formatCurrency(1234.5), true]]), { subtitle: 'Letterhead check' });
    }

    // ================= PREFERENCES =================
    preferencesView() {
        const s = this.data.settings, theme = this.app.themeMode;
        const collapsed = document.getElementById('app').classList.contains('sidebar-collapsed');
        const toggle = (label, sub, on, onclick, aria) => `
            <div class="flex items-center justify-between gap-3 py-3 border-b border-white/10">
                <span class="text-sm text-white">${label}<span class="block text-xs text-secondary">${sub}</span></span>
                <button type="button" role="switch" aria-checked="${on}" aria-label="${aria}" class="switch ${on ? 'on' : ''}" onclick="${onclick}"></button>
            </div>`;
        return `
            <div class="settings-grid">
                <div class="glass-panel settings-card p-4 sm:p-6">
                    <h3 class="text-white">This Device</h3>
                    <p class="card-sub">Saved only in this browser.</p>
                    <div class="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
                        <span class="text-sm text-white">Theme<span class="block text-xs text-secondary">Auto follows your device setting</span></span>
                        <div class="seg" role="group" aria-label="Theme">
                            ${[['dark', 'Dark'], ['light', 'Light'], ['system', 'Auto']].map(([k, l]) => `<button type="button" class="${theme === k ? 'active' : ''}" onclick="App.setTheme('${k}')">${l}</button>`).join('')}
                        </div>
                    </div>
                    ${toggle("Welcome screen on open", "Greeting with today's numbers after you sign in", this.app.welcome.enabled, "App.welcome.setEnabled(!App.welcome.enabled); this.classList.toggle('on', App.welcome.enabled); this.setAttribute('aria-checked', App.welcome.enabled)", 'Show welcome screen')}
                    ${toggle('Compact sidebar', 'Icons only on wide screens', collapsed, "App.toggleSidebar(); this.classList.toggle('on'); this.setAttribute('aria-checked', this.classList.contains('on'))", 'Compact sidebar')}
                    <button type="button" class="dt-btn mt-4" onclick="App.welcome.show()">${this.ui.icon('info', '')}Preview Welcome Screen</button>
                </div>
                <form id="preferences-card" class="glass-panel settings-card p-4 sm:p-6" onsubmit="event.preventDefault(); App.settings.savePreferences()">
                    <h3 class="text-white">Shared Preferences</h3>
                    <p class="card-sub">Apply to everyone using this business's data.</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${this.ui.field('Default low-stock level', `<input id="set-lowStockThreshold" type="number" min="0" step="any" class="field-input" value="${Utils.esc(s.lowStockThreshold)}">`)}
                        ${this.ui.field('Table rows per page', `<select id="set-tablePageSize" class="field-input">${this.ui.options([10, 25, 50, 100], s.tablePageSize)}</select>`)}
                        ${this.ui.field('Default report period', `<select id="set-defaultReportPeriod" class="field-input">${this.ui.options([{ value: 'today', label: 'Today' }, { value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }, { value: 'quarter', label: 'This Quarter' }, { value: 'year', label: 'This Year' }, { value: 'all', label: 'All Time' }], s.defaultReportPeriod)}</select>`)}
                        ${this.ui.field('Backup reminder (days, 0 = off)', `<input id="set-backupReminderDays" type="number" min="0" step="1" class="field-input" value="${Utils.esc(s.backupReminderDays)}">`)}
                    </div>
                    <p class="field-hint mt-2">Items can override the low-stock level individually (Inventory → Edit → Reorder Level).</p>
                    <div class="flex flex-wrap gap-2 mt-4">
                        <button type="submit" class="dt-btn dt-btn-primary">${this.ui.icon('check', '')}Save Preferences</button>
                        <button type="button" class="dt-btn" onclick="App.settings.resetPreferences()">${this.ui.icon('sync', '')}Reset to Defaults</button>
                    </div>
                </form>
            </div>`;
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
    async resetPreferences() {
        if (!(await this.ui.confirm({ title: 'Reset shared preferences?', tone: 'warning', icon: 'sync', confirmLabel: 'Reset', message: 'Low-stock level, rows per page, default report period and backup reminder go back to their defaults.', details: [`Low-stock level: ${DEFAULT_SETTINGS.lowStockThreshold}`, `Rows per page: ${DEFAULT_SETTINGS.tablePageSize}`, 'Report period: This Month', `Backup reminder: every ${DEFAULT_SETTINGS.backupReminderDays} days`] }))) return;
        ['lowStockThreshold', 'tablePageSize', 'defaultReportPeriod', 'backupReminderDays'].forEach(k => { this.data.settings[k] = DEFAULT_SETTINGS[k]; });
        this.app.reports.period = DEFAULT_SETTINGS.defaultReportPeriod;
        await this.app.saveAndRerender();
        this.ui.toast('Preferences reset to defaults.');
    }

    // ================= WORKERS =================
    workersView() {
        const d = this.data;
        const pay = Object.fromEntries(this.app.payroll.summary().map(p => [p.name, p]));
        const lastRemit = (name) => d.manufacturingOrders.filter(m => m.workerName === name).map(m => m.date).sort().pop() || '';
        return `<div id="worker-management-card">${this.tables.render({
            id: 'workers', title: 'Worker Management', subtitle: 'Active workers appear in Manufacturing dropdowns; their rate drives Payroll. Renaming a worker updates all of their past records.',
            rows: d.workers, defaultSort: { key: 'name', dir: 'asc' }, exportName: 'workers', emptyText: 'No workers added yet.',
            addButton: { label: 'Add Worker', onclick: "App.records.create('worker')" },
            filters: [{ key: 'st', label: 'All statuses', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], test: (r, v) => (r.active === false ? 'inactive' : 'active') === v }],
            columns: [
                { key: 'name', label: 'Name', render: r => `<span class="text-white font-semibold">${Utils.esc(r.name)}</span>${r.notes ? `<span class="block text-[0.7rem] text-secondary">${Utils.esc(r.notes)}</span>` : ''}` },
                { key: 'status', label: 'Status', value: r => r.active === false ? 'Inactive' : 'Active', render: r => this.ui.badge(r.active === false ? 'Inactive' : 'Active', r.active === false ? 'gray' : 'green') },
                { key: 'rate', label: 'Rate (₱/splint)', align: 'right', value: r => r.rate || 0, render: r => `₱<span class="editable-field" contenteditable="true" title="Click to edit" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" onblur="App.settings.updateWorkerRate('${r.id}', this)">${(r.rate || 0).toFixed(2)}</span>` },
                { key: 'phone', label: 'Phone', value: r => r.phone || '' },
                { key: 'splints', label: 'Splints Remitted', align: 'right', value: r => (pay[r.name] || {}).splints || 0, format: 'number', total: 'sum' },
                { key: 'balance', label: 'Balance Due', align: 'right', value: r => (pay[r.name] || {}).balance || 0, format: 'currency', total: 'sum' },
                { key: 'last', label: 'Last Remitted', value: r => lastRemit(r.name), render: r => lastRemit(r.name) ? Utils.formatDate(lastRemit(r.name)) : '<span class="text-secondary">—</span>' }
            ],
            actions: r => `<div class="row-actions">
                ${this.ui.iconBtn(`App.settings.toggleActive('worker', '${r.id}')`, 'power', r.active === false ? 'Reactivate worker' : 'Deactivate worker')}
                ${this.ui.iconBtn(`App.records.edit('worker', '${r.id}')`, 'edit', 'Edit worker')}
                ${this.ui.iconBtn(`App.records.remove('worker', '${r.id}')`, 'trash', 'Delete worker', { danger: true })}</div>`
        })}</div>`;
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
    /** Hide a worker/supplier from dropdowns without deleting their history (or bring them back). */
    async toggleActive(kind, id) {
        const rec = this.records.find(kind, id);
        if (!rec) return;
        rec.active = rec.active === false;
        await this.app.saveAndRerender();
        this.ui.toast(`${rec.name} is now ${rec.active ? 'active' : 'inactive'}.`);
    }

    // ================= SUPPLIERS =================
    suppliersView() {
        const d = this.data;
        const stats = (s) => {
            const pos = d.purchaseOrders.filter(po => Utils.sameText(po.supplier, s.name));
            return { count: pos.length, total: pos.filter(p => p.status === 'Checked').reduce((a, p) => a + this.finance.poTotal(p), 0), open: pos.filter(p => p.status !== 'Checked').length, last: pos.map(p => p.date).sort().pop() || '' };
        };
        return this.tables.render({
            id: 'suppliers', title: 'Supplier Directory', subtitle: 'Suppliers typed on a purchase order are added here automatically. Renaming one updates its past POs.',
            rows: d.suppliers, defaultSort: { key: 'name', dir: 'asc' }, exportName: 'suppliers', emptyText: 'No suppliers yet — add one, or type a supplier on a purchase order.',
            addButton: { label: 'Add Supplier', onclick: "App.records.create('supplier')" },
            filters: [{ key: 'st', label: 'All statuses', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }], test: (r, v) => (r.active === false ? 'inactive' : 'active') === v }],
            columns: [
                { key: 'name', label: 'Supplier', render: r => `<span class="text-white font-semibold">${Utils.esc(r.name)}</span>${r.address ? `<span class="block text-[0.7rem] text-secondary">${Utils.esc(r.address)}</span>` : ''}` },
                { key: 'contact', label: 'Contact', value: r => r.contact || '' },
                { key: 'phone', label: 'Phone', value: r => r.phone || '' },
                { key: 'email', label: 'Email', value: r => r.email || '' },
                { key: 'status', label: 'Status', value: r => r.active === false ? 'Inactive' : 'Active', render: r => this.ui.badge(r.active === false ? 'Inactive' : 'Active', r.active === false ? 'gray' : 'green') },
                { key: 'pos', label: 'POs', align: 'right', value: r => stats(r).count, render: r => `${stats(r).count}${stats(r).open ? ` <span class="text-xs text-accent">(${stats(r).open} open)</span>` : ''}`, total: 'sum', format: 'number' },
                { key: 'total', label: 'Purchased', align: 'right', value: r => stats(r).total, format: 'currency', total: 'sum' },
                { key: 'last', label: 'Last PO', value: r => stats(r).last, render: r => stats(r).last ? Utils.formatDate(stats(r).last) : '<span class="text-secondary">—</span>' }
            ],
            actions: r => `<div class="row-actions">
                <button type="button" class="dt-btn" onclick="App.procurement.newPOFor('${Utils.esc(r.name).replace(/&#39;/g, "\\'")}')" title="Create a purchase order for this supplier">${this.ui.icon('plus', '')}PO</button>
                ${this.ui.iconBtn(`App.settings.toggleActive('supplier', '${r.id}')`, 'power', r.active === false ? 'Reactivate supplier' : 'Deactivate supplier')}
                ${this.ui.iconBtn(`App.records.edit('supplier', '${r.id}')`, 'edit', 'Edit supplier')}
                ${this.ui.iconBtn(`App.records.remove('supplier', '${r.id}')`, 'trash', 'Delete supplier', { danger: true })}</div>`
        });
    }

    // ================= EXPENSE CATEGORIES =================
    categoriesView() {
        const d = this.data, cats = d.settings.expenseCategories;
        const rows = cats.map((name, i) => {
            const exps = d.expenses.filter(e => e.category === name);
            return { name, i, count: exps.length, total: exps.reduce((a, e) => a + Utils.num(e.amount), 0), last: exps.map(e => e.date).sort().pop() || '' };
        });
        const orphans = [...new Set(d.expenses.map(e => e.category).filter(c => c && !cats.includes(c)))];
        return `
            <form class="glass-panel p-4 mb-4 flex flex-wrap gap-2 items-end" onsubmit="event.preventDefault(); App.settings.addCategory()">
                ${this.ui.field('New category', `<input id="new-category" class="field-input" placeholder="e.g. Transport">`, 'flex-1 min-w-[12rem]')}
                <button type="submit" class="dt-btn dt-btn-primary mb-0.5">${this.ui.icon('plus', '')}Add</button>
            </form>
            ${orphans.length ? `<div class="glass-panel p-3 mb-4 text-sm text-accent flex flex-wrap items-center justify-between gap-2">
                <span>${this.ui.icon('alert', 'w-4 h-4 inline -mt-0.5')} Some expenses use categories that aren't in this list: ${orphans.map(Utils.esc).join(', ')}</span>
                <button class="dt-btn" onclick="App.settings.adoptOrphanCategories()">Add them to the list</button></div>` : ''}
            ${this.tables.render({
                id: 'categories', title: 'Expense Categories', subtitle: 'The order here is the order in the expense form. Renaming a category updates its past expenses.',
                rows, defaultSort: { key: 'order', dir: 'asc' }, paginate: false, exportName: 'expense_categories', emptyText: 'No categories yet.',
                columns: [
                    { key: 'order', label: '#', align: 'right', value: r => r.i + 1, render: r => `<span class="text-secondary">${r.i + 1}</span>` },
                    { key: 'name', label: 'Category', render: r => this.ui.badge(r.name, r.name === 'Payroll' ? 'violet' : 'blue') },
                    { key: 'count', label: 'Expenses', align: 'right', total: 'sum', format: 'number' },
                    { key: 'total', label: 'Total Spent', align: 'right', format: 'currency', total: 'sum' },
                    { key: 'last', label: 'Last Used', render: r => r.last ? Utils.formatDate(r.last) : '<span class="text-secondary">—</span>' }
                ],
                actions: r => `<div class="row-actions">
                    ${this.ui.iconBtn(`App.settings.moveCategory(${r.i}, -1)`, 'arrow_up', 'Move up', { extraClass: r.i === 0 ? 'opacity-30 pointer-events-none' : '' })}
                    ${this.ui.iconBtn(`App.settings.moveCategory(${r.i}, 1)`, 'arrow_down', 'Move down', { extraClass: r.i === cats.length - 1 ? 'opacity-30 pointer-events-none' : '' })}
                    ${this.ui.iconBtn(`App.settings.editCategory(${r.i})`, 'edit', 'Rename category')}
                    ${this.ui.iconBtn(`App.settings.deleteCategory(${r.i})`, 'trash', 'Delete category', { danger: true })}</div>`
            })}`;
    }
    async addCategory() {
        const name = this.val('new-category');
        const cats = this.data.settings.expenseCategories;
        if (!name) return this.ui.toast('Type a category name first.', 'error');
        if (cats.some(c => Utils.sameText(c, name))) return this.ui.toast('That category already exists.', 'error');
        cats.push(name);
        await this.app.saveAndRerender();
        this.ui.toast(`Category "${name}" added.`);
    }
    editCategory(i) {
        const cats = this.data.settings.expenseCategories;
        const old = cats[i];
        if (old === undefined) return;
        const used = this.data.expenses.filter(e => e.category === old).length;
        this.app.modal.open({
            title: `Rename "${old}"`, cols: 1, submitLabel: 'Rename',
            fields: [{ key: 'name', label: 'Category name', type: 'text', value: old, required: true, hint: used ? `${used} existing expense(s) will move to the new name.` : '' }],
            onSubmit: async (v, modal) => {
                if (v.name === old) return;
                if (cats.some((c, j) => j !== i && Utils.sameText(c, v.name))) { modal.setError('Another category already has that name.'); return false; }
                cats[i] = v.name;
                this.data.expenses.forEach(e => { if (e.category === old) e.category = v.name; });
                await this.app.saveAndRerender();
                this.ui.toast(`Renamed "${old}" to "${v.name}"${used ? ` · ${used} expense(s) updated` : ''}.`);
            }
        });
    }
    async moveCategory(i, dir) {
        const cats = this.data.settings.expenseCategories;
        const j = i + dir;
        if (j < 0 || j >= cats.length) return;
        [cats[i], cats[j]] = [cats[j], cats[i]];
        await this.app.saveAndRerender();
    }
    async deleteCategory(i) {
        const cats = this.data.settings.expenseCategories;
        const name = cats[i];
        if (name === undefined) return;
        if (cats.length <= 1) return this.ui.toast('Keep at least one category.', 'error');
        const used = this.data.expenses.filter(e => e.category === name);
        if (!used.length) {
            if (!(await this.ui.confirm({ title: `Delete "${name}"?`, tone: 'danger', confirmLabel: 'Delete', message: 'This category is not used by any expense.' }))) return;
            cats.splice(i, 1);
            await this.app.saveAndRerender();
            return this.ui.toast(`Category "${name}" deleted.`);
        }
        this.app.modal.open({
            title: `Delete "${name}"?`, cols: 1, submitLabel: 'Delete Category', danger: true,
            subtitle: `${used.length} expense(s) totalling ${Utils.formatCurrency(used.reduce((a, e) => a + Utils.num(e.amount), 0))} use this category.`,
            fields: [{ key: 'target', label: 'What should happen to those expenses?', type: 'select', value: cats.find(c => c !== name),
                options: [...cats.filter(c => c !== name).map(c => ({ value: c, label: `Move them to "${c}"` })), { value: '__keep', label: `Keep the "${name}" label on them` }] }],
            onSubmit: async (v) => {
                if (v.target !== '__keep') used.forEach(e => { e.category = v.target; });
                cats.splice(cats.indexOf(name), 1);
                await this.app.saveAndRerender();
                this.ui.toast(`Category "${name}" deleted${v.target !== '__keep' ? ` · ${used.length} expense(s) moved to "${v.target}"` : ''}.`);
            }
        });
    }
    removeCategory(i) { return this.deleteCategory(i); }
    async adoptOrphanCategories() {
        const cats = this.data.settings.expenseCategories;
        [...new Set(this.data.expenses.map(e => e.category).filter(c => c && !cats.includes(c)))].forEach(c => cats.push(c));
        await this.app.saveAndRerender();
        this.ui.toast('Categories added to the list.');
    }

    // ================= APP & OFFLINE =================
    appView() {
        return `
            <div class="settings-grid">
                <div id="app-card" class="glass-panel settings-card p-4 sm:p-6">${this.appCardHtml()}</div>
                <div class="glass-panel settings-card p-4 sm:p-6">
                    <h3 class="text-white">Storage on This Device</h3>
                    <p class="card-sub">Space used by the app's offline data and photos in this browser.</p>
                    <div class="w-full bg-white/10 rounded-full h-2.5 mt-1"><div id="storage-bar" class="bg-primary h-2.5 rounded-full" style="width: 0%"></div></div>
                    <p id="storage-text" class="text-xs text-secondary text-right mt-1">Calculating...</p>
                    <div class="glass-item p-3 rounded-lg mt-4 text-sm flex items-center justify-between">
                        <span class="text-secondary">Photos stored here</span><strong class="text-white">${this.data.imageAttachments.length}</strong>
                    </div>
                    <button type="button" class="dt-btn mt-4" onclick="App.settings.resetTips()">${this.ui.icon('sync', '')}Show Tour & Welcome Again</button>
                </div>
            </div>`;
    }
    appCardHtml() {
        const pwa = this.app.pwa;
        const status = pwa.isStandalone ? this.ui.badge('Installed · running as app', 'green') : pwa.canInstall ? this.ui.badge('Ready to install', 'blue') : this.ui.badge(pwa.supported ? 'Browser tab' : 'Open via web to install', 'gray');
        return `
            <h3 class="text-white">App & Offline</h3>
            <p class="card-sub">Install Bebang BMS on your phone, tablet or computer — it opens full-screen and works offline.</p>
            <div class="glass-item p-3 rounded-lg flex items-center justify-between gap-3 mb-2"><span class="text-sm text-white">Status</span>${status}</div>
            <div class="glass-item p-3 rounded-lg flex items-center justify-between gap-3 mb-4"><span class="text-sm text-white">Version</span><span class="text-sm text-secondary">${APP_VERSION}</span></div>
            <div class="flex flex-wrap gap-2">
                ${pwa.isStandalone ? '' : `<button type="button" onclick="App.pwa.install()" class="dt-btn dt-btn-primary">${this.ui.icon('install', '')}Install App</button>`}
                <button type="button" onclick="App.pwa.checkForUpdate()" class="dt-btn">${this.ui.icon('sync', '')}Check for Updates</button>
                <button type="button" onclick="App.tour.start()" class="dt-btn">${this.ui.icon('info', '')}Replay Tour</button>
            </div>
            <p class="field-hint mt-3">Keyboard: Ctrl/⌘ + 1–9 switches tabs · Esc closes dialogs.</p>`;
    }
    refreshAppCard() { const el = document.getElementById('app-card'); if (el) el.innerHTML = this.appCardHtml(); }
    async resetTips() {
        try { localStorage.removeItem('bebang.tourDone'); localStorage.removeItem('bebang.welcome'); } catch (e) { /* ignore */ }
        this.app.welcome.resetSession();
        this.ui.toast('The welcome screen and tour suggestion will show again next time you open the app.', 'info');
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

    // ================= DATA HEALTH =================
    healthView() {
        return `<div id="data-health-card" class="glass-panel settings-card p-4 sm:p-6 max-w-4xl">
            <h3 class="text-white">Consistency Checks</h3>
            <p class="card-sub">Checks that stock numbers, references and IDs are all consistent. Problems show a button to fix or review them.</p>
            <div id="health-output">${this.healthHtml()}</div>
        </div>`;
    }
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
            ${row(!h.mismatched.length, 'Stock matches ledger', h.mismatched.length ? `${h.mismatched.length} item(s): ${Utils.esc(h.mismatched.slice(0, 4).map(s => s.itemName).join(', '))}` : '', h.mismatched.length ? `<button class="dt-btn" onclick="App.navigate('reports/stock')">Review</button>` : '')}
            ${row(!h.negative.length, 'No negative stock', h.negative.length ? Utils.esc(h.negative.map(i => `${i.name} (${Utils.formatNumber(i.stock, 4)})`).join(', ')) : '', h.negative.length ? `<button class="dt-btn" onclick="App.navigate('inventory')">Fix</button>` : '')}
            ${row(!h.orphan.length, 'All records point to existing items', h.orphan.length ? `${h.orphan.length} record(s) reference deleted items (kept as history)` : '')}
            ${row(!h.dupIds.length, 'No duplicate record IDs', h.dupIds.length ? Utils.esc(h.dupIds.slice(0, 5).join(', ')) : '', h.dupIds.length ? `<button class="dt-btn" onclick="App.settings.fixDuplicateIds()">Fix</button>` : '')}
            ${row(!h.unknownWorkers.length, 'All workers on record exist', h.unknownWorkers.length ? `Not in worker list: ${Utils.esc(h.unknownWorkers.join(', '))}` : '', h.unknownWorkers.length ? `<button class="dt-btn" onclick="App.settings.restoreUnknownWorkers()">Add as inactive</button>` : '')}
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
    /** Workers deleted earlier but still named on records come back as inactive, so they're editable again. */
    async restoreUnknownWorkers() {
        const names = this.healthChecks().unknownWorkers;
        names.forEach(n => this.data.workers.push({ id: Utils.uuid(), name: n, rate: 0, phone: '', notes: 'Restored from past records', active: false }));
        await this.app.saveAndRerender();
        this.ui.toast(`${names.length} worker(s) added as inactive — set their rate in Settings → Workers.`);
    }

    // ================= BACKUP & RESTORE =================
    static EXPORTS = [
        { key: 'inventory', label: 'Inventory' }, { key: 'salesOrders', label: 'Sales Orders' }, { key: 'purchaseOrders', label: 'Purchase Orders' },
        { key: 'manufacturingOrders', label: 'Remittances' }, { key: 'issuances', label: 'Issuances' }, { key: 'manualAdjustments', label: 'Stock Adjustments' },
        { key: 'expenses', label: 'Expenses' }, { key: 'payrollPayments', label: 'Payroll Payments' }, { key: 'workers', label: 'Workers' },
        { key: 'customers', label: 'Customers' }, { key: 'suppliers', label: 'Suppliers' }
    ];
    backupView() {
        const s = this.data.settings, cloud = this.app.store.configured;
        return `
            <div class="settings-grid">
                <div id="backup-card" class="glass-panel settings-card p-4 sm:p-6">
                    <h3 class="text-white">Full Backup</h3>
                    <p class="card-sub">${cloud ? 'Data is synced to the cloud, but a periodic backup file is still recommended.' : '<span class="text-red-300 font-semibold">Your data is only stored in this browser.</span> Export it regularly.'}
                        Last backup: <strong class="text-white">${s.lastBackupAt ? new Date(s.lastBackupAt).toLocaleString('en-PH') : 'never'}</strong></p>
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
                        <p class="text-xs text-secondary text-center mt-2">Deletes this browser's local database and reloads${cloud ? ' (shared cloud data is not touched)' : ' with the built-in starting catalog'}. <strong>Not</strong> the same as Factory Reset.</p>
                    </div>
                </div>
                <div class="glass-panel settings-card p-4 sm:p-6">
                    <h3 class="text-white">Export Tables to Excel (CSV)</h3>
                    <p class="card-sub">Download any list as a spreadsheet. Opens in Excel or Google Sheets.</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        ${SettingsPage.EXPORTS.map(x => `<button type="button" class="dt-btn justify-between" onclick="App.settings.exportCollection('${x.key}')"><span class="inline-flex items-center gap-2">${this.ui.icon('download', '')}${x.label}</span><span class="text-secondary">${this.data[x.key].length}</span></button>`).join('')}
                    </div>
                </div>
            </div>`;
    }
    exportCollection(key) {
        const meta = SettingsPage.EXPORTS.find(x => x.key === key);
        const list = this.data[key] || [];
        if (!list.length) return this.ui.toast(`No ${meta.label.toLowerCase()} to export yet.`, 'info');
        const flat = list.map(r => {
            const o = {};
            Object.entries(r).forEach(([k, v]) => {
                if (k === 'bom' && Array.isArray(v)) o[k] = v.map(b => `${(this.stock.findItem(b.material_id) || {}).name || b.material_id} ×${b.quantity}`).join('; ');
                else if (k === 'items' && Array.isArray(v)) o[k] = v.map(l => `${l.name} ×${l.qty}${l.price !== undefined ? ` @${l.price}` : l.unit_cost !== undefined ? ` @${l.unit_cost}` : ''}`).join('; ');
                else if (v !== null && typeof v === 'object') o[k] = JSON.stringify(v);
                else o[k] = v;
            });
            return o;
        });
        const headers = [...new Set(flat.flatMap(o => Object.keys(o)))];
        Utils.downloadFile(`${key}_${Utils.today()}.csv`, '﻿' + Utils.toCSV(headers, flat.map(o => headers.map(h => o[h] ?? ''))), 'text/csv;charset=utf-8');
        this.ui.toast(`Exported ${list.length} ${meta.label.toLowerCase()} to CSV.`);
    }
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
            details: [`${d.inventory.length} inventory items`, `${d.salesOrders.length} sales · ${d.purchaseOrders.length} purchase orders`, `${d.workers.length} workers · ${d.suppliers.length} suppliers · ${d.payrollPayments.length} payroll payments · ${d.expenses.length} expenses`],
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
