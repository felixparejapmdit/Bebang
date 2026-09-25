/* ============================================================
   Printer — renders a clean, letterhead-style page into #print-area and prints it.
   The letterhead uses the business details from Settings → Business Profile.
   ============================================================ */
class Printer {
    constructor(app) { this.app = app; }

    letterhead(title, subtitle = '') {
        const s = this.app.data.settings;
        const contact = [s.address, s.phone, s.email].filter(Boolean).map(Utils.esc).join(' · ');
        return `
            <div style="border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 14px;">
                <div style="font-size: 16pt; font-weight: 800;">${Utils.esc(s.businessName)}</div>
                ${s.businessTagline ? `<div style="font-size: 10pt;">${Utils.esc(s.businessTagline)}</div>` : ''}
                ${contact ? `<div style="font-size: 9pt; color: #444;">${contact}</div>` : ''}
            </div>
            <h1 style="font-size: 14pt; font-weight: 700; margin: 0 0 2px;">${Utils.esc(title)}</h1>
            <div style="font-size: 9pt; color: #444; margin-bottom: 12px;">${subtitle ? `${Utils.esc(subtitle)} · ` : ''}Generated ${Utils.esc(new Date().toLocaleString('en-PH'))}</div>`;
    }

    print(title, bodyHtml, { subtitle = '' } = {}) {
        const area = document.getElementById('print-area');
        area.innerHTML = `<div style="padding: 4px;">${this.letterhead(title, subtitle)}${bodyHtml}</div>`;
        window.print();
    }

    /** Simple key/value summary table for reports. */
    summaryTable(rows) {
        return `<table><tbody>${rows.map(([k, v, strong]) => `<tr><td>${strong ? `<strong>${Utils.esc(k)}</strong>` : Utils.esc(k)}</td><td class="num">${strong ? `<strong>${v}</strong>` : v}</td></tr>`).join('')}</tbody></table>`;
    }
    table(headers, rows, { right = [], footer = null } = {}) {
        const cls = (i) => right.includes(i) ? 'num' : '';
        return `<table>
            <thead><tr>${headers.map((h, i) => `<th class="${cls(i)}">${Utils.esc(h)}</th>`).join('')}</tr></thead>
            <tbody>${rows.length ? rows.map(r => `<tr>${r.map((v, i) => `<td class="${cls(i)}">${v}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}">No records.</td></tr>`}</tbody>
            ${footer ? `<tfoot><tr>${footer.map((v, i) => `<td class="${cls(i)}">${v}</td>`).join('')}</tr></tfoot>` : ''}
        </table>`;
    }
}
