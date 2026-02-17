/**
 * Enterprise Analytics Studio — Power BI Service Integration
 * REST APIs for datasets, workspaces, reports. XMLA workflow documented for backend.
 */

export interface PowerBiConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  /** Or use service principal / user token */
  accessToken?: string;
}

export interface PowerBiWorkspace {
  id: string;
  name: string;
  isReadOnly?: boolean;
  type?: string;
}

export interface PowerBiDataset {
  id: string;
  name: string;
  configuredBy?: string;
  isRefreshable?: boolean;
  targetStorageMode?: string;
}

export interface PowerBiReport {
  id: string;
  name: string;
  datasetId?: string;
  webUrl?: string;
  embedUrl?: string;
}

const PBI_BASE = 'https://api.powerbi.com/v1.0/myorg';

/** Get workspaces — requires access token from Azure AD / service principal */
export async function listWorkspaces(accessToken: string): Promise<PowerBiWorkspace[]> {
  const res = await fetch(`${PBI_BASE}/groups`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Power BI API: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.value ?? [];
}

/** Get datasets in a workspace */
export async function listDatasets(accessToken: string, workspaceId: string): Promise<PowerBiDataset[]> {
  const res = await fetch(`${PBI_BASE}/groups/${workspaceId}/datasets`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Power BI API: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.value ?? [];
}

/** Get reports in a workspace */
export async function listReports(accessToken: string, workspaceId: string): Promise<PowerBiReport[]> {
  const res = await fetch(`${PBI_BASE}/groups/${workspaceId}/reports`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Power BI API: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.value ?? [];
}

/** Push rows to a streaming dataset (push semantic model) — for real-time dashboards */
export async function pushRows(
  accessToken: string,
  datasetId: string,
  tableName: string,
  rows: Record<string, unknown>[]
): Promise<void> {
  const res = await fetch(`${PBI_BASE}/datasets/${datasetId}/tables/${tableName}/rows`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) throw new Error(`Power BI Push: ${res.status} ${await res.text()}`);
}

/** Get embed config for report embedding */
export async function getReportEmbedConfig(
  accessToken: string,
  workspaceId: string,
  reportId: string
): Promise<{ embedUrl: string; token?: string }> {
  const res = await fetch(`${PBI_BASE}/groups/${workspaceId}/reports/${reportId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Power BI API: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return { embedUrl: json.embedUrl ?? '' };
}
