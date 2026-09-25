/* ============================================================
   FinanceService — every money figure (dashboard, reports, printouts) comes
   from here, so they always agree with each other.
     Revenue   = fulfilled sales only (Delivered/Billed + In-Store); pending deliveries excluded
     Purchases = cost of checked-in purchase orders (by check-in date)
     Expenses  = logged expenses (payroll payments are logged here automatically)
     Net       = Revenue − Purchases − Expenses
   ============================================================ */
class FinanceService {
    constructor(app) { this.app = app; }
    get data() { return this.app.data; }

    static inRange(date, from, to) { return (!from || date >= from) && (!to || date <= to); }

    sales(from, to) { return this.data.salesOrders.filter(so => this.app.stock.isFulfilledSale(so) && FinanceService.inRange(so.date, from, to)); }
    purchaseDate(po) { return po.checkedDate || po.date; }
    poTotal(po) { return po.items.reduce((s, l) => s + Utils.num(l.qty) * Utils.num(l.unit_cost), 0); }
    purchases(from, to) { return this.data.purchaseOrders.filter(po => po.status === 'Checked' && FinanceService.inRange(this.purchaseDate(po), from, to)); }
    expenses(from, to) { return this.data.expenses.filter(e => FinanceService.inRange(e.date, from, to)); }

    summary(from, to) {
        const sales = this.sales(from, to);
        const pos = this.purchases(from, to);
        const exps = this.expenses(from, to);
        const revenue = sales.reduce((s, o) => s + Utils.num(o.total), 0);
        const purchases = pos.reduce((s, po) => s + this.poTotal(po), 0);
        const expenses = exps.reduce((s, e) => s + Utils.num(e.amount), 0);
        const group = (list, keyFn, valFn) => {
            const m = {};
            list.forEach(x => { const k = keyFn(x); if (!m[k]) m[k] = { key: k, qty: 0, amount: 0, count: 0 }; const v = valFn(x); m[k].qty += v.qty || 0; m[k].amount += v.amount || 0; m[k].count += 1; });
            return Object.values(m).sort((a, b) => b.amount - a.amount || b.qty - a.qty);
        };
        const lines = sales.flatMap(o => o.items.map(l => ({ ...l, so: o })));
        const production = this.data.manufacturingOrders.filter(m => m.status === 'Completed' && FinanceService.inRange(m.date, from, to));
        return {
            from, to, revenue, purchases, expenses, net: revenue - purchases - expenses,
            orders: sales.length, unitsSold: lines.reduce((s, l) => s + Utils.num(l.qty), 0),
            byProduct: group(lines, l => l.name, l => ({ qty: Utils.num(l.qty), amount: Utils.num(l.qty) * Utils.num(l.price) })),
            byCustomer: group(sales, o => o.customer_name, o => ({ qty: o.items.reduce((s, l) => s + Utils.num(l.qty), 0), amount: Utils.num(o.total) })),
            byCategory: group(exps, e => e.category || 'Other', e => ({ amount: Utils.num(e.amount) })),
            byWorker: group(production, m => m.workerName, m => ({ qty: Utils.num(m.qty), amount: 0 })).sort((a, b) => b.qty - a.qty),
            unitsProduced: production.reduce((s, m) => s + Utils.num(m.qty), 0),
            pendingDeliveries: this.data.salesOrders.filter(so => so.status === 'Pending Delivery' && FinanceService.inRange(so.date, from, to))
        };
    }

    monthlySales(year) {
        const totals = Array(12).fill(0);
        this.sales(`${year}-01-01`, `${year}-12-31`).forEach(so => { totals[Utils.parseDate(so.date).getMonth()] += Utils.num(so.total); });
        return totals;
    }

    /** Resolves a named period (today/week/month/quarter/year/all) to a {from, to, label} date range. */
    periodRange(period, customFrom, customTo) {
        const now = new Date();
        const today = Utils.today();
        const y = now.getFullYear(), m = now.getMonth();
        switch (period) {
            case 'today': return { from: today, to: today, label: `Today (${Utils.formatDate(today)})` };
            case 'week': {
                const start = new Date(y, m, now.getDate() - now.getDay());
                return { from: Utils.dateStr(start), to: today, label: `This Week (from ${Utils.formatDate(Utils.dateStr(start))})` };
            }
            case 'month': return { from: Utils.dateStr(new Date(y, m, 1)), to: today, label: now.toLocaleString('en-PH', { month: 'long', year: 'numeric' }) };
            case 'lastmonth': {
                const s = new Date(y, m - 1, 1), e = new Date(y, m, 0);
                return { from: Utils.dateStr(s), to: Utils.dateStr(e), label: s.toLocaleString('en-PH', { month: 'long', year: 'numeric' }) };
            }
            case 'quarter': {
                const q = Math.floor(m / 3);
                return { from: Utils.dateStr(new Date(y, q * 3, 1)), to: today, label: `Q${q + 1} ${y}` };
            }
            case 'year': return { from: `${y}-01-01`, to: today, label: `Year ${y}` };
            case 'custom': return { from: customFrom || '', to: customTo || '', label: `${customFrom ? Utils.formatDate(customFrom) : 'Beginning'} – ${customTo ? Utils.formatDate(customTo) : 'Today'}` };
            default: return { from: '', to: '', label: 'All Time' };
        }
    }
}
