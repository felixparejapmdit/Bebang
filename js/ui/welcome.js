/* ============================================================
   WelcomeScreen — the greeting shown right after signing in (and once per
   app session in local mode): time-of-day greeting, live clock, today's key
   numbers, things that need attention, quick actions, and a getting-started
   checklist for a brand-new setup. Can be turned off per device in Settings.
   ============================================================ */
class WelcomeScreen {
    static PREF_KEY = 'bebang.welcome';          // 'off' disables it on this device
    static SESSION_KEY = 'bebang.welcomed';      // shown once per browser session

    constructor(app) {
        this.app = app;
        this._clock = null;
    }
    get el() { return document.getElementById('welcome-screen'); }
    get isOpen() { return this.el && !this.el.classList.contains('hidden'); }

    get enabled() { try { return localStorage.getItem(WelcomeScreen.PREF_KEY) !== 'off'; } catch (e) { return true; } }
    setEnabled(on) {
        try { localStorage.setItem(WelcomeScreen.PREF_KEY, on ? 'on' : 'off'); } catch (e) { /* private mode */ }
    }
    /** Called on explicit sign-in / sign-out so the next load greets the user again. */
    resetSession() { try { sessionStorage.removeItem(WelcomeScreen.SESSION_KEY); } catch (e) { /* ignore */ } }

    maybeShow() {
        let seen = false;
        try { seen = sessionStorage.getItem(WelcomeScreen.SESSION_KEY) === '1'; } catch (e) { /* ignore */ }
        if (!this.enabled || seen) return;
        this.show();
    }

    // ---------- content ----------
    greeting() {
        const h = new Date().getHours();
        if (h < 5) return { text: 'Working late', emoji: '🌙' };
        if (h < 12) return { text: 'Good morning', emoji: '☀️' };
        if (h < 18) return { text: 'Good afternoon', emoji: '🌤️' };
        return { text: 'Good evening', emoji: '🌆' };
    }
    displayName() { return this.app.userDisplayName(); }

    stats() {
        const d = this.app.data, stock = this.app.stock, fin = this.app.finance;
        const today = Utils.today();
        const todaySales = fin.sales(today, today);
        const monthStart = Utils.dateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
        const month = fin.summary(monthStart, today);
        const pending = d.salesOrders.filter(s => s.status === 'Pending Delivery');
        const low = d.inventory.filter(i => stock.isLowStock(i));
        const out = low.filter(i => i.stock <= 0);
        const payroll = this.app.payroll.summary().reduce((s, w) => s + Math.max(0, w.balance), 0);
        const remittedToday = d.manufacturingOrders.filter(m => m.date === today && m.status === 'Completed').reduce((s, m) => s + Utils.num(m.qty), 0);
        return {
            todaySales: todaySales.reduce((s, o) => s + Utils.num(o.total), 0), todayOrders: todaySales.length,
            month, pending, low, out, payroll, remittedToday,
            arrivedPOs: d.purchaseOrders.filter(p => p.status === 'Arrived'),
            pendingIss: d.issuances.filter(i => i.status === 'Pending')
        };
    }

    alerts(s) {
        const list = [];
        const waiting = this.app.access.isAdmin ? this.app.access.pendingCount : 0;
        if (waiting) list.push({ icon: 'key', color: 'violet', text: `${waiting} access request${waiting === 1 ? '' : 's'} waiting for your approval`, tab: 'settings/users' });
        if (s.pending.length) list.push({ icon: 'truck', color: 'amber', text: `${s.pending.length} deliver${s.pending.length === 1 ? 'y' : 'ies'} waiting to be fulfilled (${Utils.formatCurrency(s.pending.reduce((a, o) => a + (o.total || 0), 0))})`, tab: 'sales' });
        if (s.arrivedPOs.length) list.push({ icon: 'procurement', color: 'blue', text: `${s.arrivedPOs.length} purchase order${s.arrivedPOs.length === 1 ? ' has' : 's have'} arrived — check the stock in`, tab: 'procurement' });
        if (s.out.length) list.push({ icon: 'alert', color: 'red', text: `${s.out.length} item${s.out.length === 1 ? ' is' : 's are'} out of stock${s.out.length <= 3 ? `: ${s.out.map(i => i.name).join(', ')}` : ''}`, tab: 'inventory' });
        else if (s.low.length) list.push({ icon: 'alert', color: 'amber', text: `${s.low.length} item${s.low.length === 1 ? ' is' : 's are'} at or below the reorder level`, tab: 'inventory' });
        if (s.pendingIss.length) list.push({ icon: 'manufacturing', color: 'violet', text: `${s.pendingIss.length} issuance${s.pendingIss.length === 1 ? '' : 's'} not yet handed to workers`, tab: 'manufacturing' });
        if (s.payroll > 0) list.push({ icon: 'payroll', color: 'violet', text: `${Utils.formatCurrency(s.payroll)} payroll balance due to workers`, tab: 'payroll' });
        if (!this.app.store.configured) {
            const last = this.app.data.settings.lastBackupAt;
            const days = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;
            if (last === null || days >= (this.app.data.settings.backupReminderDays || 7)) list.push({ icon: 'download', color: 'red', text: last ? `Last backup was ${days} days ago` : 'No backup exported yet — data lives only in this browser', action: 'App.welcome.dismiss(); App.settings.exportBackup()' });
        }
        return list;
    }

    /** Checklist for a fresh setup — disappears once the basics are in place. */
    setupSteps() {
        const d = this.app.data;
        const steps = [
            { done: d.settings.businessName !== DEFAULT_SETTINGS.businessName || !!d.settings.phone || !!d.settings.address, text: 'Fill in your business profile', tab: 'settings/profile' },
            { done: d.workers.length > 0, text: 'Add your workers and their rates', tab: 'settings/workers' },
            { done: d.inventory.some(i => i.stock > 0) || d.manualAdjustments.length > 0, text: 'Log your opening stock', tab: 'inventory' },
            { done: d.salesOrders.length > 0, text: 'Record your first sale', tab: 'sales' }
        ];
        return steps.filter(s => s.done).length === steps.length ? null : steps;
    }

    render() {
        const ui = this.app.ui, s = this.stats(), g = this.greeting(), name = this.displayName();
        const settings = this.app.data.settings;
        const alerts = this.alerts(s);
        const setup = this.setupSteps();
        const tourDone = (() => { try { return localStorage.getItem('bebang.tourDone') === '1'; } catch (e) { return false; } })();
        const stat = (label, value, sub, icon, tab, color, i) => `
            <button type="button" onclick="App.welcome.go('${tab}')" class="welcome-stat glass-item text-left" style="animation-delay:${0.25 + i * 0.07}s">
                <span class="welcome-stat-icon welcome-${color}">${ui.icon(icon, '')}</span>
                <span class="block text-[0.68rem] uppercase tracking-wider text-secondary font-semibold mt-3">${label}</span>
                <span class="block text-xl sm:text-2xl font-extrabold text-white mt-0.5 truncate">${value}</span>
                <span class="block text-[0.72rem] text-secondary mt-0.5 truncate">${sub}</span>
            </button>`;
        const action = (label, emoji, call) => `<button type="button" onclick="${call}" class="welcome-action">${emoji}<span>${label}</span></button>`;

        return `
            <div class="welcome-orb welcome-orb-1"></div><div class="welcome-orb welcome-orb-2"></div><div class="welcome-orb welcome-orb-3"></div>
            <div class="welcome-card glass-panel" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
                <div class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 welcome-rise" style="animation-delay:.05s">
                    <div class="welcome-logo">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10l2-2m-2-6h16a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2zm4 4h4m-4 4h4m-4 4h4"></path></svg>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm text-secondary">${Utils.esc(settings.businessName)}</p>
                        <h2 id="welcome-title" class="welcome-title">${g.text}${name ? `, ${Utils.esc(name)}` : ''} <span class="welcome-wave">${g.emoji}</span></h2>
                        <p class="text-sm text-secondary mt-1">${new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · <span id="welcome-clock">${this.clockText()}</span>${this.app.auth.user ? ` · signed in as <span class="text-white">${Utils.esc(this.app.auth.user.email)}</span>` : ''}</p>
                    </div>
                </div>

                <p class="text-xs font-semibold uppercase tracking-wider text-secondary mt-7 mb-3 welcome-rise" style="animation-delay:.18s">Today at a glance</p>
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    ${this.app.can('reports.financial')
                        ? stat('Sales today', Utils.formatCurrency(s.todaySales), `${s.todayOrders} order${s.todayOrders === 1 ? '' : 's'} · month ${Utils.formatCurrency(s.month.revenue)}`, 'sales_up', 'sales', 'green', 0)
                        : stat('Sales today', `${s.todayOrders} order${s.todayOrders === 1 ? '' : 's'}`, `${s.month.orders} this month`, 'sales_up', 'sales', 'green', 0)}
                    ${stat('Remitted today', `${Utils.formatNumber(s.remittedToday)} splints`, `${Utils.formatNumber(s.month.unitsProduced)} this month`, 'manufacturing', 'manufacturing', 'violet', 1)}
                    ${stat('Pending deliveries', s.pending.length, Utils.formatCurrency(s.pending.reduce((a, o) => a + (o.total || 0), 0)), 'truck', 'sales', 'amber', 2)}
                    ${stat('Low-stock items', s.low.length, s.out.length ? `${s.out.length} out of stock` : 'All in stock', 'alert', 'inventory', s.low.length ? 'red' : 'blue', 3)}
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-6">
                    <div class="lg:col-span-3 welcome-rise" style="animation-delay:.5s">
                        ${setup ? `
                            <p class="text-xs font-semibold uppercase tracking-wider text-secondary mb-3">Getting started · ${setup.filter(x => x.done).length}/${setup.length}</p>
                            <div class="space-y-2">
                                ${setup.map(st => `
                                    <button type="button" onclick="App.welcome.go('${st.tab}')" class="welcome-alert glass-item w-full text-left ${st.done ? 'opacity-60' : ''}">
                                        <span class="welcome-check ${st.done ? 'done' : ''}">${st.done ? '✓' : ''}</span>
                                        <span class="flex-1 text-sm ${st.done ? 'line-through text-secondary' : 'text-white'}">${st.text}</span>
                                        ${st.done ? '' : '<span class="text-secondary">›</span>'}
                                    </button>`).join('')}
                            </div>` : `
                            <p class="text-xs font-semibold uppercase tracking-wider text-secondary mb-3">Needs your attention</p>
                            ${alerts.length ? `<div class="space-y-2">${alerts.slice(0, 5).map(a => `
                                <button type="button" onclick="${a.action || `App.welcome.go('${a.tab}')`}" class="welcome-alert glass-item w-full text-left">
                                    <span class="welcome-stat-icon welcome-${a.color} !w-8 !h-8">${ui.icon(a.icon, '')}</span>
                                    <span class="flex-1 text-sm text-white">${Utils.esc(a.text)}</span>
                                    <span class="text-secondary">›</span>
                                </button>`).join('')}</div>` : `
                                <div class="welcome-alert glass-item"><span class="welcome-check done">✓</span><span class="text-sm text-white">All caught up — nothing needs attention right now. 🎉</span></div>`}`}
                    </div>
                    <div class="lg:col-span-2 welcome-rise" style="animation-delay:.6s">
                        <p class="text-xs font-semibold uppercase tracking-wider text-secondary mb-3">Quick actions</p>
                        <div class="grid grid-cols-2 gap-2">
                            ${action('Log Sale', '💵', "App.welcome.go('sales')")}
                            ${action('Log Production', '⚡', "App.welcome.go('manufacturing')")}
                            ${action('New Purchase', '📦', "App.welcome.go('procurement')")}
                            ${action('Add Expense', '🧾', "App.welcome.dismiss(); App.records.create('exp')")}
                        </div>
                    </div>
                </div>

                <div class="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 mt-7 pt-5 border-t border-white/10 welcome-rise" style="animation-delay:.7s">
                    <label class="flex items-center gap-2 text-xs text-secondary cursor-pointer select-none">
                        <input type="checkbox" id="welcome-show-again" ${this.enabled ? 'checked' : ''} onchange="App.welcome.setEnabled(this.checked)" class="w-4 h-4 rounded">
                        Show this welcome screen when I open the app
                    </label>
                    <div class="flex flex-wrap gap-2 sm:justify-end">
                        ${tourDone ? '' : `<button type="button" onclick="App.welcome.dismiss(); App.tour.start()" class="dt-btn">${ui.icon('info', '')}Take the Tour</button>`}
                        <button type="button" id="welcome-continue" onclick="App.welcome.go('dashboard')" class="welcome-cta">Go to Dashboard <span aria-hidden="true">→</span></button>
                    </div>
                </div>
            </div>`;
    }

    clockText() { return new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }); }

    show() {
        const el = this.el;
        if (!el) return;
        try { sessionStorage.setItem(WelcomeScreen.SESSION_KEY, '1'); } catch (e) { /* ignore */ }
        clearTimeout(this._leaveTimer); // a close still animating out must not hide this new showing
        el.innerHTML = this.render();
        el.classList.remove('hidden', 'welcome-leave');
        clearInterval(this._clock);
        this._clock = setInterval(() => { const c = document.getElementById('welcome-clock'); if (c) c.textContent = this.clockText(); }, 15000);
        setTimeout(() => { const b = document.getElementById('welcome-continue'); if (b && this.isOpen) b.focus(); }, 400);
    }

    dismiss() {
        const el = this.el;
        if (!this.isOpen) return;
        clearInterval(this._clock);
        el.classList.add('welcome-leave');
        this._leaveTimer = setTimeout(() => { el.classList.add('hidden'); el.classList.remove('welcome-leave'); el.innerHTML = ''; }, 320);
    }

    go(tab) {
        this.dismiss();
        this.app.navigate(tab);
    }
}
