/* ============================================================
   BasePage — every tab extends this. A page returns its markup from render()
   (the app mounts it into #content) and can hook afterRender() for anything
   that needs the DOM. Shared services are exposed as getters.
   ============================================================ */
class BasePage {
    constructor(app) { this.app = app; }
    get data() { return this.app.data; }
    get ui() { return this.app.ui; }
    get tables() { return this.app.tables; }
    get records() { return this.app.records; }
    get stock() { return this.app.stock; }
    get finance() { return this.app.finance; }

    render() { return ''; }
    afterRender() {}

    /** Reads a form control's trimmed value by id. */
    val(id) { const el = document.getElementById(id); return el ? String(el.value).trim() : ''; }
    num(id) { return Utils.num(this.val(id), NaN); }
    setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v; }

    workerSelectOptions() {
        return this.data.workers.map(w => `<option value="${Utils.esc(w.name)}">${Utils.esc(w.name)}</option>`).join('');
    }
    itemLabel(i) { return `${i.name} (Stock: ${Utils.formatNumber(i.stock, 4)}${i.units ? ' ' + i.units : ''})`; }
    noWorkersHint() {
        return this.data.workers.length ? '' : `<p class="text-xs text-accent col-span-full">No workers yet — <button type="button" class="underline font-semibold" onclick="App.records.create('worker')">add a worker</button> first (or in Settings → Worker Management).</p>`;
    }
}
