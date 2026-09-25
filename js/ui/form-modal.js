/* ============================================================
   FormModal — one reusable dialog for every add/edit form in the app.
   Usage:
     App.modal.open({
       title: 'Edit Expense',
       fields: [{ key: 'amount', label: 'Amount (₱)', type: 'number', value: 10, required: true, min: 0 }],
       onSubmit: async (values) => { ...; return false to keep the dialog open },
       onChange: (key, values, modal) => { ... optional live updates ... }
     });
   Field types: text | number | date | select | textarea | datalist | email | tel
   ============================================================ */
class FormModal {
    constructor(app) {
        this.app = app;
        this.config = null;
        this.busy = false;
    }
    get el() { return document.getElementById('form-modal'); }

    open(config) {
        this.config = { submitLabel: 'Save', cols: 2, ...config };
        const { title, subtitle, fields, submitLabel, cols, wide, danger } = this.config;
        document.getElementById('form-modal-title').textContent = title;
        const sub = document.getElementById('form-modal-subtitle');
        sub.innerHTML = subtitle || '';
        sub.classList.toggle('hidden', !subtitle);
        this.setError('');
        const box = document.getElementById('form-modal-box');
        box.classList.toggle('max-w-lg', !wide);
        box.classList.toggle('max-w-3xl', !!wide);
        const grid = document.getElementById('form-modal-fields');
        grid.className = `grid gap-3 grid-cols-1 ${cols >= 2 ? 'sm:grid-cols-2' : ''} ${cols >= 3 ? 'lg:grid-cols-3' : ''}`;
        grid.innerHTML = fields.map(f => this._fieldHtml(f, cols)).join('');
        const btn = document.getElementById('form-modal-submit');
        btn.textContent = submitLabel;
        btn.className = `${danger ? 'bg-red-700' : 'bg-green-600'} text-white px-4 py-2 rounded-lg transition duration-150 text-sm font-semibold`;
        this.el.classList.add('visible');
        const opened = this.config;
        setTimeout(() => {
            if (this.config !== opened) return; // closed (or replaced) before the delayed focus ran
            const first = grid.querySelector('input:not([readonly]), select, textarea');
            if (first) first.focus();
        }, 60);
    }

    _fieldHtml(f, cols) {
        const id = `fm-${f.key}`;
        const val = f.value === null || f.value === undefined ? '' : f.value;
        const span = f.span === 'full' ? `sm:col-span-${Math.min(cols, 2)} ${cols >= 3 ? 'lg:col-span-3' : ''}` : (f.span ? `sm:col-span-${f.span}` : '');
        const common = `id="${id}" name="${Utils.esc(f.key)}" data-key="${Utils.esc(f.key)}" class="field-input" ${f.required ? 'required' : ''} ${f.readonly ? 'readonly' : ''} oninput="App.modal._changed('${f.key}')"`;
        let input;
        switch (f.type) {
            case 'select':
                input = `<select ${common} onchange="App.modal._changed('${f.key}')">${this.app.ui.options(f.options || [], val, { placeholder: f.placeholder })}</select>`;
                break;
            case 'textarea':
                input = `<textarea ${common} placeholder="${Utils.esc(f.placeholder || '')}">${Utils.esc(val)}</textarea>`;
                break;
            case 'datalist':
                input = `<input type="text" list="${id}-list" ${common} value="${Utils.esc(val)}" placeholder="${Utils.esc(f.placeholder || '')}" autocomplete="off">
                         <datalist id="${id}-list">${(f.list || []).map(o => `<option value="${Utils.esc(o)}">`).join('')}</datalist>`;
                break;
            case 'number':
                input = `<input type="number" ${common} value="${Utils.esc(val)}" step="${f.step || 'any'}" ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''} placeholder="${Utils.esc(f.placeholder || '')}" inputmode="decimal">`;
                break;
            default:
                input = `<input type="${f.type || 'text'}" ${common} value="${Utils.esc(val)}" placeholder="${Utils.esc(f.placeholder || '')}">`;
        }
        return `<label class="block ${span}" id="${id}-wrap">
                    <span class="field-label">${Utils.esc(f.label)}${f.required ? ' <span class="text-red-400">*</span>' : ''}</span>
                    ${input}
                    <span class="field-hint block" id="${id}-hint">${f.hint || ''}</span>
                </label>`;
    }

    values() {
        const out = {};
        (this.config?.fields || []).forEach(f => {
            const el = document.getElementById(`fm-${f.key}`);
            if (!el) return;
            const raw = el.value;
            out[f.key] = f.type === 'number' ? (raw === '' ? null : Utils.num(raw, null)) : (typeof raw === 'string' ? raw.trim() : raw);
        });
        return out;
    }
    setValue(key, value) { const el = document.getElementById(`fm-${key}`); if (el) el.value = value ?? ''; }
    setHint(key, html) { const el = document.getElementById(`fm-${key}-hint`); if (el) el.innerHTML = html || ''; }
    setError(msg) {
        const box = document.getElementById('form-modal-error');
        if (!box) return;
        box.textContent = msg || '';
        box.classList.toggle('hidden', !msg);
    }
    _changed(key) {
        if (this.config && this.config.onChange) this.config.onChange(key, this.values(), this);
    }

    validate(values) {
        for (const f of this.config.fields) {
            const v = values[f.key];
            if (f.required && (v === '' || v === null || v === undefined)) return `${f.label} is required.`;
            if (f.type === 'number' && v !== null && v !== undefined) {
                if (f.min !== undefined && v < f.min) return `${f.label} must be at least ${f.min}.`;
                if (f.max !== undefined && v > f.max) return `${f.label} must be at most ${f.max}.`;
            }
        }
        return '';
    }

    async submit() {
        if (!this.config || this.busy) return;
        const values = this.values();
        const problem = this.validate(values);
        if (problem) return this.setError(problem);
        this.busy = true;
        try {
            const result = await this.config.onSubmit(values, this);
            if (result === false) return;
            this.close();
        } catch (err) {
            console.error(err);
            this.setError(err.message || String(err));
        } finally {
            this.busy = false;
        }
    }

    close() {
        this.el.classList.remove('visible');
        this.config = null;
    }
    get isOpen() { return this.el.classList.contains('visible'); }
}
