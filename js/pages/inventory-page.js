/* ============================================================
   InventoryPage — the item catalog (Splint / Raw / Supplies / Equipment):
   add items, adjust stock (every change is logged so the ledger reconciles),
   inline price edits, BOM recipes, photos, history, edit and delete.
   ============================================================ */
class InventoryPage extends BasePage {
    static TYPES = [
        { key: 'splint', label: 'Splint' },
        { key: 'raw', label: 'Raw Materials' },
        { key: 'supplies', label: 'Supplies' },
        { key: 'equipment', label: 'Equipment' }
    ];

    constructor(app) {
        super(app);
        this.view = 'splint';
    }

    typeLabel(type) { return { raw: 'Raw Material', splint: 'Splint', supplies: 'Supplies', equipment: 'Equipment' }[type] || type; }
    typePrefix(type) { return { raw: 'RM', splint: 'SPL', supplies: 'SUP', equipment: 'EQP' }[type] || 'ITM'; }
    generateItemId(type) {
        const prefix = this.typePrefix(type);
        let n = this.data.inventory.filter(i => i.type === type).length + 1, id;
        do { id = `${prefix}-${n++}`; } while (this.data.inventory.some(i => i.id === id));
        return id;
    }
    isSellable(type) { return ['splint', 'supplies', 'equipment'].includes(type); }
    setView(view) { this.view = view; if (this.app.currentTab === 'inventory') this.app.render('inventory', { skipAnimation: true }); }

    render() {
        const d = this.data;
        const items = d.inventory.filter(i => i.type === this.view);
        const tabs = InventoryPage.TYPES.map(t => ({ ...t, count: d.inventory.filter(i => i.type === t.key).length }));
        const low = items.filter(i => this.stock.isLowStock(i)).length;
        return `
            ${this.ui.pageHeader('Inventory Warehouse', 'Every stock change here is logged as an adjustment, so the Inventory Ledger always reconciles.',
                `<button onclick="App.inventory.addItem()" class="quick-btn">＋ New Catalog Item</button>
                 <button onclick="App.inventory.printValuation()" class="quick-btn">🖨️ Valuation Report</button>`)}
            <div class="sub-nav no-print">
                ${tabs.map(t => `<button type="button" id="inventory-subnav-${t.key}" onclick="App.inventory.setView('${t.key}')" class="sub-nav-button ${this.view === t.key ? 'active' : ''}">${t.label} <span class="opacity-70">(${t.count})</span></button>`).join('')}
            </div>

            <form id="manual-stock-form" class="glass-panel p-4 sm:p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3" onsubmit="event.preventDefault(); App.inventory.addManualStock()">
                <h3 class="text-lg font-semibold text-white col-span-full">Add Old Stock / Manual Adjustment</h3>
                ${this.ui.field('Item Name *', `<input type="text" id="adj-item-name" placeholder="Start typing an item…" list="inventory-item-names" class="field-input" autocomplete="off" oninput="App.inventory.onAdjItem()">
                    <datalist id="inventory-item-names">${d.inventory.map(i => `<option value="${Utils.esc(i.name)}">`).join('')}</datalist>`, 'sm:col-span-2')}
                ${this.ui.field('Item Type', `<select id="adj-item-type" class="field-input">${InventoryPage.TYPES.map(t => `<option value="${t.key}" ${t.key === this.view ? 'selected' : ''}>${this.typeLabel(t.key)}</option>`).join('')}</select>`)}
                ${this.ui.field('Quantity (+ add / − remove) *', `<input type="number" id="adj-qty" value="1" step="any" class="field-input" oninput="App.inventory.onAdjItem()">`)}
                ${this.ui.field('Unit Cost (₱)', `<input type="number" id="adj-cost" value="0" min="0" step="any" class="field-input">`)}
                ${this.ui.field('Date', `<input type="date" id="adj-date" value="${Utils.today()}" class="field-input">`)}
                ${this.ui.field('Reason', `<input type="text" id="adj-reason" placeholder="e.g. Initial stock count" class="field-input">`, 'sm:col-span-2 lg:col-span-3 xl:col-span-4')}
                <div class="tooltip-container sm:col-span-2 lg:col-span-1 xl:col-span-2 self-end">
                    <button type="submit" class="bg-primary text-white font-bold w-full py-2 rounded-lg transition duration-150">Add to Inventory</button>
                    <span class="tooltip-text">Adds (or removes, with a negative quantity) stock without a PO. Use for initial setup or corrections.</span>
                </div>
                <p id="adj-hint" class="text-xs text-secondary col-span-full -mt-1"></p>
            </form>

            <div id="inventory-list">
            ${this.tables.render({
                id: `inventory-${this.view}`, title: `Current Inventory — ${this.typeLabel(this.view)}`,
                subtitle: `${items.length} items · ${low} at or below reorder level · stock value ${Utils.formatCurrency(items.reduce((s, i) => s + Math.max(0, i.stock) * (i.unit_cost || 0), 0))}`,
                rows: items, defaultSort: { key: 'name', dir: 'asc' }, exportName: `inventory_${this.view}`,
                emptyText: 'No items in this category yet. Use "New Catalog Item" or the form above.',
                addButton: { label: 'New Item', onclick: `App.inventory.addItem('${this.view}')` },
                filters: [{ key: 'stock', label: 'All stock levels', options: [{ value: 'low', label: 'Low / reorder' }, { value: 'out', label: 'Out of stock' }, { value: 'ok', label: 'In stock (OK)' }],
                    test: (r, v) => v === 'low' ? this.stock.isLowStock(r) : v === 'out' ? r.stock <= 0 : !this.stock.isLowStock(r) }],
                columns: [
                    { key: 'photo', label: '', sortable: false, printable: false, value: () => '', render: r => this.thumb(r) },
                    { key: 'name', label: 'Item', value: r => r.name, csv: r => r.name, render: r => `<span class="font-semibold text-white">${Utils.esc(r.name)}</span><span class="block text-[0.7rem] text-secondary">${Utils.esc(r.id)}</span>` },
                    { key: 'id', label: 'ID', value: r => r.id, className: 'hidden', printable: true },
                    { key: 'stock', label: 'Stock', align: 'right', value: r => r.stock, csv: r => r.stock,
                      render: r => `<span class="font-bold ${r.stock <= 0 ? 'text-red-400' : this.stock.isLowStock(r) ? 'text-accent' : 'text-white'}">${Utils.formatNumber(r.stock, 4)}</span> ${this.stock.isLowStock(r) ? this.ui.badge(r.stock <= 0 ? 'Out' : 'Low', r.stock <= 0 ? 'red' : 'amber') : ''}` },
                    { key: 'units', label: 'Units', value: r => r.units || '' },
                    { key: 'unit_cost', label: 'Unit Cost (₱)', align: 'right', value: r => r.unit_cost || 0, csv: r => r.unit_cost || 0,
                      render: r => `<span class="editable-field" contenteditable="true" title="Click to edit" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" onblur="App.inventory.updatePrice('${r.id}', 'unit_cost', this)">${(r.unit_cost || 0).toFixed(2)}</span>` },
                    { key: 'sale_price', label: 'Sale Price (₱)', align: 'right', value: r => this.isSellable(r.type) ? (r.sale_price || 0) : '', csv: r => this.isSellable(r.type) ? (r.sale_price || 0) : '',
                      render: r => this.isSellable(r.type) ? `<span class="editable-field" contenteditable="true" title="Click to edit" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" onblur="App.inventory.updatePrice('${r.id}', 'sale_price', this)">${(r.sale_price || 0).toFixed(2)}</span>` : '<span class="text-secondary">—</span>' },
                    { key: 'value', label: 'Stock Value', align: 'right', value: r => Math.max(0, r.stock) * (r.unit_cost || 0), format: 'currency', total: 'sum' },
                    { key: 'reorder', label: 'Reorder Lvl', align: 'right', value: r => this.stock.lowStockLevel(r), render: r => `<span class="${r.reorder_level === undefined || r.reorder_level === null || r.reorder_level === '' ? 'text-secondary' : ''}">${Utils.formatNumber(this.stock.lowStockLevel(r))}</span>` },
                    { key: 'updated', label: 'Price Updated', value: r => r.price_last_updated || '', render: r => `<span class="text-secondary">${Utils.formatDate(r.price_last_updated)}</span>` }
                ],
                actions: r => `<div class="row-actions">
                    ${r.type === 'splint' ? `<button type="button" onclick="App.bom.open('${r.id}')" class="bom-edit-button dt-btn" title="Edit recipe (BOM)">${this.ui.icon('bom', '')}BOM</button>` : ''}
                    ${this.ui.iconBtn(`App.history.open('${r.id}')`, 'history', 'Stock history')}
                    ${this.ui.iconBtn(`App.attachments.open('${r.id}', 'Inventory')`, 'photo', 'Attach photo')}
                    ${this.ui.iconBtn(`App.inventory.editItem('${r.id}')`, 'edit', 'Edit item')}
                    ${this.ui.iconBtn(`App.inventory.deleteItem('${r.id}')`, 'trash', 'Delete item', { danger: true })}</div>`
            })}
            </div>

            ${this.adjustmentsTable()}
        `;
    }

    thumb(item) {
        const img = this.data.imageAttachments.find(x => x.related_id === item.id && x.type === 'Inventory');
        return img
            ? `<img src="${img.base64}" alt="" class="thumb cursor-pointer" onclick="App.attachments.open('${item.id}', 'Inventory')">`
            : `<span class="thumb thumb-empty text-secondary">${this.ui.icon('image', 'w-4 h-4')}</span>`;
    }

    adjustmentsTable() {
        const adjs = this.data.manualAdjustments;
        return `<div class="mt-6">${this.tables.render({
            id: 'adjustments', title: 'Manual Adjustments Log', subtitle: 'Old-stock entries and stock corrections. Editing or deleting one corrects the item’s stock automatically.',
            rows: adjs, defaultSort: { key: 'date', dir: 'desc' }, exportName: 'stock_adjustments', emptyText: 'No manual adjustments yet.',
            filters: [{ key: 'dir', label: 'In & out', options: [{ value: 'in', label: 'Additions' }, { value: 'out', label: 'Removals' }], test: (r, v) => v === 'in' ? r.qty > 0 : r.qty < 0 }],
            columns: [
                { key: 'id', label: 'Ref' },
                { key: 'date', label: 'Date', render: r => Utils.formatDate(r.date) },
                { key: 'item', label: 'Item', value: r => (this.stock.findItem(r.itemId) || {}).name || r.itemName },
                { key: 'qty', label: 'Qty', align: 'right', value: r => r.qty, render: r => `<span class="font-bold ${r.qty < 0 ? 'text-red-400' : 'text-green-400'}">${r.qty > 0 ? '+' : ''}${Utils.formatNumber(r.qty, 4)}</span>` },
                { key: 'reason', label: 'Reason', wrap: true, value: r => r.reason || '' }
            ],
            actions: r => this.ui.editDeleteBtns(`App.records.edit('adj', '${r.id}')`, `App.records.remove('adj', '${r.id}')`, 'adjustment')
        })}</div>`;
    }

    onAdjItem() {
        const it = this.stock.findItemByName(this.val('adj-item-name'));
        const hint = document.getElementById('adj-hint');
        if (it) {
            this.setVal('adj-item-type', it.type);
            const costEl = document.getElementById('adj-cost');
            if (costEl && document.activeElement !== costEl && (costEl.value === '0' || costEl.value === '')) costEl.value = it.unit_cost || 0;
            const q = Utils.num(this.val('adj-qty'));
            if (hint) hint.innerHTML = `${Utils.esc(it.name)}: ${Utils.formatNumber(it.stock, 4)} ${Utils.esc(it.units || '')} now → <strong class="text-white">${Utils.formatNumber(Utils.round(it.stock + q), 4)}</strong> after this entry.`;
        } else if (hint) {
            hint.textContent = this.val('adj-item-name') ? 'New item — it will be added to the catalog.' : '';
        }
    }

    async addManualStock() {
        const name = this.val('adj-item-name');
        const type = this.val('adj-item-type');
        const qty = this.num('adj-qty');
        const costRaw = this.val('adj-cost');
        const cost = costRaw === '' ? NaN : Utils.num(costRaw);
        const reason = this.val('adj-reason') || 'Manual adjustment';
        const date = this.val('adj-date') || Utils.today();
        if (!name || !qty || (costRaw !== '' && cost < 0)) return this.ui.toast('Please enter an item name, a non-zero quantity, and a valid cost.', 'error');
        let item = this.stock.findItemByName(name);
        if (!item) {
            if (qty < 0) return this.ui.toast('Cannot remove stock from an item that does not exist yet.', 'error');
            item = { id: this.generateItemId(type), type, name, stock: 0, unit_cost: Number.isFinite(cost) ? cost : 0, units: type === 'splint' ? 'pcs' : 'units', price_last_updated: Utils.today() };
            if (type === 'splint') item.bom = [];
            this.data.inventory.push(item);
        } else if (Number.isFinite(cost) && cost > 0 && qty > 0) {
            item.unit_cost = cost;
            item.price_last_updated = Utils.today();
        }
        if (item.stock + qty < 0 && !(await this.ui.confirm({
            title: 'Stock will go negative', tone: 'warning', confirmLabel: 'Continue', cancelLabel: 'Go back',
            message: `Removing ${Utils.formatNumber(Math.abs(qty), 4)} ${item.units || ''} leaves ${item.name} at ${Utils.formatNumber(item.stock + qty, 4)}.`,
            note: `Current stock is ${Utils.formatNumber(item.stock, 4)} ${item.units || ''}.`
        }))) return;
        const adj = { id: Utils.nextId('ADJ', this.data.manualAdjustments), date, itemId: item.id, itemName: item.name, qty, reason };
        this.data.manualAdjustments.push(adj);
        this.stock.apply(this.stock.effectsOf('adj', adj));
        await this.app.saveAndRerender();
        this.ui.toast(`${qty > 0 ? 'Added' : 'Removed'} ${Utils.formatNumber(Math.abs(qty), 4)} ${item.units || 'units'} of ${item.name}.`);
    }

    async updatePrice(itemId, field, el) {
        const item = this.stock.findItem(itemId);
        if (!item) return;
        const v = Utils.num(el.innerText, NaN);
        if (!Number.isFinite(v) || v < 0) {
            el.innerText = (item[field] || 0).toFixed(2);
            return this.ui.toast('Invalid price. Please enter a valid number.', 'error');
        }
        if (Utils.round(v, 4) === Utils.round(item[field] || 0, 4)) { el.innerText = v.toFixed(2); return; }
        item[field] = v;
        item.price_last_updated = Utils.today();
        await this.app.saveAndRerender();
        this.ui.toast(`${item.name} ${field === 'unit_cost' ? 'unit cost' : 'sale price'} updated to ${Utils.formatCurrency(v)}.`);
    }

    itemFields(item = {}) {
        return [
            { key: 'name', label: 'Item Name', type: 'text', value: item.name || '', required: true, span: 'full' },
            { key: 'type', label: 'Type', type: 'select', options: InventoryPage.TYPES.map(t => ({ value: t.key, label: this.typeLabel(t.key) })), value: item.type || this.view },
            { key: 'units', label: 'Units', type: 'text', value: item.units || '', placeholder: 'pcs, rolls, gal…' },
            { key: 'stock', label: 'Stock on Hand', type: 'number', value: item.stock ?? 0, hint: item.id ? 'Changing this logs a stock-correction adjustment.' : '' },
            { key: 'reorder_level', label: 'Reorder Level', type: 'number', min: 0, value: item.reorder_level ?? '', placeholder: `Default ${this.data.settings.lowStockThreshold}` },
            { key: 'unit_cost', label: 'Unit Cost (₱)', type: 'number', min: 0, value: item.unit_cost ?? 0, required: true },
            { key: 'sale_price', label: 'Sale Price (₱)', type: 'number', min: 0, value: item.sale_price ?? '', placeholder: 'For sellable items' },
            { key: 'notes', label: 'Notes', type: 'textarea', value: item.notes || '', span: 'full' }
        ];
    }

    addItem(type) {
        this.app.modal.open({
            title: 'New Catalog Item', subtitle: 'Opening stock is logged as a manual adjustment so the ledger reconciles.',
            fields: this.itemFields({ type: type || this.view }), submitLabel: 'Add Item',
            onSubmit: async (v, modal) => {
                if (this.stock.findItemByName(v.name)) { modal.setError('An item with that name already exists.'); return false; }
                const item = { id: this.generateItemId(v.type), type: v.type, name: v.name, units: v.units || 'units', stock: 0, unit_cost: v.unit_cost || 0, price_last_updated: Utils.today(), notes: v.notes };
                if (v.sale_price !== null) item.sale_price = v.sale_price;
                if (v.reorder_level !== null) item.reorder_level = v.reorder_level;
                if (item.type === 'splint') item.bom = [];
                this.data.inventory.push(item);
                if (v.stock) this._logCorrection(item, v.stock, 'Opening stock');
                if (item.type !== this.view) this.view = item.type;
                await this.app.saveAndRerender();
                this.ui.toast(`${item.name} added to the catalog.`);
            }
        });
    }

    editItem(itemId) {
        const item = this.stock.findItem(itemId);
        if (!item) return;
        this.app.modal.open({
            title: `Edit ${item.name}`, subtitle: `ID ${Utils.esc(item.id)}`,
            fields: this.itemFields(item),
            onSubmit: async (v, modal) => {
                if (this.data.inventory.some(i => i.id !== item.id && Utils.sameText(i.name, v.name))) { modal.setError('Another item already has that name.'); return false; }
                const delta = Utils.round((v.stock ?? item.stock) - item.stock);
                if (item.name !== v.name) this._renameItem(item, v.name);
                Object.assign(item, { name: v.name, type: v.type, units: v.units || item.units, unit_cost: v.unit_cost || 0, notes: v.notes, price_last_updated: Utils.today() });
                if (v.sale_price === null) delete item.sale_price; else item.sale_price = v.sale_price;
                if (v.reorder_level === null) delete item.reorder_level; else item.reorder_level = v.reorder_level;
                if (item.type === 'splint' && !Array.isArray(item.bom)) item.bom = [];
                if (delta) this._logCorrection(item, delta, 'Stock count correction (edit)');
                await this.app.saveAndRerender();
                this.ui.toast(`${item.name} updated${delta ? ` · stock ${delta > 0 ? '+' : ''}${Utils.formatNumber(delta, 4)} logged` : ''}.`);
            }
        });
    }
    _logCorrection(item, delta, reason) {
        const adj = { id: Utils.nextId('ADJ', this.data.manualAdjustments), date: Utils.today(), itemId: item.id, itemName: item.name, qty: delta, reason };
        this.data.manualAdjustments.push(adj);
        this.stock.apply(this.stock.effectsOf('adj', adj));
    }
    /** Keeps stored names on past records in step with a renamed item. */
    _renameItem(item, newName) {
        const d = this.data, old = item.name;
        d.purchaseOrders.forEach(po => po.items.forEach(l => { if ((l.inv_id === item.id) || (!l.inv_id && Utils.sameText(l.name, old))) { l.name = newName; l.inv_id = item.id; } }));
        d.salesOrders.forEach(so => so.items.forEach(l => { if (l.inv_id === item.id) l.name = newName; }));
        d.manufacturingOrders.forEach(m => { if (m.productId === item.id) m.productName = newName; });
        d.issuances.forEach(i => { if (i.materialId === item.id) i.materialName = newName; });
        d.manualAdjustments.forEach(a => { if (a.itemId === item.id) a.itemName = newName; });
    }

    async deleteItem(itemId) {
        const item = this.stock.findItem(itemId);
        if (!item) return;
        const d = this.data;
        const refs = d.salesOrders.filter(so => so.items.some(l => l.inv_id === itemId)).length +
            d.manufacturingOrders.filter(m => m.productId === itemId).length + d.issuances.filter(i => i.materialId === itemId).length +
            d.purchaseOrders.filter(po => po.items.some(l => l.inv_id === itemId || Utils.sameText(l.name, item.name))).length;
        const usedIn = d.inventory.filter(p => (p.bom || []).some(b => b.material_id === itemId)).map(p => p.name);
        const details = [];
        if (item.stock) details.push(`It still has ${Utils.formatNumber(item.stock, 4)} ${item.units || 'units'} in stock`);
        if (refs) details.push(`${refs} past record(s) reference it — they're kept and will show it as a deleted item`);
        if (usedIn.length) details.push(`It's removed from the recipe (BOM) of: ${usedIn.join(', ')}`);
        if (!(await this.ui.confirm({
            title: 'Delete this item?', tone: 'danger', confirmLabel: 'Delete Item', cancelLabel: 'Keep it',
            message: `${item.name} (${item.id}) will be removed from the catalog.`, details, note: 'This cannot be undone.'
        }))) return;
        d.inventory = d.inventory.filter(i => i.id !== itemId);
        d.inventory.forEach(p => { if (p.bom) p.bom = p.bom.filter(b => b.material_id !== itemId); });
        d.imageAttachments = d.imageAttachments.filter(img => !(img.related_id === itemId && img.type === 'Inventory'));
        await this.app.saveAndRerender();
        this.ui.toast(`${item.name} deleted.`);
    }

    printValuation() {
        const types = InventoryPage.TYPES;
        let grand = 0;
        const body = types.map(t => {
            const items = this.data.inventory.filter(i => i.type === t.key).sort((a, b) => a.name.localeCompare(b.name));
            if (!items.length) return '';
            const sub = items.reduce((s, i) => s + Math.max(0, i.stock) * (i.unit_cost || 0), 0);
            grand += sub;
            return `<h3 style="margin: 10px 0 4px; font-size: 12pt;">${t.label}</h3>` + this.app.printer.table(
                ['Item', 'ID', 'Stock', 'Units', 'Unit Cost', 'Stock Value', 'Sale Price'],
                items.map(i => [Utils.esc(i.name), Utils.esc(i.id), Utils.formatNumber(i.stock, 4), Utils.esc(i.units || ''), Utils.formatCurrency(i.unit_cost), Utils.formatCurrency(Math.max(0, i.stock) * (i.unit_cost || 0)), i.sale_price ? Utils.formatCurrency(i.sale_price) : '—']),
                { right: [2, 4, 5, 6], footer: ['Subtotal', '', '', '', '', Utils.formatCurrency(sub), ''] });
        }).join('');
        this.app.printer.print('Inventory Valuation Report', body + `<p style="font-size: 12pt; font-weight: 700;">Total inventory value (at cost): ${Utils.formatCurrency(grand)}</p>`);
    }
}
