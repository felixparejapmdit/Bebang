/* ============================================================
   PayrollPage — piece-rate pay: splints remitted × each worker's own rate,
   minus payments made = balance due. Payments are also logged as Payroll
   expenses (kept in sync on edit/delete). Includes printable payslips.
   ============================================================ */
class PayrollPage extends BasePage {
    constructor(app) {
        super(app);
        this.period = 'all';
    }

    /** All-time running balance per worker (remittances × rate − payments). */
    summary(from = '', to = '') {
        const d = this.data;
        const inRange = (date) => FinanceService.inRange(date, from, to);
        const names = new Set(d.workers.map(w => w.name));
        const rows = d.workers.map(w => ({ id: w.id, name: w.name, rate: w.rate || 0, phone: w.phone || '', active: true, inactive: w.active === false }));
        // Keep people who were deleted but still have unpaid history visible.
        [...d.manufacturingOrders.map(m => m.workerName), ...d.payrollPayments.map(p => p.workerName)].forEach(n => {
            if (n && !names.has(n)) { names.add(n); rows.push({ id: null, name: n, rate: 0, phone: '', active: false }); }
        });
        return rows.map(w => {
            const mos = d.manufacturingOrders.filter(m => m.status === 'Completed' && m.workerName === w.name && inRange(m.date));
            const splints = mos.reduce((s, m) => s + Utils.num(m.qty), 0);
            const earned = w.active ? splints * w.rate : 0;
            const paid = d.payrollPayments.filter(p => p.workerName === w.name && inRange(p.date)).reduce((s, p) => s + Utils.num(p.amount), 0);
            const lastPay = d.payrollPayments.filter(p => p.workerName === w.name).map(p => p.date).sort().pop() || '';
            return { ...w, splints, earned, paid, balance: earned - paid, lastPay, runs: mos.length };
        });
    }

    setPeriod(p) { this.period = p; this.app.render('payroll', { skipAnimation: true }); }

    render() {
        const range = this.finance.periodRange(this.period);
        const rows = this.summary(range.from, range.to);
        const allTime = this.period === 'all';
        const outstanding = this.summary().reduce((s, w) => s + Math.max(0, w.balance), 0);
        return `
            ${this.ui.pageHeader('Payroll', 'Pay = splints remitted (Manufacturing) × each worker’s own rate. Balance due is always all-time; pick a period to see what was earned and paid in it.',
                `<select class="dt-filter" onchange="App.payroll.setPeriod(this.value)" aria-label="Payroll period">
                    ${[['all', 'All Time'], ['week', 'This Week'], ['month', 'This Month'], ['lastmonth', 'Last Month'], ['year', 'This Year']].map(([k, l]) => `<option value="${k}" ${this.period === k ? 'selected' : ''}>${l}</option>`).join('')}
                </select>`)}
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                ${this.ui.metricCard(`Splints Remitted${allTime ? '' : ` (${range.label})`}`, Utils.formatNumber(rows.reduce((s, w) => s + w.splints, 0)), { currency: false, index: 0, icon: 'manufacturing' })}
                ${this.ui.metricCard(`Earned${allTime ? ' (All Workers)' : ` (${range.label})`}`, rows.reduce((s, w) => s + w.earned, 0), { color: 'text-green-400', index: 1, icon: 'sales_up' })}
                ${this.ui.metricCard(`Paid${allTime ? '' : ` (${range.label})`}`, rows.reduce((s, w) => s + w.paid, 0), { index: 3, icon: 'wallet' })}
                ${this.ui.metricCard('Outstanding Balance', outstanding, { color: outstanding > 0 ? 'text-red-400' : 'text-white', index: 4, icon: 'alert' })}
            </div>
            ${this.tables.render({
                id: 'payroll-summary', title: 'Worker Pay Summary', subtitle: allTime ? 'All-time totals.' : `Earned & paid within ${range.label}; balance column is still all-time.`,
                rows: allTime ? rows : rows.map(r => ({ ...r, balance: (this.summary().find(x => x.name === r.name) || {}).balance || 0 })),
                defaultSort: { key: 'balance', dir: 'desc' }, exportName: 'payroll_summary', emptyText: 'No workers yet. Add workers here or in Settings → Workers.',
                addButton: { label: 'Add Worker', onclick: "App.records.create('worker')" },
                columns: [
                    { key: 'name', label: 'Worker', render: r => `<span class="text-white font-bold">${Utils.esc(r.name)}</span>${r.active ? '' : ' ' + this.ui.badge('removed', 'gray')}${r.inactive ? ' ' + this.ui.badge('inactive', 'gray') : ''}` },
                    { key: 'splints', label: 'Splints Remitted', align: 'right', total: 'sum', format: 'number' },
                    { key: 'rate', label: 'Rate (₱/splint)', align: 'right', format: 'currency' },
                    { key: 'earned', label: 'Total Earned', align: 'right', format: 'currency', total: 'sum', render: r => `<span class="text-green-400">${Utils.formatCurrency(r.earned)}</span>` },
                    { key: 'paid', label: 'Total Paid', align: 'right', format: 'currency', total: 'sum' },
                    { key: 'balance', label: 'Balance Due', align: 'right', format: 'currency', total: 'sum', render: r => `<strong class="${r.balance > 0 ? 'text-red-400' : 'text-secondary'}">${Utils.formatCurrency(r.balance)}</strong>` },
                    { key: 'lastPay', label: 'Last Paid', render: r => r.lastPay ? Utils.formatDate(r.lastPay) : '<span class="text-secondary">—</span>' }
                ],
                actions: r => r.active ? `<div class="row-actions">
                    <button onclick="App.payroll.recordPayment('${r.id}')" class="bg-green-600 text-white text-xs px-3 py-1 rounded-full disabled:opacity-40" ${r.balance <= 0 ? 'disabled' : ''}>Record Payment</button>
                    ${this.ui.iconBtn(`App.payroll.printPayslip('${r.id}')`, 'print', 'Print payslip')}
                    ${this.ui.iconBtn(`App.records.edit('worker', '${r.id}')`, 'edit', 'Edit worker / rate')}
                    ${this.ui.iconBtn(`App.records.remove('worker', '${r.id}')`, 'trash', 'Delete worker', { danger: true })}</div>` : '<span class="text-xs text-secondary">history only</span>'
            })}
            <div class="mt-6">
            ${this.tables.render({
                id: 'payroll-payments', title: 'Payment History', subtitle: 'Each payment is mirrored as a Payroll expense — editing or deleting here updates both.',
                rows: this.data.payrollPayments, defaultSort: { key: 'date', dir: 'desc' }, exportName: 'payroll_payments', emptyText: 'No payments recorded yet.',
                filters: [{ key: 'w', label: 'All workers', options: [...new Set(this.data.payrollPayments.map(p => p.workerName))].sort(), test: (r, v) => r.workerName === v }],
                columns: [
                    { key: 'id', label: 'Ref', render: r => `<span class="text-secondary">${Utils.esc(r.id)}</span>` },
                    { key: 'date', label: 'Date', render: r => Utils.formatDate(r.date) },
                    { key: 'workerName', label: 'Worker', render: r => `<span class="text-white">${Utils.esc(r.workerName)}</span>` },
                    { key: 'note', label: 'Note', value: r => r.note || '' },
                    { key: 'amount', label: 'Amount', align: 'right', format: 'currency', total: 'sum' }
                ],
                actions: r => this.ui.editDeleteBtns(`App.records.edit('pay', '${r.id}')`, `App.records.remove('pay', '${r.id}')`, 'payment')
            })}
            </div>`;
    }

    afterRender() { this.ui.animateMetrics(); }

    recordPayment(workerId) {
        const w = this.data.workers.find(x => x.id === workerId);
        const s = w && this.summary().find(x => x.id === workerId);
        if (!s) return;
        this.records.create('pay', {
            workerName: w.name, amount: Utils.round(Math.max(0, s.balance), 2),
            onChange: (key, v, modal) => { if (key === 'amount') modal.setHint('amount', v.amount > s.balance ? `<span class="text-accent">More than the balance due (${Utils.formatCurrency(s.balance)}).</span>` : `Balance after payment: ${Utils.formatCurrency(s.balance - (v.amount || 0))}`); }
        });
        this.app.modal.setHint('amount', `Balance due: ${Utils.formatCurrency(s.balance)} (${Utils.formatNumber(s.splints)} splints × ${Utils.formatCurrency(s.rate)} − ${Utils.formatCurrency(s.paid)} paid)`);
    }

    printPayslip(workerId) {
        const w = this.data.workers.find(x => x.id === workerId);
        if (!w) return;
        const s = this.summary().find(x => x.id === workerId);
        const mos = this.data.manufacturingOrders.filter(m => m.status === 'Completed' && m.workerName === w.name).sort((a, b) => a.date.localeCompare(b.date));
        const pays = this.data.payrollPayments.filter(p => p.workerName === w.name).sort((a, b) => a.date.localeCompare(b.date));
        const P = this.app.printer;
        const body = `
            ${P.summaryTable([
                ['Worker', Utils.esc(w.name)], ['Rate per splint', Utils.formatCurrency(w.rate)],
                ['Splints remitted', Utils.formatNumber(s.splints)], ['Total earned', Utils.formatCurrency(s.earned)],
                ['Total paid', Utils.formatCurrency(s.paid)], ['Balance due', Utils.formatCurrency(s.balance), true]
            ])}
            <h3>Remittances</h3>${P.table(['Date', 'Ref', 'Product', 'Qty', 'Amount'], mos.map(m => [Utils.formatDate(m.date), Utils.esc(m.id), Utils.esc(m.productName), Utils.formatNumber(m.qty), Utils.formatCurrency(m.qty * w.rate)]), { right: [3, 4], footer: ['Total', '', '', Utils.formatNumber(s.splints), Utils.formatCurrency(s.earned)] })}
            <h3>Payments</h3>${P.table(['Date', 'Ref', 'Note', 'Amount'], pays.map(p => [Utils.formatDate(p.date), Utils.esc(p.id), Utils.esc(p.note || ''), Utils.formatCurrency(p.amount)]), { right: [3], footer: ['Total', '', '', Utils.formatCurrency(s.paid)] })}
            <div style="display: flex; gap: 40px; margin-top: 48px; font-size: 10pt;">
                <div style="flex: 1; border-top: 1px solid #000; padding-top: 4px;">Prepared by</div>
                <div style="flex: 1; border-top: 1px solid #000; padding-top: 4px;">Received by (${Utils.esc(w.name)})</div>
            </div>`;
        P.print(`Payslip — ${w.name}`, body);
    }
}
