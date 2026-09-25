/* ============================================================
   Dialog — the app's own confirm / alert / prompt boxes, replacing the
   browser's plain "This page says" pop-ups. Promise-based:

     if (!(await App.ui.confirm({ title: 'Delete order?', message: '…', tone: 'danger', confirmLabel: 'Delete' }))) return;
     await App.ui.alert({ title: 'Backup restored', message: '…', tone: 'success' });
     const text = await App.ui.prompt({ title: 'Rename', value: 'old' });   // string, or null if cancelled

   Options: title, message (plain text, \n = new paragraph), details [] (bullet list),
   warnings [] (amber box), note (small footer line), tone (danger | warning | info | success),
   icon (UI icon name), confirmLabel, cancelLabel, requireText (type-to-confirm), placeholder, value.
   Keyboard: Enter = confirm, Esc = cancel, Tab stays inside. Dialogs queue if several open at once.
   ============================================================ */
class Dialog {
    static TONES = {
        danger: { icon: 'trash', btn: 'dlg-btn-danger' },
        warning: { icon: 'alert', btn: 'dlg-btn-warning' },
        info: { icon: 'info', btn: 'dlg-btn-primary' },
        success: { icon: 'check', btn: 'dlg-btn-success' }
    };

    constructor(ui) {
        this.ui = ui;
        this.queue = [];
        this.current = null;
        this._returnFocus = null;
        document.addEventListener('keydown', (e) => this._onKey(e), true);
    }
    get el() { return document.getElementById('dialog'); }
    get isOpen() { return !!this.current; }

    confirm(opts) { return this._open({ kind: 'confirm', ...Dialog._normalize(opts) }); }
    alert(opts) { return this._open({ kind: 'alert', ...Dialog._normalize(opts) }); }
    prompt(opts) { return this._open({ kind: 'prompt', ...Dialog._normalize(opts) }); }

    static _normalize(opts) { return typeof opts === 'string' ? { message: opts } : (opts || {}); }

    _open(opts) {
        return new Promise(resolve => {
            this.queue.push({ opts, resolve });
            if (!this.current) this._next();
        });
    }

    _next() {
        this.current = this.queue.shift() || null;
        if (!this.current) return;
        const o = this.current.opts;
        const tone = Dialog.TONES[o.tone] ? o.tone : (o.kind === 'alert' ? 'info' : 'warning');
        const t = Dialog.TONES[tone];
        const esc = Utils.esc;
        const paragraphs = String(o.message || '').split(/\n{1,}/).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
        const needsInput = o.kind === 'prompt' || o.requireText;
        const confirmLabel = o.confirmLabel || (o.kind === 'alert' ? 'OK' : o.kind === 'prompt' ? 'Save' : 'Confirm');

        const card = document.getElementById('dlg-card');
        card.className = `dlg-card dlg-tone-${tone}`;
        card.innerHTML = `
            <div class="dlg-head">
                <span class="dlg-icon dlg-icon-${tone}">${this.ui.icon(o.icon || t.icon, '')}</span>
                <div class="min-w-0 flex-1">
                    <h3 id="dlg-title" class="dlg-title">${esc(o.title || (o.kind === 'alert' ? 'Notice' : 'Are you sure?'))}</h3>
                    <div id="dlg-message" class="dlg-message">${paragraphs}</div>
                </div>
            </div>
            ${o.details && o.details.length ? `<ul class="dlg-details">${o.details.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
            ${o.warnings && o.warnings.length ? `<div class="dlg-warn">${this.ui.icon('alert', 'w-4 h-4 flex-shrink-0 mt-0.5')}<div>${o.warnings.map(w => `<p>${esc(w)}</p>`).join('')}</div></div>` : ''}
            ${needsInput ? `
                <label class="dlg-field">
                    <span class="field-label">${o.requireText ? `Type <strong class="text-white">${esc(o.requireText)}</strong> to confirm` : esc(o.inputLabel || '')}</span>
                    <input id="dlg-input" type="text" class="field-input" autocomplete="off" spellcheck="false" placeholder="${esc(o.placeholder || o.requireText || '')}" value="${esc(o.value || '')}">
                </label>` : ''}
            ${o.note ? `<p class="dlg-note">${this.ui.icon('info', 'w-3.5 h-3.5 flex-shrink-0')}<span>${esc(o.note)}</span></p>` : ''}
            <div class="dlg-actions">
                ${o.kind === 'alert' ? '' : `<button type="button" class="dlg-btn dlg-btn-ghost" data-dialog-cancel>${esc(o.cancelLabel || 'Cancel')}</button>`}
                <button type="button" class="dlg-btn ${t.btn}" data-dialog-confirm ${o.requireText ? 'disabled' : ''}>${esc(confirmLabel)}</button>
            </div>`;

        card.querySelector('[data-dialog-confirm]').addEventListener('click', () => this._confirm());
        const cancel = card.querySelector('[data-dialog-cancel]');
        if (cancel) cancel.addEventListener('click', () => this._finish(o.kind === 'prompt' ? null : false));
        const input = card.querySelector('#dlg-input');
        if (input && o.requireText) {
            input.addEventListener('input', () => { card.querySelector('[data-dialog-confirm]').disabled = input.value.trim() !== o.requireText; });
        }

        this._returnFocus = document.activeElement;
        const el = this.el;
        el.classList.remove('dlg-leave');
        el.classList.add('visible');
        requestAnimationFrame(() => {
            // Destructive actions focus Cancel, so a stray Enter can't delete anything.
            const target = input || (tone === 'danger' && cancel) || card.querySelector('[data-dialog-confirm]');
            if (target) { target.focus(); if (input) input.select(); }
        });
    }

    _confirm() {
        if (!this.current) return;
        const o = this.current.opts;
        const btn = document.querySelector('#dlg-card [data-dialog-confirm]');
        if (btn && btn.disabled) return;
        const input = document.getElementById('dlg-input');
        if (o.kind === 'prompt') return this._finish(input ? input.value.trim() : '');
        this._finish(o.kind === 'alert' ? undefined : true);
    }

    _finish(result) {
        if (!this.current) return;
        const { resolve } = this.current;
        this.current = null;
        const el = this.el;
        el.classList.add('dlg-leave');
        setTimeout(() => {
            if (this.current) return; // another dialog already took over
            el.classList.remove('visible', 'dlg-leave');
            if (this._returnFocus && this._returnFocus.focus && document.contains(this._returnFocus)) this._returnFocus.focus();
            if (this.queue.length) this._next();
        }, 160);
        resolve(result);
    }

    _onKey(e) {
        if (!this.current) return;
        const o = this.current.opts;
        if (e.key === 'Escape') {
            e.preventDefault(); e.stopPropagation();
            this._finish(o.kind === 'prompt' ? null : o.kind === 'alert' ? undefined : false);
        } else if (e.key === 'Enter') {
            // Enter activates the focused button (so Cancel stays Cancel); elsewhere it confirms.
            const focused = document.activeElement;
            if (focused && focused.matches('#dlg-card [data-dialog-cancel]')) return;
            e.preventDefault(); e.stopPropagation();
            this._confirm();
        } else if (e.key === 'Tab') {
            const items = [...document.querySelectorAll('#dlg-card button:not([disabled]), #dlg-card input')];
            if (!items.length) return;
            const i = items.indexOf(document.activeElement);
            const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === items.length - 1 ? 0 : i + 1);
            e.preventDefault(); e.stopPropagation();
            items[next].focus();
        } else if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
            e.preventDefault(); e.stopPropagation(); // don't switch tabs behind an open dialog
        }
    }
}
