/* ============================================================
   Widgets — the app's stand-alone dialogs and menus:
   AttachmentManager (photos), BomEditor (splint recipes),
   ItemHistory (per-item stock movements), ContextMenu (right-click).
   ============================================================ */

/* ---------- Photo attachments (device-local, auto-compressed) ---------- */
class AttachmentManager {
    constructor(app) {
        this.app = app;
        this.current = { base64: null, relatedId: null, type: null };
    }
    get el() { return document.getElementById('attachment-modal'); }

    /** Wires drag & drop and clipboard paste onto the drop zone (once, at boot). */
    init() {
        const zone = document.getElementById('drop-zone');
        if (!zone) return;
        ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('drag-over'); }));
        ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('drag-over'); }));
        zone.addEventListener('drop', (e) => this.handleFile(e));
        document.addEventListener('paste', (e) => { if (this.el.classList.contains('visible')) this.handleFile(e); });
    }

    find(relatedId, type) { return this.app.data.imageAttachments.find(img => img.related_id === relatedId && img.type === type); }

    open(relatedId, type) {
        this.current = { base64: null, relatedId, type };
        const existing = this.find(relatedId, type);
        document.getElementById('attachment-type-label').textContent = `— ${type} ${relatedId}`;
        const preview = document.getElementById('image-preview');
        preview.src = existing ? existing.base64 : '';
        document.getElementById('preview-area').classList.toggle('hidden', !existing);
        document.getElementById('preview-label').textContent = existing ? `Current photo (added ${existing.date}). Upload a new one to replace it.` : 'Preview (will be compressed):';
        document.getElementById('delete-attachment-btn').classList.toggle('hidden', !existing);
        document.getElementById('save-attachment-btn').disabled = true;
        this.el.classList.add('visible');
    }
    close() {
        this.el.classList.remove('visible');
        this.current = { base64: null, relatedId: null, type: null };
    }

    handleFile(event) {
        let file = null;
        const dt = event.dataTransfer, target = event.target;
        if (dt && dt.files && dt.files.length) file = dt.files[0];
        else if (target && target.files && target.files.length) file = target.files[0];
        else if (event.clipboardData) {
            for (const item of event.clipboardData.items) {
                if (item.type.includes('image')) { file = item.getAsFile(); break; }
            }
        }
        if (!file || !file.type.startsWith('image/')) return this.app.ui.toast('No valid image found.', 'error');
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const MAX_WIDTH = 900;
                const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                this.current.base64 = canvas.toDataURL('image/jpeg', 0.7);
                document.getElementById('image-preview').src = this.current.base64;
                document.getElementById('preview-label').textContent = 'Preview (compressed):';
                document.getElementById('preview-area').classList.remove('hidden');
                document.getElementById('save-attachment-btn').disabled = false;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        if (target && target.value !== undefined && target.type === 'file') target.value = '';
    }

    async save() {
        const { base64, relatedId, type } = this.current;
        if (!base64 || !relatedId) return this.app.ui.toast('Choose an image first.', 'error');
        const d = this.app.data;
        d.imageAttachments = d.imageAttachments.filter(img => !(img.related_id === relatedId && img.type === type));
        d.imageAttachments.push({ id: Utils.uuid(), related_id: relatedId, type, date: Utils.today(), base64 });
        this.close();
        await this.app.saveAndRerender();
        this.app.ui.toast(`${type} photo saved.`);
    }
    async remove() {
        const { relatedId, type } = this.current;
        if (!(await this.app.ui.confirm({ title: `Remove ${type.toLowerCase()} photo?`, tone: 'danger', icon: 'photo', confirmLabel: 'Remove Photo', message: `The ${type.toLowerCase()} photo attached to ${relatedId} will be deleted from this device.` }))) return;
        this.app.data.imageAttachments = this.app.data.imageAttachments.filter(img => !(img.related_id === relatedId && img.type === type));
        this.close();
        await this.app.saveAndRerender();
        this.app.ui.toast('Photo removed.');
    }
}

/* ---------- BOM (recipe) editor for splints — edits a draft, applied on Save ---------- */
class BomEditor {
    constructor(app) {
        this.app = app;
        this.productId = null;
        this.draft = [];
    }
    get el() { return document.getElementById('bom-editor-modal'); }
    get product() { return this.app.data.inventory.find(i => i.id === this.productId); }

    open(productId) {
        const product = this.app.data.inventory.find(i => i.id === productId);
        if (!product) return;
        this.productId = productId;
        this.draft = structuredClone(product.bom || []);
        document.getElementById('bom-item-name').textContent = product.name;
        document.getElementById('bom-add-qty').value = '1';
        this.renderList();
        this.el.classList.add('visible');
    }
    close() { this.el.classList.remove('visible'); this.productId = null; this.draft = []; }

    renderList() {
        const inv = this.app.data.inventory;
        const box = document.getElementById('bom-content');
        let cost = 0;
        box.innerHTML = this.draft.length === 0 ? this.app.ui.emptyNote('No materials in this recipe. Add one below.') : this.draft.map(line => {
            const m = inv.find(i => i.id === line.material_id);
            cost += (m ? m.unit_cost || 0 : 0) * line.quantity;
            return `
                <div class="glass-item p-2 rounded-lg flex justify-between items-center gap-2">
                    <span class="text-white truncate">${m ? Utils.esc(m.name) : 'Unknown Material'} <span class="text-xs text-secondary">${m ? Utils.esc(m.units || '') : ''}</span></span>
                    <div class="flex items-center space-x-2 flex-shrink-0">
                        <span class="text-secondary text-sm">Qty:</span>
                        <input type="number" value="${line.quantity}" min="0.0001" step="any" class="w-24 text-right font-bold px-2 py-1" onchange="App.bom.updateQty('${line.material_id}', this.value)" aria-label="Quantity">
                        <button type="button" onclick="App.bom.removeMaterial('${line.material_id}')" class="text-red-500 hover:text-red-400 text-lg px-1" title="Remove material">&times;</button>
                    </div>
                </div>`;
        }).join('');
        document.getElementById('bom-cost').textContent = this.draft.length ? `Material cost per splint (at current unit costs): ${Utils.formatCurrency(cost)}` : '';
        const opts = inv.filter(i => i.type === 'raw' && !this.draft.some(b => b.material_id === i.id))
            .map(m => `<option value="${m.id}">${Utils.esc(m.name)}</option>`).join('');
        document.getElementById('bom-add-material').innerHTML = `<option value="">Select Raw Material...</option>${opts}`;
    }
    addMaterial() {
        const materialId = document.getElementById('bom-add-material').value;
        const quantity = Utils.num(document.getElementById('bom-add-qty').value);
        if (!materialId || quantity <= 0) return this.app.ui.toast('Select a material and enter a valid quantity.', 'error');
        this.draft.push({ material_id: materialId, quantity });
        document.getElementById('bom-add-qty').value = '1';
        this.renderList();
    }
    updateQty(materialId, value) {
        const q = Utils.num(value);
        if (q <= 0) { this.app.ui.toast('Quantity must be a positive number.', 'error'); return this.renderList(); }
        const line = this.draft.find(l => l.material_id === materialId);
        if (line) line.quantity = q;
        this.renderList();
    }
    removeMaterial(materialId) {
        this.draft = this.draft.filter(l => l.material_id !== materialId);
        this.renderList();
    }
    async save() {
        const product = this.product;
        if (!product) return this.close();
        product.bom = this.draft;
        this.close();
        await this.app.saveAndRerender();
        this.app.ui.toast(`Recipe for ${product.name} saved.`);
    }
}

/* ---------- Per-item stock history (built from the same ledger as Reports) ---------- */
class ItemHistory {
    constructor(app) { this.app = app; }
    open(itemId) {
        const item = this.app.stock.findItem(itemId);
        if (!item) return;
        const events = this.app.stock.historyFor(itemId).reverse();
        document.getElementById('log-item-name').textContent = item.name;
        document.getElementById('log-summary').innerHTML = `Live stock: <strong class="text-white">${Utils.formatNumber(item.stock, 4)} ${Utils.esc(item.units || '')}</strong> · ${events.length} movement${events.length === 1 ? '' : 's'}`;
        document.getElementById('log-content').innerHTML = events.length === 0 ? '<p class="text-secondary text-sm">No stock movements recorded for this item yet.</p>' : events.map(e => `
            <div class="glass-item p-2.5 rounded-lg text-sm flex items-center justify-between gap-3">
                <div class="min-w-0">
                    <span class="font-bold ${e.qtyIn ? 'text-green-400' : 'text-red-400'}">${e.qtyIn ? '+' + Utils.formatNumber(e.qtyIn, 4) : '−' + Utils.formatNumber(e.qtyOut, 4)}</span>
                    <span class="text-secondary"> · ${Utils.esc(e.remarks)}</span>
                    <span class="block text-xs text-secondary">${Utils.formatDate(e.date)}</span>
                </div>
                <span class="text-xs text-secondary whitespace-nowrap">Bal: <strong class="text-white">${Utils.formatNumber(e.qtyOnHand, 4)}</strong></span>
            </div>`).join('');
        document.getElementById('inventory-log-modal').classList.add('visible');
    }
    close() { document.getElementById('inventory-log-modal').classList.remove('visible'); }
}

/* ---------- Right-click menu on kanban cards (Edit / Delete any record) ---------- */
class ContextMenu {
    constructor(app) { this.app = app; this.target = null; }
    get el() { return document.getElementById('context-menu'); }
    show(e, kind, id) {
        e.preventDefault();
        e.stopPropagation();
        this.target = { kind, id };
        const menu = this.el;
        menu.classList.remove('hidden');
        menu.classList.add('flex');
        const w = menu.offsetWidth || 170, h = menu.offsetHeight || 90;
        menu.style.left = `${Math.min(e.clientX, window.innerWidth - w - 8)}px`;
        menu.style.top = `${Math.min(e.clientY, window.innerHeight - h - 8)}px`;
    }
    hide() {
        this.el.classList.remove('flex');
        this.el.classList.add('hidden');
    }
    action(which) {
        const t = this.target;
        this.hide();
        this.target = null;
        if (!t) return;
        if (which === 'edit') this.app.records.edit(t.kind, t.id);
        if (which === 'delete') this.app.records.remove(t.kind, t.id);
    }
}
