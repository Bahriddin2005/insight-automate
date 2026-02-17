import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Wifi, WifiOff, Clock, AlertTriangle, CheckCircle2, RefreshCw, Loader2, ChevronDown, ChevronUp, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authContext';

interface ConnectionHealth {
  id: string;
  name: string;
  endpoint_url: string;
  status: string;
  last_fetched_at: string | null;
  last_row_count: number;
  last_schema: unknown[] | null;
  created_at: string;
  schedule: string;
  // computed
  isOnline: boolean;
  responseTime: number | null;
  uptimePercent: number;
  schemaChanged: boolean;
  lastError: string | null;
}

interface IngestionLog {
  id: string;
  connection_id: string;
  status: string;
  row_count: number | null;
  duration_ms: number | null;
  error_message: string | null;
  schema_snapshot: unknown[] | null;
  created_at: string;
}

export default function ApiHealthMonitor() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ConnectionHealth[]>([]);
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [pinging, setPinging] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [connRes, logRes] = await Promise.all([
        supabase.from('api_connections').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('api_ingestion_logs').select('*').order('created_at', { ascending: false }).limit(200),
      ]);

      const rawConns = (connRes.data || []) as unknown as ConnectionHealth[];
      const rawLogs = (logRes.data || []) as unknown as IngestionLog[];
      setLogs(rawLogs);

      const enriched = rawConns.map(conn => {
        const connLogs = rawLogs.filter(l => l.connection_id === conn.id);
        const successLogs = connLogs.filter(l => l.status === 'success');
        const totalLogs = connLogs.length;
        const uptimePercent = totalLogs > 0 ? Math.round((successLogs.length / totalLogs) * 100) : 100;
        const latestLog = connLogs[0];
        const avgResponseTime = successLogs.length > 0
          ? Math.round(successLogs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / successLogs.length)
          : null;

        // Check schema changes
        let schemaChanged = false;
        if (connLogs.length >= 2) {
          const latest = connLogs[0]?.schema_snapshot;
          const prev = connLogs[1]?.schema_snapshot;
          if (latest && prev) {
            schemaChanged = JSON.stringify(latest) !== JSON.stringify(prev);
          }
        }

        return {
          ...conn,
          isOnline: conn.status === 'active' && (!latestLog || latestLog.status === 'success'),
          responseTime: avgResponseTime,
          uptimePercent,
          schemaChanged,
          lastError: latestLog?.status === 'error' ? latestLog.error_message : null,
        };
      });

      setConnections(enriched);
    } catch (e) {
      console.error('Health monitor fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePing = async (conn: ConnectionHealth) => {
    setPinging(conn.id);
    const start = Date.now();
    try {
      const { error } = await supabase.functions.invoke('api-proxy', {
        body: {
          endpoint_url: conn.endpoint_url,
          method: 'GET',
          auth_type: 'none',
          auth_config: {},
          custom_headers: {},
          json_root_path: '',
          pagination_type: 'none',
          pagination_config: {},
          connection_id: conn.id,
        },
      });
      const duration = Date.now() - start;
      setConnections(prev => prev.map(c =>
        c.id === conn.id ? { ...c, isOnline: !error, responseTime: duration } : c
      ));
    } catch {
      setConnections(prev => prev.map(c =>
        c.id === conn.id ? { ...c, isOnline: false } : c
      ));
    } finally {
      setPinging(null);
    }
  };

  const onlineCount = connections.filter(c => c.isOnline).length;
  const alertCount = connections.filter(c => c.schemaChanged || c.lastError).length;

  if (!user) return null;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">API Health Monitor</span>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="flex items-center gap-1 text-xs text-accent">
              <CheckCircle2 className="w-3 h-3" /> {onlineCount} online
            </span>
            {alertCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="w-3 h-3" /> {alertCount} alert{alertCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
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
              <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : connections.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No API connections yet. Connect an API to start monitoring.</div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Summary bar */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{connections.length}</p>
                    <p className="text-xs text-muted-foreground">Total APIs</p>
                  </div>
                  <div className="bg-accent/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-accent">{onlineCount}</p>
                    <p className="text-xs text-muted-foreground">Online</p>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${alertCount > 0 ? 'bg-destructive/10' : 'bg-muted/30'}`}>
                    <p className={`text-2xl font-bold ${alertCount > 0 ? 'text-destructive' : 'text-foreground'}`}>{alertCount}</p>
                    <p className="text-xs text-muted-foreground">Alerts</p>
                  </div>
                </div>

                {/* Connection rows */}
                <div className="divide-y divide-border/30 rounded-lg border border-border/50 overflow-hidden">
                  {connections.map(conn => (
                    <div key={conn.id} className="px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                      {/* Status indicator */}
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${conn.isOnline ? 'bg-accent animate-pulse' : 'bg-destructive'}`} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{conn.name}</p>
                          {conn.schemaChanged && (
                            <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[10px] font-medium flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" /> Schema Changed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">{conn.endpoint_url}</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                          {conn.responseTime !== null && (
                            <span className="flex items-center gap-0.5">
                              <Zap className="w-3 h-3" /> {conn.responseTime}ms avg
                            </span>
                          )}
                          <span className="flex items-center gap-0.5">
                            {conn.isOnline ? <Wifi className="w-3 h-3 text-accent" /> : <WifiOff className="w-3 h-3 text-destructive" />}
                            {conn.uptimePercent}% uptime
                          </span>
                          {conn.last_fetched_at && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {new Date(conn.last_fetched_at).toLocaleString()}
                            </span>
                          )}
                          {conn.schedule !== 'manual' && (
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">{conn.schedule}</span>
                          )}
                        </div>
                        {conn.lastError && (
                          <p className="text-[11px] text-destructive mt-1 truncate">⚠ {conn.lastError}</p>
                        )}
                      </div>

                      {/* Ping button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={() => handlePing(conn)}
                        disabled={pinging === conn.id}
                      >
                        {pinging === conn.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                        Ping
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
