import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const { endpoint_url, method = 'GET', auth_type = 'none', auth_config = {}, custom_headers = {}, request_body, json_root_path = '', pagination_type = 'none', pagination_config = {}, connection_id } = body;

    if (!endpoint_url) throw new Error('endpoint_url is required');

    const startTime = Date.now();

    // Build headers
    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...custom_headers,
    };

    if (auth_type === 'bearer' && auth_config.token) {
      fetchHeaders['Authorization'] = `Bearer ${auth_config.token}`;
    } else if (auth_type === 'api_key' && auth_config.key && auth_config.header_name) {
      fetchHeaders[auth_config.header_name] = auth_config.key;
    }

    // Fetch with pagination support
    let allData: unknown[] = [];
    let currentUrl = endpoint_url;
    let page = 1;
    const maxPages = 10;

    while (page <= maxPages) {
      let url = currentUrl;
      if (pagination_type === 'page') {
        const sep = url.includes('?') ? '&' : '?';
        const paramName = pagination_config.param || 'page';
        url = `${url}${sep}${paramName}=${page}`;
        if (pagination_config.per_page_param && pagination_config.per_page) {
          url += `&${pagination_config.per_page_param}=${pagination_config.per_page}`;
        }
      } else if (pagination_type === 'offset') {
        const sep = url.includes('?') ? '&' : '?';
        const limit = pagination_config.limit || 100;
        const offsetParam = pagination_config.offset_param || 'offset';
        const limitParam = pagination_config.limit_param || 'limit';
        url = `${url}${sep}${offsetParam}=${(page - 1) * limit}&${limitParam}=${limit}`;
      }

      const fetchOpts: RequestInit = { method, headers: fetchHeaders };
      if (method !== 'GET' && method !== 'HEAD' && request_body) {
        fetchOpts.body = JSON.stringify(request_body);
      }

      const response = await fetch(url, fetchOpts);
      
      if (response.status === 429) {
        // Rate limited - wait and retry once
        await new Promise(r => setTimeout(r, 2000));
        const retry = await fetch(url, fetchOpts);
        if (!retry.ok) throw new Error(`API returned ${retry.status}: Rate limited`);
        const retryData = await retry.json();
        const extracted = extractData(retryData, json_root_path);
        allData = allData.concat(extracted);
        break;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API returned ${response.status}: ${errText.slice(0, 500)}`);
      }

      const jsonData = await response.json();
      const extracted = extractData(jsonData, json_root_path);
      
      if (extracted.length === 0) break;
      allData = allData.concat(extracted);

      // Check for cursor pagination
      if (pagination_type === 'cursor') {
        const nextCursor = getNestedValue(jsonData, pagination_config.cursor_path || 'next_cursor');
        if (!nextCursor) break;
        const sep = endpoint_url.includes('?') ? '&' : '?';
        const cursorParam = pagination_config.cursor_param || 'cursor';
        currentUrl = `${endpoint_url}${sep}${cursorParam}=${nextCursor}`;
      }

      if (pagination_type === 'none') break;
      page++;
    }

    const durationMs = Date.now() - startTime;

    // Flatten nested objects
    const flatData = allData.map(item => {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        return flattenObject(item as Record<string, unknown>);
      }
      return { value: item };
    });

    // Detect schema
    const schema = flatData.length > 0 ? Object.keys(flatData[0]).map(key => {
      const sample = flatData.slice(0, 20).map(r => (r as Record<string, unknown>)[key]);
      const type = detectType(sample);
      return { key, type };
    }) : [];

    // Log ingestion if connection_id provided
    if (connection_id) {
      try {
        await supabase.from('api_ingestion_logs').insert({
          connection_id,
          user_id: userId,
          status: 'success',
          row_count: flatData.length,
          duration_ms: durationMs,
          schema_snapshot: schema,
        });

        await supabase.from('api_connections').update({
          last_fetched_at: new Date().toISOString(),
          last_row_count: flatData.length,
          last_schema: schema,
        }).eq('id', connection_id);
      } catch (e) {
        console.error('Failed to log ingestion:', e);
      }
    }

    return new Response(JSON.stringify({
      data: flatData,
      schema,
      row_count: flatData.length,
      duration_ms: durationMs,
      pages_fetched: page,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('api-proxy error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractData(json: unknown, rootPath: string): unknown[] {
  if (!rootPath || rootPath === '') {
    if (Array.isArray(json)) return json;
    if (typeof json === 'object' && json !== null) {
      // Auto-detect: find first array property
      for (const val of Object.values(json as Record<string, unknown>)) {
        if (Array.isArray(val) && val.length > 0) return val;
      }
      return [json];
    }
    return [];
  }
  const value = getNestedValue(json, rootPath);
  if (Array.isArray(value)) return value;
  if (value !== undefined) return [value];
  return [];
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

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

function detectType(samples: unknown[]): string {
  const nonNull = samples.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonNull.length === 0) return 'text';
  const numCount = nonNull.filter(v => !isNaN(Number(v))).length;
  if (numCount / nonNull.length > 0.8) return 'numeric';
  const dateCount = nonNull.filter(v => !isNaN(Date.parse(String(v))) && String(v).length > 4).length;
  if (dateCount / nonNull.length > 0.7) return 'datetime';
  return 'text';
}
