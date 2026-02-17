/**
 * Enterprise Analytics Studio — Power BI Sync Panel
 * Configure workspace, embed reports, publish datasets
 * Note: Power BI REST API may block browser CORS — use backend proxy for production.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LayoutGrid, ExternalLink, Key, Database, FileText, Loader2 } from 'lucide-react';
import { listWorkspaces, listDatasets, listReports } from '@/lib/powerBiService';

export default function PowerBISyncPanel() {
  const [token, setToken] = useState('');
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [datasets, setDatasets] = useState<{ id: string; name: string }[]>([]);
  const [reports, setReports] = useState<{ id: string; name: string }[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');

  const loadWorkspaces = async () => {
    if (!token.trim()) {
      setError('Enter an access token');
      return;
    }
    setLoading(true);
    setError('');
    setDatasets([]);
    setReports([]);
    setSelectedWorkspace(null);
    try {
      const ws = await listWorkspaces(token);
      setWorkspaces(ws.map(w => ({ id: w.id, name: w.name })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workspaces. Power BI API may block browser CORS — use backend proxy.');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaceDetails = async (workspaceId: string) => {
    if (!token.trim()) return;
    setLoadingDetails(true);
    setSelectedWorkspace(workspaceId);
    setError('');
    try {
      const [ds, rp] = await Promise.all([
        listDatasets(token, workspaceId),
        listReports(token, workspaceId),
      ]);
      setDatasets(ds.map(d => ({ id: d.id, name: d.name })));
      setReports(rp.map(r => ({ id: r.id, name: r.name })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load datasets/reports');
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="rounded border border-gray-200 bg-white p-4 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <LayoutGrid className="w-5 h-5 text-[#ffaa00]" />
        <h3 className="font-semibold text-[#374151] text-sm">Power BI Sync</h3>
      </div>
      <p className="text-xs text-[#6b7280]">
        Token: <code className="text-[10px] bg-gray-100 px-1 rounded">Dataset.ReadWrite.All</code>, <code className="text-[10px] bg-gray-100 px-1 rounded">Workspace.Read.All</code>
      </p>
      <div className="space-y-2">
        <Label className="text-xs text-[#6b7280]">Access Token</Label>
        <Input
          type="password"
          placeholder="Azure AD / MSAL token"
          value={token}
          onChange={e => setToken(e.target.value)}
          className="text-xs"
        />
      </div>
      <Button size="sm" onClick={loadWorkspaces} disabled={loading} className="gap-1.5 w-full bg-[#4472C4] hover:bg-[#3a62ab]">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
        {loading ? 'Yuklanmoqda...' : 'Load Workspaces'}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {workspaces.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[#6b7280]">Workspaces</p>
          <ul className="space-y-0.5 max-h-32 overflow-y-auto">
            {workspaces.slice(0, 12).map(w => (
              <li key={w.id}>
                <button
                  onClick={() => loadWorkspaceDetails(w.id)}
                  disabled={loadingDetails}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-left text-xs ${selectedWorkspace === w.id ? 'bg-[#4472C4]/15 text-[#4472C4] font-medium' : 'text-[#374151] hover:bg-gray-100'}`}
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{w.name}</span>
                  {loadingDetails && selectedWorkspace === w.id && <Loader2 className="w-3 h-3 animate-spin ml-auto" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(datasets.length > 0 || reports.length > 0) && (
        <div className="space-y-3 pt-3 border-t border-gray-200">
          {datasets.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#6b7280] mb-1 flex items-center gap-1"><Database className="w-3 h-3" /> Datasets</p>
              <ul className="space-y-0.5">
                {datasets.slice(0, 5).map(d => (
                  <li key={d.id} className="text-xs text-[#374151] truncate px-1">{d.name}</li>
                ))}
              </ul>
            </div>
          )}
          {reports.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[#6b7280] mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Reports</p>
              <ul className="space-y-0.5">
                {reports.slice(0, 5).map(r => (
                  <li key={r.id} className="text-xs text-[#374151] truncate px-1">{r.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
