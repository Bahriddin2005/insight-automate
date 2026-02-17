# Enterprise Analytics Studio — Power BI Desktop Two-Way Sync

## Overview

This document describes how to achieve **bidirectional workflow** between Enterprise Analytics Studio and Microsoft Power BI (Desktop + Service) using the official integration layer: **Power BI Service datasets** and **XMLA endpoints**.

---

## Architecture

```
┌─────────────────────┐     REST / XMLA      ┌──────────────────────┐
│  Enterprise         │ ◄──────────────────► │  Power BI Service    │
│  Analytics Studio   │                      │  (Dataset = source    │
│  (Platform)         │                      │   of truth)           │
└─────────┬───────────┘                      └──────────┬───────────┘
          │                                              │
          │ Export / Publish                             │ Live Connect
          │ (CSV, M, DAX, PBIX)                          │
          ▼                                              ▼
┌─────────────────────┐                      ┌──────────────────────┐
│  Power BI Desktop   │ ◄─── Live Dataset ─── │  Published Reports   │
│  (Report Design)    │                      │  (Embed in Platform)  │
└─────────────────────┘                      └──────────────────────┘
```

---

## Workflow 1: Platform → Power BI Desktop

### Step 1: Prepare Data in Platform

1. Upload or connect your data source (CSV, Excel, SQL, API).
2. Run auto-cleaning and quality engine.
3. Build semantic model (star schema, measures).
4. Export **Power BI-ready package**:
   - **Model-ready CSV/Excel** — cleaned dataset
   - **Power Query (M)** — reflects cleaning pipeline
   **DAX measures (.txt)** — copy into New Measure
   - **Data Dictionary (.md)** — schema + relationships

### Step 2: Import into Power BI Desktop

1. Open Power BI Desktop.
2. **Get Data** → Excel/CSV → select exported file.
3. In Power Query Editor: paste M script (optional) for cleaning steps.
4. Create **relationships** per Data Dictionary.
5. **New Measure** → paste DAX measures.
6. Build visuals.
7. **Publish** to Power BI Service (workspace).

### Step 3: Platform Publishes Dataset (Optional)

Use the **Power BI Sync** module:

1. Configure Power BI credentials (Service Principal or User token).
2. Create/update dataset in Power BI Service via REST API.
3. Push semantic model metadata via **XMLA endpoint** (server-side).
4. Power BI Desktop can **Connect to existing dataset** → Live connection.

---

## Workflow 2: Power BI Desktop → Platform (Embed)

### Step 1: Analyst Works in Power BI Desktop

1. Connect to Power BI Service dataset (live) or local .pbix.
2. Design report visuals, filters, drill-downs.
3. **Publish** report to Power BI Service workspace.

### Step 2: Platform Embeds Published Report

1. In Platform: **Power BI Sync** → **Link Report**.
2. Select workspace + report from Power BI Service.
3. Platform retrieves **embed URL** via REST API.
4. Report is embedded using Power BI Embedded JS SDK.
5. **RLS (Row-Level Security)** and **OLS** are respected by Power BI Service.

---

## REST API Endpoints Used

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List workspaces | `/groups` | GET |
| List datasets | `/groups/{id}/datasets` | GET |
| List reports | `/groups/{id}/reports` | GET |
| Push rows (streaming) | `/datasets/{id}/tables/{table}/rows` | POST |
| Get embed config | `/groups/{id}/reports/{id}` | GET |

---

## XMLA Endpoint (Enterprise Workflow)

For **model deployment** and **metadata updates** (relationships, measures, partitions, incremental refresh), use XMLA read/write:

- **Endpoint**: `powerbi://api.powerbi.com/v1.0/myorg/{workspaceId}`
- **Use case**: Deploy tabular model, add measures, update relationships.
- **Implementation**: Requires backend (C# Tabular Object Model, Python `sqlalchemy` + `adodbapi`, or Power BI REST `datasets/UpdateParameters` for parameters).

**Server-side recommended flow**:

```
Platform Backend → Azure AD token → XMLA Connect → Deploy model / Update metadata
```

---

## Authentication

### Option A: User token (Interactive)

- Use MSAL.js for browser-based login.
- Token scope: `https://analysis.windows.net/powerbi/api/.default` or `Dataset.ReadWrite.All`, `Workspace.ReadWrite.All`.

### Option B: Service Principal (Unattended)

- App registration in Azure AD.
- Client ID + Client Secret.
- Grant admin consent: Power BI Service admin settings.
- Use for automated pipeline (platform → Power BI).

---

## Environment Variables

```env
VITE_POWERBI_CLIENT_ID=
VITE_POWERBI_TENANT_ID=
# Client secret: server-side only, never in frontend
POWERBI_CLIENT_SECRET=
```

---

## Throttling & Limits

- **Push datasets**: 200 requests/min per dataset (streaming).
- **REST API**: 200 requests/min per user (typical).
- **XMLA**: No hard limit; follow best practices.

---

## Security & Governance

- **Credentials**: Store in Supabase Vault or Azure Key Vault (server-side).
- **RLS**: Power BI datasets support RLS; configure in Power BI Service.
- **Audit**: Log all dataset/report publish operations in `audit_logs` table.
