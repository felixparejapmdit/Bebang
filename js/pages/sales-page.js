/* ============================================================
   SalesPage — in-store (POS) sales, planned deliveries (Sales Orders) with
   delivery/payment photo proof, the full sales register, and customers.
   ============================================================ */
class SalesPage extends BasePage {
    get sellable() { return this.data.inventory.filter(i => this.app.inventory.isSellable(i.type)); }

    render() {
        const d = this.data;
        const items = this.sellable;
        const itemOpts = items.map(i => `<option value="${i.id}" data-price="${i.sale_price || 0}">${Utils.esc(this.itemLabel(i))}</option>`).join('');
        const pending = d.salesOrders.filter(s => s.status === 'Pending Delivery');
        return `
            ${this.ui.pageHeader('Sales & CRM', `Only Splints, Supplies and Equipment are sellable. ${pending.length} delivery(ies) pending · ${Utils.formatCurrency(pending.reduce((s, o) => s + (o.total || 0), 0))}`)}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <form id="pos-form" class="glass-panel p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start" onsubmit="event.preventDefault(); App.sales.logQuickSale()">
                    <h3 class="text-lg font-semibold text-white col-span-full">⚡ Log In-Store Purchase (POS)</h3>
                    ${this.ui.field('Item *', `<select id="pos-item" class="field-input" onchange="App.sales.autoFillPrice('pos-item', 'pos-price')"><option value="">Select Item (Splint / Supplies / Equipment) *</option>${itemOpts}</select>`, 'col-span-full')}
                    ${this.ui.field('Quantity *', `<input type="number" id="pos-qty" value="1" min="1" step="any" class="field-input" oninput="App.sales.updateTotal('pos')">`)}
                    ${this.ui.field('Sale Price (₱) *', `<input type="number" id="pos-price" min="0" step="0.01" placeholder="0.00" class="field-input" oninput="App.sales.updateTotal('pos')">`)}
                    <p id="pos-total" class="text-sm text-secondary col-span-full"></p>
                    <button type="submit" class="bg-green-600 text-white font-bold w-full py-2 rounded-lg col-span-full">Log Sale</button>
                </form>

                <form id="so-form" class="glass-panel p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start" onsubmit="event.preventDefault(); App.sales.createSO()">
                    <h3 class="text-lg font-semibold text-white col-span-full">🗓️ Create Planned Sales Order (Delivery)</h3>
                    ${this.ui.field('Delivered To *', `<input type="text" id="so-customer-name" list="customer-names-list" oninput="App.sales.autoFillSOPrice()" placeholder="Hospital / Clinic / Customer" class="field-input" autocomplete="off">
                        <datalist id="customer-names-list">${d.customers.map(c => `<option value="${Utils.esc(c.name)}">`).join('')}</datalist>`, 'col-span-full')}
                    ${this.ui.field('Item *', `<select id="so-item" class="field-input" onchange="App.sales.autoFillSOPrice()"><option value="">Select Item (Splint / Supplies / Equipment) *</option>${itemOpts}</select>`, 'col-span-full')}
                    ${this.ui.field('Quantity *', `<input type="number" id="so-qty" value="1" min="1" step="any" class="field-input" oninput="App.sales.updateTotal('so')">`)}
                    ${this.ui.field('Sale Price (₱) *', `<input type="number" id="so-price" min="0" step="0.01" placeholder="0.00" class="field-input" oninput="App.sales.updateTotal('so')">`)}
                    ${this.ui.field('Order Date', `<input type="date" id="so-date" value="${Utils.today()}" class="field-input">`)}
                    ${this.ui.field('Reference / DR No.', `<input type="text" id="so-notes" placeholder="Optional" class="field-input">`)}
                    <p id="so-price-hint" class="text-xs text-accent col-span-full"></p>
                    <p id="so-total" class="text-sm text-secondary col-span-full -mt-2"></p>
                    <button type="submit" class="bg-primary text-white font-bold w-full py-2 rounded-lg col-span-full">Generate Order</button>
                </form>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                ${this.statusColumn('Pending Delivery')}
                ${this.statusColumn('Completed')}
            </div>

            ${this.registerTable()}
            <div class="mt-6" id="customer-form">${this.customerTable()}</div>
        `;
    }

    statusColumn(status) {
        const d = this.data;
        let sos = status === 'Pending Delivery' ? d.salesOrders.filter(s => s.status === 'Pending Delivery') : d.salesOrders.filter(s => s.status !== 'Pending Delivery');
        const total = sos.length;
        if (status === 'Completed') sos = [...sos].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
        return `
            <div class="glass-panel p-4 sm:p-5" id="so-list-${status.replace(/[^a-zA-Z0-9]/g, '-')}">
                <h3 class="text-base font-semibold text-white mb-3 flex items-center justify-between">${status === 'Completed' ? 'Completed (recent)' : status} ${this.ui.badge(total, total ? 'violet' : 'gray')}</h3>
                <div class="space-y-2 kanban-list">
                    ${sos.length ? sos.map(so => this.orderCard(so)).join('') : this.ui.emptyNote('No orders in this status.')}
                </div>
            </div>`;
    }

    orderCard(so) {
        const att = this.app.attachments;
        const deliv = att.find(so.id, 'Delivery'), pay = att.find(so.id, 'Payment');
        const pending = so.status === 'Pending Delivery';
        return `
            <div class="glass-item kanban-card rounded-lg" oncontextmenu="App.contextMenu.show(event, 'so', '${so.id}')">
                <div class="flex justify-between items-start gap-2">
                    <div class="min-w-0">
                        <span class="font-bold text-white">${Utils.esc(so.id)} — ${Utils.esc(so.customer_name)}</span>
                        <span class="text-xs text-secondary block">${so.items.map(i => `${Utils.esc(i.name)} (×${Utils.formatNumber(i.qty, 4)}) @ ${Utils.formatCurrency(i.price)}`).join(', ')}</span>
                        <span class="text-xs text-secondary block">${Utils.formatDate(so.date)} · <strong class="text-green-400">${Utils.formatCurrency(so.total)}</strong>${so.notes ? ` · ${Utils.esc(so.notes)}` : ''}</span>
                        <div class="flex flex-wrap items-center gap-1 mt-1">
                            ${pending ? '' : this.ui.statusBadge(so.status)}
                            ${deliv ? this.ui.badge('📷 Delivery', 'blue') : ''}${pay ? this.ui.badge('💲 Payment', 'green') : ''}
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-1 flex-shrink-0">
                        ${this.ui.editDeleteBtns(`App.records.edit('so', '${so.id}')`, `App.records.remove('so', '${so.id}')`, 'order')}
                    </div>
                </div>
                ${so.customer_id === 'CUST-0' ? '' : `
                <div class="flex flex-wrap gap-2 mt-2 pt-2 border-t border-white/10">
                    ${pending ? `<button onclick="App.sales.deliver('${so.id}')" class="bg-green-600 text-white text-xs px-3 py-1 rounded-full">Mark as Delivered</button>` : ''}
                    <button onclick="App.attachments.open('${so.id}', 'Delivery')" class="bg-white/10 text-xs px-3 py-1 rounded-full hover:bg-white/20 text-secondary">${deliv ? 'View Delivery' : 'Attach Delivery'}</button>
                    <button onclick="App.attachments.open('${so.id}', 'Payment')" class="bg-white/10 text-xs px-3 py-1 rounded-full hover:bg-white/20 text-secondary">${pay ? 'View Payment' : 'Attach Payment'}</button>
                </div>`}
            </div>`;
    }

    registerTable() {
        const d = this.data;
        return this.tables.render({
            id: 'sales-register', title: 'Sales Register', subtitle: 'Every sale and delivery. Totals count all rows shown (use the status filter for fulfilled only).',
            rows: d.salesOrders, defaultSort: { key: 'date', dir: 'desc' }, exportName: 'sales_orders', emptyText: 'No sales yet.',
            filters: [
                { key: 'st', label: 'All statuses', options: ['Pending Delivery', 'Delivered/Billed', 'Completed (In-Store)'], test: (r, v) => r.status === v },
                { key: 'c', label: 'All customers', options: [...new Set(d.salesOrders.map(s => s.customer_name))].sort(), test: (r, v) => r.customer_name === v },
                { key: 'm', label: 'All months', options: [...new Set(d.salesOrders.map(s => Utils.monthKey(s.date)))].sort().reverse(), test: (r, v) => Utils.monthKey(r.date) === v }
            ],
            columns: [
                { key: 'id', label: 'SO #', render: r => `<span class="font-bold text-white">${Utils.esc(r.id)}</span>` },
                { key: 'date', label: 'Date', render: r => Utils.formatDate(r.date) },
                { key: 'customer_name', label: 'Customer' },
                { key: 'items', label: 'Item(s)', wrap: true, value: r => r.items.map(l => `${l.name} x${l.qty}`).join('; '), render: r => r.items.map(l => `${Utils.esc(l.name)} <span class="text-secondary">×${Utils.formatNumber(l.qty, 4)} @ ${Utils.formatCurrency(l.price)}</span>`).join('<br>') },
                { key: 'qty', label: 'Units', align: 'right', value: r => r.items.reduce((s, l) => s + Utils.num(l.qty), 0), total: 'sum', format: 'number' },
                { key: 'status', label: 'Status', render: r => this.ui.statusBadge(r.status) },
                { key: 'notes', label: 'Ref', value: r => r.notes || '', render: r => `<span class="text-secondary">${Utils.esc(r.notes || '')}</span>` },
                { key: 'total', label: 'Total', align: 'right', value: r => Utils.num(r.total), format: 'currency', total: 'sum' }
            ],
            actions: r => `<div class="row-actions">
                ${r.status === 'Pending Delivery' ? this.ui.iconBtn(`App.sales.deliver('${r.id}')`, 'check', 'Mark as Delivered') : ''}
                ${this.ui.iconBtn(`App.sales.printInvoice('${r.id}')`, 'print', 'Print delivery receipt')}
                ${this.ui.iconBtn(`App.records.edit('so', '${r.id}')`, 'edit', 'Edit order')}
                ${this.ui.iconBtn(`App.records.remove('so', '${r.id}')`, 'trash', 'Delete order', { danger: true })}</div>`
        });
    }

    customerStats() {
        const stats = {};
        this.data.salesOrders.forEach(so => {
            const k = so.customer_id;
            if (!stats[k]) stats[k] = { orders: 0, revenue: 0, last: '' };
            stats[k].orders += 1;
            if (this.stock.isFulfilledSale(so)) stats[k].revenue += Utils.num(so.total);
            if (so.date > stats[k].last) stats[k].last = so.date;
        });
        return stats;
    }

    customerTable() {
        const stats = this.customerStats();
        const st = (c) => stats[c.id] || { orders: 0, revenue: 0, last: '' };
        return this.tables.render({
            id: 'customers', title: 'Customers & Leads', subtitle: 'Created automatically from "Delivered To", or add them here.',
            rows: this.data.customers, defaultSort: { key: 'name', dir: 'asc' }, exportName: 'customers',
            emptyText: 'No customers yet — they are added automatically when you create a Sales Order.',
            addButton: { label: 'Add Customer', onclick: "App.records.create('cust')" },
            filters: [{ key: 's', label: 'Customers & leads', options: [{ value: 'Customer', label: 'Customers' }, { value: 'Lead', label: 'Leads' }], test: (r, v) => (r.status || 'Customer') === v }],
            columns: [
                { key: 'name', label: 'Name', render: r => `<span class="font-semibold text-white">${Utils.esc(r.name)}</span>${r.address ? `<span class="block text-[0.7rem] text-secondary">${Utils.esc(r.address)}</span>` : ''}` },
                { key: 'contact', label: 'Contact', value: r => r.contact || '' },
                { key: 'phone', label: 'Phone', value: r => r.phone || '' },
                { key: 'status', label: 'Status', value: r => r.status || 'Customer', render: r => this.ui.statusBadge(r.status || 'Customer') },
                { key: 'orders', label: 'Orders', align: 'right', value: r => st(r).orders, total: 'sum', format: 'number' },
                { key: 'revenue', label: 'Revenue', align: 'right', value: r => st(r).revenue, format: 'currency', total: 'sum' },
                { key: 'last', label: 'Last Order', value: r => st(r).last, render: r => st(r).last ? Utils.formatDate(st(r).last) : '<span class="text-secondary">—</span>' }
            ],
            actions: r => this.ui.editDeleteBtns(`App.records.edit('cust', '${r.id}')`, `App.records.remove('cust', '${r.id}')`, 'customer')
        });
    }

    // ---------- form helpers ----------
    autoFillPrice(selectId, priceId) {
        const sel = document.getElementById(selectId);
        const opt = sel.options[sel.selectedIndex];
        const price = opt && opt.getAttribute('data-price');
        this.setVal(priceId, price ? Utils.num(price).toFixed(2) : '');
        this.updateTotal(selectId.split('-')[0]);
    }
    /** Rates vary by customer: prefill this customer's last price for the item, else the catalog price. */
    autoFillSOPrice() {
        const itemId = this.val('so-item');
        const hint = document.getElementById('so-price-hint');
        hint.textContent = '';
        if (!itemId) { this.setVal('so-price', ''); return this.updateTotal('so'); }
        const cust = this.data.customers.find(c => Utils.sameText(c.name, this.val('so-customer-name')));
        if (cust) {
            const past = this.data.salesOrders.filter(so => so.customer_id === cust.id).sort((a, b) => b.date.localeCompare(a.date));
            for (const so of past) {
                const line = so.items.find(l => l.inv_id === itemId);
                if (line) {
                    this.setVal('so-price', Utils.num(line.price).toFixed(2));
                    hint.textContent = `Using ${cust.name}'s last price for this item (${Utils.formatDate(so.date)}). Rates vary by customer — edit if needed.`;
                    return this.updateTotal('so');
                }
            }
        }
        this.autoFillPrice('so-item', 'so-price');
    }
    updateTotal(prefix) {
        const el = document.getElementById(`${prefix}-total`);
        if (!el) return;
        const qty = Utils.num(this.val(`${prefix}-qty`)), price = Utils.num(this.val(`${prefix}-price`));
        const item = this.stock.findItem(this.val(`${prefix}-item`));
        el.innerHTML = item ? `Total: <strong class="text-white">${Utils.formatCurrency(qty * price)}</strong> · In stock: ${Utils.formatNumber(item.stock, 4)}${qty > item.stock ? ' <span class="text-red-400 font-semibold">— not enough stock</span>' : ''}` : '';
    }

    async logQuickSale() {
        const item = this.stock.findItem(this.val('pos-item'));
        const qty = this.num('pos-qty'), price = this.num('pos-price');
        if (!item || !(qty > 0) || !(price >= 0)) return this.ui.toast('Please choose an item and enter a valid quantity and price.', 'error');
        if (item.stock < qty) return this.ui.toast(`Insufficient stock! Only ${Utils.formatNumber(item.stock, 4)} of ${item.name} available.`, 'error');
        const so = {
            id: Utils.nextId('SO', this.data.salesOrders), customer_id: 'CUST-0', customer_name: 'In-Store / OTC Sale', date: Utils.today(),
            status: 'Completed (In-Store)', items: [{ inv_id: item.id, name: item.name, qty, price }], total: Utils.round(qty * price, 2)
        };
        this.data.salesOrders.unshift(so);
        this.stock.apply(this.stock.effectsOf('so', so));
        await this.app.saveAndRerender();
        this.ui.toast(`In-store sale ${so.id} logged — ${Utils.formatCurrency(so.total)}.`);
    }

    async createSO() {
        const name = this.val('so-customer-name');
        const item = this.stock.findItem(this.val('so-item'));
        const qty = this.num('so-qty'), price = this.num('so-price');
        if (!name || !item || !(qty > 0) || !(price >= 0)) return this.ui.toast('Please enter who this is delivered to, and a valid item, quantity, and price.', 'error');
        if (item.stock < qty) return this.ui.toast(`Insufficient stock! Only ${Utils.formatNumber(item.stock, 4)} of ${item.name} available.`, 'error');
        const cust = this.records.findOrCreateCustomer(name);
        const so = {
            id: Utils.nextId('SO', this.data.salesOrders), customer_id: cust.id, customer_name: cust.name, date: this.val('so-date') || Utils.today(),
            status: 'Pending Delivery', items: [{ inv_id: item.id, name: item.name, qty, price }], total: Utils.round(qty * price, 2), notes: this.val('so-notes')
        };
        this.data.salesOrders.unshift(so);
        await this.app.saveAndRerender();
        this.ui.toast(`Sales Order ${so.id} created for ${cust.name}.`);
    }

    async deliver(soId) {
        const so = this.data.salesOrders.find(s => s.id === soId);
        if (!so || so.status !== 'Pending Delivery') return;
        const next = { ...so, status: 'Delivered/Billed' };
        const fx = this.stock.effectsOf('so', next);
        const problems = this.stock.problems(fx);
        if (problems.length) return this.ui.toast(`Cannot fulfill ${soId}: ${problems.join(' ')}`, 'error');
        so.status = 'Delivered/Billed';
        so.deliveredDate = Utils.today();
        this.stock.apply(fx);
        await this.app.saveAndRerender();
        this.ui.toast(`${soId} delivered — inventory updated.`);
    }

    printInvoice(soId) {
        const so = this.data.salesOrders.find(s => s.id === soId);
        if (!so) return;
        const cust = this.data.customers.find(c => c.id === so.customer_id);
        const body = `
            <table><tbody>
                <tr><td><strong>Order No.</strong></td><td>${Utils.esc(so.id)}</td><td><strong>Date</strong></td><td>${Utils.formatDate(so.date)}</td></tr>
                <tr><td><strong>Delivered To</strong></td><td>${Utils.esc(so.customer_name)}</td><td><strong>Status</strong></td><td>${Utils.esc(so.status)}</td></tr>
                ${cust && (cust.address || cust.contact || cust.phone) ? `<tr><td><strong>Address / Contact</strong></td><td colspan="3">${Utils.esc([cust.address, cust.contact, cust.phone].filter(Boolean).join(' · '))}</td></tr>` : ''}
                ${so.notes ? `<tr><td><strong>Reference</strong></td><td colspan="3">${Utils.esc(so.notes)}</td></tr>` : ''}
            </tbody></table>
            ${this.app.printer.table(['Item', 'Qty', 'Unit Price', 'Amount'], so.items.map(l => [Utils.esc(l.name), Utils.formatNumber(l.qty, 4), Utils.formatCurrency(l.price), Utils.formatCurrency(l.qty * l.price)]),
                { right: [1, 2, 3], footer: ['Total', '', '', Utils.formatCurrency(so.total)] })}
            <div style="display: flex; gap: 40px; margin-top: 48px; font-size: 10pt;">
                <div style="flex: 1; border-top: 1px solid #000; padding-top: 4px;">Prepared by</div>
                <div style="flex: 1; border-top: 1px solid #000; padding-top: 4px;">Received by (signature over printed name / date)</div>
            </div>`;
        this.app.printer.print(`Delivery Receipt — ${so.id}`, body);
    }
}
