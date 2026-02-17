import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Use service role for scheduled tasks
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Get all connections with active schedules
    const { data: connections, error: fetchErr } = await supabase
      .from('api_connections')
      .select('*')
      .neq('schedule', 'manual')
      .eq('status', 'active');

    if (fetchErr) throw fetchErr;
    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ message: 'No scheduled connections', refreshed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: { id: string; name: string; status: string; rows?: number; error?: string }[] = [];

    for (const conn of connections) {
      const startTime = Date.now();
      try {
        // Build headers
        const fetchHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(conn.custom_headers || {}),
        };

        if (conn.auth_type === 'bearer' && conn.auth_config?.token) {
          fetchHeaders['Authorization'] = `Bearer ${conn.auth_config.token}`;
        } else if (conn.auth_type === 'api_key' && conn.auth_config?.key && conn.auth_config?.header_name) {
          fetchHeaders[conn.auth_config.header_name] = conn.auth_config.key;
        }

        // Fetch data
        const fetchOpts: RequestInit = { method: conn.method || 'GET', headers: fetchHeaders };
        if (conn.method !== 'GET' && conn.method !== 'HEAD' && conn.request_body) {
          fetchOpts.body = JSON.stringify(conn.request_body);
        }

        const response = await fetch(conn.endpoint_url, fetchOpts);
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const jsonData = await response.json();
        let data: unknown[];
        
        if (Array.isArray(jsonData)) {
          data = jsonData;
        } else if (typeof jsonData === 'object' && jsonData !== null) {
          const rootPath = conn.json_root_path;
          if (rootPath) {
            const val = rootPath.split('.').reduce((acc: unknown, key: string) => {
              if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
              return undefined;
            }, jsonData);
            data = Array.isArray(val) ? val : [val].filter(Boolean);
          } else {
            const firstArr = Object.values(jsonData as Record<string, unknown>).find(v => Array.isArray(v));
            data = Array.isArray(firstArr) ? firstArr as unknown[] : [jsonData];
          }
        } else {
          data = [];
        }

        // Flatten
        const flatData = data.map(item => {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            return flattenObject(item as Record<string, unknown>);
          }
          return { value: item };
        });

        // Schema
        const schema = flatData.length > 0 ? Object.keys(flatData[0]).map(key => {
          const sample = flatData.slice(0, 10).map(r => (r as Record<string, unknown>)[key]);
          const nonNull = sample.filter(v => v !== null && v !== undefined);
          const numCount = nonNull.filter(v => !isNaN(Number(v))).length;
          const type = numCount / Math.max(nonNull.length, 1) > 0.8 ? 'numeric' : 'text';
          return { key, type };
        }) : [];

        const durationMs = Date.now() - startTime;

        // Log success
        await supabase.from('api_ingestion_logs').insert({
          connection_id: conn.id,
          user_id: conn.user_id,
          status: 'success',
          row_count: flatData.length,
          duration_ms: durationMs,
          schema_snapshot: schema,
        });

        await supabase.from('api_connections').update({
          last_fetched_at: new Date().toISOString(),
          last_row_count: flatData.length,
          last_schema: schema,
        }).eq('id', conn.id);

        results.push({ id: conn.id, name: conn.name, status: 'success', rows: flatData.length });
      } catch (e) {
        const durationMs = Date.now() - startTime;
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';

        await supabase.from('api_ingestion_logs').insert({
          connection_id: conn.id,
          user_id: conn.user_id,
          status: 'error',
          error_message: errorMsg,
          duration_ms: durationMs,
        });

        results.push({ id: conn.id, name: conn.name, status: 'error', error: errorMsg });
      }
    }

    return new Response(JSON.stringify({
      message: `Refreshed ${results.length} connections`,
      refreshed: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('scheduled-refresh error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else if (Array.isArray(value)) {
      result[newKey] = value.length > 0 && typeof value[0] === 'object' ? JSON.stringify(value) : value.join(', ');
    } else {
      result[newKey] = value;
    }
  }
  return result;
}
