/* ============================================================
   Utils — small, stateless helpers shared by every class.
   ============================================================ */
class Utils {
    static _currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
    static _currency3 = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 3 });

    /** Escapes text for safe use inside HTML content and double/single-quoted attributes. */
    static esc(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /** Local-calendar YYYY-MM-DD (toISOString() is UTC and shifts the day in the Philippines, UTC+8). */
    static dateStr(date = new Date()) {
        const d = date instanceof Date ? date : new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    static today() { return Utils.dateStr(new Date()); }
    static monthKey(dateString) { return String(dateString || '').substring(0, 7); }
    /** Parses YYYY-MM-DD as a LOCAL date (new Date('2026-01-05') would be UTC midnight). */
    static parseDate(dateString) {
        const [y, m, d] = String(dateString || '').split('-').map(Number);
        return new Date(y || 1970, (m || 1) - 1, d || 1);
    }
    static formatDate(dateString) {
        if (!dateString) return '—';
        return Utils.parseDate(dateString).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    /** ₱1,234.50 — pass precise=true for per-piece costs that need a 3rd decimal (₱0.006). */
    static formatDateTime(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return isNaN(d) ? '—' : d.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
    static formatCurrency(value, precise = false) { return (precise ? Utils._currency3 : Utils._currency).format(Number(value) || 0); }
    static formatNumber(value, maxDecimals = 2) {
        return (Number(value) || 0).toLocaleString('en-PH', { maximumFractionDigits: maxDecimals });
    }
    /** Rounds away floating-point noise (0.1 + 0.2) in stock math. */
    static round(value, decimals = 4) {
        const f = 10 ** decimals;
        return Math.round((Number(value) || 0) * f) / f;
    }
    static num(value, fallback = 0) {
        const n = parseFloat(value);
        return Number.isFinite(n) ? n : fallback;
    }

    static uuid() {
        return (crypto.randomUUID && crypto.randomUUID()) || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }
    /** Next sequential id like PO-007 — based on the highest existing number, so deletes never cause duplicates. */
    static nextId(prefix, list, pad = 3) {
        const re = new RegExp(`^${prefix}-(\\d+)$`);
        const max = (list || []).reduce((m, rec) => {
            const match = re.exec(rec && rec.id);
            return match ? Math.max(m, parseInt(match[1], 10)) : m;
        }, 0);
        return `${prefix}-${String(max + 1).padStart(pad, '0')}`;
    }

    static extractSize(name) {
        const match = (name || '').match(/#\d+/);
        return match ? match[0] : '—';
    }
    static sameText(a, b) { return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase(); }

    static toCSV(headers, rows) {
        const cell = (v) => {
            const s = v === null || v === undefined ? '' : String(v);
            return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        return [headers, ...rows].map(r => r.map(cell).join(',')).join('\r\n');
    }
    static downloadFile(filename, content, mime = 'text/plain') {
        const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
    static stripHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return (div.textContent || '').trim();
    }
}
