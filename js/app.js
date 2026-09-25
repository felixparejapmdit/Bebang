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
        this.currentTab = null;
        this._booted = false;
    }

    get data() { return this.store.data; }

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
            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
            return this._boot();
        }
        this.cloud.auth.onAuthStateChanged(async (user) => {
            const authScreen = document.getElementById('auth-screen');
            const appEl = document.getElementById('app');
            if (user) {
                authScreen.classList.add('hidden');
                appEl.classList.remove('hidden');
                this.updateStatusPill();
                if (this._booted) this.welcome.maybeShow(); // signed back in without a reload
                if (!this._booted) {
                    // Let the ID token reach Firestore's credential provider before subscribing.
                    try { await user.getIdToken(); } catch (e) { /* initDB surfaces real problems */ }
                    this._boot();
                }
            } else {
                authScreen.classList.remove('hidden');
                appEl.classList.add('hidden');
                document.getElementById('auth-email').focus();
            }
        });
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
            this.render(this.tabFromHash() || 'dashboard', { skipAnimation: true });
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
    tabFromHash() {
        const key = (location.hash || '').replace(/^#\/?/, '').split(/[/?]/)[0];
        return BebangApp.TABS.some(t => t.key === key) ? key : null;
    }
    navigate(tab) {
        if (this.welcome.isOpen) this.welcome.dismiss();
        this.render(tab, { keepScroll: false });
    }
    render(tabName = this.currentTab || 'dashboard', { skipAnimation = false, keepScroll } = {}) {
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
        const tab = BebangApp.TABS.find(t => t.key === tabName);
        document.title = `${tab ? tab.label + ' · ' : ''}${this.data.settings.businessName || 'Bebang BMS'}`;
        if (this.tabFromHash() !== tabName) history.replaceState(null, '', `#${tabName}`);
    }

    async save() { return this.store.save(); }
    async saveAndRerender() {
        await this.store.save();
        this.render(this.currentTab, { skipAnimation: true, keepScroll: true });
    }

    // ---------------- Chrome: sidebar, theme, branding, status ----------------
    renderSidebar() {
        document.getElementById('sidebar').innerHTML = BebangApp.TABS.map((t, i) => `
            <div class="tooltip-container nav-button-container" id="nav-btn-container-${t.key}">
                <button type="button" data-tab="${t.key}" data-shortcut="Ctrl + ${i + 1}" class="nav-button glass-item text-secondary w-full py-2 px-3 md:py-2.5 rounded-xl text-left flex items-center space-x-1 sm:space-x-3 text-xs sm:text-sm font-medium" aria-label="${t.label}">
                    ${this.ui.icon(t.key)}
                    <span class="nav-label-full">${t.label}</span>
                    <span class="nav-label-abbr">${t.short}</span>
                </button>
                <span class="tooltip-text">${t.label} · Ctrl/⌘ + ${i + 1}</span>
            </div>`).join('') + `<div id="sidebar-footer" class="sidebar-footer"></div>`;
        this.renderSidebarFooter();
    }

    /** First name from the signed-in account (display name, else the email's first word). */
    userDisplayName() {
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
        const name = user ? this.userDisplayName() : 'Local Mode';
        const sub = user ? user.email : (cloud ? 'Not signed in' : 'Data saved on this device');
        const initials = user ? name.slice(0, 2).toUpperCase() : '';
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
            const btn = e.target.closest('.nav-button');
            if (btn) this.navigate(btn.dataset.tab);
        });
        document.addEventListener('click', (e) => {
            const menu = this.contextMenu.el;
            if (menu && !menu.contains(e.target)) this.contextMenu.hide();
        });
        window.addEventListener('hashchange', () => {
            const tab = this.tabFromHash();
            if (tab && tab !== this.currentTab && this._booted) this.render(tab, { keepScroll: false });
        });
        window.addEventListener('online', () => { this.updateStatusPill(); this.ui.toast('Back online — syncing changes.', 'info', { duration: 2500 }); });
        window.addEventListener('offline', () => { this.updateStatusPill(); this.ui.toast("You're offline. Changes are saved on this device and sync when you reconnect.", 'info'); });
        window.matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => { if (this.themeMode === 'system') this.applyTheme(); });

        document.addEventListener('keydown', (e) => {
            if (this.ui.dialog.isOpen) return; // the dialog handles its own keys
            const meta = e.metaKey || e.ctrlKey;
            if (meta && !e.shiftKey && !e.altKey && e.key >= '1' && e.key <= '9') {
                const tab = BebangApp.TABS[parseInt(e.key, 10) - 1];
                if (tab && this._booted) { e.preventDefault(); this.navigate(tab.key); }
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
