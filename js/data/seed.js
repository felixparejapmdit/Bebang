/* ============================================================
   Seed & reference data — the built-in catalog a fresh database starts from,
   plus the reference tables transcribed from the source PDFs.
   ============================================================ */

// App-wide defaults for the Settings tab (stored in data.settings and synced).
const DEFAULT_SETTINGS = {
    businessName: "Bebang's Business Management System",
    businessTagline: 'BC&E Medical Supplies · Splint Production & Sales',
    address: '',
    phone: '',
    email: '',
    lowStockThreshold: 10,
    expenseCategories: ['Materials', 'Payroll', 'Rent', 'Utilities', 'Logistics', 'Salaries', 'Supplies', 'Maintenance', 'Other'],
    backupReminderDays: 7,
    lastBackupAt: null,
    tablePageSize: 25,
    defaultReportPeriod: 'month'
};

// ---- Product catalog seed: real SPLINT sizes, raw materials, prices & BOM recipes,
// ---- verified against "Updated 2026 (Product Cost) final.pdf". Stock starts at 0 —
// ---- log actual on-hand quantities via Procurement or Inventory > Add Old Stock.
const initialData = {
    inventory: [
        { id: 'RM-1', type: 'raw', name: 'Plastic Sheet #50', stock: 0, unit_cost: 7.50, units: 'pcs', price_last_updated: '2026-01-01' },
        { id: 'RM-2', type: 'raw', name: 'Plastic Sheet #45', stock: 0, unit_cost: 6.50, units: 'pcs', price_last_updated: '2026-01-01' },
        { id: 'RM-3', type: 'raw', name: 'Plastic Sheet #40', stock: 0, unit_cost: 5.50, units: 'pcs', price_last_updated: '2026-01-01' },
        { id: 'RM-4', type: 'raw', name: 'Plastic Sheet #35', stock: 0, unit_cost: 4.50, units: 'pcs', price_last_updated: '2026-01-01' },
        { id: 'RM-5', type: 'raw', name: 'Plastic Sheet #30', stock: 0, unit_cost: 4.00, units: 'pcs', price_last_updated: '2026-01-01' },
        { id: 'RM-6', type: 'raw', name: 'Plastic Sheet #25', stock: 0, unit_cost: 3.70, units: 'pcs', price_last_updated: '2026-01-01' },
        { id: 'RM-7', type: 'raw', name: 'Plastic Sheet #20', stock: 0, unit_cost: 3.00, units: 'pcs', price_last_updated: '2026-01-01' },
        { id: 'RM-8', type: 'raw', name: 'Plastic Sheet #15', stock: 0, unit_cost: 3.00, units: 'pcs', price_last_updated: '2026-01-01' },
        { id: 'RM-9', type: 'raw', name: 'Plastic Sheet #10', stock: 0, unit_cost: 3.00, units: 'pcs', price_last_updated: '2026-01-01' },
        { id: 'RM-10', type: 'raw', name: 'Neoprene Cloth', stock: 0, unit_cost: 3668.00, units: 'rolls', price_last_updated: '2026-01-01' },
        { id: 'RM-11', type: 'raw', name: 'Glue (Adhesive)', stock: 0, unit_cost: 750.00, units: 'gal', price_last_updated: '2026-01-01' },
        { id: 'RM-12', type: 'raw', name: 'Ecobag Roll', stock: 0, unit_cost: 3300.00, units: 'rolls', price_last_updated: '2026-01-01' },
        { id: 'RM-13', type: 'raw', name: 'Velcro 3/4 (Roll)', stock: 0, unit_cost: 125.00, units: 'rolls', price_last_updated: '2026-01-01' },
        { id: 'RM-14', type: 'raw', name: 'Velcro 1 (Roll)', stock: 0, unit_cost: 128.00, units: 'rolls', price_last_updated: '2026-01-01' },
        { id: 'RM-15', type: 'raw', name: 'Sewing Thread (Cone)', stock: 0, unit_cost: 19.00, units: 'cones', price_last_updated: '2026-01-01' },
        { id: 'RM-16', type: 'raw', name: 'Poly Bag', stock: 0, unit_cost: 0.80, units: 'pcs', price_last_updated: '2026-01-01' },
        { id: 'RM-17', type: 'raw', name: 'Packaging Tape', stock: 0, unit_cost: 38.00, units: 'rolls', price_last_updated: '2026-01-01' },
        { id: 'RM-18', type: 'raw', name: 'Double-Sided Tape', stock: 0, unit_cost: 17.00, units: 'rolls', price_last_updated: '2026-01-01' },
        { id: 'RM-19', type: 'raw', name: 'Shipping Box #50', stock: 0, unit_cost: 35.25, units: 'pcs', price_last_updated: '2026-01-01' },
        { id: 'RM-20', type: 'raw', name: 'Shipping Box #45', stock: 0, unit_cost: 28.50, units: 'pcs', price_last_updated: '2026-01-01' },
        { id: 'RM-21', type: 'raw', name: 'Shipping Box #40', stock: 0, unit_cost: 24.25, units: 'pcs', price_last_updated: '2026-01-01' },
        { id: 'RM-22', type: 'raw', name: 'Shipping Box #35', stock: 0, unit_cost: 24.25, units: 'pcs', price_last_updated: '2026-01-01' },
        { id: 'RM-23', type: 'raw', name: 'Shipping Box #30', stock: 0, unit_cost: 24.25, units: 'pcs', price_last_updated: '2026-01-01' },
        { id: 'SPL-1', type: 'splint', name: 'SPLINT #50', stock: 0, unit_cost: 26.376, sale_price: 60.00, price_last_updated: '2026-01-01',
          bom: [ { material_id: 'RM-1', quantity: 1 }, { material_id: 'RM-16', quantity: 1 } ]
        },
        { id: 'SPL-2', type: 'splint', name: 'SPLINT #45', stock: 0, unit_cost: 23.396, sale_price: 60.00, price_last_updated: '2026-01-01',
          bom: [ { material_id: 'RM-2', quantity: 1 }, { material_id: 'RM-16', quantity: 1 } ]
        },
        { id: 'SPL-3', type: 'splint', name: 'SPLINT #40', stock: 0, unit_cost: 21.916, sale_price: 60.00, price_last_updated: '2026-01-01',
          bom: [ { material_id: 'RM-3', quantity: 1 }, { material_id: 'RM-16', quantity: 1 } ]
        },
        { id: 'SPL-4', type: 'splint', name: 'SPLINT #35', stock: 0, unit_cost: 20.346, sale_price: 50.00, price_last_updated: '2026-01-01',
          bom: [ { material_id: 'RM-4', quantity: 1 }, { material_id: 'RM-16', quantity: 1 } ]
        },
        { id: 'SPL-5', type: 'splint', name: 'SPLINT #30', stock: 0, unit_cost: 19.666, sale_price: 50.00, price_last_updated: '2026-01-01',
          bom: [ { material_id: 'RM-5', quantity: 1 }, { material_id: 'RM-16', quantity: 1 } ]
        },
        { id: 'SPL-6', type: 'splint', name: 'SPLINT #25', stock: 0, unit_cost: 18.894, sale_price: 50.00, price_last_updated: '2026-01-01',
          bom: [ { material_id: 'RM-6', quantity: 1 }, { material_id: 'RM-16', quantity: 1 } ]
        },
        { id: 'SPL-7', type: 'splint', name: 'SPLINT #20', stock: 0, unit_cost: 12.11, sale_price: 35.00, price_last_updated: '2026-01-01',
          bom: [ { material_id: 'RM-7', quantity: 1 }, { material_id: 'RM-16', quantity: 1 } ]
        },
        { id: 'SPL-8', type: 'splint', name: 'SPLINT #15', stock: 0, unit_cost: 12.11, sale_price: 35.00, price_last_updated: '2026-01-01',
          bom: [ { material_id: 'RM-8', quantity: 1 }, { material_id: 'RM-16', quantity: 1 } ]
        },
        { id: 'SPL-9', type: 'splint', name: 'SPLINT #10', stock: 0, unit_cost: 12.11, sale_price: 35.00, price_last_updated: '2026-01-01',
          bom: [ { material_id: 'RM-9', quantity: 1 }, { material_id: 'RM-16', quantity: 1 } ]
        }
        // Supplies and Equipment start empty — add your own via Procurement or Inventory > Add Old Stock.
    ],
    customers: [],
    salesOrders: [],
    expenses: [],
    imageAttachments: [],
    theme: 'dark',
    purchaseOrders: [],
    manufacturingOrders: [],
    issuances: [],
    workers: [],
    manualAdjustments: [],
    payrollPayments: [],
    suppliers: [],
    settings: structuredClone(DEFAULT_SETTINGS)
};

const emptyData = {
    inventory: [], customers: [], salesOrders: [], expenses: [],
    imageAttachments: [], theme: 'dark', purchaseOrders: [],
    manufacturingOrders: [], issuances: [], workers: [], manualAdjustments: [],
    payrollPayments: [], suppliers: [], costingRows: null, rawMaterialPriceRows: null,
    settings: structuredClone(DEFAULT_SETTINGS)
};

// ---- SPLINT PRODUCT COSTING DATA (from "Updated 2026 (Product Cost) final.pdf") ----
// Default/reference seed for the live-editable this.data.costingRows (Costing tab Action column
// lets the owner add/edit/delete rows; these DEFAULT_* constants are only the starting values and
// what "Factory Reset" restores). Columns m[]: Raw PP cut | Neoprene | Glue | Thread | Ecobag |
// Sewing & Labor | Velcro | Poly Bag | Packaging Tape | Double Tape | Box
const COSTING_PARTS = ['Raw PP cut', 'Neoprene cut', 'Glue', 'Thread', 'Ecobag', 'Sewing & Labor', 'Velcro', 'Poly Bag', 'Pack. Tape', 'Dbl. Tape', 'Box'];
const OVERHEAD_PER_PC = 3.22;
const DEFAULT_COSTING = [
    { size: '#50', m: [7.5, 1.83, 0.10, 0.76, 0.006, 7.5, 1.5, 2, 0.4, 0.8, 0.76], total: 26.376, retail: 60, dist: [21.624, 18.624, 15.624] },
    { size: '#45', m: [6.5, 1.41, 0.10, 0.72, 0.006, 7.5, 0.14, 2, 0.4, 0.64, 0.76], total: 23.396, retail: 60, dist: [24.604, 21.604, 18.604] },
    { size: '#40', m: [5.5, 1.26, 0.10, 0.47, 0.006, 7.5, 0.12, 2, 0.4, 0.58, 0.76], total: 21.916, retail: 60, dist: [26.084, 23.084, 20.084] },
    { size: '#35', m: [4.5, 1.59, 0.10, 0.40, 0.006, 7, 0.08, 2, 0.18, 0.51, 0.76], total: 20.346, retail: 50, dist: [19.654, 17.154, 14.654] },
    { size: '#30', m: [4, 1.46, 0.10, 0.36, 0.006, 7, 0.07, 2, 0.18, 0.51, 0.76], total: 19.666, retail: 50, dist: [20.334, 17.834, 15.334] },
    { size: '#25', m: [3.7, 1.048, 0.10, 0.30, 0.006, 7, 0.07, 2, 0.18, 0.51, 0.76], total: 18.894, retail: 50, dist: [21.106, 18.606, 15.000] },
    { size: '#20', m: [3, null, null, null, null, 5, null, null, 0.34, 0.38, 0.17], total: 12.11, retail: 35, dist: [15.89, 14.14, 12.39] },
    { size: '#15', m: [3, null, null, null, null, 5, null, null, 0.34, 0.38, 0.17], total: 12.11, retail: 35, dist: [15.89, 14.14, 12.39] },
    { size: '#10', m: [3, null, null, null, null, 5, null, null, 0.34, 0.38, 0.17], total: 12.11, retail: 35, dist: [15.89, 14.14, 12.39] }
];
// Structured (not pre-formatted) so the Costing tab's Action column can edit real numbers.
const DEFAULT_RAW_MATERIAL_PRICES = [
    { material: 'Neoprene Cloth', price: 3668, priceUnit: 'roll', yieldQty: 2000, yieldUnit: 'cut pieces', costPerPc: 1.83 },
    { material: 'Glue (Adhesive)', price: 650, priceUnit: 'gallon', yieldQty: 850, yieldUnit: 'pcs', costPerPc: 0.76 },
    { material: 'Sewing Thread', price: 19, priceUnit: 'cone', yieldQty: 3378, yieldUnit: 'straps', costPerPc: 0.01 },
    { material: 'Labor Cost', price: 7.50, priceUnit: 'pc (flat rate)', yieldQty: 1, yieldUnit: 'pc', costPerPc: 7.50 },
    { material: 'ID Lace (3/4 inch)', price: 100, priceUnit: 'roll', yieldQty: 120, yieldUnit: 'pcs', costPerPc: 0.83 },
    { material: 'Ecobag (strap material)', price: 3300, priceUnit: 'roll', yieldQty: 24000, yieldUnit: 'pcs', costPerPc: 0.14 },
    { material: 'Magic Velcro (3/4 inch)', price: 125, priceUnit: 'roll', yieldQty: 310, yieldUnit: 'pcs', costPerPc: 0.40 },
    { material: 'Magic Velcro (1 inch)', price: 128, priceUnit: 'roll', yieldQty: 700, yieldUnit: 'pcs', costPerPc: 0.18 },
    { material: 'Poly Bag', price: 400, priceUnit: 'pack (500)', yieldQty: 500, yieldUnit: 'bags', costPerPc: 0.80 },
    { material: 'Packaging Tape', price: 38, priceUnit: 'roll', yieldQty: 50, yieldUnit: 'boxes', costPerPc: 0.76 },
    { material: 'Double-Sided Tape', price: 17, priceUnit: 'roll', yieldQty: 100, yieldUnit: 'pcs', costPerPc: 0.17 },
    { material: 'Overhead (Monthly)', price: 90100, priceUnit: 'month', yieldQty: 28000, yieldUnit: 'pcs produced', costPerPc: 3.22 }
];

// ---- 2026 GROSS INCOME (from "INVENTORY january to june 2026 (raw materials).pdf", CHART sheet) ----
// Source: monthly TOTAL column of the TRANSMITTAL OUT BC&E MEDICAL SUPPLIES table, Jan-Jun 2026.
// The PDF's CHART tab mislabels the row "GROSS INCOME 2025" — every transmittal date in that
// table is dated 2026, so this is 2026 data; relabeled accordingly here. Jul-Dec not yet recorded.
const HISTORICAL_GROSS_INCOME_2026 = {
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    values: [439515, 667918, 434593, 762100, 180550, 384460, null, null, null, null, null, null],
    grandTotal: 2869136
};
