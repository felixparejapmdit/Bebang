/* ============================================================
   UI — shared presentational helpers (icons, toasts, badges, cards, empty states).
   Every page builds its markup from these so the look stays consistent.
   ============================================================ */
class UI {
    static ICONS = {
        dashboard: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-10v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
        procurement: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>',
        inventory: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10m0-10l-4-2m4 2l4-2m-4 2l4 2m-4-2l-4-2m4 2l4 2"/>',
        manufacturing: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.568.342 1.252.427 1.932.203z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>',
        sales: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>',
        reports: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5l2 2h3a2 2 0 012 2v10a2 2 0 01-2 2z"/>',
        costing: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
        payroll: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h5M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z"/>',
        settings: '<line x1="4" y1="6" x2="20" y2="6" stroke-linecap="round" stroke-width="2"/><circle cx="15" cy="6" r="2" stroke-width="2"/><line x1="4" y1="12" x2="20" y2="12" stroke-linecap="round" stroke-width="2"/><circle cx="9" cy="12" r="2" stroke-width="2"/><line x1="4" y1="18" x2="20" y2="18" stroke-linecap="round" stroke-width="2"/><circle cx="16" cy="18" r="2" stroke-width="2"/>',
        edit: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>',
        trash: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>',
        plus: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>',
        download: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>',
        upload: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>',
        print: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>',
        history: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>',
        photo: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>',
        image: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
        bom: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>',
        check: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>',
        sync: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>',
        menu: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>',
        install: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>',
        grid: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/>',
        pulse: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h4l3-8 4 16 3-8h4"/>',
        copy: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>',
        star: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>',
        lock: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>',
        key: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>',
        building: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>',
        users: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>',
        tag: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>',
        shield: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
        database: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>',
        chevron: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>',
        arrow_up: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>',
        arrow_down: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>',
        power: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 11-12.728 0M12 3v9"/>',
        monitor: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
        logout: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>',
        sun: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>',
        moon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>',
        alert: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>',
        user: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>',
        info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
        truck: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>',
        sales_up: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>',
        wallet: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>'
    };

    constructor() {
        this._toastStack = null;
        this.dialog = new Dialog(this);
    }

    icon(name, cls = 'w-5 h-5') {
        return `<svg class="${cls}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">${UI.ICONS[name] || UI.ICONS.info}</svg>`;
    }

    // ---------- Feedback ----------
    /** Non-blocking notification. type: success | error | info. */
    toast(message, type = 'success', { duration, actionLabel, onAction } = {}) {
        if (!this._toastStack) {
            this._toastStack = document.getElementById('toast-stack');
            if (!this._toastStack) {
                this._toastStack = document.createElement('div');
                this._toastStack.id = 'toast-stack';
                document.body.appendChild(this._toastStack);
            }
        }
        const el = document.createElement('div');
        el.className = `toast toast-${type}`;
        el.setAttribute('role', type === 'error' ? 'alert' : 'status');
        el.innerHTML = `<span class="toast-dot"></span><span class="flex-1">${Utils.esc(message)}</span>${actionLabel ? `<button class="toast-action">${Utils.esc(actionLabel)}</button>` : ''}`;
        const remove = () => { el.classList.add('toast-leave'); setTimeout(() => el.remove(), 200); };
        el.addEventListener('click', (e) => {
            if (actionLabel && e.target.closest('.toast-action') && onAction) onAction();
            remove();
        });
        this._toastStack.appendChild(el);
        // Keep the stack short: drop the oldest when more than three are showing.
        const shown = this._toastStack.querySelectorAll('.toast:not(.toast-leave)');
        if (shown.length > 3) shown[0].remove();
        const ms = duration ?? (type === 'error' ? 6500 : 3500);
        if (ms > 0) setTimeout(remove, ms);
        return el;
    }
    /** Styled replacements for window.confirm / alert / prompt — see js/ui/dialog.js. All return Promises. */
    confirm(opts) { return this.dialog.confirm(opts); }
    alert(opts) { return this.dialog.alert(opts); }
    prompt(opts) { return this.dialog.prompt(opts); }

    // ---------- Building blocks ----------
    emptyNote(msg) {
        return `<div class="empty-note">${this.icon('inventory', '')}<p>${msg}</p></div>`;
    }
    iconBtn(onclick, icon, title, { danger = false, extraClass = '' } = {}) {
        return `<button type="button" onclick="${onclick}" title="${Utils.esc(title)}" aria-label="${Utils.esc(title)}" class="icon-btn ${danger ? 'danger' : ''} ${extraClass}">${this.icon(icon, '')}</button>`;
    }
    editDeleteBtns(editCall, deleteCall, noun = 'record') {
        return `<div class="row-actions">${this.iconBtn(editCall, 'edit', `Edit ${noun}`)}${this.iconBtn(deleteCall, 'trash', `Delete ${noun}`, { danger: true })}</div>`;
    }
    badge(text, color = 'gray') { return `<span class="badge badge-${color}">${Utils.esc(text)}</span>`; }
    statusBadge(status) {
        const map = {
            'Draft': 'gray', 'Ordered': 'blue', 'Arrived': 'amber', 'Checked': 'green',
            'Pending': 'amber', 'Issued': 'blue', 'Completed': 'green',
            'Pending Delivery': 'amber', 'Delivered/Billed': 'green', 'Completed (In-Store)': 'violet',
            'Customer': 'green', 'Lead': 'blue', 'Low': 'red', 'OK': 'green'
        };
        return this.badge(status, map[status] || 'gray');
    }
    pageHeader(title, subtitle = '', actions = '') {
        return `
            <div class="page-head">
                <div class="min-w-0">
                    <h2 class="text-white section-title">${title}</h2>
                    ${subtitle ? `<p>${subtitle}</p>` : ''}
                </div>
                ${actions ? `<div class="flex flex-wrap gap-2 no-print">${actions}</div>` : ''}
            </div>`;
    }
    subNav(items, active, onclickFn) {
        return `<div class="sub-nav no-print">${items.map(t => `
            <button type="button" id="subnav-${t.key}" onclick="${onclickFn}('${t.key}')" class="sub-nav-button ${active === t.key ? 'active' : ''}">${t.label}${t.count !== undefined ? ` <span class="opacity-70">(${t.count})</span>` : ''}</button>`).join('')}
        </div>`;
    }
    metricCard(title, value, { color = 'text-white', index = 0, currency = true, icon = 'wallet', sub = '', onclick = '' } = {}) {
        const val = currency ? Utils.formatCurrency(value) : Utils.esc(value);
        const chipColors = ['from-indigo-500 to-violet-600', 'from-emerald-500 to-teal-600', 'from-amber-400 to-orange-600', 'from-sky-500 to-blue-600', 'from-rose-500 to-pink-600', 'from-fuchsia-500 to-purple-600'];
        return `
            <div class="glass-panel p-3 sm:p-5 rounded-2xl metric-card-animated min-w-0 ${onclick ? 'cursor-pointer' : ''}" ${onclick ? `onclick="${onclick}"` : ''} data-index="${index}">
                <div class="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                    <p class="text-[0.65rem] sm:text-xs font-semibold uppercase tracking-wider text-secondary">${title}</p>
                    <span class="metric-chip bg-gradient-to-br ${chipColors[index % chipColors.length]} flex-shrink-0">${this.icon(icon, '')}</span>
                </div>
                <p class="text-lg sm:text-2xl font-extrabold ${color} truncate" title="${Utils.esc(Utils.stripHtml(String(val)))}">${val}</p>
                ${sub ? `<p class="text-[0.7rem] text-secondary mt-1 truncate">${sub}</p>` : ''}
            </div>`;
    }
    /** Fades metric cards in after a render. */
    animateMetrics() {
        setTimeout(() => {
            document.querySelectorAll('.metric-card-animated').forEach((el, i) => {
                el.style.transitionDelay = `${i * 50}ms`;
                el.classList.add('visible');
            });
        }, 10);
    }
    /** A simple labelled input for inline forms. */
    field(label, inputHtml, cls = '') {
        return `<label class="block ${cls}"><span class="field-label">${label}</span>${inputHtml}</label>`;
    }
    options(list, selected, { placeholder } = {}) {
        return (placeholder !== undefined ? `<option value="">${Utils.esc(placeholder)}</option>` : '') +
            list.map(o => {
                const value = typeof o === 'object' ? o.value : o;
                const label = typeof o === 'object' ? o.label : o;
                return `<option value="${Utils.esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${Utils.esc(label)}</option>`;
            }).join('');
    }
    barChart(values, labels, { color = '', formatter = (v) => Utils.formatCurrency(v), height = 'h-44' } = {}) {
        const max = Math.max(1, ...values.map(v => Math.abs(v || 0)));
        return `
            <div class="flex items-end justify-between gap-1 sm:gap-2 ${height} pt-6">
                ${values.map((v, i) => `
                    <div class="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                        <div class="chart-bar w-full ${v < 0 ? 'bg-red-500' : color}" style="height: ${v ? Math.max(3, (Math.abs(v) / max) * 100) : 2}%;" title="${Utils.esc(labels[i])}: ${Utils.esc(formatter(v || 0))}">
                            ${v ? `<span class="chart-bar-value hidden sm:inline">${Utils.esc(formatter(v))}</span>` : ''}
                        </div>
                        <span class="text-[0.62rem] sm:text-[0.68rem] text-secondary mt-2 truncate max-w-full">${Utils.esc(labels[i])}</span>
                    </div>`).join('')}
            </div>`;
    }
}
