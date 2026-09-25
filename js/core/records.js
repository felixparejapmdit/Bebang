/* ============================================================
   RecordService — create / edit / delete for every record type, in one place.
   Edits and deletes go through StockService, so stock is always reversed or
   re-applied correctly (e.g. deleting a delivered sale puts the stock back),
   linked records stay in sync (payroll payment ↔ its expense), and renaming a
   worker or customer carries over to all of their past records.
   ============================================================ */
class RecordService {
    static KINDS = {
        po: { collection: 'purchaseOrders', label: 'Purchase Order' },
        so: { collection: 'salesOrders', label: 'Sales Order' },
        mo: { collection: 'manufacturingOrders', label: 'Remittance' },
        iss: { collection: 'issuances', label: 'Issuance' },
        adj: { collection: 'manualAdjustments', label: 'Stock Adjustment' },
        exp: { collection: 'expenses', label: 'Expense' },
        pay: { collection: 'payrollPayments', label: 'Payroll Payment' },
        cust: { collection: 'customers', label: 'Customer' },
        worker: { collection: 'workers', label: 'Worker' },
        supplier: { collection: 'suppliers', label: 'Supplier' }
    };

    constructor(app) { this.app = app; }
    get data() { return this.app.data; }
    get stock() { return this.app.stock; }
    list(kind) { return this.data[RecordService.KINDS[kind].collection]; }
    find(kind, id) { return this.list(kind).find(r => r.id === id); }

    // ---------- option lists used by forms ----------
    workerOptions(current) {
        const names = this.data.workers.filter(w => w.active !== false).map(w => w.name);
        if (current && !names.includes(current)) names.push(current);
        return names;
    }
    itemOptions(types) {
        return this.data.inventory.filter(i => types.includes(i.type))
            .map(i => ({ value: i.id, label: `${i.name} (Stock: ${Utils.formatNumber(i.stock, 4)} ${i.units || ''})` }));
    }
    supplierNames() {
        return [...new Set([...this.data.suppliers.filter(s => s.active !== false).map(s => s.name), ...this.data.purchaseOrders.map(p => p.supplier).filter(Boolean)])].sort((a, b) => a.localeCompare(b));
    }
    /** Returns the supplier record for a typed name, creating it the first time (like customers). */
    findOrCreateSupplier(rawName) {
        const name = String(rawName || '').trim();
        if (!name) return null;
        let s = this.data.suppliers.find(x => Utils.sameText(x.name, name));
        if (!s) {
            s = { id: `VEND-${Utils.uuid()}`, name, contact: '', phone: '', email: '', address: '', notes: '', active: true };
            this.data.suppliers.push(s);
        }
        return s;
    }
    customerNames() { return this.data.customers.map(c => c.name).sort((a, b) => a.localeCompare(b)); }

    findOrCreateCustomer(rawName) {
        const name = String(rawName || '').trim();
        if (!name) return null;
        let c = this.data.customers.find(x => Utils.sameText(x.name, name));
        if (!c) {
            c = { id: `CUST-${Utils.uuid()}`, name, contact: '', phone: '', address: '', status: 'Customer', last_followup: Utils.today(), notes: '' };
            this.data.customers.push(c);
        }
        return c;
    }

    // ---------- form definitions ----------
    fieldsFor(kind, r = {}) {
        const s = this.data.settings;
        switch (kind) {
            case 'po': {
                const line = (r.items && r.items[0]) || {};
                return [
                    { key: 'date', label: 'Date', type: 'date', value: r.date || Utils.today(), required: true },
                    { key: 'supplier', label: 'Supplier', type: 'datalist', list: this.supplierNames(), value: r.supplier || '', placeholder: 'Optional' },
                    { key: 'name', label: 'Item Name', type: 'datalist', list: this.data.inventory.map(i => i.name), value: line.name || '', required: true, span: 'full' },
                    { key: 'type', label: 'Item Type', type: 'select', options: [{ value: 'raw', label: 'Raw Material' }, { value: 'supplies', label: 'Supplies' }, { value: 'equipment', label: 'Equipment' }], value: line.type || 'raw' },
                    { key: 'qty', label: 'Quantity', type: 'number', min: 0.0001, value: line.qty ?? 1, required: true },
                    { key: 'unit_cost', label: 'Unit Cost (₱)', type: 'number', min: 0, value: line.unit_cost ?? 0, required: true },
                    { key: 'notes', label: 'Notes', type: 'textarea', value: r.notes || '', span: 'full' }
                ];
            }
            case 'so': {
                const line = (r.items && r.items[0]) || {};
                const multi = r.items && r.items.length > 1;
                const statusOpts = r.customer_id === 'CUST-0' ? ['Completed (In-Store)'] : ['Pending Delivery', 'Delivered/Billed'];
                return [
                    { key: 'date', label: 'Date', type: 'date', value: r.date || Utils.today(), required: true },
                    { key: 'status', label: 'Status', type: 'select', options: statusOpts, value: r.status || statusOpts[0] },
                    { key: 'customer_name', label: 'Delivered To / Customer', type: 'datalist', list: this.customerNames(), value: r.customer_name || '', required: true, span: 'full', readonly: r.customer_id === 'CUST-0' },
                    ...(multi ? [] : [
                        { key: 'inv_id', label: 'Item', type: 'select', options: this.itemOptions(['splint', 'supplies', 'equipment']), value: line.inv_id || '', required: true, span: 'full' },
                        { key: 'qty', label: 'Quantity', type: 'number', min: 0.0001, value: line.qty ?? 1, required: true },
                        { key: 'price', label: 'Unit Price (₱)', type: 'number', min: 0, value: line.price ?? 0, required: true }
                    ]),
                    { key: 'notes', label: 'Notes / Reference No.', type: 'textarea', value: r.notes || '', span: 'full', hint: multi ? 'This order has several items — only its date, customer, status and notes can be edited here.' : '' }
                ];
            }
            case 'mo':
                return [
                    { key: 'date', label: 'Date', type: 'date', value: r.date || Utils.today(), required: true },
                    { key: 'workerName', label: 'Worker', type: 'select', options: this.workerOptions(r.workerName), value: r.workerName || '', required: true, placeholder: 'Select worker…' },
                    { key: 'productId', label: 'Splint Size', type: 'select', options: this.itemOptions(['splint']), value: r.productId || '', required: true, span: 'full', placeholder: 'Select splint…' },
                    { key: 'qty', label: 'Quantity Remitted', type: 'number', min: 1, step: 1, value: r.qty ?? 1, required: true }
                ];
            case 'iss':
                return [
                    { key: 'date', label: 'Date', type: 'date', value: r.date || Utils.today(), required: true },
                    { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Issued'], value: r.status || 'Pending' },
                    { key: 'workerName', label: 'Worker', type: 'select', options: this.workerOptions(r.workerName), value: r.workerName || '', required: true, placeholder: 'Select worker…' },
                    { key: 'materialId', label: 'Raw Material', type: 'select', options: this.itemOptions(['raw']), value: r.materialId || '', required: true, placeholder: 'Select material…' },
                    { key: 'qty', label: 'Quantity', type: 'number', min: 0.0001, value: r.qty ?? 1, required: true }
                ];
            case 'adj':
                return [
                    { key: 'item', label: 'Item', type: 'text', value: (this.stock.findItem(r.itemId) || {}).name || r.itemName, readonly: true, span: 'full' },
                    { key: 'date', label: 'Date', type: 'date', value: r.date || Utils.today(), required: true },
                    { key: 'qty', label: 'Quantity (+ add / − remove)', type: 'number', value: r.qty ?? 0, required: true },
                    { key: 'reason', label: 'Reason', type: 'text', value: r.reason || '', span: 'full' }
                ];
            case 'exp':
                return [
                    { key: 'date', label: 'Date', type: 'date', value: r.date || Utils.today(), required: true },
                    { key: 'category', label: 'Category', type: 'select', options: [...new Set([...s.expenseCategories, ...(r.category ? [r.category] : [])])], value: r.category || s.expenseCategories[0], required: true },
                    { key: 'description', label: 'Description', type: 'text', value: r.description || '', required: true, span: 'full' },
                    { key: 'amount', label: 'Amount (₱)', type: 'number', min: 0.01, value: r.amount ?? '', required: true },
                    { key: 'paidTo', label: 'Paid To', type: 'text', value: r.paidTo || '', placeholder: 'Optional' },
                    { key: 'notes', label: 'Notes / OR No.', type: 'textarea', value: r.notes || '', span: 'full', hint: r.paymentId ? 'Linked to a payroll payment — changes are mirrored there.' : '' }
                ];
            case 'pay':
                return [
                    { key: 'date', label: 'Date', type: 'date', value: r.date || Utils.today(), required: true },
                    { key: 'workerName', label: 'Worker', type: 'select', options: this.workerOptions(r.workerName), value: r.workerName || '', required: true, placeholder: 'Select worker…' },
                    { key: 'amount', label: 'Amount Paid (₱)', type: 'number', min: 0.01, value: r.amount ?? '', required: true },
                    { key: 'note', label: 'Note', type: 'text', value: r.note || '', placeholder: 'e.g. Week 38 payout' }
                ];
            case 'cust':
                return [
                    { key: 'name', label: 'Hospital / Clinic / Customer Name', type: 'text', value: r.name || '', required: true, span: 'full' },
                    { key: 'contact', label: 'Contact Person', type: 'text', value: r.contact || '' },
                    { key: 'phone', label: 'Phone', type: 'tel', value: r.phone || '' },
                    { key: 'address', label: 'Address', type: 'text', value: r.address || '', span: 'full' },
                    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'Customer', label: 'Existing Customer' }, { value: 'Lead', label: 'Potential Lead' }], value: r.status || 'Customer' },
                    { key: 'last_followup', label: 'Last Follow-up', type: 'date', value: r.last_followup || Utils.today() },
                    { key: 'notes', label: 'Notes', type: 'textarea', value: r.notes || '', span: 'full' }
                ];
            case 'worker':
                return [
                    { key: 'name', label: 'Worker Name', type: 'text', value: r.name || '', required: true, span: 'full' },
                    { key: 'rate', label: 'Rate (₱ per splint)', type: 'number', min: 0, value: r.rate ?? 0, required: true },
                    { key: 'phone', label: 'Phone', type: 'tel', value: r.phone || '' },
                    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active — shown in Manufacturing' }, { value: 'inactive', label: 'Inactive — hidden, history kept' }], value: r.active === false ? 'inactive' : 'active' },
                    { key: 'notes', label: 'Notes', type: 'textarea', value: r.notes || '', span: 'full' }
                ];
            case 'supplier':
                return [
                    { key: 'name', label: 'Supplier Name', type: 'text', value: r.name || '', required: true, span: 'full' },
                    { key: 'contact', label: 'Contact Person', type: 'text', value: r.contact || '' },
                    { key: 'phone', label: 'Phone', type: 'tel', value: r.phone || '' },
                    { key: 'email', label: 'Email', type: 'email', value: r.email || '' },
                    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive — hidden from suggestions' }], value: r.active === false ? 'inactive' : 'active' },
                    { key: 'address', label: 'Address', type: 'text', value: r.address || '', span: 'full' },
                    { key: 'notes', label: 'Notes (items supplied, terms…)', type: 'textarea', value: r.notes || '', span: 'full' }
                ];
        }
        return [];
    }

    // ---------- create ----------
    create(kind, defaults = {}) {
        const label = RecordService.KINDS[kind].label;
        this.app.modal.open({
            title: `Add ${label}`,
            fields: this.fieldsFor(kind, defaults),
            submitLabel: `Add ${label}`,
            onSubmit: async (v, modal) => {
                const d = this.data;
                if (kind === 'exp') {
                    d.expenses.push({ id: Utils.nextId('EXP', d.expenses, 4), date: v.date, category: v.category, description: v.description, amount: v.amount, paidTo: v.paidTo, notes: v.notes });
                } else if (kind === 'cust') {
                    if (d.customers.some(c => Utils.sameText(c.name, v.name))) { modal.setError('A customer with that name already exists.'); return false; }
                    d.customers.push({ id: `CUST-${Utils.uuid()}`, ...v });
                } else if (kind === 'worker') {
                    if (d.workers.some(w => Utils.sameText(w.name, v.name))) { modal.setError('A worker with that name already exists.'); return false; }
                    d.workers.push({ id: Utils.uuid(), name: v.name, rate: v.rate || 0, phone: v.phone, notes: v.notes, active: v.status !== 'inactive' });
                } else if (kind === 'supplier') {
                    if (d.suppliers.some(s => Utils.sameText(s.name, v.name))) { modal.setError('A supplier with that name already exists.'); return false; }
                    d.suppliers.push({ id: `VEND-${Utils.uuid()}`, name: v.name, contact: v.contact, phone: v.phone, email: v.email, address: v.address, notes: v.notes, active: v.status !== 'inactive' });
                } else if (kind === 'pay') {
                    const pay = { id: Utils.nextId('PAY', d.payrollPayments), date: v.date, workerName: v.workerName, amount: v.amount, note: v.note };
                    d.payrollPayments.push(pay);
                    d.expenses.push({ id: Utils.nextId('EXP', d.expenses, 4), date: v.date, category: 'Payroll', description: `Payroll: ${v.workerName}`, amount: v.amount, paymentId: pay.id, notes: v.note });
                }
                await this.app.saveAndRerender();
                this.app.ui.toast(`${label} added.`);
            },
            onChange: defaults.onChange
        });
    }

    // ---------- edit ----------
    edit(kind, id) {
        const rec = this.find(kind, id);
        if (!rec) return this.app.ui.toast('Record not found — it may have been deleted on another device.', 'error');
        const label = RecordService.KINDS[kind].label;
        const fields = this.fieldsFor(kind, rec);
        this.app.modal.open({
            title: `Edit ${label}${['cust', 'worker'].includes(kind) ? '' : ` ${rec.id}`}`,
            subtitle: this._editNote(kind, rec),
            fields,
            onSubmit: (v, modal) => this._saveEdit(kind, rec, v, modal),
            onChange: kind === 'so' ? (key, v, modal) => {
                if (key !== 'inv_id') return;
                const it = this.stock.findItem(v.inv_id);
                if (it) modal.setValue('price', it.sale_price || 0);
            } : null
        });
    }
    _editNote(kind, rec) {
        const fx = this.stock.effectsOf(kind, rec);
        return fx.length ? `This record has already moved stock (${Utils.esc(this.stock.describe(fx))}). Saving changes adjusts stock by the difference automatically.` : '';
    }

    async _saveEdit(kind, rec, v, modal) {
        const d = this.data;
        const next = structuredClone(rec);
        switch (kind) {
            case 'po': {
                const line = next.items[0];
                Object.assign(next, { date: v.date, supplier: v.supplier, notes: v.notes });
                Object.assign(line, { name: v.name, type: v.type, qty: v.qty, unit_cost: v.unit_cost });
                if (!Utils.sameText(rec.items[0].name, v.name)) delete line.inv_id;
                if (next.status === 'Checked') {
                    const it = this.stock.findItemByName(v.name);
                    if (!it) { modal.setError('This PO is already checked in, so its item must exist in inventory. Pick an existing item name.'); return false; }
                    line.inv_id = it.id;
                }
                break;
            }
            case 'so': {
                const cust = rec.customer_id === 'CUST-0' ? null : this.findOrCreateCustomer(v.customer_name);
                Object.assign(next, { date: v.date, status: v.status, notes: v.notes });
                if (cust) { next.customer_id = cust.id; next.customer_name = cust.name; }
                if (next.items.length === 1 && v.inv_id) {
                    const it = this.stock.findItem(v.inv_id);
                    next.items[0] = { inv_id: v.inv_id, name: it ? it.name : next.items[0].name, qty: v.qty, price: v.price };
                }
                next.total = Utils.round(next.items.reduce((s, l) => s + l.qty * l.price, 0), 2);
                break;
            }
            case 'mo': {
                const it = this.stock.findItem(v.productId);
                Object.assign(next, { date: v.date, workerName: v.workerName, productId: v.productId, productName: it ? it.name : next.productName, qty: v.qty });
                break;
            }
            case 'iss': {
                const it = this.stock.findItem(v.materialId);
                Object.assign(next, { date: v.date, status: v.status, workerName: v.workerName, materialId: v.materialId, materialName: it ? it.name : next.materialName, unit: it ? (it.units || 'units') : next.unit, qty: v.qty });
                break;
            }
            case 'adj':
                if (!v.qty) { modal.setError('Quantity cannot be zero.'); return false; }
                Object.assign(next, { date: v.date, qty: v.qty, reason: v.reason });
                break;
            case 'exp':
                Object.assign(next, { date: v.date, category: v.category, description: v.description, amount: v.amount, paidTo: v.paidTo, notes: v.notes });
                break;
            case 'pay':
                Object.assign(next, { date: v.date, workerName: v.workerName, amount: v.amount, note: v.note });
                break;
            case 'cust':
                if (d.customers.some(c => c.id !== rec.id && Utils.sameText(c.name, v.name))) { modal.setError('Another customer already has that name.'); return false; }
                Object.assign(next, v);
                break;
            case 'worker':
                if (d.workers.some(w => w.id !== rec.id && Utils.sameText(w.name, v.name))) { modal.setError('Another worker already has that name.'); return false; }
                Object.assign(next, { name: v.name, rate: v.rate || 0, phone: v.phone, notes: v.notes, active: v.status !== 'inactive' });
                break;
            case 'supplier':
                if (d.suppliers.some(s => s.id !== rec.id && Utils.sameText(s.name, v.name))) { modal.setError('Another supplier already has that name.'); return false; }
                Object.assign(next, { name: v.name, contact: v.contact, phone: v.phone, email: v.email, address: v.address, notes: v.notes, active: v.status !== 'inactive' });
                break;
        }

        const fx = this.stock.diff(this.stock.effectsOf(kind, rec), this.stock.effectsOf(kind, next));
        const problems = this.stock.problems(fx);
        if (problems.length && !(await this.app.ui.confirm({
            title: 'Stock will go negative', tone: 'warning', confirmLabel: 'Save anyway', cancelLabel: 'Go back',
            message: 'Saving this change leaves the following item(s) below zero:', warnings: problems,
            note: 'Usually this means stock was already used or sold. You can correct it later with a manual adjustment.'
        }))) return false;
        this.stock.apply(fx);

        // Carry renames / linked values over to related records.
        if (kind === 'worker' && rec.name !== next.name) this._renameWorker(rec.name, next.name);
        if (kind === 'cust' && rec.name !== next.name) d.salesOrders.forEach(so => { if (so.customer_id === rec.id) so.customer_name = next.name; });
        if (kind === 'supplier' && rec.name !== next.name) d.purchaseOrders.forEach(po => { if (Utils.sameText(po.supplier, rec.name)) po.supplier = next.name; });
        if (kind === 'pay') {
            const exp = d.expenses.find(e => e.paymentId === rec.id);
            if (exp) Object.assign(exp, { date: next.date, amount: next.amount, description: `Payroll: ${next.workerName}`, notes: next.note });
        }
        if (kind === 'exp' && rec.paymentId) {
            const pay = d.payrollPayments.find(p => p.id === rec.paymentId);
            if (pay) Object.assign(pay, { date: next.date, amount: next.amount });
        }

        Object.keys(rec).forEach(k => { if (!(k in next)) delete rec[k]; });
        Object.assign(rec, next);
        await this.app.saveAndRerender();
        this.app.ui.toast(`${RecordService.KINDS[kind].label} updated${fx.length ? ` · stock ${this.stock.describe(fx)}` : ''}.`);
    }

    _renameWorker(oldName, newName) {
        const d = this.data;
        d.manufacturingOrders.forEach(r => { if (r.workerName === oldName) r.workerName = newName; });
        d.issuances.forEach(r => { if (r.workerName === oldName) r.workerName = newName; });
        d.payrollPayments.forEach(r => { if (r.workerName === oldName) r.workerName = newName; });
        d.expenses.forEach(e => { if (e.category === 'Payroll' && e.description === `Payroll: ${oldName}`) e.description = `Payroll: ${newName}`; });
    }

    /** One-line description of a record, used in confirmation dialogs. */
    summary(kind, r) {
        const money = Utils.formatCurrency;
        switch (kind) {
            case 'po': return `${r.id} · ${r.items.map(l => `${l.name} ×${Utils.formatNumber(l.qty, 4)}`).join(', ')} · ${money(this.app.finance.poTotal(r))} · ${r.status}`;
            case 'so': return `${r.id} · ${r.customer_name} · ${r.items.map(l => `${l.name} ×${Utils.formatNumber(l.qty, 4)}`).join(', ')} · ${money(r.total)} · ${r.status}`;
            case 'mo': return `${r.id} · ${r.workerName} remitted ${Utils.formatNumber(r.qty)} × ${r.productName} on ${Utils.formatDate(r.date)}`;
            case 'iss': return `${r.id} · ${Utils.formatNumber(r.qty, 4)} ${r.unit || ''} of ${r.materialName} to ${r.workerName} (${r.status})`;
            case 'adj': return `${r.id} · ${(this.stock.findItem(r.itemId) || {}).name || r.itemName} ${r.qty > 0 ? '+' : ''}${Utils.formatNumber(r.qty, 4)} · ${r.reason || 'Manual adjustment'}`;
            case 'exp': return `${r.category} · ${r.description} · ${money(r.amount)} on ${Utils.formatDate(r.date)}`;
            case 'pay': return `${money(r.amount)} paid to ${r.workerName} on ${Utils.formatDate(r.date)}`;
            default: return r.name || r.id;
        }
    }

    // ---------- delete ----------
    async remove(kind, id) {
        const rec = this.find(kind, id);
        if (!rec) return;
        const d = this.data;
        const label = RecordService.KINDS[kind].label;
        const fx = this.stock.negate(this.stock.effectsOf(kind, rec));
        const details = [];
        if (fx.length) details.push(`Stock is reversed: ${this.stock.describe(fx)}`);
        if (kind === 'pay' || (kind === 'exp' && rec.paymentId)) details.push('The linked payroll payment and its expense entry are both removed');
        if (kind === 'so' && d.imageAttachments.some(img => img.related_id === rec.id)) details.push('Its delivery / payment photos are removed');
        if (kind === 'cust') {
            const n = d.salesOrders.filter(so => so.customer_id === rec.id).length;
            if (n) details.push(`${n} sales order(s) for this customer are kept as records`);
        }
        if (kind === 'worker') details.push('Their past remittances, issuances and payments are kept as records. Tip: set them Inactive instead to hide them but keep them editable');
        if (kind === 'supplier') {
            const n = d.purchaseOrders.filter(po => Utils.sameText(po.supplier, rec.name)).length;
            if (n) details.push(`${n} purchase order(s) keep the supplier name as a record`);
        }
        const problems = this.stock.problems(fx);
        if (!(await this.app.ui.confirm({
            title: `Delete this ${label.toLowerCase()}?`, tone: 'danger', confirmLabel: 'Delete', cancelLabel: 'Keep it',
            message: this.summary(kind, rec), details,
            warnings: problems.length ? ['This leaves negative stock:', ...problems] : [],
            note: 'This cannot be undone.'
        }))) return;

        this.stock.apply(fx);
        const coll = RecordService.KINDS[kind].collection;
        d[coll] = d[coll].filter(r => r !== rec);
        if (kind === 'so') d.imageAttachments = d.imageAttachments.filter(img => img.related_id !== rec.id);
        if (kind === 'pay') d.expenses = d.expenses.filter(e => e.paymentId !== rec.id);
        if (kind === 'exp' && rec.paymentId) d.payrollPayments = d.payrollPayments.filter(p => p.id !== rec.paymentId);
        await this.app.saveAndRerender();
        this.app.ui.toast(`${label} deleted${fx.length ? ' · stock reversed' : ''}.`);
    }
}
