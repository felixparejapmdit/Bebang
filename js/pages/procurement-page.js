/* ============================================================
   ProcurementPage — purchase orders: Draft → Ordered → Arrived → Checked.
   Stock is only added at "Check-In Stock" (and reversed if a checked PO is
   deleted or edited). Includes a full, filterable PO register.
   ============================================================ */
class ProcurementPage extends BasePage {
    static FLOW = { Draft: { next: 'Ordered', label: 'Place Order', color: 'bg-blue-600' }, Ordered: { next: 'Arrived', label: 'Mark as Arrived', color: 'bg-yellow-600' }, Arrived: { next: 'Checked', label: 'Check-In Stock', color: 'bg-green-600' } };

    render() {
        const d = this.data;
        const names = d.inventory.filter(i => i.type !== 'splint').map(i => `<option value="${Utils.esc(i.name)}">`).join('');
        const open = d.purchaseOrders.filter(p => p.status !== 'Checked');
        return `
            ${this.ui.pageHeader('Procurement', 'Purchase orders for raw materials, supplies and equipment. Stock is added when a PO is checked in.')}
            <form id="procurement-form" class="glass-panel p-4 sm:p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3" onsubmit="event.preventDefault(); App.procurement.createPO()">
                <h3 class="text-lg font-semibold text-white col-span-full">Create New Purchase Order (Draft)</h3>
                ${this.ui.field('Item Name *', `<input type="text" id="po-item-name" list="procurement-item-names" placeholder="e.g. Neoprene Cloth" class="field-input" autocomplete="off" oninput="App.procurement.onItemName()">
                    <datalist id="procurement-item-names">${names}</datalist>`, 'sm:col-span-2 xl:col-span-2')}
                ${this.ui.field('Item Type', `<select id="po-item-type" class="field-input">
                        <option value="raw">Raw Material</option><option value="supplies">Supplies</option><option value="equipment">Equipment</option>
                    </select>`)}
                ${this.ui.field('Quantity *', `<input type="number" id="po-item-qty" value="1" min="0.0001" step="any" class="field-input" oninput="App.procurement.updateTotal()">`)}
                ${this.ui.field('Unit Cost (₱) *', `<input type="number" id="po-item-cost" value="0" min="0" step="any" class="field-input" oninput="App.procurement.updateTotal()">`)}
                ${this.ui.field('Supplier', `<input type="text" id="po-supplier" list="po-supplier-list" placeholder="Optional" value="${Utils.esc(this.consumePrefill())}" class="field-input">
                    <datalist id="po-supplier-list">${this.records.supplierNames().map(n => `<option value="${Utils.esc(n)}">`).join('')}</datalist>`)}
                <p id="po-total-hint" class="text-xs text-secondary col-span-full sm:col-span-1 xl:col-span-4 self-center"></p>
                <div class="tooltip-container col-span-full sm:col-span-1 xl:col-span-2">
                    <button type="submit" class="bg-primary text-white font-bold w-full py-2 rounded-lg transition duration-150">Create PO</button>
                    <span class="tooltip-text">Creates a new 'Draft' PO. Find it below to place the order.</span>
                </div>
            </form>

            <div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4 mb-6">
                ${['Draft', 'Ordered', 'Arrived', 'Checked'].map(s => this.statusColumn(s)).join('')}
            </div>

            ${this.tables.render({
                id: 'po-register', title: 'Purchase Order Register', subtitle: `${open.length} open · ${d.purchaseOrders.length} total`,
                rows: d.purchaseOrders, defaultSort: { key: 'date', dir: 'desc' }, exportName: 'purchase_orders',
                emptyText: 'No purchase orders yet. Create one above.',
                filters: [
                    { key: 'status', label: 'All statuses', options: ['Draft', 'Ordered', 'Arrived', 'Checked'], test: (r, v) => r.status === v },
                    { key: 'type', label: 'All types', options: [{ value: 'raw', label: 'Raw Material' }, { value: 'supplies', label: 'Supplies' }, { value: 'equipment', label: 'Equipment' }], test: (r, v) => r.items.some(l => l.type === v) }
                ],
                columns: [
                    { key: 'id', label: 'PO #', render: r => `<span class="font-bold text-white">${Utils.esc(r.id)}</span>` },
                    { key: 'date', label: 'Date', render: r => Utils.formatDate(r.date) },
                    { key: 'items', label: 'Item(s)', wrap: true, value: r => r.items.map(l => l.name).join(', '), render: r => r.items.map(l => `${Utils.esc(l.name)} <span class="text-secondary">×${Utils.formatNumber(l.qty, 4)}</span>`).join('<br>') },
                    { key: 'supplier', label: 'Supplier', value: r => r.supplier || '', render: r => Utils.esc(r.supplier || '—') },
                    { key: 'status', label: 'Status', value: r => r.status, render: r => this.ui.statusBadge(r.status) },
                    { key: 'total', label: 'Total Cost', align: 'right', value: r => this.finance.poTotal(r), format: 'currency', total: 'sum' }
                ],
                actions: r => `<div class="row-actions">
                    ${ProcurementPage.FLOW[r.status] ? this.ui.iconBtn(`App.procurement.advance('${r.id}')`, 'check', ProcurementPage.FLOW[r.status].label) : ''}
                    ${this.ui.iconBtn(`App.records.edit('po', '${r.id}')`, 'edit', 'Edit PO')}
                    ${this.ui.iconBtn(`App.records.remove('po', '${r.id}')`, 'trash', 'Delete PO', { danger: true })}</div>`
            })}
        `;
    }

    statusColumn(status) {
        let pos = this.data.purchaseOrders.filter(p => p.status === status);
        const total = pos.length;
        if (status === 'Checked') pos = [...pos].sort((a, b) => (b.checkedDate || b.date).localeCompare(a.checkedDate || a.date)).slice(0, 8);
        const flow = ProcurementPage.FLOW[status];
        return `
            <div class="glass-panel p-4" id="po-list-${status}">
                <h3 class="text-base font-semibold text-white mb-3 flex items-center justify-between">${status} ${this.ui.badge(total, total ? 'violet' : 'gray')}</h3>
                <div class="space-y-2 kanban-list">
                    ${pos.length ? pos.map(po => `
                        <div class="glass-item kanban-card rounded-lg" oncontextmenu="App.contextMenu.show(event, 'po', '${po.id}')">
                            <div class="flex justify-between items-start gap-2">
                                <div class="min-w-0">
                                    <span class="font-bold text-white">${Utils.esc(po.id)}</span>
                                    <span class="text-xs text-secondary block">${po.items.map(i => `${Utils.esc(i.name)} (×${Utils.formatNumber(i.qty, 4)})`).join(', ')}</span>
                                    <span class="text-xs text-secondary block">${Utils.formatDate(po.date)}${po.supplier ? ` · ${Utils.esc(po.supplier)}` : ''} · ${Utils.formatCurrency(this.finance.poTotal(po))}</span>
                                </div>
                                ${this.ui.editDeleteBtns(`App.records.edit('po', '${po.id}')`, `App.records.remove('po', '${po.id}')`, 'PO')}
                            </div>
                            ${flow ? `<button onclick="App.procurement.advance('${po.id}')" class="${flow.color} text-white text-xs px-3 py-1 rounded-full mt-2">${flow.label}</button>` : ''}
                        </div>`).join('') : this.ui.emptyNote('No orders in this status.')}
                    ${status === 'Checked' && total > pos.length ? `<p class="text-xs text-secondary text-center">Showing latest ${pos.length} of ${total} — see the register below.</p>` : ''}
                </div>
            </div>`;
    }

    /** Settings → Suppliers → "New PO" pre-fills the supplier once. */
    consumePrefill() { const v = this.prefillSupplier || ''; this.prefillSupplier = ''; return v; }
    newPOFor(supplierName) { this.prefillSupplier = supplierName; this.app.navigate('procurement'); setTimeout(() => { const el = document.getElementById('po-item-name'); if (el) el.focus(); }, 50); }

    onItemName() {
        const it = this.stock.findItemByName(this.val('po-item-name'));
        if (it && it.type !== 'splint') {
            this.setVal('po-item-type', it.type);
            this.setVal('po-item-cost', it.unit_cost || 0);
        }
        this.updateTotal();
    }
    updateTotal() {
        const it = this.stock.findItemByName(this.val('po-item-name'));
        const qty = Utils.num(this.val('po-item-qty')), cost = Utils.num(this.val('po-item-cost'));
        const hint = document.getElementById('po-total-hint');
        if (hint) hint.innerHTML = `PO total: <strong class="text-white">${Utils.formatCurrency(qty * cost)}</strong>${it ? ` · ${Utils.esc(it.name)} currently has ${Utils.formatNumber(it.stock, 4)} ${Utils.esc(it.units || '')} in stock` : this.val('po-item-name') ? ' · new item — it will be added to inventory on check-in' : ''}`;
    }

    async createPO() {
        const name = this.val('po-item-name');
        const qty = this.num('po-item-qty'), cost = this.num('po-item-cost');
        const type = this.val('po-item-type');
        if (!name || !(qty > 0) || !(cost >= 0)) return this.ui.toast('Please enter a valid item name, quantity, and cost.', 'error');
        const existing = this.stock.findItemByName(name);
        if (existing && existing.type === 'splint') return this.ui.toast('Splints are produced (Manufacturing → Remittance), not purchased.', 'error');
        const id = Utils.nextId('PO', this.data.purchaseOrders);
        const supplier = this.records.findOrCreateSupplier(this.val('po-supplier'));
        this.data.purchaseOrders.unshift({
            id, date: Utils.today(), status: 'Draft', supplier: supplier ? supplier.name : '',
            items: [{ name: existing ? existing.name : name, qty, unit_cost: cost, type: existing ? existing.type : type }]
        });
        await this.app.saveAndRerender();
        this.ui.toast(`Purchase Order ${id} created as Draft.`);
    }

    async advance(poId) {
        const po = this.data.purchaseOrders.find(p => p.id === poId);
        const flow = po && ProcurementPage.FLOW[po.status];
        if (!flow) return;
        if (flow.next === 'Checked') {
            po.items.forEach(line => {
                let item = this.stock.resolvePoItem(line);
                if (item) {
                    item.unit_cost = Utils.num(line.unit_cost);
                    item.price_last_updated = Utils.today();
                } else {
                    item = { id: this.app.inventory.generateItemId(line.type || 'raw'), type: line.type || 'raw', name: line.name, stock: 0, unit_cost: Utils.num(line.unit_cost), units: 'units', price_last_updated: Utils.today() };
                    this.data.inventory.push(item);
                }
                line.inv_id = item.id;
            });
            po.checkedDate = Utils.today();
            po.status = 'Checked';
            this.stock.apply(this.stock.effectsOf('po', po));
            await this.app.saveAndRerender();
            this.ui.toast(`PO ${poId} checked in — inventory updated (${this.stock.describe(this.stock.effectsOf('po', po))}).`);
            return;
        }
        po.status = flow.next;
        if (flow.next === 'Ordered') po.orderedDate = Utils.today();
        if (flow.next === 'Arrived') po.arrivedDate = Utils.today();
        await this.app.saveAndRerender();
        this.ui.toast(`PO ${poId} is now ${flow.next}.`);
    }
}
