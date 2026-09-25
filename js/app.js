/* ============================================================
   BebangApp — composition root. Creates every service and page, owns the
   router (tabs + URL hash), theme, sidebar, keyboard shortcuts and boot.
   Exposed as window.App so inline handlers can call e.g. App.sales.createSO().
   ============================================================ */
class BebangApp {
    static TABS = [
        { key: 'dashboard', label: 'Dashboard', short: 'Home' },
        { key: 'procurement', label: 'Procurement', short: 'Buy' },
        { key: 'inventory', label: 'Inventory', short: 'Stock' },
        { key: 'manufacturing', label: 'Manufacturing', short: 'Make' },
        { key: 'sales', label: 'Sales', short: 'Sales' },
        { key: 'reports', label: 'Reports', short: 'Reports' },
        { key: 'costing', label: 'Costing', short: 'Cost' },
        { key: 'payroll', label: 'Payroll', short: 'Pay' },
        { key: 'settings', label: 'Settings', short: 'Settings' }
    ];

    constructor() {
        // Core services
        this.cloud = new CloudSync(FIREBASE_CONFIG);
        this.store = new DataStore(this.cloud);
        this.ui = new UI();
        this.tables = new DataTable(this);
        this.modal = new FormModal(this);
        this.printer = new Printer(this);
        this.stock = new StockService(this);
        this.finance = new FinanceService(this);
        this.records = new RecordService(this);
        this.auth = new AuthService(this, this.cloud);
        this.access = new AccessService(this, this.cloud);
        this.pwa = new PwaManager(this);
        // Widgets
        this.attachments = new AttachmentManager(this);
        this.bom = new BomEditor(this);
        this.history = new ItemHistory(this);
        this.contextMenu = new ContextMenu(this);
        this.tour = new TourGuide(this);
        this.welcome = new WelcomeScreen(this);
        // Pages (also reachable as App.<key>, e.g. App.inventory)
        this.pages = {
            dashboard: new DashboardPage(this), procurement: new ProcurementPage(this), inventory: new InventoryPage(this),
            manufacturing: new ManufacturingPage(this), sales: new SalesPage(this), reports: new ReportsPage(this),
            costing: new CostingPage(this), payroll: new PayrollPage(this), settings: new SettingsPage(this)
        };
        Object.assign(this, this.pages);
        // Role-based permissions: wrap every action once all objects exist.
        this.guard = new PermissionGuard(this);
        this.guard.install();
        this.currentTab = null;
        this._booted = false;
    }

    get data() { return this.store.data; }

    // ---------------- Permissions ----------------
    /** Local-only mode and the owner can do everything. */
    get fullAccess() { return !this.store.configured || this.access.isAdmin; }
    can(perm) { return this.access.can(perm); }
    canViewTab(tab) { return tab === 'settings' || this.can(`${tab}.view`); }
    firstAllowedTab() { return (BebangApp.TABS.find(t => this.canViewTab(t.key)) || { key: 'settings' }).key; }
    /** Role or role settings changed: rebuild the sidebar and redraw (or leave a page that's no longer allowed). */
    onPermissionsChanged() {
        this.renderSidebar();
        if (!this._booted || !this.currentTab) return;
        if (!this.canViewTab(this.currentTab)) {
            this.ui.toast("Your role no longer includes that page.", 'info');
            return this.navigate(this.firstAllowedTab(), { push: false });
        }
        if (!this.isUserBusy()) this.render(this.currentTab, { skipAnimation: true, keepScroll: true });
    }

    // ---------------- Boot ----------------
    start() {
        this.applyTheme();
        this.applySidebarPref();
        this.renderSidebar();
        this.setupEventListeners();
        this.attachments.init();
        this.pwa.init();
        this.updateStatusPill();

        if (!this.store.configured) {
            this.showScreen('app');
            return this._boot();
        }
        // Until Firebase says whether a session exists, show a splash — never the login form —
        // so a remembered session doesn't flash the login page and then jump to the dashboard.
        this.showScreen('splash', 'Checking your session…');
        this.auth.handleRedirectResult();
        this.cloud.auth.onAuthStateChanged(user => this.onAuthUser(user));
    }

    /** Which full-screen layer is visible: splash | auth | access | app. */
    showScreen(name, splashText) {
        this._screen = name;
        document.getElementById('boot-splash').classList.toggle('hidden', name !== 'splash');
        document.getElementById('auth-screen').classList.toggle('hidden', name !== 'auth');
        document.getElementById('access-screen').classList.toggle('hidden', name !== 'access');
        document.getElementById('app').classList.toggle('hidden', name !== 'app');
        if (splashText) document.getElementById('boot-splash-text').textContent = splashText;
        if (name === 'auth') setTimeout(() => { const b = document.getElementById('google-signin-btn'); if (b) b.focus(); }, 50);
    }

    async onAuthUser(user) {
        if (!user) {
            this.access.stopSelf();
            this.access.stopAdmin();
            if (this._booted) return location.reload(); // signed out: drop everything held in memory
            return this.showScreen('auth');
        }
        this.showScreen('splash', 'Checking your access…');
        try { await user.getIdToken(); } catch (e) { /* surfaced below if it matters */ }
        try {
            await this.access.ensureRecord(user);
        } catch (err) {
            // Admin can still get in if the new security rules haven't been published yet.
            if (this.access.isAdminUser(user) && err.code === 'permission-denied') { this.access.rulesMissing = true; return this.enterApp(); }
            console.error('Access check failed:', err);
            return this.showAccessScreen('error', null, err);
        }
        this.access.watchSelf(user.uid, rec => this.onAccessRecord(rec), err => {
            if (this.access.isAdminUser(user)) { this.access.rulesMissing = true; return this.enterApp(); }
            this.showAccessScreen('error', null, err);
        });
    }

    onAccessRecord(rec) {
        if ((rec && rec.status === 'approved') || this.access.isAdmin) {
            if (this._screen === 'app') return this.onPermissionsChanged(); // e.g. the owner changed their role
            return this.enterApp();
        }
        if (this._booted) return location.reload(); // access removed while using the app
        this.showAccessScreen(rec ? rec.status : 'removed', rec);
    }

    enterApp() {
        const wasWaiting = this._screen === 'access';
        this.showScreen('app');
        document.body.classList.toggle('is-admin', this.access.isAdmin);
        this.updateStatusPill();
        if (this.access.isAdmin && !this._adminStarted) { this._adminStarted = true; this.access.startAdmin(); }
        this.access.watchConfig(() => this.onPermissionsChanged());
        this.renderSidebar();
        if (wasWaiting) this.ui.toast('Your access was approved — welcome to Bebang BMS!', 'success', { duration: 6000 });
        if (!this._booted) {
            if (wasWaiting) this.welcome.resetSession();
            this._boot();
        } else {
            this.welcome.maybeShow();
        }
    }

    /** The screen a signed-in but not-yet-approved person sees. */
    showAccessScreen(state, rec, err) {
        const user = this.auth.user || {};
        const esc = Utils.esc;
        const who = `
            <div class="access-who">
                ${user.photoURL ? `<img src="${esc(user.photoURL)}" alt="" class="access-avatar" referrerpolicy="no-referrer">` : `<span class="access-avatar access-avatar-initial">${esc((user.displayName || user.email || '?').charAt(0).toUpperCase())}</span>`}
                <div class="min-w-0"><p class="text-white font-semibold truncate">${esc(user.displayName || user.email || '')}</p><p class="text-xs text-secondary truncate">${esc(user.email || '')}</p></div>
            </div>`;
        const signOutBtn = `<button type="button" class="dlg-btn dlg-btn-ghost" onclick="App.auth.signOut({ ask: false })">Use a different account</button>`;
        const views = {
            pending: {
                tone: 'warning', icon: 'history', title: 'Waiting for approval',
                body: `<p>Your request to use <strong class="text-white">${esc(this.data.settings.businessName)}</strong> has been sent to the administrator.</p><p>You can keep this page open — you'll be signed in automatically the moment it's approved.</p>`,
                meta: rec && rec.requestedAt ? `Requested ${Utils.formatDateTime(rec.requestedAt)}` : '',
                live: true,
                actions: `${signOutBtn}<button type="button" id="access-check-btn" class="dlg-btn dlg-btn-primary" onclick="App.checkAccess()">${this.ui.icon('sync', 'w-4 h-4 inline -mt-0.5')} Check Status</button>`
            },
            rejected: {
                tone: 'danger', icon: 'alert', title: 'Request declined',
                body: `<p>The administrator declined your access request.</p>${rec && rec.note ? `<p class="access-note">“${esc(rec.note)}”</p>` : ''}<p>If you think this is a mistake, you can ask again.</p>`,
                meta: rec && rec.decidedAt ? `Decided ${Utils.formatDateTime(rec.decidedAt)}` : '',
                actions: `${signOutBtn}<button type="button" class="dlg-btn dlg-btn-primary" onclick="App.requestAccessAgain()">Request Again</button>`
            },
            revoked: {
                tone: 'danger', icon: 'power', title: 'Access removed',
                body: `<p>Your access to this app was removed by the administrator.</p>${rec && rec.note ? `<p class="access-note">“${esc(rec.note)}”</p>` : ''}`,
                meta: rec && rec.decidedAt ? `Changed ${Utils.formatDateTime(rec.decidedAt)}` : '',
                actions: signOutBtn
            },
            removed: {
                tone: 'info', icon: 'info', title: 'No access request on file',
                body: '<p>Your earlier request was removed. Send a new one and the administrator will be notified.</p>',
                actions: `${signOutBtn}<button type="button" class="dlg-btn dlg-btn-primary" onclick="App.requestAccessAgain()">Request Access</button>`
            },
            error: {
                tone: 'danger', icon: 'alert', title: "Couldn't check your access",
                body: err && err.code === 'permission-denied'
                    ? "<p>The approval system hasn't been set up in Firebase yet (security rules). Please ask the administrator.</p>"
                    : `<p>${esc((err && err.message) || 'Something went wrong while checking your access.')}</p><p>Check your internet connection and try again.</p>`,
                actions: `${signOutBtn}<button type="button" class="dlg-btn dlg-btn-primary" onclick="App.onAuthUser(App.auth.user)">Try Again</button>`
            }
        };
        const v = views[state] || views.error;
        document.getElementById('access-card').innerHTML = `
            <div class="access-badge dlg-icon dlg-icon-${v.tone}">${this.ui.icon(v.icon, '')}</div>
            <h1 class="access-title">${v.title}</h1>
            <div class="access-body">${v.body}</div>
            ${who}
            ${v.live ? `<p class="access-live"><span class="pulse-dot"></span>Listening for approval… <span id="access-last-check" class="opacity-70"></span></p>` : ''}
            ${v.meta ? `<p class="text-xs text-secondary mt-2">${v.meta}</p>` : ''}
            <div class="access-actions">${v.actions}</div>`;
        document.getElementById('access-card').dataset.state = state;
        this.showScreen('access');
    }

    async checkAccess() {
        const btn = document.getElementById('access-check-btn');
        const user = this.auth.user;
        if (!user) return;
        if (btn) { btn.disabled = true; btn.textContent = 'Checking…'; }
        try {
            const rec = await this.access.checkNow(user.uid);
            if (rec && rec.status === 'approved') return this.enterApp();
            if (!rec || rec.status !== 'pending') return this.onAccessRecord(rec);
            const t = document.getElementById('access-last-check');
            if (t) t.textContent = `· last checked ${new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}`;
            this.ui.toast("Still waiting for approval — you'll be signed in automatically once it's approved.", 'info');
        } catch (err) {
            this.ui.toast(`Couldn't check right now: ${err.message}`, 'error');
        } finally {
            if (btn && document.contains(btn)) { btn.disabled = false; btn.innerHTML = `${this.ui.icon('sync', 'w-4 h-4 inline -mt-0.5')} Check Status`; }
        }
    }

    async requestAccessAgain() {
        const user = this.auth.user;
        if (!user) return;
        try {
            if (this.access.record && this.access.record.status === 'rejected') await this.access.requestAgain(user.uid);
            else await this.access.ensureRecord(user);
            this.ui.toast('Request sent. The administrator has been notified.');
        } catch (err) {
            this.ui.toast(`Couldn't send the request: ${err.message}`, 'error');
        }
    }

    /** Admin: the list of access requests changed (badges, open page, welcome numbers). */
    onAccessListChanged() {
        const n = this.access.pendingCount;
        document.querySelectorAll('[data-badge="users"]').forEach(b => { b.textContent = n; b.classList.toggle('hidden', !n); });
        const dot = document.getElementById('settings-nav-dot');
        if (dot) dot.classList.toggle('hidden', !n);
        if (this.currentTab === 'settings' && ['users', 'overview'].includes(this.settings.view) && !this.isUserBusy()) this.render('settings', { skipAnimation: true, keepScroll: true });
    }

    _boot() {
        this._booted = true;
        document.getElementById('content').innerHTML = `<div class="content-inner"><div class="empty-note mt-10"><p>Loading your data…</p></div></div>`;
        this.store.init((isFirst) => this.onData(isFirst));
    }

    /** Called when data first loads, and whenever another device changes it. */
    onData(isFirst) {
        if (isFirst) {
            this.applyBranding();
            this.applyRoute(this.routeFromHash() || 'dashboard');
            this.render(this.currentRouteTab, { skipAnimation: true });
            this.welcome.maybeShow();
            return;
        }
        if (this.isUserBusy()) return; // held in store.pendingRemote; folded in on the next render
        this.render(this.currentTab || 'dashboard', { skipAnimation: true, keepScroll: true });
        this.ui.toast('Updated with changes from another device.', 'info', { duration: 2500 });
    }

    /** True while the user is typing in a form or has a dialog open — don't redraw under them. */
    isUserBusy() {
        const a = document.activeElement;
        const typing = a && ['INPUT', 'SELECT', 'TEXTAREA'].includes(a.tagName) && document.getElementById('content').contains(a) && a.type !== 'search';
        const editing = a && a.isContentEditable;
        return !!(typing || editing || this.modal.isOpen || this.bom.productId);
    }

    // ---------------- Router ----------------
    /** Route = "tab" or "tab/section" (e.g. "settings/workers"), mirrored in the URL hash. */
    routeFromHash() { return (location.hash || '').replace(/^#\/?/, '').split('?')[0]; }
    tabFromHash() {
        const key = this.routeFromHash().split('/')[0];
        return BebangApp.TABS.some(t => t.key === key) ? key : null;
    }
    /** Applies a route's section to its page (if it has sections) and remembers the tab. */
    applyRoute(route) {
        const [tab, sub] = String(route || '').split('/');
        const key = this.pages[tab] ? tab : 'dashboard';
        const page = this.pages[key];
        if (sub !== undefined && page.setRoute) page.setRoute(sub);
        this.currentRouteTab = key;
        return key;
    }
    currentRoute() {
        const page = this.pages[this.currentTab];
        const suffix = page && page.routeSuffix ? page.routeSuffix() : '';
        return suffix ? `${this.currentTab}/${suffix}` : this.currentTab;
    }
    /** User navigation: adds a browser-history entry so Back/Forward (and Android back) move between pages. */
    navigate(route, { push = true } = {}) {
        if (this.welcome.isOpen) this.welcome.dismiss();
        const wanted = String(route || '').split('/')[0];
        if (this.pages[wanted] && !this.canViewTab(wanted)) {
            this.ui.toast("Your role doesn't include that page. Ask the administrator if you need it.", 'error');
            if (this.currentTab && this.canViewTab(this.currentTab)) return;
            route = this.firstAllowedTab();
        }
        const tab = this.applyRoute(route);
        if (tab === 'settings') this.setSettingsMenuOpen(true);
        this._pushHistory = push;
        this.render(tab, { keepScroll: false });
        this._pushHistory = false;
    }
    render(tabName = this.currentTab || 'dashboard', { skipAnimation = false, keepScroll } = {}) {
        if (String(tabName).includes('/')) tabName = this.applyRoute(tabName);
        if (this.pages[tabName] && !this.canViewTab(tabName)) tabName = this.firstAllowedTab();
        this.store.consumePendingRemote();
        const page = this.pages[tabName] || this.pages.dashboard;
        tabName = this.pages[tabName] ? tabName : 'dashboard';
        const content = document.getElementById('content');
        const sameTab = this.currentTab === tabName;
        const preserve = keepScroll ?? sameTab;
        const scrollTop = content.scrollTop;
        this.contextMenu.hide();
        if (!this.tour.isOpen) this.tour.unhighlight();

        this.currentTab = tabName;
        content.classList.toggle('no-anim', skipAnimation || sameTab);
        try {
            content.innerHTML = `<div class="content-inner">${page.render()}</div>`;
            page.afterRender();
            this.guard.apply(content);
        } catch (err) {
            console.error(`Error rendering ${tabName}:`, err);
            content.innerHTML = `<div class="content-inner"><div class="glass-panel p-6"><h2 class="text-xl font-bold text-red-400 mb-2">Something went wrong showing this page.</h2><p class="text-sm text-secondary mb-3">${Utils.esc(err.message)}</p><button class="dt-btn" onclick="App.navigate('dashboard')">Back to Dashboard</button></div></div>`;
        }
        content.scrollTop = preserve ? scrollTop : 0;
        // Keep the active sub-tab visible in horizontally scrolling sub-navs (phones).
        const activeSub = content.querySelector('.sub-nav .sub-nav-button.active');
        if (activeSub) activeSub.parentElement.scrollLeft = activeSub.offsetLeft - activeSub.parentElement.offsetLeft - 16;

        document.querySelectorAll('.nav-button').forEach(btn => {
            const active = btn.dataset.tab === tabName;
            btn.classList.toggle('nav-active', active);
            btn.classList.toggle('text-white', active);
            btn.classList.toggle('text-secondary', !active);
            btn.classList.toggle('glass-item', !active);
            btn.setAttribute('aria-current', active ? 'page' : 'false');
            if (active && window.innerWidth < 768) btn.scrollIntoView({ block: 'nearest', inline: 'center' });
        });
        document.querySelectorAll('.nav-sub-button').forEach(btn => {
            const active = tabName === btn.dataset.tab && this.pages[tabName].view === btn.dataset.sub;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-current', active ? 'page' : 'false');
        });
        const tab = BebangApp.TABS.find(t => t.key === tabName);
        document.title = `${tab ? tab.label + ' · ' : ''}${this.data.settings.businessName || 'Bebang BMS'}`;
        const route = this.currentRoute();
        if (this.routeFromHash() !== route) history[this._pushHistory && this._booted ? 'pushState' : 'replaceState'](null, '', `#${route}`);
    }

    async save() { return this.store.save(); }
    async saveAndRerender() {
        await this.store.save();
        this.render(this.currentTab, { skipAnimation: true, keepScroll: true });
    }

    // ---------------- Chrome: sidebar, theme, branding, status ----------------
    renderSidebar() {
        const open = this.settingsMenuOpen;
        document.getElementById('sidebar').innerHTML = BebangApp.TABS.map((t, i) => {
            const group = t.key === 'settings';
            return `
            <div class="tooltip-container nav-button-container ${group ? `nav-group ${open ? 'open' : ''}` : ''} ${this.canViewTab(t.key) ? '' : 'perm-hidden'}" id="nav-btn-container-${t.key}">
                <button type="button" data-tab="${t.key}" ${group ? 'data-group="settings" aria-controls="nav-sub-settings"' : ''} ${group ? `aria-expanded="${open}"` : ''} data-shortcut="Ctrl + ${i + 1}" class="nav-button glass-item text-secondary w-full py-2 px-3 md:py-2.5 rounded-xl text-left flex items-center space-x-1 sm:space-x-3 text-xs sm:text-sm font-medium" aria-label="${t.label}">
                    ${this.ui.icon(t.key)}
                    <span class="nav-label-full">${t.label}</span>
                    <span class="nav-label-abbr">${t.short}</span>
                    ${group ? `<span id="settings-nav-dot" class="nav-dot hidden" title="Access requests waiting"></span><span class="nav-chevron" aria-hidden="true">${this.ui.icon('chevron', 'w-4 h-4')}</span>` : ''}
                </button>
                <span class="tooltip-text">${t.label} · Ctrl/⌘ + ${i + 1}</span>
                ${group ? `<div class="nav-sub" id="nav-sub-settings" role="group" aria-label="Settings sections">
                    ${this.settings.sections.map((s, j, arr) => `
                        ${j === 0 || arr[j - 1].group !== s.group ? `<span class="nav-sub-heading">${s.group}</span>` : ''}
                        <button type="button" class="nav-sub-button" data-tab="settings" data-sub="${s.key}">
                            ${this.ui.icon(s.icon, 'w-4 h-4')}<span>${s.label}</span><span class="nav-sub-badge hidden" data-badge="${s.key}"></span>
                        </button>`).join('')}
                </div>` : ''}
            </div>`;
        }).join('') + `<div id="sidebar-footer" class="sidebar-footer"></div>`;
        this.renderSidebarFooter();
        if (this.access) this.onAccessListChanged();
    }

    get settingsMenuOpen() {
        try { return localStorage.getItem('bebang.settingsMenu') !== 'closed'; } catch (e) { return true; }
    }
    setSettingsMenuOpen(open) {
        try { localStorage.setItem('bebang.settingsMenu', open ? 'open' : 'closed'); } catch (e) { /* ignore */ }
        const group = document.getElementById('nav-btn-container-settings');
        if (!group) return;
        group.classList.toggle('open', open);
        const btn = group.querySelector('.nav-button');
        if (btn) btn.setAttribute('aria-expanded', open);
    }
    /** Desktop sidebar with labels (where the dropdown is shown), vs. phone bottom nav / icon-only sidebar. */
    get sidebarExpanded() {
        return window.innerWidth >= 768 && !document.getElementById('app').classList.contains('sidebar-collapsed');
    }

    get localDisplayName() { try { return localStorage.getItem('bebang.displayName') || ''; } catch (e) { return ''; } }
    setLocalDisplayName(name) {
        try { if (name) localStorage.setItem('bebang.displayName', name); else localStorage.removeItem('bebang.displayName'); } catch (e) { /* ignore */ }
        this.renderSidebarFooter();
    }

    /** Name to greet: the one set on this device, else the account's display name / email's first word. */
    userDisplayName() {
        if (this.localDisplayName) return this.localDisplayName;
        const user = this.auth.user;
        if (!user) return '';
        if (user.displayName) return user.displayName.split(' ')[0];
        const local = (user.email || '').split('@')[0].split(/[._\-\d]/)[0];
        return local ? local.charAt(0).toUpperCase() + local.slice(1) : 'User';
    }

    /** Bottom of the desktop sidebar: who is signed in, theme mode, and log out. */
    renderSidebarFooter() {
        const el = document.getElementById('sidebar-footer');
        if (!el) return;
        const user = this.auth.user;
        const cloud = this.store.configured;
        const name = this.userDisplayName() || 'Local Mode';
        const sub = user ? user.email : (cloud ? 'Not signed in' : 'Data saved on this device');
        const words = name.trim().split(/\s+/);
        const initials = (user || this.localDisplayName) ? (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase() : '';
        const mode = this.themeMode;
        const modes = [['dark', 'moon', 'Dark'], ['light', 'sun', 'Light'], ['system', 'monitor', 'Auto']];
        const next = { dark: 'light', light: 'system', system: 'dark' }[mode] || 'dark';
        const current = modes.find(m => m[0] === mode) || modes[0];
        el.innerHTML = `
            <div class="sidebar-user" title="${Utils.esc(user ? user.email : sub)}">
                <span class="sidebar-avatar">${initials ? Utils.esc(initials) : this.ui.icon('user', 'w-4 h-4')}</span>
                <span class="sidebar-user-text">
                    <span class="sidebar-user-name text-white">${Utils.esc(name)}</span>
                    <span class="sidebar-user-email">${Utils.esc(sub)}</span>
                    ${user && this.access.enabled ? `<span class="sidebar-role badge badge-${this.access.roleColor(this.access.myRoleId)}">${Utils.esc(this.access.roleName(this.access.myRoleId))}</span>` : ''}
                </span>
            </div>
            <div class="seg sidebar-theme" role="group" aria-label="Theme mode">
                ${modes.map(([k, icon, label]) => `<button type="button" class="${mode === k ? 'active' : ''}" onclick="App.setTheme('${k}')" title="${label} theme" aria-pressed="${mode === k}">${this.ui.icon(icon, 'w-3.5 h-3.5')}<span>${label}</span></button>`).join('')}
            </div>
            <button type="button" class="sidebar-theme-cycle header-icon-btn text-secondary" onclick="App.setTheme('${next}')" title="Theme: ${current[2]} (click to change)" aria-label="Change theme">${this.ui.icon(current[1], '')}</button>
            ${cloud && user ? `<button type="button" id="sidebar-logout" class="sidebar-logout" onclick="App.auth.signOut()" title="Log out">${this.ui.icon('logout', 'w-4 h-4')}<span class="sidebar-logout-label">Log out</span></button>` : ''}`;
    }

    get themeMode() {
        try { return localStorage.getItem('bebang.theme') || this.data.theme || 'dark'; } catch (e) { return 'dark'; }
    }
    setTheme(mode) {
        try { localStorage.setItem('bebang.theme', mode); } catch (e) { /* private mode */ }
        this.applyTheme();
        if (this.currentTab === 'settings') this.render('settings', { skipAnimation: true, keepScroll: true });
    }
    applyTheme() {
        const mode = this.themeMode;
        const dark = mode === 'system' ? !window.matchMedia('(prefers-color-scheme: light)').matches : mode !== 'light';
        document.body.classList.toggle('dark-theme', dark);
        document.body.classList.toggle('light-theme', !dark);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', dark ? '#0f172a' : '#eef2f7');
        const icon = document.getElementById('theme-toggle-icon');
        if (icon) icon.innerHTML = UI.ICONS[dark ? 'sun' : 'moon'];
        this.renderSidebarFooter();
    }
    toggleTheme() { this.setTheme(document.body.classList.contains('dark-theme') ? 'light' : 'dark'); }

    applySidebarPref() {
        let collapsed = false;
        try { collapsed = localStorage.getItem('bebang.sidebar') === 'collapsed'; } catch (e) { /* ignore */ }
        document.getElementById('app').classList.toggle('sidebar-collapsed', collapsed);
    }
    toggleSidebar() {
        const appEl = document.getElementById('app');
        const collapsed = !appEl.classList.contains('sidebar-collapsed');
        appEl.classList.add('sidebar-animating');
        clearTimeout(this._sidebarAnim);
        this._sidebarAnim = setTimeout(() => appEl.classList.remove('sidebar-animating'), 260);
        appEl.classList.toggle('sidebar-collapsed', collapsed);
        try { localStorage.setItem('bebang.sidebar', collapsed ? 'collapsed' : 'open'); } catch (e) { /* ignore */ }
    }

    applyBranding() {
        const s = this.data.settings;
        document.getElementById('header-title').textContent = s.businessName || DEFAULT_SETTINGS.businessName;
        document.getElementById('header-tagline').textContent = s.businessTagline || '';
    }

    updateStatusPill() {
        const pill = document.getElementById('status-pill');
        const text = document.getElementById('session-status-pill');
        if (!pill || !text) return;
        const online = navigator.onLine;
        pill.classList.toggle('offline', !online);
        pill.classList.toggle('local', online && !this.store.configured);
        if (!online) text.textContent = 'Offline — saved on device';
        else if (!this.store.configured) text.textContent = 'Local mode';
        else text.textContent = (this.auth.user && this.auth.user.email) || 'Synced';
        this.renderSidebarFooter();
        const badge = document.getElementById('settings-net-badge');
        if (badge) badge.innerHTML = online ? this.ui.badge('Online · syncing', 'green') : this.ui.badge('Offline · changes queued', 'amber');
    }

    // ---------------- Events ----------------
    setupEventListeners() {
        document.getElementById('sidebar').addEventListener('click', (e) => {
            const sub = e.target.closest('.nav-sub-button');
            if (sub) return this.navigate(`${sub.dataset.tab}/${sub.dataset.sub}`);
            const btn = e.target.closest('.nav-button');
            if (!btn) return;
            if (btn.dataset.group && this.sidebarExpanded) {
                // Already in Settings: the button just opens/closes its dropdown.
                if (this.currentTab === 'settings') return this.setSettingsMenuOpen(!this.settingsMenuOpen);
                return this.navigate('settings/overview');
            }
            this.navigate(btn.dataset.group ? 'settings/overview' : btn.dataset.tab);
        });
        document.addEventListener('click', (e) => {
            const menu = this.contextMenu.el;
            if (menu && !menu.contains(e.target)) this.contextMenu.hide();
        });
        window.addEventListener('hashchange', () => {
            const route = this.routeFromHash();
            if (!this.tabFromHash() || route === this.currentRoute() || !this._booted) return;
            // Back/Forward to a link without a section (e.g. "#settings") means that page's default section.
            const [tab, sub] = route.split('/');
            if (sub === undefined && this.pages[tab] && this.pages[tab].setRoute) this.pages[tab].setRoute('');
            this.navigate(route, { push: false });
        });
        window.addEventListener('online', () => { this.updateStatusPill(); this.ui.toast('Back online — syncing changes.', 'info', { duration: 2500 }); });
        window.addEventListener('offline', () => { this.updateStatusPill(); this.ui.toast("You're offline. Changes are saved on this device and sync when you reconnect.", 'info'); });
        window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => { if (this.themeMode === 'system') this.applyTheme(); });

        document.addEventListener('keydown', (e) => {
            if (this.ui.dialog.isOpen) return; // the dialog handles its own keys
            const meta = e.metaKey || e.ctrlKey;
            if (meta && !e.shiftKey && !e.altKey && e.key >= '1' && e.key <= '9') {
                const tab = BebangApp.TABS[parseInt(e.key, 10) - 1];
                if (tab && this._booted) { e.preventDefault(); if (this.canViewTab(tab.key)) this.navigate(tab.key); }
                return;
            }
            if (this.tour.isOpen) {
                if (e.key === 'Escape') this.tour.close();
                else if (e.key === 'ArrowRight') { e.preventDefault(); this.tour.next(); }
                else if (e.key === 'ArrowLeft') { e.preventDefault(); this.tour.prev(); }
                return;
            }
            if (this.welcome.isOpen && !this.modal.isOpen) {
                if (e.key === 'Escape') this.welcome.dismiss();
                return;
            }
            if (e.key === 'Escape') {
                if (this.modal.isOpen) this.modal.close();
                else if (this.bom.productId) this.bom.close();
                else if (this.attachments.el.classList.contains('visible')) this.attachments.close();
                else if (document.getElementById('inventory-log-modal').classList.contains('visible')) this.history.close();
                this.contextMenu.hide();
            }
        });
    }
}

// ---------------- Launch ----------------
window.App = new BebangApp();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => window.App.start());
else window.App.start();
