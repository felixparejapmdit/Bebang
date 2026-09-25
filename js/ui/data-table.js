/* ============================================================
   DataTable — every list in the app is one of these, so every table gets the
   same management tools: search, column sort, filters, paging, totals row,
   per-row actions, CSV export and print.

   App.tables.render({
     id: 'expenses', title: 'Expenses', rows: [...],
     columns: [{ key: 'date', label: 'Date', value: r => r.date },
               { key: 'amount', label: 'Amount', align: 'right', value: r => r.amount,
                 render: r => Utils.formatCurrency(r.amount), total: 'sum', format: 'currency' }],
     actions: r => '...buttons html...',
     filters: [{ key: 'cat', label: 'All categories', options: [...], test: (r, v) => r.category === v }],
     addButton: { label: 'Add Expense', onclick: 'App.reports.addExpense()' },
     defaultSort: { key: 'date', dir: 'desc' }
   })
   State (search/sort/page/filters) survives re-renders; typing in the search box only
   redraws the table body, so focus is never lost.
   ============================================================ */
class DataTable {
    constructor(app) {
        this.app = app;
        this.registry = {};
    }

    _entry(id) { return this.registry[id]; }

    render(cfg) {
        const prev = this.registry[cfg.id];
        const state = prev ? prev.state : {
            search: '', page: 1, filters: {},
            sortKey: cfg.defaultSort ? cfg.defaultSort.key : null,
            sortDir: cfg.defaultSort ? cfg.defaultSort.dir : 'asc',
            pageSize: cfg.pageSize || null
        };
        this.registry[cfg.id] = { cfg, state };
        const ui = this.app.ui;
        const filtersHtml = (cfg.filters || []).map(f => `
            <select class="dt-filter" aria-label="${Utils.esc(f.label)}" onchange="App.tables.setFilter('${cfg.id}', '${f.key}', this.value)">
                <option value="">${Utils.esc(f.label)}</option>
                ${f.options.map(o => {
                    const v = typeof o === 'object' ? o.value : o, l = typeof o === 'object' ? o.label : o;
                    return `<option value="${Utils.esc(v)}" ${String(state.filters[f.key] ?? '') === String(v) ? 'selected' : ''}>${Utils.esc(l)}</option>`;
                }).join('')}
            </select>`).join('');
        return `
            <div class="dt ${cfg.panel === false ? '' : 'glass-panel p-4 sm:p-5'} ${cfg.className || ''}" id="dt-${cfg.id}">
                <div class="dt-toolbar">
                    <div class="min-w-0">
                        ${cfg.title ? `<h3 class="dt-title text-white">${cfg.title}</h3>` : ''}
                        ${cfg.subtitle ? `<p class="text-xs text-secondary mt-0.5">${cfg.subtitle}</p>` : ''}
                    </div>
                    <div class="dt-tools no-print">
                        ${cfg.search === false ? '' : `<input type="search" class="dt-search" placeholder="${Utils.esc(cfg.searchPlaceholder || 'Search…')}" value="${Utils.esc(state.search)}" oninput="App.tables.search('${cfg.id}', this.value)" aria-label="Search ${Utils.esc(Utils.stripHtml(cfg.title || 'table'))}">`}
                        ${filtersHtml}
                        ${cfg.toolbar || ''}
                        ${cfg.exportable === false ? '' : `<button type="button" class="dt-btn" onclick="App.tables.exportCSV('${cfg.id}')" title="Download as CSV (Excel)">${ui.icon('download', '')}CSV</button>
                        <button type="button" class="dt-btn" onclick="App.tables.print('${cfg.id}')" title="Print this table">${ui.icon('print', '')}Print</button>`}
                        ${cfg.addButton ? `<button type="button" class="dt-btn dt-btn-primary" onclick="${cfg.addButton.onclick}">${ui.icon('plus', '')}${Utils.esc(cfg.addButton.label)}</button>` : ''}
                    </div>
                </div>
                <div id="dt-${cfg.id}-body">${this._bodyHtml(cfg.id)}</div>
            </div>`;
    }

    _cellValue(col, row) {
        if (col.value) return col.value(row);
        return row[col.key];
    }
    _processed(id) {
        const { cfg, state } = this._entry(id);
        let rows = [...(cfg.rows || [])];
        (cfg.filters || []).forEach(f => {
            const v = state.filters[f.key];
            if (v !== undefined && v !== '') rows = rows.filter(r => f.test(r, v));
        });
        const q = state.search.trim().toLowerCase();
        if (q) {
            const cols = cfg.columns.filter(c => !c.actions);
            rows = rows.filter(r => cols.some(c => {
                const text = c.csv ? c.csv(r) : this._cellValue(c, r);
                return String(text ?? '').toLowerCase().includes(q);
            }) || (cfg.searchText && cfg.searchText(r).toLowerCase().includes(q)));
        }
        if (state.sortKey) {
            const col = cfg.columns.find(c => c.key === state.sortKey);
            if (col) {
                const dir = state.sortDir === 'desc' ? -1 : 1;
                rows.sort((a, b) => {
                    let va = col.sortValue ? col.sortValue(a) : this._cellValue(col, a);
                    let vb = col.sortValue ? col.sortValue(b) : this._cellValue(col, b);
                    if (va === null || va === undefined) va = '';
                    if (vb === null || vb === undefined) vb = '';
                    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
                    return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' }) * dir;
                });
            }
        }
        return rows;
    }

    _format(value, format) {
        if (format === 'currency') return Utils.formatCurrency(value);
        if (format === 'number') return Utils.formatNumber(value, 4);
        return Utils.esc(value);
    }
    _footerValues(cfg, rows) {
        const cols = cfg.columns;
        if (!cols.some(c => c.total)) return null;
        return cols.map(c => {
            if (!c.total) return null;
            const v = typeof c.total === 'function' ? c.total(rows) : rows.reduce((s, r) => s + (Utils.num(this._cellValue(c, r))), 0);
            return { raw: v, html: this._format(v, c.format) };
        });
    }

    _bodyHtml(id) {
        const { cfg, state } = this._entry(id);
        const ui = this.app.ui;
        const all = this._processed(id);
        const pageSize = state.pageSize || Utils.num(this.app.data.settings.tablePageSize, 25) || 25;
        const pages = Math.max(1, Math.ceil(all.length / pageSize));
        state.page = Math.min(Math.max(1, state.page), pages);
        const start = (state.page - 1) * pageSize;
        const rows = cfg.paginate === false ? all : all.slice(start, start + pageSize);
        const cols = [...cfg.columns];
        if (cfg.actions) cols.push({ key: '__actions', label: 'Action', align: 'center', actions: true, sortable: false, className: 'no-print' });
        const alignCls = (c) => c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left';

        if ((cfg.rows || []).length === 0) return ui.emptyNote(cfg.emptyText || 'Nothing here yet.');

        const footer = this._footerValues(cfg, all);
        const head = cols.map(c => {
            const sortable = c.sortable !== false && !c.actions;
            const icon = state.sortKey === c.key ? `<span class="sort-icon ${state.sortDir === 'asc' ? 'sort-asc' : 'sort-desc'}"></span>` : '';
            return `<th class="${alignCls(c)} ${sortable ? 'sortable' : ''} ${c.className || ''}" ${sortable ? `onclick="App.tables.sort('${id}', '${c.key}')"` : ''}>${c.label}${icon}</th>`;
        }).join('');
        const body = rows.length ? rows.map(r => `
            <tr class="${cfg.rowClass ? cfg.rowClass(r) : ''}">
                ${cols.map(c => {
                    if (c.actions) return `<td class="text-center whitespace-nowrap no-print">${cfg.actions(r)}</td>`;
                    const html = c.render ? c.render(r) : this._format(this._cellValue(c, r), c.format);
                    return `<td class="${alignCls(c)} ${c.wrap ? '' : 'whitespace-nowrap'} ${c.className || ''}">${html}</td>`;
                }).join('')}
            </tr>`).join('')
            : `<tr><td colspan="${cols.length}" class="text-center py-6 text-secondary">No matching records.</td></tr>`;
        const foot = footer ? `<tfoot><tr>${cols.map((c, i) => {
            if (i === 0 && !footer[0]) return `<td class="text-left">Total (${all.length})</td>`;
            const f = footer[i];
            return `<td class="${alignCls(c)} whitespace-nowrap ${c.className || ''}">${f ? f.html : ''}</td>`;
        }).join('')}</tr></tfoot>` : '';

        const pager = cfg.paginate === false || pages <= 1 ? '' : `
            <div class="dt-pager no-print">
                <button type="button" class="dt-btn" onclick="App.tables.page('${id}', ${state.page - 1})" ${state.page <= 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>
                <span>Page ${state.page} of ${pages}</span>
                <button type="button" class="dt-btn" onclick="App.tables.page('${id}', ${state.page + 1})" ${state.page >= pages ? 'disabled' : ''} aria-label="Next page">›</button>
            </div>`;
        const shown = cfg.paginate === false || pages <= 1 ? `${all.length} record${all.length === 1 ? '' : 's'}` : `Showing ${start + 1}–${Math.min(start + pageSize, all.length)} of ${all.length}`;
        return `
            <div class="overflow-x-auto table-fade rounded-xl">
                <table class="dt-table min-w-full">
                    <thead><tr>${head}</tr></thead>
                    <tbody>${body}</tbody>
                    ${foot}
                </table>
            </div>
            <div class="dt-footer"><span>${shown}${all.length !== (cfg.rows || []).length ? ` (filtered from ${(cfg.rows || []).length})` : ''}</span>${pager}</div>`;
    }

    refresh(id) {
        const body = document.getElementById(`dt-${id}-body`);
        if (body && this._entry(id)) body.innerHTML = this._bodyHtml(id);
    }
    search(id, value) { const e = this._entry(id); if (!e) return; e.state.search = value; e.state.page = 1; this.refresh(id); }
    sort(id, key) {
        const e = this._entry(id); if (!e) return;
        if (e.state.sortKey === key) e.state.sortDir = e.state.sortDir === 'asc' ? 'desc' : 'asc';
        else { e.state.sortKey = key; e.state.sortDir = 'asc'; }
        this.refresh(id);
    }
    page(id, n) { const e = this._entry(id); if (!e) return; e.state.page = n; this.refresh(id); }
    setFilter(id, key, value) { const e = this._entry(id); if (!e) return; e.state.filters[key] = value; e.state.page = 1; this.refresh(id); }

    /** Plain-text matrix of what's currently shown (filters/search/sort applied, all pages). */
    _matrix(id) {
        const { cfg } = this._entry(id);
        const cols = cfg.columns.filter(c => c.printable !== false);
        const rows = this._processed(id);
        const text = (c, r) => {
            if (c.csv) return c.csv(r);
            const v = this._cellValue(c, r);
            if (c.format === 'currency') return Utils.round(Utils.num(v), 2);
            return v ?? '';
        };
        const footer = this._footerValues({ ...cfg, columns: cols }, rows);
        return {
            cols, headers: cols.map(c => Utils.stripHtml(c.label)),
            rows: rows.map(r => cols.map(c => text(c, r))),
            footer: footer ? footer.map((f, i) => f ? (cols[i].format === 'currency' ? Utils.round(f.raw, 2) : f.raw) : (i === 0 ? `Total (${rows.length})` : '')) : null
        };
    }
    exportCSV(id) {
        const e = this._entry(id); if (!e) return;
        const m = this._matrix(id);
        const rows = m.footer ? [...m.rows, m.footer] : m.rows;
        const name = (e.cfg.exportName || Utils.stripHtml(e.cfg.title || id)).replace(/[^\w-]+/g, '_');
        Utils.downloadFile(`${name}_${Utils.today()}.csv`, '﻿' + Utils.toCSV(m.headers, rows), 'text/csv;charset=utf-8');
        this.app.ui.toast(`Exported ${m.rows.length} rows to CSV.`);
    }
    print(id) {
        const e = this._entry(id); if (!e) return;
        const m = this._matrix(id);
        const { cfg, state } = e;
        const notes = [state.search ? `Search: “${state.search}”` : '', ...Object.entries(state.filters).filter(([, v]) => v).map(([k, v]) => {
            const f = (cfg.filters || []).find(x => x.key === k);
            const opt = f && f.options.find(o => String(typeof o === 'object' ? o.value : o) === String(v));
            return `${f ? f.label : k}: ${opt ? (typeof opt === 'object' ? opt.label : opt) : v}`;
        })].filter(Boolean).join(' · ');
        const fmt = (c, v) => c.format === 'currency' && v !== '' ? Utils.formatCurrency(v) : Utils.esc(v);
        const table = `
            <table>
                <thead><tr>${m.cols.map(c => `<th class="${c.align === 'right' ? 'num' : ''}">${Utils.esc(Utils.stripHtml(c.label))}</th>`).join('')}</tr></thead>
                <tbody>${m.rows.map(r => `<tr>${r.map((v, i) => `<td class="${m.cols[i].align === 'right' ? 'num' : ''}">${fmt(m.cols[i], v)}</td>`).join('')}</tr>`).join('')}</tbody>
                ${m.footer ? `<tfoot><tr>${m.footer.map((v, i) => `<td class="${m.cols[i].align === 'right' ? 'num' : ''}">${fmt(m.cols[i], v)}</td>`).join('')}</tr></tfoot>` : ''}
            </table>`;
        this.app.printer.print(cfg.printTitle || Utils.stripHtml(cfg.title || id), table, { subtitle: notes || `${m.rows.length} records` });
    }
}
