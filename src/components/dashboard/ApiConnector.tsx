import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Key, ChevronRight, ChevronLeft, Eye, Loader2, Plus, Trash2, ArrowRight, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authContext';
import { analyzeDataset } from '@/lib/dataProcessor';
import type { DatasetAnalysis } from '@/lib/dataProcessor';
import DataPreview from './DataPreview';

interface ApiConnectorProps {
  onDataReady: (analysis: DatasetAnalysis, name: string) => void;
}

type Step = 'endpoint' | 'auth' | 'options' | 'preview';

interface ApiConfig {
  name: string;
  endpoint_url: string;
  method: string;
  auth_type: string;
  auth_config: Record<string, string>;
  custom_headers: Record<string, string>;
  request_body: string;
  json_root_path: string;
  pagination_type: string;
  pagination_config: Record<string, string>;
  schedule: string;
}

const defaultConfig: ApiConfig = {
  name: '',
  endpoint_url: '',
  method: 'GET',
  auth_type: 'none',
  auth_config: {},
  custom_headers: {},
  request_body: '',
  json_root_path: '',
  pagination_type: 'none',
  pagination_config: {},
  schedule: 'manual',
};

export default function ApiConnector({ onDataReady }: ApiConnectorProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('endpoint');
  const [config, setConfig] = useState<ApiConfig>(defaultConfig);
  const [headerEntries, setHeaderEntries] = useState<{ key: string; value: string }[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [previewSchema, setPreviewSchema] = useState<{ key: string; type: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewMeta, setPreviewMeta] = useState<{ row_count: number; duration_ms: number; pages_fetched: number } | null>(null);

  const steps: Step[] = ['endpoint', 'auth', 'options', 'preview'];
  const stepIdx = steps.indexOf(step);

  const updateConfig = (partial: Partial<ApiConfig>) => setConfig(prev => ({ ...prev, ...partial }));

  const addHeader = () => setHeaderEntries(prev => [...prev, { key: '', value: '' }]);
  const removeHeader = (i: number) => setHeaderEntries(prev => prev.filter((_, idx) => idx !== i));
  const updateHeader = (i: number, field: 'key' | 'value', val: string) => {
    setHeaderEntries(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: val } : h));
  };

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError('');
    setPreviewData([]);
    try {
      const headers: Record<string, string> = {};
      headerEntries.forEach(h => { if (h.key.trim()) headers[h.key.trim()] = h.value; });

      const payload = {
        endpoint_url: config.endpoint_url,
        method: config.method,
        auth_type: config.auth_type,
        auth_config: config.auth_type !== 'none' ? config.auth_config : {},
        custom_headers: headers,
        request_body: config.request_body ? JSON.parse(config.request_body) : undefined,
        json_root_path: config.json_root_path,
        pagination_type: config.pagination_type,
        pagination_config: config.pagination_config,
      };

      const { data, error: fnError } = await supabase.functions.invoke('api-proxy', { body: payload });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setPreviewData(data.data?.slice(0, 200) || []);
      setPreviewSchema(data.schema || []);
      setPreviewMeta({ row_count: data.row_count, duration_ms: data.duration_ms, pages_fetched: data.pages_fetched });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch API data');
    } finally {
      setLoading(false);
    }
  }, [config, headerEntries]);

  const handleIngest = async () => {
    if (!previewData.length) return;
    setLoading(true);
    setError('');
    try {
      const headers: Record<string, string> = {};
      headerEntries.forEach(h => { if (h.key.trim()) headers[h.key.trim()] = h.value; });

      // Save connection
      const { data: conn, error: connErr } = await supabase.from('api_connections').insert({
        user_id: user!.id,
        name: config.name || new URL(config.endpoint_url).hostname,
        endpoint_url: config.endpoint_url,
        method: config.method,
        auth_type: config.auth_type,
        auth_config: config.auth_config,
        custom_headers: headers,
        request_body: config.request_body ? JSON.parse(config.request_body) : null,
        json_root_path: config.json_root_path,
        pagination_type: config.pagination_type,
        pagination_config: config.pagination_config,
        schedule: config.schedule,
        last_fetched_at: new Date().toISOString(),
        last_row_count: previewData.length,
        last_schema: previewSchema,
      }).select('id').single();

      if (connErr) console.error('Failed to save connection:', connErr);

      // Full fetch with connection_id for logging
      const payload = {
        endpoint_url: config.endpoint_url,
        method: config.method,
        auth_type: config.auth_type,
        auth_config: config.auth_type !== 'none' ? config.auth_config : {},
        custom_headers: headers,
        request_body: config.request_body ? JSON.parse(config.request_body) : undefined,
        json_root_path: config.json_root_path,
        pagination_type: config.pagination_type,
        pagination_config: config.pagination_config,
        connection_id: conn?.id,
      };

      const { data: fullData, error: fnErr } = await supabase.functions.invoke('api-proxy', { body: payload });
      if (fnErr) throw new Error(fnErr.message);
      if (fullData?.error) throw new Error(fullData.error);

      const analysis = analyzeDataset(fullData.data);
      onDataReady(analysis, config.name || `API: ${new URL(config.endpoint_url).hostname}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ingestion failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s)}
              className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                i <= stepIdx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </button>
            {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i < stepIdx ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Endpoint */}
        {step === 'endpoint' && (
          <motion.div key="endpoint" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Connection Name</Label>
              <Input value={config.name} onChange={e => updateConfig({ name: e.target.value })} placeholder="My API Connection" className="mt-1" />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">API Endpoint URL *</Label>
              <Input value={config.endpoint_url} onChange={e => updateConfig({ endpoint_url: e.target.value })} placeholder="https://api.example.com/v1/data" className="mt-1 font-mono text-sm" />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">HTTP Method</Label>
              <Select value={config.method} onValueChange={v => updateConfig({ method: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.method === 'POST' && (
              <div>
                <Label className="text-sm text-muted-foreground">Request Body (JSON)</Label>
                <textarea
                  value={config.request_body}
                  onChange={e => updateConfig({ request_body: e.target.value })}
                  placeholder='{"query": "...", "limit": 100}'
                  className="mt-1 w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus:ring-1 focus:ring-ring outline-none"
                />
              </div>
            )}
            <Button onClick={() => setStep('auth')} disabled={!config.endpoint_url} className="w-full gradient-primary text-primary-foreground">
              Next: Authentication <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Auth */}
        {step === 'auth' && (
          <motion.div key="auth" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Authentication Type</Label>
              <Select value={config.auth_type} onValueChange={v => updateConfig({ auth_type: v, auth_config: {} })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Authentication</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="api_key">API Key</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.auth_type === 'bearer' && (
              <div>
                <Label className="text-sm text-muted-foreground">Bearer Token</Label>
                <Input type="password" value={config.auth_config.token || ''} onChange={e => updateConfig({ auth_config: { token: e.target.value } })} placeholder="your-token-here" className="mt-1 font-mono text-sm" />
              </div>
            )}
            {config.auth_type === 'api_key' && (
              <>
                <div>
                  <Label className="text-sm text-muted-foreground">Header Name</Label>
                  <Input value={config.auth_config.header_name || ''} onChange={e => updateConfig({ auth_config: { ...config.auth_config, header_name: e.target.value } })} placeholder="X-API-Key" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">API Key</Label>
                  <Input type="password" value={config.auth_config.key || ''} onChange={e => updateConfig({ auth_config: { ...config.auth_config, key: e.target.value } })} placeholder="your-api-key" className="mt-1 font-mono text-sm" />
                </div>
              </>
            )}

            {/* Custom Headers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm text-muted-foreground">Custom Headers</Label>
                <Button variant="ghost" size="sm" onClick={addHeader} className="text-xs"><Plus className="w-3 h-3 mr-1" /> Add</Button>
              </div>
              {headerEntries.map((h, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input value={h.key} onChange={e => updateHeader(i, 'key', e.target.value)} placeholder="Header name" className="flex-1 text-sm" />
                  <Input value={h.value} onChange={e => updateHeader(i, 'value', e.target.value)} placeholder="Value" className="flex-1 text-sm" />
                  <Button variant="ghost" size="icon" onClick={() => removeHeader(i)} className="shrink-0"><Trash2 className="w-3 h-3 text-destructive" /></Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('endpoint')} className="flex-1"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
              <Button onClick={() => setStep('options')} className="flex-1 gradient-primary text-primary-foreground">Next: Options <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Options */}
        {step === 'options' && (
          <motion.div key="options" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">JSON Root Path (optional)</Label>
              <Input value={config.json_root_path} onChange={e => updateConfig({ json_root_path: e.target.value })} placeholder="data.results" className="mt-1 font-mono text-sm" />
              <p className="text-xs text-muted-foreground mt-1">Path to the data array in JSON response (e.g. "data.items")</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Pagination</Label>
              <Select value={config.pagination_type} onValueChange={v => updateConfig({ pagination_type: v, pagination_config: {} })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Pagination</SelectItem>
                  <SelectItem value="page">Page-based</SelectItem>
                  <SelectItem value="offset">Offset-based</SelectItem>
                  <SelectItem value="cursor">Cursor-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.pagination_type === 'page' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Page param</Label>
                  <Input value={config.pagination_config.param || ''} onChange={e => updateConfig({ pagination_config: { ...config.pagination_config, param: e.target.value } })} placeholder="page" className="mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Per page param</Label>
                  <Input value={config.pagination_config.per_page_param || ''} onChange={e => updateConfig({ pagination_config: { ...config.pagination_config, per_page_param: e.target.value } })} placeholder="per_page" className="mt-1 text-sm" />
                </div>
              </div>
            )}
            {config.pagination_type === 'cursor' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Cursor param</Label>
                  <Input value={config.pagination_config.cursor_param || ''} onChange={e => updateConfig({ pagination_config: { ...config.pagination_config, cursor_param: e.target.value } })} placeholder="cursor" className="mt-1 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cursor path in response</Label>
                  <Input value={config.pagination_config.cursor_path || ''} onChange={e => updateConfig({ pagination_config: { ...config.pagination_config, cursor_path: e.target.value } })} placeholder="meta.next_cursor" className="mt-1 text-sm" />
                </div>
              </div>
            )}
            <div>
              <Label className="text-sm text-muted-foreground">Schedule</Label>
              <Select value={config.schedule} onValueChange={v => updateConfig({ schedule: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual only</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('auth')} className="flex-1"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
              <Button onClick={() => { setStep('preview'); fetchPreview(); }} className="flex-1 gradient-primary text-primary-foreground">
                <Eye className="w-4 h-4 mr-1" /> Preview Data
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Preview */}
        {step === 'preview' && (
          <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> Fetching API data...
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm p-3 rounded-lg bg-destructive/10">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            {previewMeta && !loading && (
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-accent">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">{previewMeta.row_count.toLocaleString()} rows</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{previewMeta.duration_ms}ms</span>
                </div>
                <div className="text-muted-foreground">
                  {previewSchema.length} columns • {previewMeta.pages_fetched} page(s)
                </div>
              </div>
            )}
            {previewData.length > 0 && <DataPreview data={previewData} />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('options')} className="flex-1"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
              <Button variant="outline" onClick={fetchPreview} disabled={loading} className="shrink-0">
                <Eye className="w-4 h-4 mr-1" /> Refresh
              </Button>
              <Button onClick={handleIngest} disabled={loading || !previewData.length} className="flex-1 gradient-primary text-primary-foreground">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4 mr-1" /> Ingest & Analyze</>}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
