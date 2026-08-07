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
