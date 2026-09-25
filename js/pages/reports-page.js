/* ============================================================
   ReportsPage — Financial statements, stock summary & reconciliation,
   the full inventory ledger, sales / production analysis and expenses.
   Every table is searchable, sortable, exportable (CSV) and printable.
   ============================================================ */
class ReportsPage extends BasePage {
    static VIEWS = [
        { key: 'financial', label: 'Financial' },
        { key: 'stock', label: 'Stock & Valuation' },
        { key: 'ledger', label: 'Inventory Ledger' },
        { key: 'sales', label: 'Sales' },
        { key: 'production', label: 'Production' },
        { key: 'expenses', label: 'Expenses' }
    ];

    constructor(app) {
        super(app);
        this.view = 'financial';
        this.period = null;
        this.customFrom = '';
        this.customTo = '';
    }

    setView(view) { this.view = view; this.app.render('reports', { skipAnimation: true }); }
    afterRender() { this.ui.animateMetrics(); }

    render() {
        if (!this.period) this.period = this.data.settings.defaultReportPeriod || 'month';
        const views = ReportsPage.VIEWS.map(v => ({ ...v, count: v.key === 'expenses' ? this.data.expenses.length : undefined }));
        const body = {
            financial: () => this.financialView(), stock: () => this.stockView(), ledger: () => this.ledgerView(),
            sales: () => this.salesView(), production: () => this.productionView(), expenses: () => this.expensesView()
        }[this.view] || (() => this.financialView());
        return `
            ${this.ui.pageHeader('Reports', 'Live figures computed from your records. Use CSV / Print on any table.')}
            ${this.ui.subNav(views, this.view, 'App.reports.setView')}
            ${body()}
        `;
    }

    // ---------------- Financial ----------------
    get range() { return this.finance.periodRange(this.period, this.customFrom, this.customTo); }
    setPeriod(p) { this.period = p; this.app.render('reports', { skipAnimation: true }); }
    setCustom() {
        this.customFrom = this.val('report-from');
        this.customTo = this.val('report-to');
        this.period = 'custom';
        this.app.render('reports', { skipAnimation: true });
    }

    financialView() {
        const r = this.range;
        const s = this.finance.summary(r.from, r.to);
        const periods = [['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['lastmonth', 'Last Month'], ['quarter', 'This Quarter'], ['year', 'This Year'], ['all', 'All Time'], ['custom', 'Custom']];
        const miniTable = (title, rows, cols) => `
            <div class="glass-panel p-4 sm:p-5">
                <h4 class="font-semibold text-white mb-3">${title}</h4>
                ${rows.length === 0 ? `<p class="text-sm text-secondary">No data for this period.</p>` : `
                <div class="overflow-x-auto"><table class="dt-table min-w-full">
                    <thead><tr>${cols.map(c => `<th class="${c.right ? 'text-right' : 'text-left'}">${c.label}</th>`).join('')}</tr></thead>
                    <tbody>${rows.map(row => `<tr>${cols.map(c => `<td class="${c.right ? 'text-right' : ''} whitespace-nowrap">${c.render(row)}</td>`).join('')}</tr>`).join('')}</tbody>
                </table></div>`}
            </div>`;
        return `
            <div id="reports-generator-card" class="glass-panel p-4 sm:p-6 mb-6">
                <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-white">Financial Report</h3>
                        <p class="text-xs text-secondary">${Utils.esc(r.label)}${r.from || r.to ? ` · ${r.from ? Utils.formatDate(r.from) : '…'} to ${r.to ? Utils.formatDate(r.to) : '…'}` : ''}</p>
                    </div>
                    <div class="flex flex-wrap gap-2 no-print">
                        <select id="report-period" class="dt-filter" onchange="App.reports.setPeriod(this.value)">
                            ${periods.map(([k, l]) => `<option value="${k}" ${this.period === k ? 'selected' : ''}>${l}</option>`).join('')}
                        </select>
                        <button type="button" onclick="App.reports.setPeriod(document.getElementById('report-period').value)" class="dt-btn dt-btn-primary">Generate</button>
                        <button type="button" id="print-report-btn" onclick="App.reports.printFinancial()" class="dt-btn">${this.ui.icon('print', '')}Print Report</button>
                    </div>
                </div>
                ${this.period === 'custom' ? `
                <div class="flex flex-wrap items-end gap-2 mb-4 no-print">
                    ${this.ui.field('From', `<input type="date" id="report-from" value="${Utils.esc(this.customFrom)}" class="field-input">`)}
                    ${this.ui.field('To', `<input type="date" id="report-to" value="${Utils.esc(this.customTo)}" class="field-input">`)}
                    <button type="button" class="dt-btn dt-btn-primary mb-0.5" onclick="App.reports.setCustom()">Apply Range</button>
                </div>` : ''}
                <div id="report-output" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    ${this.ui.metricCard('Revenue', s.revenue, { color: 'text-green-400', index: 0, icon: 'sales_up', sub: `${s.orders} orders · ${Utils.formatNumber(s.unitsSold)} units` })}
                    ${this.ui.metricCard('Purchases', s.purchases, { color: 'text-amber-300', index: 2, icon: 'procurement', sub: 'Checked-in purchase orders' })}
                    ${this.ui.metricCard('Expenses', s.expenses, { color: 'text-red-400', index: 4, icon: 'wallet', sub: `${s.byCategory.length} categories` })}
                    ${this.ui.metricCard('Net Profit', s.net, { color: s.net >= 0 ? 'text-blue-400' : 'text-red-400', index: 1, icon: 'costing', sub: s.revenue ? `Margin ${Utils.formatNumber(s.net / s.revenue * 100, 1)}%` : '' })}
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <div class="glass-item p-3 rounded-lg"><p class="text-xs text-secondary">Best-Selling Item</p><p class="font-semibold text-white">${s.byProduct[0] ? `${Utils.esc(s.byProduct[0].key)} (${Utils.formatNumber(s.byProduct[0].qty)} sold)` : 'N/A'}</p></div>
                    <div class="glass-item p-3 rounded-lg"><p class="text-xs text-secondary">Top Customer</p><p class="font-semibold text-white">${s.byCustomer[0] ? `${Utils.esc(s.byCustomer[0].key)} (${Utils.formatCurrency(s.byCustomer[0].amount)})` : 'N/A'}</p></div>
                    <div class="glass-item p-3 rounded-lg"><p class="text-xs text-secondary">Most Productive Worker</p><p class="font-semibold text-white">${s.byWorker[0] ? `${Utils.esc(s.byWorker[0].key)} (${Utils.formatNumber(s.byWorker[0].qty)} splints)` : 'N/A'}</p></div>
                </div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                ${miniTable('Sales by Product', s.byProduct, [{ label: 'Product', render: x => Utils.esc(x.key) }, { label: 'Units', right: true, render: x => Utils.formatNumber(x.qty) }, { label: 'Revenue', right: true, render: x => Utils.formatCurrency(x.amount) }])}
                ${miniTable('Sales by Customer', s.byCustomer, [{ label: 'Customer', render: x => Utils.esc(x.key) }, { label: 'Orders', right: true, render: x => x.count }, { label: 'Revenue', right: true, render: x => Utils.formatCurrency(x.amount) }])}
                ${miniTable('Expenses by Category', s.byCategory, [{ label: 'Category', render: x => Utils.esc(x.key) }, { label: 'Entries', right: true, render: x => x.count }, { label: 'Amount', right: true, render: x => Utils.formatCurrency(x.amount) }])}
            </div>`;
    }

    printFinancial() {
        const r = this.range;
        const s = this.finance.summary(r.from, r.to);
        const P = this.app.printer;
        const body = `
            ${P.summaryTable([
                ['Revenue (fulfilled sales)', Utils.formatCurrency(s.revenue)],
                ['Less: Purchases (checked-in POs)', Utils.formatCurrency(s.purchases)],
                ['Less: Expenses', Utils.formatCurrency(s.expenses)],
                ['Net Profit', Utils.formatCurrency(s.net), true],
                ['Orders / Units sold', `${s.orders} / ${Utils.formatNumber(s.unitsSold)}`],
                ['Splints produced (remitted)', Utils.formatNumber(s.unitsProduced)]
            ])}
            <h3>Sales by Product</h3>${P.table(['Product', 'Units', 'Revenue'], s.byProduct.map(x => [Utils.esc(x.key), Utils.formatNumber(x.qty), Utils.formatCurrency(x.amount)]), { right: [1, 2] })}
            <h3>Sales by Customer</h3>${P.table(['Customer', 'Orders', 'Revenue'], s.byCustomer.map(x => [Utils.esc(x.key), x.count, Utils.formatCurrency(x.amount)]), { right: [1, 2] })}
            <h3>Expenses by Category</h3>${P.table(['Category', 'Entries', 'Amount'], s.byCategory.map(x => [Utils.esc(x.key), x.count, Utils.formatCurrency(x.amount)]), { right: [1, 2], footer: ['Total', '', Utils.formatCurrency(s.expenses)] })}
            <h3>Production by Worker</h3>${P.table(['Worker', 'Remittances', 'Splints'], s.byWorker.map(x => [Utils.esc(x.key), x.count, Utils.formatNumber(x.qty)]), { right: [1, 2] })}`;
        P.print(`Financial Report — ${r.label}`, body, { subtitle: r.from || r.to ? `${r.from || 'Beginning'} to ${r.to || 'today'}` : 'All records' });
    }

    // ---------------- Stock & valuation ----------------
    stockView() {
        const summary = this.stock.stockSummary();
        const mismatches = summary.filter(s => s.exists && Math.abs(s.diff) > 1e-9);
        return `
            ${mismatches.length ? `<div class="glass-panel p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
                <p class="text-sm text-accent">${this.ui.icon('alert', 'w-4 h-4 inline -mt-0.5')} ${mismatches.length} item(s) have a live stock number that doesn't match their ledger history (usually stock that was edited directly in older versions).</p>
                <button onclick="App.reports.reconcileAll()" class="dt-btn dt-btn-primary">${this.ui.icon('sync', '')}Reconcile All</button>
            </div>` : ''}
            ${this.tables.render({
                id: 'stock-summary', title: 'Current Stock Summary', subtitle: 'Total in / out from the ledger vs. the live stock number. "Reconcile" logs an adjustment for any difference.',
                rows: summary, defaultSort: { key: 'itemName', dir: 'asc' }, exportName: 'stock_summary',
                emptyText: 'No inventory items yet.',
                filters: [
                    { key: 't', label: 'All types', options: InventoryPage.TYPES.map(t => ({ value: t.key, label: t.label })), test: (r, v) => r.itemType === v },
                    { key: 'm', label: 'All rows', options: [{ value: 'mis', label: 'Mismatched only' }, { value: 'low', label: 'Low stock only' }], test: (r, v) => v === 'mis' ? Math.abs(r.diff) > 1e-9 : (r.exists && this.stock.isLowStock(this.stock.findItem(r.itemId))) }
                ],
                columns: [
                    { key: 'itemName', label: 'Item', render: r => `<span class="text-white">${Utils.esc(r.itemName)}</span>${r.exists ? '' : ' ' + this.ui.badge('deleted', 'gray')}` },
                    { key: 'itemType', label: 'Type', value: r => this.app.inventory.typeLabel(r.itemType) },
                    { key: 'qtyIn', label: 'Total In', align: 'right', value: r => r.qtyIn, render: r => `<span class="text-green-400">+${Utils.formatNumber(r.qtyIn, 4)}</span>` },
                    { key: 'qtyOut', label: 'Total Out', align: 'right', value: r => r.qtyOut, render: r => `<span class="text-red-400">−${Utils.formatNumber(r.qtyOut, 4)}</span>` },
                    { key: 'ledger', label: 'Ledger Balance', align: 'right', value: r => r.ledger, format: 'number' },
                    { key: 'live', label: 'Live Stock', align: 'right', value: r => r.live ?? '', render: r => r.exists ? `<strong class="text-white">${Utils.formatNumber(r.live, 4)}</strong> <span class="text-secondary text-xs">${Utils.esc(r.unit)}</span>` : '—' },
                    { key: 'diff', label: 'Check', align: 'center', value: r => r.diff, csv: r => r.diff, render: r => !r.exists ? '' : Math.abs(r.diff) > 1e-9 ? this.ui.badge(`Δ ${r.diff > 0 ? '+' : ''}${Utils.formatNumber(r.diff, 4)}`, 'amber') : this.ui.badge('✓', 'green') },
                    { key: 'value', label: 'Value (cost)', align: 'right', value: r => r.exists ? Math.max(0, r.live) * r.unitCost : 0, format: 'currency', total: 'sum' }
                ],
                actions: r => !r.exists ? '<span class="text-xs text-secondary">deleted</span>' : `<div class="row-actions">
                    ${Math.abs(r.diff) > 1e-9 ? `<button class="dt-btn" onclick="App.reports.reconcile('${r.itemId}')" title="Log an adjustment so the ledger matches live stock">Reconcile</button>` : ''}
                    ${this.ui.iconBtn(`App.history.open('${r.itemId}')`, 'history', 'Stock history')}
                    ${this.ui.iconBtn(`App.inventory.editItem('${r.itemId}')`, 'edit', 'Edit item')}
                    ${this.ui.iconBtn(`App.inventory.deleteItem('${r.itemId}')`, 'trash', 'Delete item', { danger: true })}</div>`
            })}`;
    }

    /** Makes the ledger explain the live stock by logging an opening-balance adjustment for the gap. */
    _reconcileItem(s) {
        const item = this.stock.findItem(s.itemId);
        if (!item || Math.abs(s.diff) < 1e-9) return false;
        this.data.manualAdjustments.push({
            id: Utils.nextId('ADJ', this.data.manualAdjustments), date: Utils.today(), itemId: item.id, itemName: item.name,
            qty: s.diff, reason: 'Reconciliation (balance brought forward)'
        });
        return true; // live stock is already correct — the adjustment only documents it
    }
    async reconcile(itemId) {
        const s = this.stock.stockSummary().find(x => x.itemId === itemId);
        if (!s || !(await this.ui.confirm({
            title: `Reconcile ${s.itemName}?`, icon: 'sync', tone: 'info', confirmLabel: 'Reconcile',
            message: `A reconciliation adjustment of ${s.diff > 0 ? '+' : ''}${Utils.formatNumber(s.diff, 4)} ${s.unit} will be logged so the ledger matches the live stock.`,
            details: [`Ledger balance: ${Utils.formatNumber(s.ledger, 4)} ${s.unit}`, `Live stock: ${Utils.formatNumber(s.live, 4)} ${s.unit} (unchanged)`]
        }))) return;
        this._reconcileItem(s);
        await this.app.saveAndRerender();
        this.ui.toast(`${s.itemName} reconciled.`);
    }
    async reconcileAll() {
        const list = this.stock.stockSummary().filter(s => s.exists && Math.abs(s.diff) > 1e-9);
        if (!list.length || !(await this.ui.confirm({
            title: `Reconcile ${list.length} item${list.length === 1 ? '' : 's'}?`, icon: 'sync', tone: 'info', confirmLabel: 'Reconcile All',
            message: 'An adjustment is logged for each item so its ledger matches the live stock. Live stock numbers are kept.',
            details: list.slice(0, 8).map(s => `${s.itemName}: ${s.diff > 0 ? '+' : ''}${Utils.formatNumber(s.diff, 4)} ${s.unit}`).concat(list.length > 8 ? [`…and ${list.length - 8} more`] : [])
        }))) return;
        list.forEach(s => this._reconcileItem(s));
        await this.app.saveAndRerender();
        this.ui.toast(`${list.length} item(s) reconciled.`);
    }

    // ---------------- Ledger ----------------
    ledgerView() {
        const events = this.stock.ledgerEvents();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const year = new Date().getFullYear();
        const live = this.finance.monthlySales(year);
        const hist = HISTORICAL_GROSS_INCOME_2026;
        const kindLabel = { po: 'Purchase', adj: 'Adjustment', mo: 'Remittance', iss: 'Issuance', so: 'Sale' };
        return `
            <div id="inventory-ledger-view">
            ${this.tables.render({
                id: 'ledger', title: 'Raw Materials & Inventory Ledger', subtitle: 'Date | Item | Qty In | Unit | Unit Cost | Total Cost | Qty Out | Qty on Hand | Remarks — running balance per item, oldest first.',
                rows: events, defaultSort: { key: 'seq', dir: 'asc' }, exportName: 'inventory_ledger', printTitle: 'Raw Materials & Inventory Ledger',
                emptyText: 'No inventory transactions logged yet. Use Procurement, Manual Stock, Manufacturing, and Sales to build your live ledger.',
                filters: [
                    { key: 't', label: 'All types', options: InventoryPage.TYPES.map(t => ({ value: t.key, label: t.label })), test: (r, v) => r.itemType === v },
                    { key: 'i', label: 'All items', options: [...new Map(events.map(e => [e.itemId, e.itemName])).entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)), test: (r, v) => r.itemId === v },
                    { key: 'k', label: 'All movements', options: Object.entries(kindLabel).map(([value, label]) => ({ value, label })), test: (r, v) => r.ref.kind === v },
                    { key: 'm', label: 'All months', options: [...new Set(events.map(e => Utils.monthKey(e.date)))].sort().reverse(), test: (r, v) => Utils.monthKey(r.date) === v }
                ],
                columns: [
                    { key: 'seq', label: '#', align: 'right', value: r => r.seq, render: r => `<span class="text-secondary">${r.seq}</span>` },
                    { key: 'date', label: 'Date', value: r => r.date },
                    { key: 'itemName', label: 'Item', render: r => `<span class="text-white">${Utils.esc(r.itemName)}</span>` },
                    { key: 'qtyIn', label: 'Qty In', align: 'right', value: r => r.qtyIn || '', render: r => r.qtyIn ? `<span class="text-green-400 font-semibold">+${Utils.formatNumber(r.qtyIn, 4)}</span>` : '<span class="text-secondary">—</span>' },
                    { key: 'unit', label: 'Unit', value: r => r.unit },
                    { key: 'unitCost', label: 'Unit Cost', align: 'right', value: r => r.unitCost, format: 'currency' },
                    { key: 'totalCost', label: 'Total Cost', align: 'right', value: r => r.totalCost, format: 'currency' },
                    { key: 'qtyOut', label: 'Qty Out', align: 'right', value: r => r.qtyOut || '', render: r => r.qtyOut ? `<span class="text-red-400 font-semibold">−${Utils.formatNumber(r.qtyOut, 4)}</span>` : '<span class="text-secondary">—</span>' },
                    { key: 'qtyOnHand', label: 'Qty on Hand', align: 'right', value: r => r.qtyOnHand, render: r => `<strong class="text-white">${Utils.formatNumber(r.qtyOnHand, 4)}</strong>` },
                    { key: 'remarks', label: 'Remarks', wrap: true, value: r => r.remarks, render: r => `<span class="text-secondary">${Utils.esc(r.remarks)}</span>` }
                ],
                actions: r => this.ui.editDeleteBtns(`App.records.edit('${r.ref.kind}', '${r.ref.id}')`, `App.records.remove('${r.ref.kind}', '${r.ref.id}')`, `source ${kindLabel[r.ref.kind].toLowerCase()}`)
            })}
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
                <div class="glass-panel p-4 sm:p-6">
                    <h4 class="text-base font-semibold text-white mb-1">2026 Gross Income — Historical (Transmittal Records)</h4>
                    <p class="text-xs text-secondary">Source: "INVENTORY january to june 2026 (raw materials).pdf" — CHART sheet. Jul–Dec not recorded in the source. Grand Total: <span class="font-bold text-green-400">${Utils.formatCurrency(hist.grandTotal)}</span></p>
                    ${this.ui.barChart(hist.values.map(v => v || 0), monthNames, { formatter: v => `₱${Math.round(v / 1000)}k` })}
                </div>
                <div class="glass-panel p-4 sm:p-6">
                    <h4 class="text-base font-semibold text-white mb-1">${year} Gross Income — Live (Your Sales)</h4>
                    <p class="text-xs text-secondary">Fulfilled sales logged in this app this year. Grand Total: <span class="font-bold text-green-400">${Utils.formatCurrency(live.reduce((a, b) => a + b, 0))}</span></p>
                    ${this.ui.barChart(live, monthNames, { formatter: v => v >= 1000 ? `₱${Math.round(v / 1000)}k` : Utils.formatCurrency(v) })}
                </div>
            </div>`;
    }

    // ---------------- Sales ----------------
    salesView() {
        const d = this.data;
        const byRecipient = {};
        d.salesOrders.forEach(so => {
            const k = so.customer_name;
            if (!byRecipient[k]) byRecipient[k] = { name: k, orders: 0, qty: 0, revenue: 0, pending: 0, last: so.date };
            const r = byRecipient[k];
            r.orders += 1;
            r.qty += so.items.reduce((s, l) => s + Utils.num(l.qty), 0);
            if (this.stock.isFulfilledSale(so)) r.revenue += Utils.num(so.total); else r.pending += Utils.num(so.total);
            if (so.date > r.last) r.last = so.date;
        });
        const byProduct = {};
        d.salesOrders.filter(so => this.stock.isFulfilledSale(so)).forEach(so => so.items.forEach(l => {
            const k = l.inv_id;
            const it = this.stock.findItem(k);
            if (!byProduct[k]) byProduct[k] = { name: it ? it.name : l.name, qty: 0, revenue: 0, orders: 0, cost: it ? it.unit_cost || 0 : 0 };
            byProduct[k].qty += Utils.num(l.qty);
            byProduct[k].revenue += Utils.num(l.qty) * Utils.num(l.price);
            byProduct[k].orders += 1;
        }));
        const months = {};
        d.salesOrders.filter(so => this.stock.isFulfilledSale(so)).forEach(so => {
            const k = Utils.monthKey(so.date);
            if (!months[k]) months[k] = { month: k, orders: 0, qty: 0, revenue: 0 };
            months[k].orders += 1;
            months[k].qty += so.items.reduce((s, l) => s + Utils.num(l.qty), 0);
            months[k].revenue += Utils.num(so.total);
        });
        return `
            <div id="sales-data-view" class="space-y-6">
            ${this.tables.render({
                id: 'rep-recipients', title: 'Deliveries by Recipient', subtitle: 'Every "Delivered To" name, aggregated — mirrors the Transmittal Out ledger’s per-recipient totals.',
                rows: Object.values(byRecipient), defaultSort: { key: 'revenue', dir: 'desc' }, exportName: 'deliveries_by_recipient', emptyText: 'No deliveries logged yet.',
                columns: [
                    { key: 'name', label: 'Delivered To', render: r => `<span class="text-white">${Utils.esc(r.name)}</span>` },
                    { key: 'orders', label: 'Orders', align: 'right', total: 'sum', format: 'number' },
                    { key: 'qty', label: 'Total Qty', align: 'right', total: 'sum', format: 'number' },
                    { key: 'revenue', label: 'Revenue (fulfilled)', align: 'right', format: 'currency', total: 'sum' },
                    { key: 'pending', label: 'Pending Value', align: 'right', format: 'currency', total: 'sum' },
                    { key: 'last', label: 'Last Delivery', render: r => Utils.formatDate(r.last) }
                ]
            })}
            <div class="grid grid-cols-1 2xl:grid-cols-2 gap-6">
            ${this.tables.render({
                id: 'rep-products', title: 'Sales by Product', subtitle: 'Fulfilled sales. Gross margin uses each item’s current unit cost.',
                rows: Object.values(byProduct), defaultSort: { key: 'revenue', dir: 'desc' }, exportName: 'sales_by_product', emptyText: 'No fulfilled sales yet.',
                columns: [
                    { key: 'name', label: 'Product', render: r => `<span class="text-white">${Utils.esc(r.name)}</span>` },
                    { key: 'qty', label: 'Units Sold', align: 'right', total: 'sum', format: 'number' },
                    { key: 'revenue', label: 'Revenue', align: 'right', format: 'currency', total: 'sum' },
                    { key: 'margin', label: 'Gross Margin', align: 'right', value: r => r.revenue - r.qty * r.cost, format: 'currency', total: 'sum' },
                    { key: 'avg', label: 'Avg Price', align: 'right', value: r => r.qty ? r.revenue / r.qty : 0, format: 'currency' }
                ]
            })}
            ${this.tables.render({
                id: 'rep-months', title: 'Sales by Month', rows: Object.values(months), defaultSort: { key: 'month', dir: 'desc' }, exportName: 'sales_by_month', emptyText: 'No fulfilled sales yet.',
                columns: [
                    { key: 'month', label: 'Month', render: r => Utils.parseDate(`${r.month}-01`).toLocaleString('en-PH', { month: 'long', year: 'numeric' }) },
                    { key: 'orders', label: 'Orders', align: 'right', total: 'sum', format: 'number' },
                    { key: 'qty', label: 'Units', align: 'right', total: 'sum', format: 'number' },
                    { key: 'revenue', label: 'Revenue', align: 'right', format: 'currency', total: 'sum' }
                ]
            })}
            </div>
            ${this.app.sales.registerTable()}
            </div>`;
    }

    // ---------------- Production ----------------
    productionView() {
        const d = this.data;
        const byWorkerSize = {};
        d.manufacturingOrders.filter(m => m.status === 'Completed').forEach(m => {
            const size = Utils.extractSize(m.productName);
            const k = `${m.workerName}|${size}`;
            if (!byWorkerSize[k]) byWorkerSize[k] = { name: m.workerName, size, units: 0, runs: 0, products: new Set(), last: m.date };
            const w = byWorkerSize[k];
            w.units += Utils.num(m.qty);
            w.runs += 1;
            w.products.add(m.productName);
            if (m.date > w.last) w.last = m.date;
        });
        const rows = Object.values(byWorkerSize).map(w => ({ ...w, products: [...w.products].join(', ') }));
        return `
            <div id="production-log-view" class="space-y-6">
            ${this.tables.render({
                id: 'rep-worker-units', title: 'Units Produced by Worker', subtitle: 'Completed remittances, grouped by worker and splint size.',
                rows, defaultSort: { key: 'name', dir: 'asc' }, exportName: 'units_by_worker', emptyText: 'No completed production runs yet.',
                filters: [{ key: 'w', label: 'All workers', options: [...new Set(rows.map(r => r.name))].sort(), test: (r, v) => r.name === v }],
                columns: [
                    { key: 'name', label: 'Worker', render: r => `<span class="text-white">${Utils.esc(r.name)}</span>` },
                    { key: 'size', label: 'Size' },
                    { key: 'units', label: 'Units Produced', align: 'right', total: 'sum', format: 'number', render: r => `<strong class="text-accent">${Utils.formatNumber(r.units)}</strong>` },
                    { key: 'runs', label: 'Remittances', align: 'right', total: 'sum', format: 'number' },
                    { key: 'products', label: 'Products Made', wrap: true },
                    { key: 'last', label: 'Last Remitted', render: r => Utils.formatDate(r.last) }
                ]
            })}
            ${this.app.manufacturing.remittanceTable()}
            ${this.app.manufacturing.materialsByWorker()}
            </div>`;
    }

    // ---------------- Expenses ----------------
    expensesView() {
        const d = this.data;
        const cats = [...new Set([...d.settings.expenseCategories, ...d.expenses.map(e => e.category)])];
        return this.tables.render({
            id: 'expenses', title: 'Expenses', subtitle: 'Operating costs (rent, utilities, logistics…). Payroll payments are added here automatically.',
            rows: d.expenses, defaultSort: { key: 'date', dir: 'desc' }, exportName: 'expenses', emptyText: 'No expenses logged yet. Click "Add Expense".',
            addButton: { label: 'Add Expense', onclick: "App.records.create('exp')" },
            filters: [
                { key: 'c', label: 'All categories', options: cats, test: (r, v) => r.category === v },
                { key: 'm', label: 'All months', options: [...new Set(d.expenses.map(e => Utils.monthKey(e.date)))].sort().reverse(), test: (r, v) => Utils.monthKey(r.date) === v }
            ],
            columns: [
                { key: 'id', label: 'Ref', render: r => `<span class="text-secondary">${Utils.esc(r.id)}</span>` },
                { key: 'date', label: 'Date', render: r => Utils.formatDate(r.date) },
                { key: 'category', label: 'Category', render: r => this.ui.badge(r.category, r.category === 'Payroll' ? 'violet' : 'blue') },
                { key: 'description', label: 'Description', wrap: true, render: r => `<span class="text-white">${Utils.esc(r.description)}</span>${r.notes ? `<span class="block text-[0.7rem] text-secondary">${Utils.esc(r.notes)}</span>` : ''}` },
                { key: 'paidTo', label: 'Paid To', value: r => r.paidTo || '' },
                { key: 'amount', label: 'Amount', align: 'right', format: 'currency', total: 'sum' }
            ],
            actions: r => this.ui.editDeleteBtns(`App.records.edit('exp', '${r.id}')`, `App.records.remove('exp', '${r.id}')`, 'expense')
        });
    }
}
