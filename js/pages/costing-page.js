/* ============================================================
   CostingPage — the editable 2026 cost-per-piece table (per splint size) and
   the raw-material price & yield reference, with a one-click sync of the
   reference costs/prices into the Splint inventory items.
   ============================================================ */
class CostingPage extends BasePage {
    render() {
        const d = this.data;
        const rows = (d.costingRows || []).map((c, idx) => ({ ...c, idx }));
        const raws = (d.rawMaterialPriceRows || []).map((r, idx) => ({ ...r, idx }));
        const nf = (v) => (v === null || v === undefined || v === 0) ? '<span class="text-secondary">—</span>' : Utils.formatCurrency(v, true);
        return `
            ${this.ui.pageHeader('2026 Product Costing', 'Standard reference costs. Actual rates charged can vary by customer — the final price is set on each Sales Order.',
                `<button onclick="App.costing.syncToInventory()" class="quick-btn">🔄 Apply to Splint Inventory</button>
                 <button onclick="App.costing.restoreDefaults()" class="quick-btn">↺ Restore PDF Defaults</button>`)}
            ${this.tables.render({
                id: 'costing-rows', title: 'SPLINT — Cost Per Piece by Size', paginate: false,
                subtitle: `Source: "Updated 2026 (Product Cost) final.pdf". Overhead = ₱90,100 ÷ 28,000 pcs = ₱${OVERHEAD_PER_PC} / pc. Distributor gain = retail profit minus 20% / 25% / 30% retail discount.`,
                rows, defaultSort: { key: 'size', dir: 'desc' }, exportName: 'splint_costing', emptyText: 'No sizes yet. Click "Add Size" to start.',
                addButton: { label: 'Add Size', onclick: 'App.costing.editCostingRow(-1)' },
                columns: [
                    { key: 'size', label: 'Size', value: r => Utils.num(String(r.size).replace('#', '')), csv: r => `SPLINT ${r.size}`, render: r => `<span class="font-bold text-white">SPLINT ${Utils.esc(r.size)}</span>` },
                    ...COSTING_PARTS.map((p, i) => ({ key: `m${i}`, label: p, align: 'right', value: r => r.m[i] ?? '', csv: r => r.m[i] ?? '', render: r => nf(r.m[i]) })),
                    { key: 'overhead', label: 'Overhead', align: 'right', value: () => OVERHEAD_PER_PC, render: () => `<span class="text-secondary">${Utils.formatCurrency(OVERHEAD_PER_PC)}</span>` },
                    { key: 'total', label: 'Total Cost', align: 'right', value: r => r.total, render: r => `<strong class="text-white">${nf(r.total)}</strong>${this.checkTotal(r)}` },
                    { key: 'retail', label: 'Retail', align: 'right', value: r => r.retail, render: r => `<span class="text-green-400 font-semibold">${nf(r.retail)}</span>` },
                    { key: 'profit', label: 'Profit', align: 'right', value: r => r.retail - r.total, render: r => `<strong class="text-accent">${nf(r.retail - r.total)}</strong>` },
                    ...[20, 25, 30].map((p, i) => ({ key: `dist${i}`, label: `Dist ${p}%`, align: 'right', value: r => r.dist[i], render: r => `<span class="text-blue-300">${nf(r.dist[i])}</span>` }))
                ],
                actions: r => this.ui.editDeleteBtns(`App.costing.editCostingRow(${r.idx})`, `App.costing.deleteCostingRow(${r.idx})`, 'size')
            })}
            <div class="mt-6">
            ${this.tables.render({
                id: 'raw-price-rows', title: 'Raw Materials — Price & Yield Reference', subtitle: 'Unit prices and computed cost per piece (price ÷ yield).',
                rows: raws, defaultSort: { key: 'material', dir: 'asc' }, exportName: 'raw_material_prices', paginate: false, emptyText: 'No materials yet. Click "Add Material" to start.',
                addButton: { label: 'Add Material', onclick: 'App.costing.editRawRow(-1)' },
                columns: [
                    { key: 'material', label: 'Material', render: r => `<span class="text-white">${Utils.esc(r.material)}</span>` },
                    { key: 'price', label: 'Price', align: 'right', value: r => r.price, csv: r => r.price, render: r => `${Utils.formatCurrency(r.price)} <span class="text-secondary">/ ${Utils.esc(r.priceUnit)}</span>` },
                    { key: 'priceUnit', label: 'Per', value: r => r.priceUnit, className: 'hidden' },
                    { key: 'yieldQty', label: 'Yield', align: 'right', value: r => r.yieldQty, csv: r => r.yieldQty, render: r => `${Utils.formatNumber(r.yieldQty)} <span class="text-secondary">${Utils.esc(r.yieldUnit)}</span>` },
                    { key: 'yieldUnit', label: 'Yield Unit', value: r => r.yieldUnit, className: 'hidden' },
                    { key: 'costPerPc', label: 'Cost / Piece', align: 'right', value: r => r.costPerPc, render: r => `<strong>${Utils.formatCurrency(r.costPerPc, true)}</strong> <span class="text-secondary">/ pc</span>` },
                    { key: 'computed', label: 'Price ÷ Yield', align: 'right', value: r => r.yieldQty ? r.price / r.yieldQty : 0, render: r => `<span class="text-secondary">${r.yieldQty ? Utils.formatCurrency(r.price / r.yieldQty, true) : '—'}</span>` }
                ],
                actions: r => this.ui.editDeleteBtns(`App.costing.editRawRow(${r.idx})`, `App.costing.deleteRawRow(${r.idx})`, 'material')
            })}
            </div>`;
    }

    checkTotal(r) {
        const sum = r.m.reduce((s, v) => s + (v || 0), 0) + OVERHEAD_PER_PC;
        return Math.abs(sum - r.total) > 0.011 ? ` <span class="badge badge-amber" title="Components + overhead add up to ${Utils.formatCurrency(sum)}">≠ ${Utils.formatCurrency(sum)}</span>` : '';
    }

    editCostingRow(index) {
        const row = index === -1 ? { size: '', m: Array(COSTING_PARTS.length).fill(null), total: 0, retail: 0, dist: [0, 0, 0] } : this.data.costingRows[index];
        const fields = [
            { key: 'size', label: 'Size (e.g. #50)', type: 'text', value: row.size, required: true },
            ...COSTING_PARTS.map((label, i) => ({ key: `m${i}`, label: `${label} (₱)`, type: 'number', min: 0, value: row.m[i] })),
            { key: 'total', label: 'Total Cost (₱)', type: 'number', min: 0, value: row.total, hint: 'Leave blank to use components + overhead.' },
            { key: 'retail', label: 'Retail Price (₱)', type: 'number', min: 0, value: row.retail },
            { key: 'dist0', label: 'Distributor 20% (₱)', type: 'number', value: row.dist[0] },
            { key: 'dist1', label: 'Distributor 25% (₱)', type: 'number', value: row.dist[1] },
            { key: 'dist2', label: 'Distributor 30% (₱)', type: 'number', value: row.dist[2] }
        ];
        const computed = (v) => COSTING_PARTS.reduce((s, _, i) => s + (v[`m${i}`] || 0), 0) + OVERHEAD_PER_PC;
        this.app.modal.open({
            title: index === -1 ? 'Add Splint Size' : `Edit SPLINT ${row.size}`, fields, cols: 3, wide: true,
            onChange: (key, v, modal) => modal.setHint('total', `Components + overhead = <strong>${Utils.formatCurrency(computed(v))}</strong>. Leave blank to use this.`),
            onSubmit: async (v) => {
                const next = {
                    size: v.size.startsWith('#') ? v.size : `#${v.size}`,
                    m: COSTING_PARTS.map((_, i) => v[`m${i}`]),
                    total: v.total ?? Utils.round(computed(v), 3), retail: v.retail || 0,
                    dist: [v.dist0 || 0, v.dist1 || 0, v.dist2 || 0]
                };
                if (index === -1) this.data.costingRows.push(next); else this.data.costingRows[index] = next;
                await this.app.saveAndRerender();
                this.ui.toast(`SPLINT ${next.size} saved.`);
            }
        });
    }
    async deleteCostingRow(index) {
        const row = this.data.costingRows[index];
        if (!row || !(await this.ui.confirm({ title: 'Delete this size?', tone: 'danger', confirmLabel: 'Delete', message: `The costing row for SPLINT ${row.size} (total cost ${Utils.formatCurrency(row.total, true)}, retail ${Utils.formatCurrency(row.retail)}) will be removed.`, note: 'You can bring back the original rows with "Restore PDF Defaults".' }))) return;
        this.data.costingRows.splice(index, 1);
        await this.app.saveAndRerender();
        this.ui.toast('Row deleted.');
    }

    editRawRow(index) {
        const row = index === -1 ? { material: '', price: 0, priceUnit: '', yieldQty: 0, yieldUnit: '', costPerPc: 0 } : this.data.rawMaterialPriceRows[index];
        this.app.modal.open({
            title: index === -1 ? 'Add Raw Material Price' : `Edit ${row.material}`,
            fields: [
                { key: 'material', label: 'Material', type: 'text', value: row.material, required: true, span: 'full' },
                { key: 'price', label: 'Price (₱)', type: 'number', min: 0, value: row.price, required: true },
                { key: 'priceUnit', label: 'Price Unit (e.g. roll)', type: 'text', value: row.priceUnit },
                { key: 'yieldQty', label: 'Yield Quantity', type: 'number', min: 0, value: row.yieldQty },
                { key: 'yieldUnit', label: 'Yield Unit (e.g. pcs)', type: 'text', value: row.yieldUnit },
                { key: 'costPerPc', label: 'Cost / Piece (₱)', type: 'number', min: 0, value: row.costPerPc, hint: 'Leave blank to use price ÷ yield.' }
            ],
            onChange: (key, v, modal) => { if (v.yieldQty) modal.setHint('costPerPc', `Price ÷ yield = <strong>${Utils.formatCurrency((v.price || 0) / v.yieldQty)}</strong>. Leave blank to use this.`); },
            onSubmit: async (v) => {
                const next = { material: v.material, price: v.price || 0, priceUnit: v.priceUnit, yieldQty: v.yieldQty || 0, yieldUnit: v.yieldUnit, costPerPc: v.costPerPc ?? (v.yieldQty ? Utils.round(v.price / v.yieldQty, 4) : 0) };
                if (index === -1) this.data.rawMaterialPriceRows.push(next); else this.data.rawMaterialPriceRows[index] = next;
                await this.app.saveAndRerender();
                this.ui.toast(`${next.material} saved.`);
            }
        });
    }
    async deleteRawRow(index) {
        const row = this.data.rawMaterialPriceRows[index];
        if (!row || !(await this.ui.confirm({ title: 'Delete this material price?', tone: 'danger', confirmLabel: 'Delete', message: `${row.material} — ${Utils.formatCurrency(row.price)} / ${row.priceUnit} will be removed from the reference table.` }))) return;
        this.data.rawMaterialPriceRows.splice(index, 1);
        await this.app.saveAndRerender();
        this.ui.toast('Row deleted.');
    }

    /** Copies each size's Total Cost → unit cost and Retail → sale price onto the matching SPLINT item. */
    async syncToInventory() {
        const matches = (this.data.costingRows || []).map(r => ({ r, item: this.data.inventory.find(i => i.type === 'splint' && Utils.extractSize(i.name) === r.size) })).filter(x => x.item);
        if (!matches.length) return this.ui.toast('No Splint inventory items match these sizes (item names need "#50" etc.).', 'error');
        const changes = matches.filter(({ r, item }) => Utils.round(item.unit_cost || 0, 3) !== Utils.round(r.total, 3) || Utils.round(item.sale_price || 0, 2) !== Utils.round(r.retail, 2));
        if (!changes.length) return this.ui.toast('Splint inventory already matches the costing table.', 'info');
        if (!(await this.ui.confirm({
            title: 'Apply costing to inventory?', icon: 'sync', tone: 'info', confirmLabel: `Update ${changes.length} item${changes.length === 1 ? '' : 's'}`,
            message: "Each splint's unit cost becomes the table's Total Cost, and its sale price becomes the Retail price:",
            details: changes.map(({ r, item }) => `${item.name}: cost ${Utils.formatCurrency(item.unit_cost, true)} → ${Utils.formatCurrency(r.total, true)} · price ${Utils.formatCurrency(item.sale_price || 0)} → ${Utils.formatCurrency(r.retail)}`)
        }))) return;
        changes.forEach(({ r, item }) => { item.unit_cost = r.total; item.sale_price = r.retail; item.price_last_updated = Utils.today(); });
        await this.app.saveAndRerender();
        this.ui.toast(`${changes.length} splint item(s) updated from the costing table.`);
    }

    async restoreDefaults() {
        if (!(await this.ui.confirm({ title: 'Restore PDF defaults?', icon: 'sync', tone: 'warning', confirmLabel: 'Restore Defaults', message: 'Both costing tables go back to the original values from "Updated 2026 (Product Cost) final.pdf".', note: 'Your edits to these two tables will be lost. Inventory items are not changed.' }))) return;
        this.data.costingRows = structuredClone(DEFAULT_COSTING);
        this.data.rawMaterialPriceRows = structuredClone(DEFAULT_RAW_MATERIAL_PRICES);
        await this.app.saveAndRerender();
        this.ui.toast('Costing tables restored to the PDF defaults.');
    }
}
