# PLAN — Bebang2026.html (Bebang's Business Management System — 2026 Edition)

## 1. Objective

Build a working, offline-first business management web app for **Bebang's / BC&E Medical Supplies** that is seeded with the real 2026 business data from the two source PDFs, so the owner can track raw materials, produce ECOBAG products, log sales, and generate reports without the generic demo data in the original `Mgt.html`.

**Deliverable:** `Bebang2026.html` — a single self-contained HTML file (no build step, no server). Original `Mgt.html` is intentionally left untouched.

## 2. Source Files Reviewed

| File | Role |
|---|---|
| `Mgt.html` | Existing management system (dashboard, procurement, inventory, manufacturing, sales, reports). **Problem:** all seed data was demo data (Hospital Bed, IV Pump, Padding Foam) unrelated to the actual business. |
| `Updated 2026 (Product Cost) final.pdf` | **The list of raw materials** + the per-piece cost model: 9 ECOBAG sizes (#50 → #10), each with material split, overhead, total unit cost, retail price, retail profit, and distributor profit tiers (20% / 25% / 30%). Also the raw-material price & yield table (neoprene, glue, thread, velcro, poly bag, etc.) and the overhead computation. |
| `INVENTORY january to june 2026 (raw materials).pdf` | Raw-materials ledger Jan–Jun 2026 (quantity in / out / on-hand per item and size), monthly sales transmittals to hospitals/clinics, and the current stock summary per plastic size. |

## 3. Data Extraction (source → seed)

### 3.1 Finished goods (ECOBAG products)
From the product-cost PDF costing table, one finished item per size:

| Size | Total unit cost | Retail | Dist 20% | Dist 25% | Dist 30% |
|---|---|---|---|---|---|
| #50 | ₱26.376 | ₱60 | ₱21.62 | ₱18.62 | ₱15.62 |
| #45 | ₱23.396 | ₱60 | ₱24.60 | ₱21.60 | ₱18.60 |
| #40 | ₱21.916 | ₱60 | ₱26.08 | ₱23.08 | ₱20.08 |
| #35 | ₱20.346 | ₱50 | ₱19.65 | ₱17.15 | ₱14.65 |
| #30 | ₱19.666 | ₱50 | ₱20.33 | ₱17.83 | ₱15.33 |
| #25 | ₱18.894 | ₱50 | ₱21.11 | ₱18.61 | ₱15.00 |
| #20 | ₱12.11 | ₱35 | ₱15.89 | ₱14.14 | ₱12.39 |
| #15 | ₱12.11 | ₱35 | ₱15.89 | ₱14.14 | ₱12.39 |
| #10 | ₱12.11 | ₱35 | ₱15.89 | ₱14.14 | ₱12.39 |

**BOM per product:** 1× Plastic Sheet (matching size) + 1× Poly Bag — the clean 1:1 structural materials, so the Manufacturing module deducts real stock.

### 3.2 Raw materials (master list + current stock)
From the inventory ledger's current on-hand numbers (plastic current-stock summary, glue, velcro, boxes, double tape, etc.) and prices from both PDFs:

- Plastic Sheet #50 (₱7.50, 4,379 pcs), #45 (₱6.50), #40 (₱5.50), #35 (₱4.50, 1,908), #30 (₱4.00, 2,804), #25 (₱3.70, 2,042), #20/#15/#10 (₱3.00)
- Neoprene Cloth ₱3,668/roll · Glue ₱750/gal (30 on hand) · Ecobag Roll ₱3,300 (6) · Velcro 3/4″ ₱125 (8) · Velcro 1″ ₱128 (249) · Sewing Thread ₱19/cones · Poly Bag ₱0.80 (20,000) · Packaging Tape ₱38 · Double-Sided Tape ₱17 (3) · Shipping Boxes #50–#30 (₱35.25 / ₱28.50 / ₱24.25)

### 3.3 Business records (round 1 only — removed in round 2, see §8)
- **Customers** (9): St. Jude, Remy Trading, Jollymed, Ka Eva, Southwoods, Homecare (lead), Metro Rizal (lead), Graman, Excel Pharma — from the transmittal sheets.
- **Sales orders** (7): sample delivered orders at realistic transmittal rates + 1 pending order.
- **Expenses**: the documented monthly overhead — CEO ₱30,000 + Staff ₱39,600 + Rent ₱15,000 + Electricity ₱1,000 + Water ₱500 + Logistics ₱4,000 = **₱90,100** (matches the PDF overhead basis).
- **Purchase orders** (4) and **manufacturing orders** (3) reflecting 2026 activity.

## 4. Implementation Steps

1. Copy `Mgt.html` → `Bebang2026.html`.
2. Replace the `initialData` seed block with the 2026 dataset above.
3. Add `COSTING` + `RAW_MATERIAL_PRICES` constants transcribed from the product-cost PDF.
4. Add a new **Costing** tab (`renderCosting()`): full ECOBAG per-piece breakdown table + raw-material price/yield reference table.
5. Wire the tab: sidebar list, icon, render switch, keyboard shortcut (Ctrl+1–7).
6. Update app title/header to "2026 Edition".

## 5. Verification (done)

- `node --check` on the extracted module script → **syntax OK**.
- All 9 costing rows recomputed (materials + ₱3.22 overhead) → **exactly match PDF totals** (26.376, 23.396, … 12.11).
- Headless smoke test: `initDB()` + all 7 tabs render without errors; 23 raw + 9 finished items loaded; total asset value ₱577,348.90.
- Functional test: producing 100× ECOBAG #50 consumed 100 plastic sheets (4,379→4,279), added 100 finished units (1,200→1,300), logged ₱830 material expense; shortage guard correctly blocks production with insufficient stock.

## 6. Notes / Limitations

- Data persists in the browser via **localforage**, scoped to this file's origin. As of round 2 (§8), first load starts with the real product catalog but **zero stock and zero transaction history** — not demo data.
- If you already opened an earlier version of this file in your browser, your saved data is still the old seeded set; use **Reports → Factory Reset** to clear it and pick up the clean catalog.
- Historical delivered sales orders are records only; they do not re-deduct current stock.
- Costing tab labels are transcribed positionally from the PDF columns (sums verified); fine to re-label if the original sheet is consulted.

## 7. Optional Roadmap

- [ ] Add a real per-size "Box" and neoprene-lining line to BOMs (fractional yields from the PDF notes).
- [ ] Auto-generate Purchase Orders from low-stock alerts (min-stock thresholds per raw material).
- [ ] CSV export of inventory, costing, and ledger tables.
- [ ] Move data storage to a real backend / Google Sheets sync when multi-device access is needed.

## 8. Round 2 — Bug Fixes, Live Ledger Report, Sample Data Removal

**Trigger:** user reported dropdown text was unreadable, asked for a full button/workflow audit, asked for a report matching `INVENTORY january to june 2026 (raw materials).pdf`'s ledger format, and asked to remove sample data in favor of live user-entered data.

### 8.1 Bug fixes (found via headless-browser functional testing, not just code review)
- **Dropdown/select text invisible on open**: native `<option>` popups render outside the app's glass/backdrop-filter layer with their own opaque background; the inherited light theme text color had no matching `background-color` on `<option>`, so text was invisible against the browser's default light popup (both themes now set explicit `color`/`background-color` on `select option`).
- **Right-click context menu (Edit/Delete on POs/MOs/SOs) opened and instantly closed**: `showContextMenu()` didn't call `stopPropagation()`, so the event bubbled to `<body oncontextmenu="App.hideContextMenu()">` in the same dispatch and immediately hid the menu it had just shown. Fixed with `e.stopPropagation()`.
- Responsive fixes from the prior UI/UX pass (mobile bottom-nav duplicate labels, metric-card truncation, tablet-width form grids, BOM modal grid, wide-table scroll affordance, header sizing) — see git history / earlier session for detail.

### 8.2 New: Raw Materials & Inventory Ledger report (Reports tab)
Mirrors the structure of the PDF's SUMMARY sheet (Date | Item | Qty In | Unit | Unit Cost | Total Cost | Qty Out | Qty on Hand | Remarks) plus a Current Stock Summary (like the PDF's RAWPP sheet) and a Monthly Gross Income table+chart (like the PDF's CHART sheet) — but **fully computed from live app data**, not re-seeded PDF history:
- Qty In events: checked-in Purchase Orders, Manual Stock Adjustments.
- Qty Out / Qty In events: completed Manufacturing Orders (raw materials consumed per BOM = out; finished goods produced = in).
- Qty Out events: fulfilled Sales Orders (Delivered/Billed and In-Store/POS).
- Running "Qty on Hand" is computed chronologically per item from these events alone — verified by functional test to exactly reconcile with each item's live `stock` field once the seed data has no untracked "phantom" starting stock (see §8.3).
- Filterable by item type / specific item, sortable, printable (`generatePrintReport('ledger')`), with the same horizontal-scroll affordance as other wide tables.

### 8.3 Sample data removed
Per explicit user decision (asked via clarifying question): **kept** the verified product catalog — 9 ECOBAG finished goods + 23 raw materials, real names/units/prices/BOM recipes from the product-cost PDF — but **zeroed every stock count**, and **removed** all invented transactional/demo records: customers, sales orders, purchase orders, manufacturing orders, workers, manual adjustments, expenses. `initialData` now seeds only the catalog; `emptyData` (used by Factory Reset) is unchanged. Onboarding-tour copy that still referenced the original `Mgt.html` demo items ("Gauze Pads", "Hospital Bed", "IV Pump", "Splint") was rewritten to reference actual ECOBAG/raw-material examples.

### 8.4 Fully offline — no CDN dependencies
The file previously loaded Tailwind CSS, localforage, and Google Fonts from external CDNs via `<link>`/`<script src>` — meaning **without internet, the app had zero styling and would crash on load** (localforage undefined → `initDB()` throws immediately). Fixed:
- Tailwind's browser JIT engine (`cdn.tailwindcss.com`, ~400KB) and localforage 1.10.0 (~30KB) are now inlined directly as `<script>` bodies — both are self-contained client-side engines with no runtime network calls (verified: no `fetch`/`XMLHttpRequest` to any host in either bundle).
- Google Fonts (`Inter`/`Sora`) `<link>` tags removed; the existing `font-family: 'Inter', system-ui, sans-serif` stack already falls back gracefully to the OS system font with no visual breakage.
- `Bebang2026.html` grew from ~205KB to ~628KB as a result — still a single, self-contained, no-build-step file.
- Verified with Playwright by blocking every non-`file://` network request: the app loads, renders pixel-identical (blur/gradients/backdrop-filter all present), persists data via localforage, and navigates all 7 tabs with zero console errors and zero blocked-request attempts.

### 8.5 Verification
- `node --check` on the extracted module script after each change → syntax OK.
- Headless Chrome (Playwright) functional suite exercising every button-driven workflow end-to-end: manual stock add (raw + finished), BOM add/remove/save, Quick Log Production, Planned MO full lifecycle, Add Customer, Sales Order full lifecycle, POS quick sale, PO full lifecycle (Draft→Ordered→Arrived→Checked), Add/Delete Worker, inline price edit, context-menu delete, report generation, Export→Import round-trip, Factory Reset — **28/28 checks passing, zero console/page errors**.
- Ledger consistency check: after the seed-data change, computed ledger running balance matches `item.stock` exactly for every item touched by the test flow (0 mismatches) — confirming the ledger math is correct once there's no untracked starting stock.

### 8.6 2026 Historical Gross Income chart (from the PDF's CHART sheet)
Added `HISTORICAL_GROSS_INCOME_2026` — a static reference constant (same treatment as `COSTING`/`RAW_MATERIAL_PRICES`) holding the exact Jan–Jun monthly totals from the PDF's CHART sheet (₱439,515 / 667,918 / 434,593 / 762,100 / 180,550 / 384,460; Jul–Dec unrecorded; Grand Total ₱2,869,136 — verified the six months sum exactly to the grand total). The PDF labels this row "GROSS INCOME 2025" but every underlying transmittal is dated 2026, so it's relabeled "2026" here. Rendered as its own bar chart in Reports → Raw Materials & Inventory Ledger, directly above the existing **live** monthly-income chart (renamed "Live (Your Sales Orders)" for clarity) so the two — historical PDF record vs. ongoing app usage — aren't confused for each other.

## 9. Round 3 — BOM Editing, Delivered-To Tracking, Worker Production, Live Stock Visibility

Trigger: user reported the BOM editor "should be working perfectly," asked to track the Transmittal Out sheet's "DELIVERED TO" recipients and per-worker production counts, and asked to see available raw-material/finished-good stock during production.

### 9.1 BOM editor: inline-editable quantities (real bug, found via headless click-through)
The editor's data was always correct for the selected item — verified by opening it for a product with an existing recipe and reading the rendered DOM — but changing a material's quantity required deleting it and re-adding it via the separate "add" form, with the app's own error message literally instructing users to do that ("Material already in BOM. Remove it first to change quantity."). Fixed: each recipe row's quantity is now a live `<input type="number">` (`onchange="App.updateBomMaterialQty(...)"`) that saves in place — no more remove/re-add. The "Add Material" dropdown also now excludes materials already in the recipe (`refreshBomMaterialOptions()`, called on open/add/remove), since editing the existing row is now the correct path. Verified: pre-fill, inline edit, add-dropdown filtering, remove-repopulates-dropdown, save-persists, and reopen-shows-fresh-data — all pass.

### 9.2 "Delivered To" tracking (Sales Orders)
The Sales Order form previously required picking from a pre-registered `customers` dropdown — which, combined with the round-2 change to start with zero seeded customers, meant a delivery couldn't be logged until the user first visited a separate "Add Customer" form. This didn't match the source PDF's Transmittal Out sheet, where deliveries go to dozens of ad-hoc named recipients (Ka Eva, Remy, Jollymed, Graman, …) with no registration step. Replaced the dropdown with a free-text `#so-customer-name` input (`list="customer-names-list"` datalist of existing names for autocomplete). `findOrCreateCustomerByName()` looks up a case-insensitive match on submit and creates a lightweight customer record only if one doesn't already exist — reusing the same name twice does not create a duplicate.

### 9.3 "Deliveries by Recipient" summary (Reports → Delivery & Sales Records)
New `getDeliveriesByRecipient()` groups all Sales Orders by `customer_name` (i.e., Delivered To) and shows Orders / Total Qty / Total Revenue / Last Delivery per recipient, sorted by revenue — the live-data equivalent of summing the PDF's Transmittal Out table by its DELIVERED TO column.

### 9.4 "Units Produced by Worker" summary (Reports → Production Log)
New `getProductionByWorker()` groups **completed** Manufacturing Orders by `workerName` and shows Units Produced / Production Runs / Products Made per worker, sorted by units produced.

### 9.5 Live stock visibility during production (Manufacturing tab)
Product dropdowns in both Quick Log and Planned MO forms now show `(Stock: N)` per item, matching the pattern already used on the Sales tab. Added `updateMoMaterialsPreview()`, wired to the product select and quantity input in both forms (`id="mo-quick-materials-preview"` / `mo-plan-materials-preview`): for the selected product × quantity, it lists every BOM raw material with "Need X / Have Y", flagging shortfalls in red with a ⚠️ so a manager can see *before* clicking Log Production whether there's enough material on hand — rather than finding out from the error message after the fact.

### 9.6 Verification
`node --check` after each change → syntax OK. Headless Chrome (Playwright) suite: 7 BOM-editor checks + 9 new-feature checks (materials preview accuracy, stock-in-dropdown, worker summary totals, delivered-to free-text creation + dedup, recipient summary aggregation) + 5 regression checks on previously-verified flows (POS sale, PO lifecycle, context-menu delete, export/import round-trip, factory reset) — **21/21 passing, zero console/page errors**, plus a full production→sale cycle that reconciled exactly in the ledger (10 produced − 7 sold = 3 in stock, materials debited correctly on both sides).

## 10. Round 4 — Domain Model Correction: Splint (not ECOBAG), Supplies/Equipment, Issuance/Remittance, Payroll

Trigger: user corrected a fundamental mislabeling — the finished good the business actually makes and sells is called a **Splint**, assembled from raw materials (rawpp/plastic sheet, glue, neoprene, ecobag *strap material*, velcro, double tape, etc.). "Ecobag" is one of those raw materials (per the costing PDF's own "ECOBAG STRAP" note), not the product name — a mislabeling from an earlier session that this round corrects everywhere. Alongside that, the user asked for two new stock categories (Supplies, Equipment), a from-scratch Manufacturing workflow that separates "materials given to a worker" from "splints received back," per-customer pricing awareness, fully editable Costing tables, and a new Payroll tab. This is the largest single change in the file's history — touching the data model and all eight tabs.

### 10.1 Rename: ECOBAG → SPLINT
All 9 finished-good catalog entries renamed `ECOBAG #NN` → `SPLINT #NN` (same sizes/prices/BOMs, `FG-` id prefix → `SPL-`), the Costing tab's "ECOBAG — Cost Per Piece by Size" table, the dashboard tagline, the header subtitle, code comments, and every tour-guide step that referenced the old name or the old "Finished Good" terminology.

### 10.2 Inventory taxonomy: raw → raw / splint / supplies / equipment
Extended `inventory[].type` from 2 values to 4. `generateItemId(type)` maps each to its own id prefix (RM/SPL/SUP/EQP). Supplies and Equipment start empty (no invented seed items — consistent with the round-2 "no sample data" decision); only the real Splint catalog and raw-material list are seeded. Every filter across the app that used to check `type === 'finished'` was updated: BOM-eligibility, sellable-items (Sales dropdowns), the ledger's ad-hoc typing, etc.

### 10.3 Inventory tab
Four sub-tabs now (Splint / Raw Materials / Supplies / Equipment, was 2). Every item row gets **Edit** and **Delete** icon buttons: Edit opens a new `#edit-item-modal` pre-filled with name/type/units/stock/cost/price; Delete confirms then removes the item (history/BOM references to a deleted item degrade gracefully to "Unknown Material", matching existing behavior). Attach Photo re-verified working. The Manual Stock form's Item Type dropdown now offers all 4 types.

### 10.4 Procurement tab
Item Type dropdown: `Raw Material / Supplies / Equipment` (removed `Finished Good` — splints are produced, not purchased). Item Name is now a text input with a datalist of every existing inventory item name for autocomplete, instead of plain free text.

### 10.5 Manufacturing tab — split into Issuance and Remittance
This is the biggest behavioral change. The old model was a single BOM-driven "Log Production" step that atomically deducted every raw material and added finished stock. The real workflow is piece-work: materials go out to a worker, and — separately, possibly much later — finished splints come back from that worker. Decoupled accordingly:
- **Remittance** (was "Quick Log Production for Stock"): worker hands in N completed splints of a given size → instantly adds splint stock and logs it against that worker (feeds Payroll). No longer touches raw material stock at all.
- **Issuance** (was "Planned Production / Manufacturing Orders"): give a worker N units of one raw material (each size/variant is its own catalog item, so "select the size" = picking the right item from the dropdown). Starts **Pending**; a **Mark as Issued** action deducts raw stock at that point (with a live "Need X / Have Y" stock-sufficiency preview beforehand) — mirroring the existing PO pattern of only touching stock on confirmation, not on creation. A new "Materials Issued by Worker" panel shows what's currently out with each worker.
- `manufacturingOrders` keeps its existing shape/name (now semantically "remittances") so the Reports/Ledger code reading it didn't need to change. A new `issuances` collection holds the materials-out side.
- The Inventory Ledger's raw-material "Qty Out" events now come from `Issued` issuances instead of BOM-on-completion; splint "Qty In" still comes from `manufacturingOrders` (unchanged shape) — re-verified the ledger reconciles exactly with live stock under the new model.

### 10.6 Sales tab
Sellable-item dropdowns (POS + Sales Order) now show Splint, Supplies, and Equipment — raw materials excluded (they're for building splints, not for sale). Added a `title` note that rates vary by customer; when the "Delivered To" name matches an existing customer who's bought the selected item before, the price field prefills with *their* last price for that item instead of the generic catalog price (still freely editable either way).

### 10.7 Reports tab
Current Stock Summary (in the Inventory Ledger) gets an Action column with the same Edit/Delete icon buttons as the Inventory tab (reuses `showEditItemModal`/`deleteInventoryItem`). Production Log gets a Size column (parsed from the product name via `extractSize()`, e.g. "SPLINT #50" → "#50"). "Units Produced by Worker" is now grouped by **(worker, size)** instead of just worker, so its new Size column is unambiguous per row, rather than trying to cram multiple sizes into one cell.

### 10.8 Costing tab — now fully editable
`COSTING` / `RAW_MATERIAL_PRICES` were previously hardcoded constants; renamed to `DEFAULT_COSTING` / `DEFAULT_RAW_MATERIAL_PRICES` and used only to seed the new live, persisted `data.costingRows` / `data.rawMaterialPriceRows` (Factory Reset clears them to empty, same "delete ALL data" semantics as everything else, not restored to defaults). Both tables get an Action column (Add/Edit/Delete) driving one shared dynamic modal (`#edit-row-modal`) whose fields are generated per-row-type from a field spec (`getRowFieldSpec`), since a costing row has 16 individual numbers (size, 11 material components, total, retail, 3 distributor tiers). Raw material price rows were restructured from pre-formatted display strings into real numeric fields (price/priceUnit/yieldQty/yieldUnit/costPerPc) so they're actually editable. Added a note on the tab that these are reference prices — actual rates depend on the customer (see §10.6).

### 10.9 New Payroll tab (8th tab, Cmd/Ctrl+8)
Workers gained a `rate` field (₱ per splint, editable inline in Reports → Worker Management, same contenteditable pattern as inventory prices). Payroll tab computes, per worker: splints remitted (from completed `manufacturingOrders`) × their rate = total earned, minus `payrollPayments` logged so far = balance due. "Record Payment" prompts for an amount (defaulting to the full balance), logs it to a new `payrollPayments` collection, and also logs a matching `expenses` entry (category "Payroll") so it flows into existing financial reports.

### 10.10 Verification
`node --check` after every change → syntax OK throughout. Full guided-tour walkthrough (37 steps, all rewritten where they described the old model) completes with zero errors. Headless Chrome (Playwright) end-to-end suite covering the entire new domain model — **41/41 checks passing, zero console/page errors** — including: all 4 inventory types + sub-tabs, Edit/Delete item modal, Attach Photo, Procurement's new type list + datalist, a full PO lifecycle, BOM editing on a fresh Splint, the complete Issuance → Mark as Issued → stock-deducted chain, the complete Remittance → stock-added chain (and confirmed it does *not* double-deduct raw materials), Sales dropdowns' type filtering, free-text "Delivered To" order creation with automatic customer dedup, customer-specific last-price prefill, the Stock Summary action icons, the Size column on both worker/production tables, full CRUD on both Costing tables, Payroll's earned/paid/balance math and Record Payment's expense side-effect, the dashboard's new Pending-POs metric and Asset-by-Category breakdown, and regression checks on context-menu delete, export/import, and Factory Reset (including the new `issuances`/`costingRows` collections).

## 11. Round 5 — Payroll Action Column, Favicon

- **Payroll: edit/delete per worker, right from the Action column.** Rate-setting was previously only reachable from Reports → Worker Management; the Payroll table's Action column now also has Edit (opens `#edit-worker-modal` pre-filled with name + rate, saves via `saveEditedWorker()`, which re-renders so Total Earned/Balance Due immediately reflect the new rate) and Delete (`deleteWorker()`, now behind a `confirm()` — it wasn't before) icon buttons, alongside the existing Record Payment button. Verified: modal pre-fill, rate change persists, the table's computed columns recompute immediately (10 splints × ₱7.50 → ₱75.00 shown without a tab switch), and delete removes the worker — 6/6 checks passing.
- **Favicon.** Added a self-contained `<link rel="icon" type="image/svg+xml" href="data:...">` — an inline base64 SVG (no external file/request, consistent with the app's offline-first requirement from §8.4) reusing the same gradient and clipboard icon as the in-app header logo for visual consistency.

## 12. Round 6 — New Settings Tab, Clear-Cache Reset Button

Trigger: after deploying to GitHub/Vercel, the user compared the local `file://` copy against the fresh Vercel deployment and found the Item Name datalist (Inventory → Add Old Stock) looked empty locally but populated on Vercel. Root cause (confirmed by diffing a truly-fresh Playwright profile against the file's own logic at `initDB()`): the two origins have independent IndexedDB stores, and the app only ever seeds `initialData` the *first* time a given origin loads — the local browser's copy had been carrying an older snapshot from earlier in this project's development ever since, with no automatic re-sync as the code's defaults evolved. Walked the user through a manual fix (`indexedDB.deleteDatabase('BebangBizSystem_v1')` in DevTools Console), which then surfaced a second, correct piece of app behavior: a freshly-reset Issuance correctly refused to be marked "Issued" with `Insufficient stock. Have: 0, Need: 1` — by design, catalog items seed at zero stock (§8's "no sample data" decision) until real stock is logged via Procurement or Inventory → Add Old Stock. Both were existing, correct behavior, not bugs — but they motivated this round's actual request: promote that manual DevTools workaround into a real in-app button, and consolidate the admin/config cards that had been living inside Reports into their own tab.

### 12.1 New "Settings" tab (9th tab, Cmd/Ctrl+9)
Added `Settings` to the sidebar's tab list and a new distinct sidebar icon (a 3-line "sliders" glyph — deliberately *not* reusing the gear/cog already used for Manufacturing, which the first draft of this change accidentally did before catching it in the same pass). New `renderSettings()` + a `case 'settings'` in the render dispatcher.

### 12.2 Moved from Reports → Settings: Worker Management, Theme Settings, Data Backup & Restore
All three cards relocated verbatim (same markup, same handlers — `addWorker`/`updateWorkerRate`/`deleteWorker`, `setTheme`, `exportData`/`importData`/`updateStorageUsage`) out of `renderReports()` and into the new `renderSettings()`. Factory Reset moved along with them since it's nested inside the Data Backup & Restore card, not a separate card. Reports keeps Generate Financial Report + the Inventory Ledger / Production Log / Sales Records views, and its heading changed from "Reports & Settings" to just "Reports" now that Settings is its own destination. `setTheme()`'s conditional re-render (`if (this.currentTab === 'reports')`) now checks `'settings'` instead, and the handful of cross-references that told users to find Worker Management "in Reports" (a code comment, and Payroll's empty-state note) were updated to say Settings.

### 12.3 New "Clear Cache & Reload Defaults" button (Settings → Data Backup & Restore)
Turns the manual DevTools fix from this round's trigger into a real button: `resetLocalDatabase()` confirms, then calls `indexedDB.deleteDatabase(STORE_NAME)` directly (not `App.factoryReset()`, and not exposed as a variant of it) and reloads. This is deliberately a *different* operation from Factory Reset, which is why it's a separate button with its own confirmation copy: Factory Reset empties everything to true zero — including the catalog itself (`emptyData.inventory = []`) — while Clear Cache deletes the whole local database so the next load re-seeds from the current code's `initialData`, restoring the real 23-raw-material / 9-splint starting catalog. Using the *emptier* one to fix "my catalog looks wrong" would have made it worse, not better, which is the mistake this button exists to prevent people from making by hand.

### 12.4 Guided tour updated (37 → 39 steps)
Every step that highlighted a moved card (`#worker-management-card`, `#backup-card`, `#factory-reset-button`) now targets `tab: 'settings'` instead of `'reports'`. Added two new steps: an intro step pointing at the Settings nav item (mirroring the existing pattern of one nav-intro step per tab), and one introducing the new Clear Cache button right after the Factory Reset step. Renumbered the trailing numbered steps (old "Step 20/21" → "Step 20/21/22") and updated the final step's shortcut callout from "Cmd/Ctrl + 1-8" to "1-9". While walking every step programmatically to verify highlight targets resolve, also found and fixed two **pre-existing, unrelated** dead highlights on the Sales tab steps ("Attach Proof" / "Fulfill & Deliver Order"): they targeted `#so-list-Pending Delivery` (an unescaped space, invalid as a CSS id selector) when the real element's id sanitizes to `so-list-Pending-Delivery` — corrected to match.

### 12.5 Fractional issuance quantities (Manufacturing → Issuance)
Glue is stored and costed by the gallon (`RM-11`, `units: 'gal'`) but handed to workers a fraction of a gallon at a time — the quantity field already accepted any decimal (`step="any"`, and `createIssuance`/`advanceIssuanceStatus` already used `parseFloat` throughout, so fractional stock math was already correct end-to-end), but typing e.g. "0.25" by hand isn't how anyone thinks about "a quarter gallon" during fast data entry. Added a row of Quick pick buttons (1/4, 1/2, 3/4, 1 — unit-labeled) that appears under the quantity field whenever the selected material's `units` is in a new `ISSUANCE_FRACTION_UNITS` list (currently just `'gal'`); clicking one sets the quantity field via `setIssuanceQty()` and re-runs the existing stock preview. Deliberately keyed off the material's *unit* rather than hardcoding "Glue" by name or id, so it depends only on how the material happens to be measured — any other raw material added later with `units: 'gal'` gets the same quick-picks for free, while non-bulk materials (pcs, rolls, cones, etc.) are unaffected and keep the plain numeric input. Verified: buttons appear only for the gal-unit material, clicking one sets the exact decimal and highlights active, the stock-sufficiency preview reflects the fraction correctly, the created issuance stores `qty: 0.5` un-truncated, and marking it Issued deducts stock by exactly that fraction (2 → 1.5, not rounded) — 7/7 checks passing, zero console errors.

### 12.6 Verification
`node --check` → syntax OK. Headless Chrome (Playwright), three suites: (1) 16/16 — sidebar tab count/order/shortcut, distinct Settings icon, Reports no longer contains the moved cards while Settings does, a worker added from Settings shows up correctly in Payroll, theme toggle from Settings applies and survives a tab round-trip; (2) 5/5 — Clear Cache truly deletes the database (a pre-existing test worker is gone after reload, not just reset in memory) and re-seeds the exact current-code catalog (23 raw + 9 splint, right names), Factory Reset from its new home still zeroes everything including the catalog; (3) 8/8 — full 39-step tour walkthrough, every highlight target resolves, new/moved steps land on the correct tab. Zero console/page errors across all three. Also spot-checked the Settings tab at a 390px mobile viewport (iPhone-sized) — no horizontal overflow, all three cards stack and read correctly.

### 12.7 Payroll column order
Swapped **Splints Remitted** to sit right after **Worker** (was after Rate). Header `<th>` order and each row's `<td>` order both updated together so the columns stay aligned. Verified via a fresh worker + rendered header-text check — 1/1 passing.

## 13. Round 7 — Live Multi-Device Sync (Firebase Auth + Firestore)

Trigger: the user wants everyone who opens the Vercel deployment to see the same live business data, not an independent copy per browser. A plain JSON file can't do this — Vercel serves static files a browser can read but never write back to — so this requires a real backend. Confirmed with the user (via AskUserQuestion) that a live shared cloud database is the intended scope, not a one-way published snapshot or the existing manual Export/Import.

### 13.1 Why Firebase, and why this doesn't compromise offline-first
Chose Firebase (Firestore + Authentication) over building a custom API: it's a free-tier hosted backend that needs no server code of our own, so the app can stay a single static file with no build step. Firestore's client SDK has built-in offline persistence — reads serve from a local cache, writes made offline are queued and sent once reconnected — which is what lets sync coexist with this app's offline-first requirement. The one real gap: a device's *very first* sign-in still needs internet (to authenticate and pull the initial shared data); every use after that degrades gracefully offline, same as before.

### 13.2 Architecture
- **Single shared document**, `business/main` in Firestore, holds everything except photos (see 13.4) — the same "one big data blob" shape `this.data` has always had, just persisted remotely instead of (as well as) in IndexedDB. Chosen over a fully-normalized per-record Firestore schema (one doc per sale, per worker, etc.) as the pragmatic first version: this business's real volume (dozens–low-hundreds of transactions/month, per the historical gross-income data) is nowhere near Firestore's 1MB document limit, and a single-doc model meant every existing render function could keep reading `this.data.X` synchronously, unchanged. Trade-off, stated plainly: two saves within the same instant would have the later one win outright (no field-level merge) — acceptable at this scale, and a candidate to revisit (per-collection documents) if the business ever needs true simultaneous multi-editor safety.
- **One shared login** (Firebase Authentication, email/password) rather than per-worker accounts — this app has never modeled "who's using the app" as a concept separate from "workers" (who get paid, not who log in), and adding real per-user accounts would be a much bigger UX change than was asked for. The business shares one email/password the way they'd share a Wi-Fi password.
- **Photos never sync.** `imageAttachments` (compressed product photos from Attach Photo) stay in this device's local IndexedDB only, deliberately excluded from the Firestore document (`saveData` destructures `{ imageAttachments, ...syncable }` before writing). Reason: base64 photo data would realistically blow past Firestore's 1MB document cap within a few dozen attachments, and doing this properly means Firebase Storage (a separate service/integration) — out of scope for this round; flagged as a clear, well-bounded follow-up if photo sync is ever needed.
- **Dormant until configured.** `firebaseConfig` ships with placeholder values; `FIREBASE_CONFIGURED` (true only once every field is filled in) gates everything. Unconfigured, the app behaves *exactly* as it did before this round — no login screen, `initLocalOnlyDB()` runs the same local-only logic `initDB()` always had. This means today's push ships safely dormant; nothing changes for any current user until real Firebase credentials are added.

### 13.3 What changed in the file
- Inlined the three Firebase **compat** SDKs (app, auth, firestore — 10.13.0, ~515KB combined) as `<script>` tags in `<head>`, fetched from `gstatic.com` and spliced in the same way Tailwind/localforage already are, so the app stays a single offline-loadable file. Verified loading with all non-`file://` network blocked.
- New `#auth-screen` overlay (email/password form, sibling to `#app`) shown/hidden by `onAuthStateChanged`; `#app` starts with `class="... hidden"` and is only revealed once signed in (or immediately, unconfigured).
- `signIn()` / `signOut()` / `friendlyAuthError()` (maps Firebase error codes to plain-English messages).
- `applyIncomingData(incoming, imageAttachments)` — extracted the migration/backfill logic that used to live only inside `initDB()` into its own function, since it's now called from three places that all need the exact same rules: `initDB`'s Firestore listener, `initLocalOnlyDB`, and `importData` (which previously had its own smaller, silently-drifted-out-of-sync copy of the same checks — consolidated so Restore Data now gets every backfill initDB does, not a subset).
- `initDB()` rewritten: configured → subscribe to the shared doc with `onSnapshot` (real-time listener), seeding it via `seedSharedDatabase()` on first-ever connection to an empty database; unconfigured → falls back to `initLocalOnlyDB()`, byte-for-byte the old behavior.
- `seedSharedDatabase()` — first device to ever connect to an empty shared doc gets asked (via `confirm()`) whether to upload its existing local data as everyone's starting point, or start clean from the built-in catalog. Without this, a device with real pre-existing data would silently have it shadowed the moment sync was turned on.
- `saveData()` now writes the syncable portion to Firestore and only `imageAttachments` to local storage, when configured; unchanged (full blob to local storage) otherwise.
- `render()` gained a guard at the very top: if a live update arrived from another device while the user had a form input focused, it's held in `_latestCloudData` rather than force-applied (which would blow away whatever they were mid-typing) — the next render that happens for any reason (their own next action) picks it up automatically, since render() is about to redraw everything at that point regardless.
- Settings tab gained an **Account & Sync** card (top of the tab): shows the signed-in email + Sign Out when configured, or a plain "sync isn't set up yet, local-only" note otherwise. Header's status pill now shows the signed-in user's email instead of the static "Session Active" text once configured.
- **Firestore Security Rules** (deploy via Firebase Console → Firestore → Rules): only signed-in users can read/write `business/main`; everything else denied by default.
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /business/main {
        allow read, write: if request.auth != null;
      }
      match /{document=**} {
        allow read, write: if false;
      }
    }
  }
  ```

### 13.4 Verification status
Full regression suite (settings-tab, reset-buttons, tour walkthrough, glue fractions, payroll column — 37/37 checks) re-run against the real file in its shipped (unconfigured/dormant) state: all passing, zero console errors, `node --check` clean — confirming this round is a safe, no-behavior-change push for every current user.

Real end-to-end sync verification was done against a local Firebase emulator suite (Auth + Firestore, no real cloud project needed — `firebase emulators:start`, with a portable JDK 21 fetched into scratchpad since the sandbox's default JDK was too old for the Firestore emulator) rather than taken on faith. This caught a genuine bug: the very first Firestore subscription after sign-in would sometimes fire before Firestore's internal credential provider had picked up the new auth token, getting one spurious `PERMISSION_DENIED` from Security Rules before the SDK gave up rather than self-healing. Fixed two ways — `await user.getIdToken()` before subscribing (closes most of the race), plus `subscribeToSharedData()` now retries with backoff (400ms × attempt, up to 4 tries) specifically on `permission-denied`, so a transient rejection immediately after sign-in can never silently kill the listener. Confirmed fixed with 4 consecutive clean emulator runs (12/12 checks each, zero console errors) covering: two separate signed-in browser contexts sharing one login ("Device A" / "Device B"); Device A adding a worker and Device B seeing it appear live with **no action taken on Device B's side**, both in `App.data` and in the rendered Payroll table; the Firestore document server-side confirmed to contain every synced field (`inventory`, `workers`, `salesOrders`, etc.) and to **not** contain `imageAttachments`, proving photos really do stay device-local rather than just trusting the code that's supposed to strip them; an unauthenticated REST read against the emulator rejected with 403 `PERMISSION_DENIED`, proving the Security Rules text in 13.3 is both syntactically valid and actually enforced; and Sign Out correctly returning to the login screen.

## 14. Round 8 — Modular (OOP) Split, PWA, Full-Screen Layout, Table Management, Settings Overhaul

Trigger: the user asked to break up `Bebang2026.html` (1.23 MB single file) into an object-oriented structure, make the app a PWA, make pages fill the screen, make every report work with management tools for all data tables, enhance Settings, and verify every page shows the right data in the right place.

### 14.1 New structure (no build step — classic `<script>` files, so `file://` still works)
`Bebang2026.html` is now a ~16 KB shell (head, sign-in, app frame, dialogs). Everything else is split by responsibility:

| Path | Contents |
|---|---|
| `css/app.css` | Design system (was the inline `<style>`), plus new table/toast/settings/print styles |
| `js/vendor/*` | Tailwind JIT, localforage, Firebase app/auth/firestore compat — unchanged, just moved out of the HTML |
| `js/config/version.js` | `APP_VERSION` — shared by the page and the service worker; **bump on every deploy** |
| `js/config/firebase-config.js` | `FIREBASE_CONFIG` + IndexedDB names (same names as before, so existing local data carries over) |
| `js/data/seed.js` | `initialData`, `emptyData`, `DEFAULT_SETTINGS`, costing + historical reference tables |
| `js/core/` | `Utils`, `CloudSync` + `DataStore` (load/migrate/save), `StockService` (stock effects + ledger), `FinanceService` (all money math), `RecordService` (create/edit/delete for every record type), `AuthService`, `PwaManager` |
| `js/ui/` | `UI` (icons, toasts, badges, cards), `FormModal` (one dialog for every form), `DataTable`, `Printer`, widgets (`AttachmentManager`, `BomEditor`, `ItemHistory`, `ContextMenu`), `TourGuide` |
| `js/pages/` | `BasePage` + one class per tab: Dashboard, Procurement, Inventory, Manufacturing, Sales, Reports, Costing, Payroll, Settings |
| `js/app.js` | `BebangApp` composition root — router (tabs + `#hash`), theme, sidebar, shortcuts, boot. `window.App` exposes pages/services for inline handlers (`App.sales.createSO()`) |

### 14.2 PWA
`manifest.webmanifest` (name, icons 192/512 + maskable, shortcuts to Sales/Manufacturing/Inventory/Reports), `sw.js` (precaches the whole app shell per `APP_VERSION`; network-first for page loads, cache-first + background refresh for files; never touches Firebase/Google requests), PNG icons in `assets/icons/`, `index.html` redirects `/` → `Bebang2026.html`. Install button in the header (when the browser offers it) and in Settings → App & Offline; "new version available → Reload" toast when a new deploy is detected. Verified: Chrome reports zero installability errors, 40+ files precached, and the app loads and navigates with the network fully cut.

### 14.3 Layout
`#app` now fills the viewport (was capped at 1280px / 92vw×92vh). Header + collapsible icon-only sidebar on desktop (remembered per device); horizontally scrollable bottom nav on phones with safe-area padding; grids widen at `xl`/`2xl`. Dialogs moved outside `#app` (its `backdrop-filter` made `position: fixed` children relative to it). Verified no horizontal overflow on any tab at 390px.

### 14.4 Data management & report fixes
- **Every table is a `DataTable`**: search, click-to-sort, filters, paging, totals row, CSV export, print (with business letterhead), and per-row Edit/Delete. Covers inventory, adjustments, PO register, issuances, remittances, materials-by-worker, sales register, customers, ledger, stock summary, sales/production analyses, expenses, payroll, payments, workers, both costing tables.
- **Edits/deletes keep stock correct**: all stock movement goes through `StockService.effectsOf()`, so deleting a checked-in PO / delivered sale / issued issuance / remittance / adjustment reverses its stock, and editing one applies only the difference (with a warning if stock would go negative). Previously deleting records left stock untouched and "Edit" just said "not yet available".
- **Ledger reconciles**: editing an item's stock now logs a correction adjustment (was a silent overwrite); adjustments can be negative; PO lines remember their inventory id so renamed items keep their history; Reports → Stock & Valuation shows ledger vs live stock with one-click Reconcile.
- **Bugs fixed**: printing produced a blank page (`#print-area` was inside the hidden `#app`); all "today"/month dates used UTC and were a day off between 00:00–08:00 PH time; dashboard sales counted undelivered orders; item History used the old BOM model and missed issuances/POS sales; Ctrl+9 (Settings) didn't work; deleting a record could create duplicate IDs; renaming a worker orphaned their payroll history; drag-drop/paste for photos was never wired up; "View Delivery/Payment" never showed the saved photo; user text was injected unescaped into HTML.
- **New data**: Expenses (add/edit/delete, categories), customers list with orders/revenue, PO supplier, SO reference/DR no. and date, reorder level per item, payroll payments linked to their expense entry (edit/delete stays in sync), delivery receipts and payslips (print).
- **Financials** (`FinanceService`): Net Profit = fulfilled sales − checked-in purchases − expenses, used identically by the dashboard, financial report (any period incl. custom range) and printouts.

### 14.5 Settings
Account & sync status, Business Profile (header + print letterhead), Preferences (theme dark/light/system per device, default low-stock level, rows per page, default report period, backup reminder), Expense Categories, Worker Management table, App & Offline (install / check for updates / replay tour), Data Health (stock-vs-ledger, negative stock, orphan refs, duplicate IDs, unknown workers), Backup & Restore (last-backup date, restore preview + confirm, Factory Reset now requires typing DELETE).

### 14.6 Verification
`node --check` on every file. Playwright end-to-end suite against the served app (local-only config): **105/105 checks**, zero console errors — full business cycle (stock → PO → issuance → remittance → POS/SO → deliver), edit/delete stock reversal, payroll ↔ expense linkage, rename propagation, finance totals, ledger reconciliation, table search/filter/sort/CSV/print, costing sync, BOM draft/save, settings, persistence across reload, backup → factory reset → restore, legacy-data migration, all 37 tour steps, and 390px mobile layout on all 9 tabs. PWA suite: **10/10** (redirect, sign-in shown with real config, SW active/controlling, precache, installable, manifest valid, offline load + navigation). Also confirmed the app still opens from `file://`.

### 14.7 Deploying
Deploy the whole folder (not just the HTML). After changing any file, bump `APP_VERSION` in `js/config/version.js` so installed apps pick up the update.

## 15. Round 9 — Welcome Screen After Sign-In

`WelcomeScreen` (`js/ui/welcome.js`, styles at the end of `css/app.css`) greets the user right after signing in — and, in local-only mode, once per app session:
- Time-of-day greeting (with the name taken from the signed-in account), business name, date and a live clock.
- **Today at a glance**: sales today (and month-to-date), splints remitted today, pending deliveries, low/out-of-stock count — each card jumps to its tab.
- **Needs your attention**: pending deliveries, arrived POs awaiting check-in, out-of-stock/low items, un-handed issuances, payroll balance due, and (local mode) an overdue backup — or, on a brand-new setup, a **Getting started** checklist (business profile, workers, opening stock, first sale) until those are done.
- Quick actions (Log Sale, Log Production, New Purchase, Add Expense), "Take the Tour" (hidden once the tour has been taken), "Go to Dashboard" (focused; Enter/Esc/any Ctrl+1–9 shortcut dismisses).
- "Show this welcome screen when I open the app" checkbox, plus a toggle and Preview button in Settings → Preferences (per device). Explicit sign-in/sign-out always re-arms it.

Also fixed while testing: the Financial report's summary cards never faded in (Reports was missing the metric-card animation trigger), and a welcome screen reopened within its 0.3s close animation got hidden by the pending close. `APP_VERSION` → 2026.3.1.

Verification: welcome suite 21/21 (first open, greeting, checklist vs. attention list, live numbers incl. payroll due, quick action / Esc / shortcut dismissal, once-per-session, opt-out persistence, Settings toggle, light theme, 390px no overflow); main suite 106/106; PWA suite 10/10; zero console errors.

## 16. Round 10 — index.html Is the Main File; Sidebar Account Footer

- **Main file is now `index.html`** (moved with `git mv`, so its history follows). `Bebang2026.html` is a tiny redirect that keeps old links and bookmarks working (it forwards the `#tab` too). The manifest (`id`/`start_url` = `./`, shortcuts `./#sales` etc.) and the service worker (`SHELL = 'index.html'`) were updated. `APP_VERSION` → 2026.3.2.
- **Sidebar footer** (desktop): avatar with initials, signed-in name + email ("Local Mode" when sync is off), a Dark / Light / Auto theme switch, and a **Log out** button (shown only when signed in to the shared account; asks for confirmation). Collapsed sidebar shows just the avatar, a one-click theme cycle button and a logout icon. On phones the bottom nav has no room, so the header theme button stays and the status pill opens Settings → Account & Sync (Sign Out).
- Verification: sidebar suite 19/19 (redirect keeps tab, footer pinned to the bottom, local vs. signed-in states, initials, logout confirm → sign-out, theme buttons incl. Auto, collapsed mode, mobile behaviour); welcome 21/21; main 106/106; PWA 10/10; zero console errors.

## 17. Round 11 — Styled Dialogs Replace Every Browser Pop-up

All 24 native `confirm()` / `prompt()` / `alert()` calls ("This page says…") across 9 files were replaced by `Dialog` (`js/ui/dialog.js`, styles at the end of `css/app.css`), exposed as promise-based `App.ui.confirm()`, `App.ui.alert()` and `App.ui.prompt()`.

- **Design:** coloured icon badge and top accent bar per tone (danger / warning / info / success), bold title, readable message, bullet list of consequences (e.g. "Stock is reversed: -10 SPLINT #50"), amber warning box (negative stock), small "This cannot be undone" note, and action-named buttons ("Delete" / "Keep it", "Log out" / "Stay signed in", "Restore Backup"…). Light and dark themes; on phones it slides up as a bottom sheet with full-width buttons.
- **Safety & keyboard:** destructive dialogs focus Cancel so a stray Enter can't delete; Enter confirms otherwise, Esc cancels, Tab stays inside the dialog, Ctrl+1–9 is blocked behind it; multiple dialogs queue. Factory Reset is now one dialog with a type-DELETE field (button stays disabled until it matches exactly) instead of confirm + prompt.
- **Every message was rewritten** with specifics: deletes show a one-line summary of the record (`RecordService.summary()`), backup restore shows the file name, export date and record counts, cost sync lists each price change, reconcile shows ledger vs. live stock, and so on. The old `#message-box` was removed. `APP_VERSION` → 2026.3.3.
- Verification: new dialog suite 21/21 (no native pop-ups at all, content, Cancel focus on danger, Enter/Esc/Tab behaviour, shortcut blocking, confirm/cancel results, type-DELETE gating, queueing, alert, light theme, phone bottom sheet); sidebar 19/19, welcome 21/21, main 106/106, PWA 10/10; zero console errors.

## 18. Round 12 — Settings Split Into Sections (Sidebar Dropdown)

Settings in the sidebar is now a dropdown; each section is its own page with a URL (`#settings/workers`, browser Back/Forward work) and full management:

| Section | Management |
|---|---|
| Overview | A tile per section with a live status line (e.g. "2 active · 3 total", "All checks passed") |
| Account & Sync | Sign-in/sync status, log out, password-reset email (email accounts), **display name on this device** (set/remove) |
| User Access *(admin only — §19)* | Approve / decline / revoke / delete access requests; pre-approve emails (add/edit/remove) |
| Business Profile | Edit, **reset to defaults**, live letterhead preview, print test page |
| Preferences | Device (theme, welcome screen, compact sidebar) and shared settings (save / **reset to defaults**) |
| Workers | Add / edit / delete, inline rate edit, **Active/Inactive** status (inactive = hidden from Manufacturing dropdowns, history kept), balance due, last remitted |
| Suppliers *(new)* | Supplier directory (add / edit / delete / deactivate); auto-created from existing POs and whenever a new supplier is typed on a PO; renaming carries over to past POs; PO count, amount purchased, "+ PO" shortcut |
| Expense Categories | Add, **rename** (updates past expenses), **reorder**, delete (choose which category its expenses move to, or keep the label) |
| App & Offline | Install, updates, version, storage, reset tour/welcome |
| Data Health | Checks + fixes (incl. restoring deleted-but-referenced workers as inactive) |
| Backup & Restore | JSON backup/restore, **CSV export of any table** (11 lists), factory reset, clear cache |

On phones and with the icon-only sidebar, the page shows section tabs instead of the dropdown. Also: browser history entries per page (Android back button works), `#reports/<view>` routes, dialog focus-restore bug fixed. Verified: settings suite 46/46.

## 19. Round 13 — Google Sign-In With Admin Approval; Login-Page Flash Fixed

**Login flash (reported bug):** the sign-in form was visible while Firebase was still restoring a remembered session, then jumped to the dashboard. Now a splash ("Checking your session…") shows until Firebase knows; the form only appears when nobody is signed in. Verified by watching the DOM during reload.

**Flow.** "Continue with Google" (popup; full-page redirect in the installed app / where popups fail). The email & password login is still there, tucked behind "Sign in with email & password", and goes through the same approval. On first sign-in the app creates `users/{uid}` in Firestore:
- **Admin** (`ADMIN_EMAILS` in `js/config/firebase-config.js` — felixpareja.pmdit07@gmail.com — *with a provider-verified email*) → approved automatically.
- **Pre-approved email** (`invites/{email}`) → approved automatically.
- **Everyone else** → *pending*: a "Waiting for approval" screen with their Google name/photo, **Check Status**, and a live listener — the moment the admin approves, they are signed in automatically. Declined users see the admin's note and can **Request Again**; revoked users are locked out immediately (even mid-session).

**Admin page:** Settings → **User Access** (only visible to the admin): pending count badge on the sidebar + a notification toast for each new request + an item on the welcome screen; table of everyone with Approve / Decline (with note) / Revoke / Delete; **Pre-approved Emails** (add / edit note / remove).

**Security rules** (`firestore.rules`, also wired in `firebase.json`): only approved users/admin can read or write `business/main`; a user can only create their own *pending* record, can never change their own status or role (except rejected → pending), can't list others; only the admin manages records and invites. The app ignores unconfirmed local writes to a user's own record, so tampering can't flash the app open.

**Verified against the Firebase Emulator Suite** (Auth + Firestore with these exact rules): 41/41 — splash then login, admin auto-approval + shared data seeding, pending screen, 7 tampering attempts all denied by the rules, admin badge/notification/table, approve → requester signed in automatically, live sync, revoke → locked out + data denied, decline with note → request again, delete → new request, pre-approved email → straight in, unverified email account is *not* admin, session restore without login flash, log out, and the real "Continue with Google" button via the emulator's sign-in popup. All other suites still pass (main 106, settings 46, welcome 21, sidebar 19, dialogs 21, PWA 10).

### One-time setup (Firebase Console, project bebang-ecbce)
1. **Authentication → Sign-in method → Add new provider → Google → Enable** (pick a support email) → Save.
2. **Authentication → Settings → Authorized domains → Add domain** → your Vercel domain (e.g. `bebang.vercel.app`, plus any custom domain).
3. **Firestore Database → Rules** → replace everything with the contents of `firestore.rules` → **Publish** (or `firebase deploy --only firestore:rules`).
4. Deploy the app (push to GitHub → Vercel).
5. Sign in **with Google** as felixpareja.pmdit07@gmail.com first — you're approved automatically as admin.
6. Ask staff to open the site and "Continue with Google"; approve them in Settings → User Access (or pre-approve their emails first).

**About the old shared password.** Signing in with Google as felixpareja.pmdit07@gmail.com makes that email "verified". If the shared email/password login for the same address still works afterwards, anyone who knows that password would be signed in as the admin — so after step 5, **change that password** (Authentication → Users → ⋮ → Reset password) or turn off Email/Password under Sign-in method once everyone uses Google.

**Local testing with emulators:** `firebase emulators:start --only auth,firestore` then open `http://localhost:<port>/index.html?emulator` (the `?emulator` switch only works on localhost/127.0.0.1).

## 20. Round 14 — Role-Based Access Control (Access Matrix, Roles, User Accounts)

Modelled on the reference app's Settings → *Access Control* group. The Settings dropdown now has grouped headings (Account · Access Control · Business · System).

- **User Accounts** (was User Access): each person has a **role**, chosen when approving ("Approve & Sign Them In" asks for it) and changeable any time from a dropdown in the table — the person's screen updates live. Pre-approved emails carry a role too.
- **Roles Management**: roles table (people count, permissions x/42, Read-only vs Can make changes, ★ default role for newly approved people). Add (optionally copying another role's permissions), edit, duplicate, set default, delete (its people are moved to a role you pick). The **Owner** (ADMIN_EMAILS) is a fixed row with every permission.
- **Access Matrix**: 42 permissions in 10 groups (Dashboard, Procurement, Inventory, Manufacturing, Sales & Customers, Reports & Expenses, Costing, Payroll, Settings, General) × every role, with per-group and per-role "all/none" toggles, a filter box, unsaved-changes bar with Save/Discard. Granting any action in a module also grants its View; removing View clears the module.
- **Built-in roles**: Manager (everything except factory reset), Staff (production/sales floor: log stock, POs, remittances, issuances, POS/orders/deliveries, customers; no deletes, no costing/payroll, no revenue/profit), Viewer (read-only). People approved before roles existed are treated as Manager.

**Enforcement.** `PermissionGuard` (`js/core/permissions.js`) wraps every action method (so a blocked action never runs — button, right-click menu, keyboard or console alike) and, after each render, hides buttons/forms and makes price fields read-only for actions the role lacks. Pages without View are removed from the sidebar and refused by the router; revenue/profit (dashboard cards & charts, Reports → Financial, welcome screen) need `reports.financial`. Server-side (`firestore.rules`): roles live in `config/access` (only the owner can write it); roles with only View permissions are stored `readOnly` and **their writes to the business data are rejected by Firestore**; nobody can change their own `roleId`, and only an invitation can pre-set one. Limitation: the business data is a single document, so the server enforces read-only vs. can-edit per role — the finer per-button permissions are enforced by the app.

**Verified** against the Firebase emulators: roles suite 39/39 (default roles seeded & read-only flag, create/copy/duplicate/default/delete-with-reassign, matrix tick/save/implied-view/discard/filter, approve-with-role, Staff sees exactly its pages & buttons and is blocked from deleting even via code, live permission and role changes, Viewer writes rejected by the server but reads allowed, can't self-promote or edit roles, invite with role, legacy = Manager). Regression: access 41/41, main 106/106, settings 46/46, welcome 21/21, sidebar 19/19, dialogs 21/21, PWA 10/10.

**Deploy note:** publish the updated `firestore.rules` again (it adds `config/access`, read-only roles and the role-change protection) before or right after pushing this version; until then the owner can't save roles.
