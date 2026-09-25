/* ============================================================
   Permissions — the role-based access model (Settings → Access Matrix).

   PERMISSION_GROUPS  every page / button permission, grouped by module
   DEFAULT_ROLES      starting roles (the owner can add, edit and delete roles)
   PermissionGuard    enforces permissions in one place:
     • wraps every action method (App.sales.deliver, App.records.remove('po', …)…)
       so a blocked action never runs, whatever button or shortcut triggered it;
     • after each render, hides buttons / forms / editable fields whose action
       the current role can't perform (it reads the same App.x.y(…) handlers).
   The owner (ADMIN_EMAILS) always has everything. In local-only mode (no Firebase)
   there are no accounts, so every permission is granted.
   ============================================================ */
const PERMISSION_GROUPS = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', perms: [
        ['dashboard.view', 'View dashboard'] ] },
    { key: 'procurement', label: 'Procurement', icon: 'procurement', perms: [
        ['procurement.view', 'View purchase orders'], ['procurement.create', 'Create purchase orders'],
        ['procurement.advance', 'Place order · mark arrived · check in stock'], ['procurement.edit', 'Edit purchase orders'],
        ['procurement.delete', 'Delete purchase orders'] ] },
    { key: 'inventory', label: 'Inventory', icon: 'inventory', perms: [
        ['inventory.view', 'View inventory & stock history'], ['inventory.create', 'Add catalog items'],
        ['inventory.edit', 'Edit items & prices'], ['inventory.adjust', 'Adjust stock (manual entries, reconcile)'],
        ['inventory.bom', 'Edit recipes (BOM)'], ['inventory.photos', 'Attach item photos'], ['inventory.delete', 'Delete items'] ] },
    { key: 'manufacturing', label: 'Manufacturing', icon: 'manufacturing', perms: [
        ['manufacturing.view', 'View manufacturing'], ['manufacturing.remit', 'Log remittances (splints in)'],
        ['manufacturing.issue', 'Issue raw materials (materials out)'], ['manufacturing.edit', 'Edit remittances & issuances'],
        ['manufacturing.delete', 'Delete remittances & issuances'] ] },
    { key: 'sales', label: 'Sales & Customers', icon: 'sales', perms: [
        ['sales.view', 'View sales'], ['sales.pos', 'Log in-store sales (POS)'], ['sales.create', 'Create sales orders'],
        ['sales.deliver', 'Mark delivered & attach proof photos'], ['sales.edit', 'Edit sales orders'],
        ['sales.delete', 'Delete sales orders'], ['sales.customers', 'Add / edit / delete customers'] ] },
    { key: 'reports', label: 'Reports & Expenses', icon: 'reports', perms: [
        ['reports.view', 'View reports'], ['reports.financial', 'See financial figures (revenue, profit)'],
        ['reports.expenses', 'Add / edit / delete expenses'] ] },
    { key: 'costing', label: 'Costing', icon: 'costing', perms: [
        ['costing.view', 'View product costing'], ['costing.edit', 'Edit costing tables'] ] },
    { key: 'payroll', label: 'Payroll', icon: 'payroll', perms: [
        ['payroll.view', 'View payroll'], ['payroll.pay', 'Record payments'], ['payroll.edit', 'Edit / delete payments'] ] },
    { key: 'settings', label: 'Settings', icon: 'settings', perms: [
        ['settings.profile', 'Business profile'], ['settings.preferences', 'Shared preferences'],
        ['settings.workers', 'Manage workers'], ['settings.suppliers', 'Manage suppliers'],
        ['settings.categories', 'Manage expense categories'], ['settings.health', 'Data health checks & fixes'],
        ['settings.backup', 'Backup, restore & CSV exports'], ['settings.danger', 'Factory reset & clear cache'] ] },
    { key: 'data', label: 'General', icon: 'download', perms: [
        ['data.export', 'Export tables to CSV & print'] ] }
];
const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.perms.map(p => p[0]));
const VIEW_ONLY_PERMISSIONS = ['data.export', 'reports.financial'];
/** A role that can't change anything — the security rules block its writes to the business data. */
const isReadOnlyRole = (perms) => !perms.some(p => !p.endsWith('.view') && !VIEW_ONLY_PERMISSIONS.includes(p));

const DEFAULT_ROLES = {
    manager: {
        name: 'Manager', color: 'blue', description: 'Runs day-to-day operations — everything except factory reset.',
        permissions: ALL_PERMISSIONS.filter(p => p !== 'settings.danger')
    },
    staff: {
        name: 'Staff', color: 'green', description: 'Production and sales floor — logs stock, production and sales. Cannot delete or see profit.',
        permissions: ['dashboard.view', 'procurement.view', 'procurement.create', 'inventory.view', 'inventory.adjust', 'inventory.photos',
            'manufacturing.view', 'manufacturing.remit', 'manufacturing.issue', 'sales.view', 'sales.pos', 'sales.create', 'sales.deliver',
            'sales.customers', 'reports.view', 'data.export']
    },
    viewer: {
        name: 'Viewer', color: 'gray', description: 'Read-only — can look at everything but change nothing.',
        permissions: ALL_PERMISSIONS.filter(p => p.endsWith('.view') || p === 'reports.financial' || p === 'data.export')
    }
};
const DEFAULT_ROLE_ID = 'staff';        // role given to newly approved people (changeable in Roles Management)
const LEGACY_ROLE_ID = 'manager';       // people approved before roles existed keep full day-to-day access
const ROLE_COLORS = ['violet', 'blue', 'green', 'amber', 'red', 'gray'];

class PermissionGuard {
    // module of each record kind handled by RecordService
    static KIND = {
        po: { edit: 'procurement.edit', remove: 'procurement.delete', create: 'procurement.create' },
        so: { edit: 'sales.edit', remove: 'sales.delete', create: 'sales.create' },
        mo: { edit: 'manufacturing.edit', remove: 'manufacturing.delete', create: 'manufacturing.remit' },
        iss: { edit: 'manufacturing.edit', remove: 'manufacturing.delete', create: 'manufacturing.issue' },
        adj: { edit: 'inventory.adjust', remove: 'inventory.adjust', create: 'inventory.adjust' },
        exp: { edit: 'reports.expenses', remove: 'reports.expenses', create: 'reports.expenses' },
        pay: { edit: 'payroll.edit', remove: 'payroll.edit', create: 'payroll.pay' },
        cust: { edit: 'sales.customers', remove: 'sales.customers', create: 'sales.customers' },
        worker: { edit: 'settings.workers', remove: 'settings.workers', create: 'settings.workers' },
        supplier: { edit: 'settings.suppliers', remove: 'settings.suppliers', create: 'settings.suppliers' }
    };
    static attachPerm(type) { return type === 'Inventory' ? 'inventory.photos' : 'sales.deliver'; }

    /** "object.method" → permission (a string, or a function of the call's arguments). */
    static ACTIONS = {
        'records.create': (k) => (PermissionGuard.KIND[k] || {}).create, 'records.edit': (k) => (PermissionGuard.KIND[k] || {}).edit,
        'records.remove': (k) => (PermissionGuard.KIND[k] || {}).remove,
        'procurement.createPO': 'procurement.create', 'procurement.newPOFor': 'procurement.create', 'procurement.advance': 'procurement.advance',
        'inventory.addItem': 'inventory.create', 'inventory.editItem': 'inventory.edit', 'inventory.updatePrice': 'inventory.edit',
        'inventory.deleteItem': 'inventory.delete', 'inventory.addManualStock': 'inventory.adjust', 'inventory.printValuation': 'data.export',
        'bom.open': 'inventory.bom', 'bom.save': 'inventory.bom',
        'attachments.open': (id, type) => PermissionGuard.attachPerm(type),
        'history.open': 'inventory.view',
        'manufacturing.logRemittance': 'manufacturing.remit', 'manufacturing.createIssuance': 'manufacturing.issue', 'manufacturing.markIssued': 'manufacturing.issue',
        'sales.logQuickSale': 'sales.pos', 'sales.createSO': 'sales.create', 'sales.deliver': 'sales.deliver', 'sales.printInvoice': 'data.export',
        'reports.reconcile': 'inventory.adjust', 'reports.reconcileAll': 'inventory.adjust', 'reports.printFinancial': 'data.export',
        'tables.exportCSV': 'data.export', 'tables.print': 'data.export',
        'costing.editCostingRow': 'costing.edit', 'costing.deleteCostingRow': 'costing.edit', 'costing.editRawRow': 'costing.edit',
        'costing.deleteRawRow': 'costing.edit', 'costing.syncToInventory': 'costing.edit', 'costing.restoreDefaults': 'costing.edit',
        'payroll.recordPayment': 'payroll.pay', 'payroll.printPayslip': 'data.export',
        'settings.saveProfile': 'settings.profile', 'settings.resetProfile': 'settings.profile', 'settings.printTestPage': 'settings.profile',
        'settings.savePreferences': 'settings.preferences', 'settings.resetPreferences': 'settings.preferences',
        'settings.updateWorkerRate': 'settings.workers', 'settings.toggleActive': (k) => k === 'supplier' ? 'settings.suppliers' : 'settings.workers',
        'settings.addCategory': 'settings.categories', 'settings.editCategory': 'settings.categories', 'settings.moveCategory': 'settings.categories',
        'settings.deleteCategory': 'settings.categories', 'settings.removeCategory': 'settings.categories', 'settings.adoptOrphanCategories': 'settings.categories',
        'settings.fixDuplicateIds': 'settings.health', 'settings.restoreUnknownWorkers': 'settings.health',
        'settings.exportBackup': 'settings.backup', 'settings.importBackup': 'settings.backup', 'settings.exportCollection': 'settings.backup',
        'settings.factoryReset': 'settings.danger', 'settings.clearCache': 'settings.danger',
        // access control — owner only
        'settings.approveUser': '@owner', 'settings.declineUser': '@owner', 'settings.revokeUser': '@owner', 'settings.deleteUser': '@owner',
        'settings.setUserRole': '@owner', 'settings.addInvite': '@owner', 'settings.editInvite': '@owner', 'settings.removeInvite': '@owner',
        'settings.editRole': '@owner', 'settings.duplicateRole': '@owner', 'settings.deleteRole': '@owner', 'settings.setDefaultRole': '@owner',
        'settings.toggleMatrix': '@owner', 'settings.toggleMatrixGroup': '@owner', 'settings.toggleMatrixRole': '@owner', 'settings.saveMatrix': '@owner'
    };

    constructor(app) { this.app = app; }

    resolve(path, args) {
        const rule = PermissionGuard.ACTIONS[path];
        if (!rule) return null;
        return typeof rule === 'function' ? rule(...args) : rule;
    }
    allowed(perm) {
        if (!perm) return true;
        if (perm === '@owner') return this.app.access.isAdmin;
        return this.app.can(perm);
    }

    /** Wraps every listed action so it refuses to run without permission. */
    install() {
        Object.keys(PermissionGuard.ACTIONS).forEach(path => {
            const [objName, method] = path.split('.');
            const obj = this.app[objName];
            if (!obj || typeof obj[method] !== 'function' || obj[method].__guarded) return;
            const original = obj[method];
            const guard = this;
            const wrapped = function (...args) {
                const perm = guard.resolve(path, args);
                if (!guard.allowed(perm)) {
                    guard.app.ui.toast("Your role doesn't allow this action. Ask the administrator if you need it.", 'error');
                    return undefined;
                }
                return original.apply(this, args);
            };
            wrapped.__guarded = true;
            obj[method] = wrapped;
        });
    }

    /** Permissions needed by the App.x.y(...) calls in an inline handler string. */
    permsInHandler(code) {
        const perms = [];
        const re = /App\.(\w+)\.(\w+)\(([^)]*)\)/g;
        let m;
        while ((m = re.exec(code))) {
            const args = [...m[3].matchAll(/'([^']*)'/g)].map(a => a[1]);
            const perm = this.resolve(`${m[1]}.${m[2]}`, args);
            if (perm) perms.push(perm);
        }
        return perms;
    }

    /** Hides what the current role can't do inside `root` (called after every render). */
    apply(root) {
        if (!root || this.app.fullAccess) return;
        root.querySelectorAll('[onclick], form[onsubmit], [onblur], [onchange]').forEach(el => {
            const code = [el.getAttribute('onclick'), el.getAttribute('onsubmit'), el.getAttribute('onblur'), el.getAttribute('onchange')].filter(Boolean).join(';');
            const perms = this.permsInHandler(code);
            if (!perms.length || perms.every(p => this.allowed(p))) return;
            if (el.isContentEditable || el.hasAttribute('contenteditable')) {
                el.removeAttribute('contenteditable');
                el.classList.remove('editable-field');
                el.removeAttribute('onblur');
                el.title = 'Read-only for your role';
            } else {
                el.classList.add('perm-hidden');
            }
        });
    }
}
