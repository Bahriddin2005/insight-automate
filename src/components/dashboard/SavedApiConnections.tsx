import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Trash2, RefreshCw, Loader2, Clock, Database, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authContext';
import { analyzeDataset } from '@/lib/dataProcessor';
import type { DatasetAnalysis } from '@/lib/dataProcessor';

interface ApiConnection {
  id: string;
  name: string;
  endpoint_url: string;
  method: string;
  auth_type: string;
  auth_config: Record<string, string>;
  custom_headers: Record<string, string>;
  request_body: unknown;
  json_root_path: string;
  pagination_type: string;
  pagination_config: Record<string, string>;
  schedule: string;
  last_fetched_at: string | null;
  last_row_count: number;
  status: string;
  created_at: string;
}

interface SavedApiConnectionsProps {
  onDataReady?: (analysis: DatasetAnalysis, name: string) => void;
}

export default function SavedApiConnections({ onDataReady }: SavedApiConnectionsProps) {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ApiConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const fetchConnections = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('api_connections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setConnections((data as unknown as ApiConnection[]) || []);
    } catch (e) {
      console.error('Failed to load connections:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const handleDelete = async (id: string) => {
    await supabase.from('api_connections').delete().eq('id', id);
    setConnections(prev => prev.filter(c => c.id !== id));
  };

  const handleRefresh = async (conn: ApiConnection) => {
    if (!onDataReady) return;
    setRefreshingId(conn.id);
    try {
      const payload = {
        endpoint_url: conn.endpoint_url,
        method: conn.method,
        auth_type: conn.auth_type,
        auth_config: conn.auth_type !== 'none' ? conn.auth_config : {},
        custom_headers: conn.custom_headers,
        request_body: conn.request_body,
        json_root_path: conn.json_root_path,
        pagination_type: conn.pagination_type,
        pagination_config: conn.pagination_config,
        connection_id: conn.id,
      };

      const { data, error } = await supabase.functions.invoke('api-proxy', { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const analysis = analyzeDataset(data.data);
      onDataReady(analysis, conn.name);
    } catch (e) {
      console.error('Refresh failed:', e);
    } finally {
      setRefreshingId(null);
    }
  };

  if (!connections.length && !loading) return null;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Saved API Connections</span>
          <span className="text-xs text-muted-foreground">({connections.length})</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50"
          >
            {loading ? (
              <div className="p-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="divide-y divide-border/30">
                {connections.map(conn => (
                  <div key={conn.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Globe className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{conn.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{conn.endpoint_url}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-accent" />
                          {conn.last_row_count} rows
                        </span>
                        {conn.last_fetched_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(conn.last_fetched_at).toLocaleDateString()}
                          </span>
                        )}
                        {conn.schedule !== 'manual' && (
                          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">{conn.schedule}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRefresh(conn)}
                        disabled={refreshingId === conn.id}
                      >
                        {refreshingId === conn.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(conn.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
