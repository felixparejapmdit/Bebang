/* ============================================================
   DashboardPage — KPIs, stock value by category, low-stock alerts,
   sales & profit charts and recent activity.
   ============================================================ */
class DashboardPage extends BasePage {
    render() {
        const d = this.data;
        const year = new Date().getFullYear();
        const ytd = this.finance.summary(`${year}-01-01`, Utils.today());
        const costValue = d.inventory.reduce((s, i) => s + Math.max(0, i.stock) * (i.unit_cost || 0), 0);
        const retailValue = d.inventory.reduce((s, i) => s + Math.max(0, i.stock) * (i.sale_price || i.unit_cost || 0), 0);
        const pendingPOs = d.purchaseOrders.filter(p => p.status !== 'Checked');
        const pendingSOs = d.salesOrders.filter(s => s.status === 'Pending Delivery');
        const lowStock = d.inventory.filter(i => this.stock.isLowStock(i)).sort((a, b) => a.stock - b.stock);
        const payroll = this.app.payroll.summary();
        const outstanding = payroll.reduce((s, w) => s + Math.max(0, w.balance), 0);
        const types = ['splint', 'raw', 'supplies', 'equipment'];
        const byCat = types.map(t => {
            const items = d.inventory.filter(i => i.type === t);
            return { t, label: this.app.inventory.typeLabel(t), count: items.length, units: items.reduce((s, i) => s + i.stock, 0), value: items.reduce((s, i) => s + Math.max(0, i.stock) * (i.unit_cost || 0), 0) };
        });
        const s = d.settings;
        const fin = this.app.can('reports.financial');

        return `
            ${this.ui.pageHeader('Business Dashboard', `${Utils.esc(s.businessTagline || '')} — ${new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
                `<button onclick="App.tour.start()" class="tour-btn">${this.ui.icon('info', 'w-4 h-4')} Start Tour</button>`)}
            ${this.backupReminder()}
            <div class="flex flex-wrap gap-2 mb-6 no-print">
                <button onclick="App.navigate('procurement')" class="quick-btn">＋ New Purchase Order</button>
                <button onclick="App.navigate('manufacturing')" class="quick-btn">⚡ Log Production</button>
                <button onclick="App.navigate('sales')" class="quick-btn">💵 Log Sale</button>
                <button onclick="App.navigate('inventory')" class="quick-btn">📦 Manage Inventory</button>
                <button onclick="App.records.create('exp')" class="quick-btn">🧾 Add Expense</button>
                <button onclick="App.navigate('reports')" class="quick-btn">📊 Reports</button>
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
                ${!fin ? '' : this.ui.metricCard(`Sales ${year}`, ytd.revenue, { color: 'text-green-400', index: 0, icon: 'sales_up', sub: `${ytd.orders} fulfilled orders · ${Utils.formatNumber(ytd.unitsSold)} units`, onclick: "App.navigate('reports')" })}
                ${!fin ? '' : this.ui.metricCard(`Net Profit ${year}`, ytd.net, { color: ytd.net >= 0 ? 'text-blue-400' : 'text-red-400', index: 1, icon: 'costing', sub: `Purchases ${Utils.formatCurrency(ytd.purchases)} · Expenses ${Utils.formatCurrency(ytd.expenses)}` })}
                ${this.ui.metricCard('Inventory Value (Cost)', costValue, { color: 'text-accent', index: 2, icon: 'inventory', sub: `Retail value ${Utils.formatCurrency(retailValue)}`, onclick: "App.navigate('inventory')" })}
                ${this.ui.metricCard('Pending Deliveries', pendingSOs.length, { currency: false, index: 3, icon: 'truck', sub: Utils.formatCurrency(pendingSOs.reduce((a, o) => a + (o.total || 0), 0)), onclick: "App.navigate('sales')" })}
                ${this.ui.metricCard('Low-Stock Items', lowStock.length, { currency: false, color: lowStock.length ? 'text-red-400' : 'text-white', index: 4, icon: 'alert', sub: `${pendingPOs.length} purchase order(s) open`, onclick: "App.navigate('inventory')" })}
                ${this.ui.metricCard('Payroll Outstanding', outstanding, { color: outstanding > 0 ? 'text-red-400' : 'text-white', index: 5, icon: 'payroll', sub: `${d.workers.length} worker(s)`, onclick: "App.navigate('payroll')" })}
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
                <div class="glass-panel p-4 sm:p-5 xl:col-span-2">
                    <p class="text-xs font-semibold uppercase tracking-wider text-secondary mb-3">Stock Value by Category (at cost)</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        ${byCat.map(c => `
                            <button type="button" onclick="App.inventory.setView('${c.t}'); App.navigate('inventory')" class="glass-item p-3 rounded-lg flex items-center justify-between text-left">
                                <span><span class="block text-sm font-semibold text-white">${c.label}</span><span class="text-xs text-secondary">${c.count} items · ${Utils.formatNumber(c.units)} units</span></span>
                                <span class="font-bold text-white">${Utils.formatCurrency(c.value)}</span>
                            </button>`).join('')}
                    </div>
                </div>
                <div class="glass-panel p-4 sm:p-5">
                    <div class="flex items-center justify-between mb-3">
                        <p class="text-xs font-semibold uppercase tracking-wider text-secondary">Low-Stock Alerts</p>
                        <span class="text-xs text-secondary">≤ reorder level</span>
                    </div>
                    ${lowStock.length === 0 ? this.ui.emptyNote('All items are above their reorder level.') : `
                    <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        ${lowStock.slice(0, 12).map(i => `
                            <div class="glass-item px-3 py-2 rounded-lg flex items-center justify-between gap-2 text-sm">
                                <span class="truncate text-white">${Utils.esc(i.name)}</span>
                                <span class="flex items-center gap-2 flex-shrink-0"><span class="${i.stock <= 0 ? 'text-red-400' : 'text-accent'} font-bold">${Utils.formatNumber(i.stock, 4)}</span><span class="text-xs text-secondary">/ ${Utils.formatNumber(this.stock.lowStockLevel(i))}</span></span>
                            </div>`).join('')}
                        ${lowStock.length > 12 ? `<p class="text-xs text-secondary text-center pt-1">+${lowStock.length - 12} more</p>` : ''}
                    </div>`}
                </div>
            </div>

            ${!fin ? '' : `<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                ${this.salesChart()}
                ${this.profitChart()}
            </div>`}
            ${this.recentActivity()}
        `;
    }

    afterRender() { this.ui.animateMetrics(); }

    backupReminder() {
        const s = this.data.settings;
        if (this.app.store.configured) return ''; // cloud-synced data doesn't depend on this browser
        const days = Utils.num(s.backupReminderDays, 7);
        if (!days) return '';
        const last = s.lastBackupAt ? new Date(s.lastBackupAt) : null;
        const age = last ? Math.floor((Date.now() - last.getTime()) / 86400000) : null;
        if (last && age < days) return '';
        return `<div class="glass-panel p-3 mb-5 flex flex-wrap items-center justify-between gap-2 border-yellow-500/40">
            <span class="text-sm text-accent">${this.ui.icon('alert', 'w-4 h-4 inline -mt-0.5')} ${last ? `Last backup was ${age} day(s) ago.` : 'No backup has been exported yet.'} Your data lives only in this browser.</span>
            <button onclick="App.settings.exportBackup()" class="dt-btn dt-btn-primary">${this.ui.icon('download', '')}Export Backup Now</button>
        </div>`;
    }

    salesChart() {
        const now = new Date();
        const labels = [], values = [];
        for (let i = 5; i >= 0; i--) {
            const md = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = Utils.dateStr(md).substring(0, 7);
            labels.push(md.toLocaleString('en-PH', { month: 'short' }));
            values.push(this.finance.sales(`${key}-01`, `${key}-31`).reduce((s, o) => s + Utils.num(o.total), 0));
        }
        return `<div class="glass-panel p-4 sm:p-6">
            <h3 class="text-lg font-semibold text-white mb-1">Last 6 Months Sales</h3>
            <p class="text-xs text-secondary">Fulfilled orders · total ${Utils.formatCurrency(values.reduce((a, b) => a + b, 0))}</p>
            ${this.ui.barChart(values, labels, { formatter: v => Utils.formatCurrency(v).replace('.00', '') })}
        </div>`;
    }

    profitChart() {
        const today = new Date();
        const labels = [], values = [];
        for (let i = 7; i >= 0; i--) {
            const ws = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - i * 7);
            const we = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 6);
            labels.push(`${ws.getDate()}/${ws.getMonth() + 1}`);
            values.push(this.finance.summary(Utils.dateStr(ws), Utils.dateStr(we)).net);
        }
        return `<div class="glass-panel p-4 sm:p-6">
            <h3 class="text-lg font-semibold text-white mb-1">Last 8 Weeks Net Profit</h3>
            <p class="text-xs text-secondary">Sales − purchases − expenses, per week (week starting)</p>
            ${this.ui.barChart(values, labels, { color: 'bg-blue-500', formatter: v => Utils.formatCurrency(v).replace('.00', '') })}
        </div>`;
    }

    recentActivity() {
        const d = this.data;
        const acts = [
            ...d.salesOrders.map(r => ({ date: r.date, type: 'Sale', text: `${r.id} · ${r.customer_name} · ${r.items.map(l => `${l.name} ×${l.qty}`).join(', ')}`, amount: r.total, status: r.status })),
            ...d.purchaseOrders.map(r => ({ date: r.checkedDate || r.date, type: 'Purchase', text: `${r.id} · ${r.items.map(l => `${l.name} ×${l.qty}`).join(', ')}${r.supplier ? ` · ${r.supplier}` : ''}`, amount: -this.finance.poTotal(r), status: r.status })),
            ...d.manufacturingOrders.map(r => ({ date: r.date, type: 'Remittance', text: `${r.id} · ${r.workerName} · ${r.productName} ×${r.qty}`, amount: null, status: r.status })),
            ...d.issuances.map(r => ({ date: r.date, type: 'Issuance', text: `${r.id} · ${r.workerName} · ${r.materialName} ×${r.qty} ${r.unit || ''}`, amount: null, status: r.status })),
            ...d.expenses.map(r => ({ date: r.date, type: 'Expense', text: `${r.category} · ${r.description}`, amount: -r.amount, status: '' }))
        ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 10);
        return `<div class="glass-panel p-4 sm:p-6">
            <h3 class="text-lg font-semibold text-white mb-3">Recent Activity</h3>
            ${acts.length === 0 ? this.ui.emptyNote('No activity yet. Start by logging stock, a purchase order, or a sale.') : `
            <div class="overflow-x-auto"><table class="dt-table min-w-full"><tbody>
                ${acts.map(a => `<tr>
                    <td class="whitespace-nowrap text-secondary">${Utils.formatDate(a.date)}</td>
                    <td class="whitespace-nowrap">${this.ui.badge(a.type, { Sale: 'green', Purchase: 'blue', Remittance: 'violet', Issuance: 'amber', Expense: 'red' }[a.type])}</td>
                    <td class="text-white">${Utils.esc(a.text)}</td>
                    <td class="whitespace-nowrap">${a.status ? this.ui.statusBadge(a.status) : ''}</td>
                    <td class="whitespace-nowrap text-right font-semibold ${a.amount > 0 ? 'text-green-400' : a.amount < 0 ? 'text-red-400' : 'text-secondary'}">${a.amount === null ? '—' : Utils.formatCurrency(a.amount)}</td>
                </tr>`).join('')}
            </tbody></table></div>`}
        </div>`;
    }
}
