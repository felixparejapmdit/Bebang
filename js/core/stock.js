/* ============================================================
   StockService — the one place that knows how each record type moves stock.
   Every transaction kind maps to a list of { itemId, delta } "effects", which is
   what lets edits and deletes reverse/re-apply stock correctly, and what the
   Inventory Ledger, item History and stock reconciliation are all built from.

   Kinds:  po  (Checked purchase order → +qty)       adj (manual adjustment → ±qty)
           mo  (Completed remittance → +splints)     iss (Issued raw material → −qty)
           so  (fulfilled sale / in-store sale → −qty)
   ============================================================ */
class StockService {
    constructor(app) { this.app = app; }
    get data() { return this.app.data; }

    findItem(id) { return this.data.inventory.find(i => i.id === id); }
    findItemByName(name) { return this.data.inventory.find(i => Utils.sameText(i.name, name)); }
    /** PO lines store the inventory id once checked in; older ones only have the name. */
    resolvePoItem(line) { return (line.inv_id && this.findItem(line.inv_id)) || this.findItemByName(line.name); }

    isFulfilledSale(so) { return so.status !== 'Pending Delivery'; }
    lowStockLevel(item) {
        const lvl = item.reorder_level;
        return (lvl === undefined || lvl === null || lvl === '') ? Utils.num(this.data.settings.lowStockThreshold, 10) : Utils.num(lvl);
    }
    isLowStock(item) { return item.stock <= this.lowStockLevel(item); }

    effectsOf(kind, rec) {
        if (!rec) return [];
        switch (kind) {
            case 'po':
                return rec.status === 'Checked'
                    ? rec.items.map(l => ({ itemId: (this.resolvePoItem(l) || {}).id, delta: Utils.num(l.qty) })).filter(e => e.itemId)
                    : [];
            case 'adj': return [{ itemId: rec.itemId, delta: Utils.num(rec.qty) }];
            case 'mo': return rec.status === 'Completed' ? [{ itemId: rec.productId, delta: Utils.num(rec.qty) }] : [];
            case 'iss': return rec.status === 'Issued' ? [{ itemId: rec.materialId, delta: -Utils.num(rec.qty) }] : [];
            case 'so':
                return this.isFulfilledSale(rec) ? rec.items.map(l => ({ itemId: l.inv_id, delta: -Utils.num(l.qty) })) : [];
            default: return [];
        }
    }

    /** Net effect of replacing `oldFx` with `newFx` (both lists of {itemId, delta}). */
    diff(oldFx, newFx) {
        const net = {};
        oldFx.forEach(e => { net[e.itemId] = (net[e.itemId] || 0) - e.delta; });
        newFx.forEach(e => { net[e.itemId] = (net[e.itemId] || 0) + e.delta; });
        return Object.entries(net).filter(([, d]) => Math.abs(d) > 1e-9).map(([itemId, delta]) => ({ itemId, delta }));
    }
    negate(fx) { return fx.map(e => ({ itemId: e.itemId, delta: -e.delta })); }

    /** Human-readable problems (stock going below zero / missing items) if `fx` were applied. */
    problems(fx) {
        return fx.flatMap(e => {
            const item = this.findItem(e.itemId);
            if (!item) return e.delta < 0 ? [] : [`An item in this record no longer exists in inventory.`];
            const after = Utils.round(item.stock + e.delta);
            return after < 0 ? [`${item.name}: stock would become ${Utils.formatNumber(after, 4)} ${item.units || ''} (have ${Utils.formatNumber(item.stock, 4)}).`] : [];
        });
    }
    apply(fx) {
        fx.forEach(e => {
            const item = this.findItem(e.itemId);
            if (item) item.stock = Utils.round(item.stock + e.delta);
        });
    }
    describe(fx) {
        return fx.map(e => {
            const item = this.findItem(e.itemId);
            return `${e.delta > 0 ? '+' : ''}${Utils.formatNumber(e.delta, 4)} ${item ? item.name : 'Unknown item'}`;
        }).join(', ');
    }

    // ---------------- Ledger ----------------
    /** Every stock movement, oldest first, with a running Qty-on-Hand per item. */
    ledgerEvents() {
        const d = this.data;
        const events = [];
        const itemInfo = (id, fallbackType) => {
            const it = this.findItem(id);
            return { itemType: it ? it.type : fallbackType, unit: it ? (it.units || 'units') : 'units', unitCost: it ? (it.unit_cost || 0) : 0 };
        };
        d.purchaseOrders.filter(po => po.status === 'Checked').forEach(po => {
            po.items.forEach(line => {
                const it = this.resolvePoItem(line);
                events.push({
                    date: po.date, itemId: it ? it.id : line.name, itemName: it ? it.name : line.name,
                    ...itemInfo(it && it.id, line.type || 'raw'), unitCost: Utils.num(line.unit_cost),
                    qtyIn: Utils.num(line.qty), qtyOut: 0,
                    remarks: `Purchase Order ${po.id}${po.supplier ? ` — ${po.supplier}` : ''}`, ref: { kind: 'po', id: po.id }
                });
            });
        });
        d.manualAdjustments.forEach(adj => {
            const q = Utils.num(adj.qty);
            const it = this.findItem(adj.itemId);
            events.push({
                date: adj.date, itemId: adj.itemId, itemName: it ? it.name : adj.itemName, ...itemInfo(adj.itemId, 'raw'),
                qtyIn: q > 0 ? q : 0, qtyOut: q < 0 ? -q : 0,
                remarks: `${adj.reason || 'Manual adjustment'} (${adj.id})`, ref: { kind: 'adj', id: adj.id }
            });
        });
        d.manufacturingOrders.filter(mo => mo.status === 'Completed').forEach(mo => {
            const it = this.findItem(mo.productId);
            events.push({
                date: mo.date, itemId: mo.productId, itemName: it ? it.name : mo.productName, ...itemInfo(mo.productId, 'splint'),
                qtyIn: Utils.num(mo.qty), qtyOut: 0, remarks: `Remitted — ${mo.id} (${mo.workerName})`, ref: { kind: 'mo', id: mo.id }
            });
        });
        d.issuances.filter(iss => iss.status === 'Issued').forEach(iss => {
            const it = this.findItem(iss.materialId);
            events.push({
                date: iss.date, itemId: iss.materialId, itemName: it ? it.name : iss.materialName, ...itemInfo(iss.materialId, 'raw'),
                qtyIn: 0, qtyOut: Utils.num(iss.qty), remarks: `Issued — ${iss.id} to ${iss.workerName}`, ref: { kind: 'iss', id: iss.id }
            });
        });
        d.salesOrders.filter(so => this.isFulfilledSale(so)).forEach(so => {
            so.items.forEach(line => {
                const it = this.findItem(line.inv_id);
                events.push({
                    date: so.date, itemId: line.inv_id, itemName: it ? it.name : line.name, ...itemInfo(line.inv_id, 'splint'),
                    qtyIn: 0, qtyOut: Utils.num(line.qty), remarks: `Sold — ${so.id} (${so.customer_name})`, ref: { kind: 'so', id: so.id }
                });
            });
        });
        // Stable chronological order: by date, then ins before outs on the same day.
        events.forEach((e, i) => { e._i = i; });
        events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (b.qtyIn - a.qtyIn) || (a._i - b._i)));
        const balance = {};
        events.forEach((e, i) => {
            balance[e.itemId] = Utils.round((balance[e.itemId] || 0) + e.qtyIn - e.qtyOut);
            e.qtyOnHand = balance[e.itemId];
            e.totalCost = (e.qtyIn || e.qtyOut) * (e.unitCost || 0);
            e.seq = i + 1;
        });
        return events;
    }

    /** Per-item totals: ledger balance vs the live stock number, so mismatches are visible and fixable. */
    stockSummary(events = this.ledgerEvents()) {
        const byItem = {};
        this.data.inventory.forEach(it => {
            byItem[it.id] = { itemId: it.id, itemName: it.name, itemType: it.type, unit: it.units || 'units', qtyIn: 0, qtyOut: 0, ledger: 0, live: it.stock, exists: true, unitCost: it.unit_cost || 0 };
        });
        events.forEach(e => {
            if (!byItem[e.itemId]) byItem[e.itemId] = { itemId: e.itemId, itemName: e.itemName, itemType: e.itemType, unit: e.unit, qtyIn: 0, qtyOut: 0, ledger: 0, live: null, exists: false, unitCost: 0 };
            const s = byItem[e.itemId];
            s.qtyIn = Utils.round(s.qtyIn + e.qtyIn);
            s.qtyOut = Utils.round(s.qtyOut + e.qtyOut);
            s.ledger = e.qtyOnHand;
        });
        return Object.values(byItem).map(s => ({ ...s, diff: s.exists ? Utils.round(s.live - s.ledger) : 0 }));
    }

    historyFor(itemId) { return this.ledgerEvents().filter(e => e.itemId === itemId); }
}
