# Console module UI behaviour (CargoWise-aligned)

Source of truth for Master (Console / MAWB) vs House (HAWB) behaviour in
`airfreight-western-ui`. Domain guards remain in `src/lib/consoleDomain.ts`.

## Mental model

| Surface | Identity | Operator owns | Must not own |
|---------|----------|---------------|--------------|
| **Console (Master)** | Master Job No + **MAWB / MBL** | Carrier booking & schedule, consolidation totals, ULD, **Carrier AP** | Customer AR invoice, importer customs filing |
| **House (under Console)** | **HAWB / HBL** (primary) + House Job No | Shipper/consignee, house cargo, commercial terms, **Customer AR**, customs | Overriding Master schedule while attached |

Master schedule is the **single source of truth**. On Console save, MAWB / route /
airline / ETD / ETA / flight / ATD / ATA cascade to attached houses
(`freight.updateConsolidation` → `syncConsoleFromMaster`).

## Console detail layout

Implemented in `ConsolidationView.vue` (form mode):

1. **Lifecycle Handoff spine** (unchanged)
2. **Master Bill panel** (`MasterBillPanel.vue`)
   - Banner: “Master Bill · Console”, Master Job No, MAWB status
   - Carrier booking & schedule: MAWB, airline, flight/voyage, route, POL/POD,
     ETD / ETA / **ATD / ATA**, status, cut-off
   - Consolidation totals: pieces, gross / chargeable weight, volume, ULD
   - Agents: booking / POL / dest
   - Actions: Allocate MAWB, Edit Master Job (full job form), sticky “Master job desk”
3. **House Bills table**
   - Column order emphasises **HAWB / HBL** first, then House Job, customer, pcs/wt, customs
   - Violet visual cue (“House Bills”) vs sky Master banner
4. **Carrier AP Unified Ledger** (`ConsoleChargesPanel`, `money-scope="console-ap"`)
5. Console notes

## House experience

`HouseDetailDrawer.vue` (widened `os-drawer--house`):

- Header identity is **HAWB** first; Job No secondary
- Actions: **Open full House Job** (`/shipments/:id`), **House Overview** (`/jobs/:id`)
- Sections:
  - House Bill identity (HAWB, customer, status, Incoterm, HAWB freight terms)
  - Shipper / Consignee / Notify / delivery
  - House cargo (pcs, wt, volume, packing, HS, description, special reqs)
  - **Inherited from Master (locked)** — MAWB, airline, route, ETD/ETA/flight/ATD with
    inherit hints (not editable while attached)
  - Customs (House-only) — ABN, broker, DAFF, clearance, money lock
  - House AR preview + link to House Charges desk

Autosave stays on the drawer; detach remains Console-owned.

## Scope rules (unchanged / enforced)

- `assertNotConsoleArInvoice('console')` — customer AR never issued on Console
- `assertNotConsoleCustomsEntry('console')` — customs entry never filed on Console
- House customs pills open the House drawer (not Master)
- Console ledger is Carrier AP only; House AR on house job / drawer

## Cascade

When Master schedule fields change and Console is saved:

1. Consolidation record updated
2. Master shipment row aligned
3. Each attached house receives MAWB, route, airline, ETD, ETA, and flight/ATD/ATA extras

Houses must not write those fields while `consolidationId` is set (UI locks via
`inherit-hint` / disabled inputs on the inherited block).

## Related files

- `src/views/ConsolidationView.vue`
- `src/components/consolidation/MasterBillPanel.vue`
- `src/components/consolidation/HouseDetailDrawer.vue`
- `src/components/consolidation/ConsoleChargesPanel.vue`
- `src/stores/freight.ts` (`syncConsoleFromMaster`, `updateConsolidation`)
- `src/lib/consoleDomain.ts`
