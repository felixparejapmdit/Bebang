/* ============================================================
   ManufacturingPage — the piece-work flow:
     Issuance   = raw materials handed OUT to a worker (stock deducted when marked Issued)
     Remittance = finished splints handed IN by a worker (adds splint stock, feeds Payroll)
   ============================================================ */
class ManufacturingPage extends BasePage {
    // Materials measured by the container (e.g. Glue in gallons) get quick-pick fractions.
    static FRACTION_UNITS = ['gal'];
    static QTY_PRESETS = [{ value: 0.25, label: '1/4' }, { value: 0.5, label: '1/2' }, { value: 0.75, label: '3/4' }, { value: 1, label: '1' }];

    render() {
        const d = this.data;
        const splints = d.inventory.filter(i => i.type === 'splint');
        const raws = d.inventory.filter(i => i.type === 'raw');
        const today = Utils.today();
        const todayUnits = d.manufacturingOrders.filter(m => m.date === today && m.status === 'Completed').reduce((s, m) => s + Utils.num(m.qty), 0);
        return `
            ${this.ui.pageHeader('Manufacturing', `Issue raw materials to workers and log the finished splints they remit. Remitted today: <strong class="text-white">${Utils.formatNumber(todayUnits)}</strong> splints.`)}
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
                <form id="quick-log-form" class="glass-panel p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start" onsubmit="event.preventDefault(); App.manufacturing.logRemittance()">
                    <h3 class="text-lg font-semibold text-white col-span-full">🚀 Remittance <span class="text-sm font-normal text-secondary">— completed splints from a worker</span></h3>
                    ${this.ui.field('Splint Size *', `<select id="mo-quick-product" class="field-input"><option value="">Select Splint Size...</option>${splints.map(i => `<option value="${i.id}">${Utils.esc(this.itemLabel(i))}</option>`).join('')}</select>`, 'col-span-full')}
                    ${this.ui.field('Quantity Completed *', `<input type="number" id="mo-quick-qty" value="1" min="1" step="1" class="field-input">`)}
                    ${this.ui.field('Worker *', `<select id="mo-quick-worker" class="field-input"><option value="">Select Worker *</option>${this.workerSelectOptions()}</select>`)}
                    ${this.ui.field('Date', `<input type="date" id="mo-quick-date" value="${today}" max="${today}" class="field-input">`)}
                    ${this.noWorkersHint()}
                    <div class="tooltip-container col-span-full">
                        <button type="submit" class="bg-accent font-bold w-full py-2 rounded-lg transition duration-150">Log Remittance</button>
                        <span class="tooltip-text">Adds the splints to stock and credits the worker's production (used on the Payroll tab).</span>
                    </div>
                </form>

                <form id="mo-form" class="glass-panel p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 content-start" onsubmit="event.preventDefault(); App.manufacturing.createIssuance(false)">
                    <h3 class="text-lg font-semibold text-white col-span-full">🗓️ Issuance <span class="text-sm font-normal text-secondary">— raw materials given to a worker</span></h3>
                    ${this.ui.field('Raw Material (size/variant) *', `<select id="mo-plan-product" onchange="App.manufacturing.updatePreview()" class="field-input"><option value="">Select Raw Material (size/variant)...</option>${raws.map(i => `<option value="${i.id}">${Utils.esc(this.itemLabel(i))}</option>`).join('')}</select>`, 'col-span-full')}
                    ${this.ui.field('Quantity *', `<input type="number" id="mo-plan-qty" value="1" min="0.0001" step="any" oninput="App.manufacturing.updatePreview()" class="field-input">`)}
                    ${this.ui.field('Worker *', `<select id="mo-plan-worker" class="field-input"><option value="">Select Worker *</option>${this.workerSelectOptions()}</select>`)}
                    ${this.ui.field('Date', `<input type="date" id="mo-plan-date" value="${today}" max="${today}" class="field-input">`)}
                    <div id="mo-plan-qty-quickpicks" class="col-span-full"></div>
                    <div id="mo-plan-materials-preview" class="col-span-full"></div>
                    ${this.noWorkersHint()}
                    <div class="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div class="tooltip-container">
                            <button type="submit" class="bg-primary text-white font-bold w-full py-2 rounded-lg transition duration-150">Create Issuance</button>
                            <span class="tooltip-text">Creates a 'Pending' issuance. Click 'Mark as Issued' once the materials are handed over — that's when stock is deducted.</span>
                        </div>
                        <button type="button" onclick="App.manufacturing.createIssuance(true)" class="bg-blue-600 text-white font-bold w-full py-2 rounded-lg">Issue Now (deduct stock)</button>
                    </div>
                </form>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                ${this.issuanceColumn('Pending')}
                ${this.issuanceColumn('Issued')}
            </div>

            ${this.materialsByWorker()}

            <div class="grid grid-cols-1 2xl:grid-cols-2 gap-4 mt-6">
                ${this.remittanceTable()}
                ${this.issuanceTable()}
            </div>
        `;
    }

    afterRender() { this.updatePreview(); }

    issuanceColumn(status) {
        let list = this.data.issuances.filter(i => i.status === status);
        const total = list.length;
        if (status === 'Issued') list = [...list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
        return `
            <div class="glass-panel p-4 sm:p-5" id="iss-list-${status}">
                <h3 class="text-base font-semibold text-white mb-3 flex items-center justify-between">${status === 'Pending' ? 'Pending (not yet handed over)' : 'Issued (recent)'} ${this.ui.badge(total, total ? 'violet' : 'gray')}</h3>
                <div class="space-y-2 kanban-list">
                    ${list.length ? list.map(iss => `
                        <div class="glass-item kanban-card rounded-lg flex justify-between items-center gap-2" oncontextmenu="App.contextMenu.show(event, 'iss', '${iss.id}')">
                            <div class="min-w-0">
                                <span class="font-bold text-white">${Utils.esc(iss.id)}: ${Utils.esc(iss.materialName)} <span class="text-secondary font-normal">×${Utils.formatNumber(iss.qty, 4)} ${Utils.esc(iss.unit || '')}</span></span>
                                <span class="text-xs text-secondary block">Worker: ${Utils.esc(iss.workerName)} · ${Utils.formatDate(iss.date)}</span>
                            </div>
                            <div class="flex items-center gap-1 flex-shrink-0">
                                ${status === 'Pending' ? `<button onclick="App.manufacturing.markIssued('${iss.id}')" class="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">Mark as Issued</button>` : ''}
                                ${this.ui.editDeleteBtns(`App.records.edit('iss', '${iss.id}')`, `App.records.remove('iss', '${iss.id}')`, 'issuance')}
                            </div>
                        </div>`).join('') : this.ui.emptyNote('No issuances in this status.')}
                </div>
            </div>`;
    }

    materialsByWorker() {
        const map = {};
        this.data.issuances.filter(i => i.status === 'Issued').forEach(i => {
            const key = `${i.workerName}|${i.materialId}`;
            if (!map[key]) map[key] = { worker: i.workerName, material: i.materialName, unit: i.unit || '', qty: 0, count: 0, last: i.date };
            map[key].qty = Utils.round(map[key].qty + Utils.num(i.qty));
            map[key].count += 1;
            if (i.date > map[key].last) map[key].last = i.date;
        });
        const rows = Object.values(map);
        return this.tables.render({
            id: 'materials-by-worker', title: 'Materials Issued by Worker', subtitle: 'Total quantity of each material handed to each worker (all Issued issuances).',
            rows, defaultSort: { key: 'worker', dir: 'asc' }, emptyText: 'No materials issued yet.', exportName: 'materials_by_worker',
            filters: [{ key: 'w', label: 'All workers', options: [...new Set(rows.map(r => r.worker))].sort(), test: (r, v) => r.worker === v }],
            columns: [
                { key: 'worker', label: 'Worker', render: r => `<span class="text-white font-semibold">${Utils.esc(r.worker)}</span>` },
                { key: 'material', label: 'Material' },
                { key: 'qty', label: 'Total Issued', align: 'right', value: r => r.qty, render: r => `<strong>${Utils.formatNumber(r.qty, 4)}</strong> ${Utils.esc(r.unit)}` },
                { key: 'count', label: 'Issuances', align: 'right' },
                { key: 'last', label: 'Last Issued', render: r => Utils.formatDate(r.last) }
            ]
        });
    }

    remittanceTable() {
        const d = this.data;
        return this.tables.render({
            id: 'remittances', title: 'Remittance Log', subtitle: 'Every batch of finished splints received from workers.',
            rows: d.manufacturingOrders, defaultSort: { key: 'date', dir: 'desc' }, exportName: 'remittances', emptyText: 'No remittances logged yet.',
            filters: [
                { key: 'w', label: 'All workers', options: [...new Set(d.manufacturingOrders.map(m => m.workerName))].sort(), test: (r, v) => r.workerName === v },
                { key: 's', label: 'All sizes', options: [...new Set(d.manufacturingOrders.map(m => Utils.extractSize(m.productName)))].sort(), test: (r, v) => Utils.extractSize(r.productName) === v }
            ],
            columns: [
                { key: 'id', label: 'Ref' },
                { key: 'date', label: 'Date', render: r => Utils.formatDate(r.date) },
                { key: 'workerName', label: 'Worker' },
                { key: 'productName', label: 'Product', value: r => (this.stock.findItem(r.productId) || {}).name || r.productName },
                { key: 'size', label: 'Size', value: r => Utils.extractSize(r.productName) },
                { key: 'qty', label: 'Qty', align: 'right', value: r => Utils.num(r.qty), total: 'sum', format: 'number' }
            ],
            actions: r => this.ui.editDeleteBtns(`App.records.edit('mo', '${r.id}')`, `App.records.remove('mo', '${r.id}')`, 'remittance')
        });
    }

    issuanceTable() {
        const d = this.data;
        return this.tables.render({
            id: 'issuances', title: 'Issuance Register', subtitle: 'All materials handed out, pending or issued.',
            rows: d.issuances, defaultSort: { key: 'date', dir: 'desc' }, exportName: 'issuances', emptyText: 'No issuances yet.',
            filters: [
                { key: 'st', label: 'All statuses', options: ['Pending', 'Issued'], test: (r, v) => r.status === v },
                { key: 'w', label: 'All workers', options: [...new Set(d.issuances.map(m => m.workerName))].sort(), test: (r, v) => r.workerName === v }
            ],
            columns: [
                { key: 'id', label: 'Ref' },
                { key: 'date', label: 'Date', render: r => Utils.formatDate(r.date) },
                { key: 'workerName', label: 'Worker' },
                { key: 'materialName', label: 'Material', value: r => (this.stock.findItem(r.materialId) || {}).name || r.materialName },
                { key: 'qty', label: 'Qty', align: 'right', value: r => Utils.num(r.qty), render: r => `${Utils.formatNumber(r.qty, 4)} <span class="text-secondary">${Utils.esc(r.unit || '')}</span>` },
                { key: 'status', label: 'Status', render: r => this.ui.statusBadge(r.status) }
            ],
            actions: r => `<div class="row-actions">${r.status === 'Pending' ? this.ui.iconBtn(`App.manufacturing.markIssued('${r.id}')`, 'check', 'Mark as Issued') : ''}${this.ui.iconBtn(`App.records.edit('iss', '${r.id}')`, 'edit', 'Edit issuance')}${this.ui.iconBtn(`App.records.remove('iss', '${r.id}')`, 'trash', 'Delete issuance', { danger: true })}</div>`
        });
    }

    setIssuanceQty(value) { this.setVal('mo-plan-qty', value); this.updatePreview(); }

    updatePreview() {
        const preview = document.getElementById('mo-plan-materials-preview');
        const picks = document.getElementById('mo-plan-qty-quickpicks');
        if (!preview) return;
        const material = this.stock.findItem(this.val('mo-plan-product'));
        const qty = Utils.num(this.val('mo-plan-qty'));
        if (picks) {
            picks.innerHTML = (material && ManufacturingPage.FRACTION_UNITS.includes(material.units)) ? `
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs text-secondary">Quick pick:</span>
                    ${ManufacturingPage.QTY_PRESETS.map(p => `<button type="button" onclick="App.manufacturing.setIssuanceQty(${p.value})" class="px-3 py-1 rounded-full text-xs font-medium transition ${qty === p.value ? 'bg-primary text-white' : 'bg-white/10 text-secondary hover:bg-white/20'}">${p.label} ${Utils.esc(material.units)}</button>`).join('')}
                </div>` : '';
        }
        if (!material || qty <= 0) { preview.innerHTML = ''; return; }
        const ok = material.stock >= qty;
        preview.innerHTML = `
            <div class="glass-item p-3 rounded-lg flex justify-between items-center gap-2 text-xs sm:text-sm ${ok ? '' : 'bg-red-500/10'}">
                <span class="${ok ? 'text-secondary' : 'text-red-400 font-semibold'}">${ok ? '✓' : '⚠️'} ${Utils.esc(material.name)}</span>
                <span class="${ok ? 'text-secondary' : 'text-red-400 font-bold'}">Requesting ${Utils.formatNumber(qty, 4)} / Have ${Utils.formatNumber(material.stock, 4)} ${Utils.esc(material.units || '')}</span>
            </div>`;
    }

    async logRemittance() {
        const product = this.stock.findItem(this.val('mo-quick-product'));
        const qty = this.num('mo-quick-qty');
        const worker = this.val('mo-quick-worker');
        if (!product || !(qty > 0) || !worker) return this.ui.toast('Please select a splint size, quantity, and worker.', 'error');
        const mo = { id: Utils.nextId('MO', this.data.manufacturingOrders), date: this.val('mo-quick-date') || Utils.today(), productId: product.id, productName: product.name, qty, workerName: worker, status: 'Completed' };
        this.data.manufacturingOrders.unshift(mo);
        this.stock.apply(this.stock.effectsOf('mo', mo));
        await this.app.saveAndRerender();
        this.ui.toast(`Remittance logged: ${qty} × ${product.name} from ${worker}.`);
    }

    async createIssuance(issueNow) {
        const material = this.stock.findItem(this.val('mo-plan-product'));
        const qty = this.num('mo-plan-qty');
        const worker = this.val('mo-plan-worker');
        if (!material || !(qty > 0) || !worker) return this.ui.toast('Please select a raw material, quantity, and worker.', 'error');
        if (issueNow && material.stock < qty) return this.ui.toast(`Insufficient stock. Have: ${Utils.formatNumber(material.stock, 4)} ${material.units || ''}, Need: ${qty}.`, 'error');
        const iss = { id: Utils.nextId('ISS', this.data.issuances), date: this.val('mo-plan-date') || Utils.today(), materialId: material.id, materialName: material.name, unit: material.units || 'units', qty, workerName: worker, status: issueNow ? 'Issued' : 'Pending' };
        this.data.issuances.unshift(iss);
        this.stock.apply(this.stock.effectsOf('iss', iss));
        await this.app.saveAndRerender();
        this.ui.toast(issueNow ? `${iss.id}: ${qty} ${iss.unit} of ${material.name} issued to ${worker}.` : `Issuance ${iss.id} created for ${worker} — pending.`);
    }

    async markIssued(issId) {
        const iss = this.data.issuances.find(i => i.id === issId);
        if (!iss || iss.status !== 'Pending') return;
        const material = this.stock.findItem(iss.materialId);
        if (!material || material.stock < iss.qty) {
            return this.ui.toast(`Insufficient stock. Have: ${material ? Utils.formatNumber(material.stock, 4) : 0} ${iss.unit}, Need: ${iss.qty} ${iss.unit}.`, 'error');
        }
        iss.status = 'Issued';
        iss.issuedDate = Utils.today();
        this.stock.apply(this.stock.effectsOf('iss', iss));
        await this.app.saveAndRerender();
        this.ui.toast(`Issuance ${issId} issued: ${iss.qty} ${iss.unit} of ${iss.materialName} given to ${iss.workerName}.`);
    }
}
