/* ============================================================
   TourGuide — the step-by-step walkthrough. Each step names the tab it lives
   on, the element to highlight, and (optionally) a setup() that switches a
   sub-view first, so every highlight target actually exists.
   ============================================================ */
class TourGuide {
    constructor(app) {
        this.app = app;
        this.index = -1;
        this.returnFocus = null;
        this.steps = [
            { title: "Welcome to Bebang's Business Management System!", content: "This guide walks through the full workflow: team setup, stock, buying, production, selling, payroll and reports.", tab: 'dashboard', highlight: null },
            { title: 'Step 1: Set Up Your Team', content: "Before production, add your workers. Worker Management lives in the 'Settings' tab.", tab: 'settings', highlight: '#nav-btn-container-settings' },
            { title: 'Worker Management', content: "Add each worker and their rate per splint here. Workers fill the Manufacturing dropdowns, and the rate drives Payroll. Renaming a worker updates all of their past records.", tab: 'settings', highlight: '#worker-management-card' },
            { title: 'Step 2: Log Your Old Stock', content: "Next, record what you already have on hand. Go to the 'Inventory' tab.", tab: 'inventory', highlight: '#nav-btn-container-inventory' },
            { title: 'Step 3: The Manual Stock Form', content: "Use 'Add Old Stock / Manual Adjustment' to add stock without a Purchase Order. Pick the item (e.g. 'Plastic Sheet #50' or 'SPLINT #50'), the quantity on hand, its unit cost, and a reason like 'Initial stock count'. A negative quantity removes stock.", tab: 'inventory', highlight: '#manual-stock-form' },
            { title: 'Step 4: Every Change Is Logged', content: "Each entry appears in the Manual Adjustments Log at the bottom of the page. Editing or deleting one corrects the item's stock automatically, so the Inventory Ledger always reconciles.", tab: 'inventory', highlight: '#manual-stock-form' },
            { title: 'Step 5: Procurement (Buying)', content: "Buy new raw materials, supplies or equipment from the 'Procurement' tab.", tab: 'procurement', highlight: '#nav-btn-container-procurement' },
            { title: 'Step 6: The Purchase Order Form', content: "Type the item name (suggestions come from your catalog; its type and last cost fill in automatically), the quantity, unit cost and supplier.", tab: 'procurement', highlight: '#procurement-form' },
            { title: "Step 7: Field: 'Item Type'", content: "Choose 'Raw Material' for anything used to build a splint (e.g. Glue, Velcro), or 'Supplies' / 'Equipment' for other stock. Splints are produced, not purchased.", tab: 'procurement', highlight: '#po-item-type' },
            { title: 'Step 8: Create the PO', content: "Click 'Create PO' to save it as a Draft. The running total shows below the form.", tab: 'procurement', highlight: '#procurement-form button' },
            { title: 'Step 9: PO Workflow: Place Order', content: "Draft POs appear here. Click 'Place Order' once you've sent it to your supplier.", tab: 'procurement', highlight: '#po-list-Draft' },
            { title: 'Step 10: PO Workflow: Receive & Check', content: "When items arrive, click 'Mark as Arrived', then 'Check-In Stock'. Check-in is what officially adds the items to inventory.", tab: 'procurement', highlight: '#po-list-Ordered' },
            { title: 'Fixing Mistakes', content: "Every card and table row has Edit and Delete buttons (right-click works too). Deleting a checked-in PO takes its stock back out automatically.", tab: 'procurement', highlight: '#po-list-Draft' },
            { title: 'Step 11: Back to Inventory', content: "Let's look at the stock itself. Go to the 'Inventory' tab.", tab: 'inventory', highlight: '#nav-btn-container-inventory' },
            { title: 'Step 12: The Inventory Table', content: "Search, sort, filter by low stock, export to CSV, or print. Use the photo button to attach a product picture (auto-compressed), and the clock button to see an item's full stock history.", tab: 'inventory', highlight: '#inventory-list', setup: (app) => { app.inventory.view = 'splint'; } },
            { title: 'Step 13: Edit Prices', content: "Click directly on a Unit Cost or Sale Price to edit it, then press Enter or click away. The 'Price Updated' date changes too.", tab: 'inventory', highlight: '.editable-field', setup: (app) => { app.inventory.view = 'splint'; } },
            { title: "Step 14: Set the 'Recipe' (BOM)", content: "For splints, click 'BOM' to open the recipe editor: the materials and quantities one splint uses, plus the material cost per splint. It's a costing reference; Manufacturing tracks materials out and splints in separately.", tab: 'inventory', highlight: '.bom-edit-button', setup: (app) => { app.inventory.view = 'splint'; } },
            { title: 'Step 15: Manufacturing (Issuance & Remittance)', content: "Track raw materials going out to workers and finished splints coming back. Go to the 'Manufacturing' tab.", tab: 'manufacturing', highlight: '#nav-btn-container-manufacturing' },
            { title: 'Workflow 1: Remittance (splints coming IN)', content: "Your main daily tool. When a worker hands in completed splints, pick the size, quantity, worker and date, then click 'Log Remittance'. This adds splint stock and credits the worker for Payroll.", tab: 'manufacturing', highlight: '#quick-log-form' },
            { title: 'Workflow 2: Issuance (materials going OUT)', content: "When you hand a worker raw materials, pick the material, quantity and worker. 'Create Issuance' saves it as Pending; click 'Mark as Issued' when it's physically handed over. 'Issue Now' does both in one step.", tab: 'manufacturing', highlight: '#mo-form' },
            { title: 'Step 16: Sales (Selling)', content: "Only Splints, Supplies and Equipment can be sold. Go to the 'Sales' tab.", tab: 'sales', highlight: '#nav-btn-container-sales' },
            { title: 'Workflow 1: In-Store Sale (POS)', content: "For a walk-in customer, pick the item and quantity. The total and remaining stock show as you type.", tab: 'sales', highlight: '#pos-form' },
            { title: 'POS: Price Override', content: "The Sale Price fills in automatically; type over it to give a discount. 'Log Sale' updates inventory immediately.", tab: 'sales', highlight: '#pos-price' },
            { title: 'Workflow 2: Planned Sale (Delivery)', content: "For deliveries, type who it's for in 'Delivered To'. New names become customers automatically. Add a DR/reference number if you have one.", tab: 'sales', highlight: '#so-form' },
            { title: 'Prices Depend on the Customer', content: "If this customer has bought the item before, the price fills in with their last price instead of the catalog price. You can edit it at any time.", tab: 'sales', highlight: '#so-price' },
            { title: 'Step 17: Attach Proof', content: "Pending orders appear here. Use 'Attach Delivery' and 'Attach Payment' to add photos of the receipt or transfer.", tab: 'sales', highlight: '#so-list-Pending-Delivery' },
            { title: 'Step 18: Fulfill & Deliver', content: "Click 'Mark as Delivered' to deduct the stock and complete the order. The printer button in the Sales Register prints a delivery receipt.", tab: 'sales', highlight: '#so-list-Pending-Delivery' },
            { title: 'Step 19: Reports', content: "Review everything in the 'Reports' tab.", tab: 'reports', highlight: '#nav-btn-container-reports' },
            { title: 'Financial Report', content: "Pick a period (or a custom date range) to see revenue, purchases, expenses and net profit, plus breakdowns by product, customer and category. 'Print Report' prints it on your letterhead.", tab: 'reports', highlight: '#reports-generator-card', setup: (app) => { app.reports.view = 'financial'; } },
            { title: 'Production & Other Reports', content: "The sub-tabs cover Stock & Valuation (with reconciliation), the full Inventory Ledger, Sales, Production (units per worker) and Expenses. Every table can be searched, exported to CSV and printed.", tab: 'reports', highlight: '#production-log-view', setup: (app) => { app.reports.view = 'production'; } },
            { title: 'Step 20: Payroll', content: "Pay is calculated from remitted splints × each worker's rate. Record payments (they're logged as expenses too) and print payslips.", tab: 'payroll', highlight: '#nav-btn-container-payroll' },
            { title: 'Step 21: Settings & Backups', content: "Business profile, preferences, expense categories, workers, app install and data tools all live in 'Settings'.", tab: 'settings', highlight: '#nav-btn-container-settings' },
            { title: 'CRITICAL: Backup', content: "Click 'Export Data' regularly to save a JSON backup of your entire database. 'Restore Data' replaces everything with a backup file.", tab: 'settings', highlight: '#backup-card' },
            { title: 'CRITICAL: Factory Reset', content: "The red 'Factory Reset' button deletes everything, including the item catalog. You'll be asked to type DELETE to confirm.", tab: 'settings', highlight: '#factory-reset-button' },
            { title: 'Clear Cache & Reload Defaults', content: "If lists look outdated after an app update, use this instead of Factory Reset. It clears this browser's local copy and reloads.", tab: 'settings', highlight: '#clear-cache-button' },
            { title: 'Install as an App', content: "Install Bebang BMS on your phone or computer from the 'App & Offline' card. It opens full-screen and keeps working offline.", tab: 'settings', highlight: '#app-card' },
            { title: "You're a Power User!", content: "That's the complete workflow. Shortcuts: Ctrl/⌘ + 1–9 switches tabs and Esc closes dialogs. You're all set!", tab: 'dashboard', highlight: null }
        ];
    }
    get modal() { return document.getElementById('tour-modal'); }
    get isOpen() { return this.modal.classList.contains('visible'); }

    start() {
        this.returnFocus = document.activeElement;
        this.index = 0;
        this.modal.classList.remove('hidden');
        this.modal.classList.add('visible');
        this.renderStep();
    }
    close() {
        try { localStorage.setItem('bebang.tourDone', '1'); } catch (e) { /* ignore */ }
        this.index = -1;
        this.modal.classList.remove('visible', 'items-start', 'items-end');
        this.modal.classList.add('hidden');
        this.unhighlight();
        if (this.returnFocus && this.returnFocus.focus) this.returnFocus.focus();
    }
    next() { if (this.index < this.steps.length - 1) { this.index++; this.renderStep(); } else this.close(); }
    prev() { if (this.index > 0) { this.index--; this.renderStep(); } }
    unhighlight() { document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight')); }

    renderStep() {
        const step = this.steps[this.index];
        if (!step) return this.close();
        this.unhighlight();
        if (step.setup) step.setup(this.app);
        if (this.app.currentTab !== step.tab || step.setup) this.app.render(step.tab, { skipAnimation: true, keepScroll: false });
        document.getElementById('tour-title').textContent = step.title;
        document.getElementById('tour-content').textContent = step.content;
        document.getElementById('tour-progress').textContent = `${this.index + 1} / ${this.steps.length}`;
        document.getElementById('tour-prev-btn').disabled = this.index === 0;
        document.getElementById('tour-next-btn').textContent = this.index === this.steps.length - 1 ? 'Finish' : 'Next →';
        const modal = this.modal;
        const target = step.highlight && document.querySelector(step.highlight);
        modal.classList.remove('items-start', 'items-end');
        if (target) {
            target.classList.add('tour-highlight');
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const rect = target.getBoundingClientRect();
            modal.classList.add((rect.top + rect.height / 2) < window.innerHeight / 2 ? 'items-end' : 'items-start');
        }
        document.getElementById('tour-next-btn').focus();
    }
}
