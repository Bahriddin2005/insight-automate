import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Tableau REST API: Sign in with JWT to get API token
async function tableauSignIn(siteUrl: string, siteName: string, jwt: string): Promise<{ token: string; siteId: string }> {
  const signInUrl = `${siteUrl}/api/3.22/auth/signin`;
  const body = {
    credentials: {
      jwt: jwt,
      site: { contentUrl: siteName },
    },
  };

  const res = await fetch(signInUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tableau sign-in failed [${res.status}]: ${text}`);
  }

  const data = await res.json();
  return {
    token: data.credentials.token,
    siteId: data.credentials.site.id,
  };
}

// Trigger workbook or datasource refresh
async function triggerRefresh(
  siteUrl: string,
  apiToken: string,
  siteId: string,
  resourceType: 'workbook' | 'datasource',
  resourceId: string
): Promise<{ jobId: string }> {
  const endpoint = resourceType === 'workbook'
    ? `${siteUrl}/api/3.22/sites/${siteId}/workbooks/${resourceId}/refresh`
    : `${siteUrl}/api/3.22/sites/${siteId}/datasources/${resourceId}/refresh`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Tableau-Auth': apiToken,
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Refresh failed [${res.status}]: ${text}`);
  }

  const data = await res.json();
  return { jobId: data.job?.id || 'unknown' };
}

// Generate JWT for REST API auth (same logic as tableau-auth)
function base64url(input: Uint8Array): string {
  let str = '';
  for (const byte of input) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlString(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createTableauJWT(clientId: string, secretId: string, secretValue: string, username: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT', kid: secretId, iss: clientId };
  const payload = {
    iss: clientId,
    sub: username,
    aud: 'tableau',
    exp: now + 300,
    jti: crypto.randomUUID(),
    iat: now,
    scp: ['tableau:content:read', 'tableau:tasks:run'],
  };

  const encodedHeader = base64urlString(JSON.stringify(header));
  const encodedPayload = base64urlString(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secretValue), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;

    // Parse request
    const { resource_type, resource_id, resource_name } = await req.json();
    if (!resource_type || !resource_id) {
      return new Response(JSON.stringify({ error: 'resource_type and resource_id required' }), { status: 400, headers: corsHeaders });
    }

    // Get Tableau config
    const clientId = Deno.env.get('TABLEAU_CLIENT_ID');
    const secretId = Deno.env.get('TABLEAU_SECRET_ID');
    const secretValue = Deno.env.get('TABLEAU_SECRET_VALUE');
    const siteName = Deno.env.get('TABLEAU_SITE_NAME');

    if (!clientId || !secretId || !secretValue || !siteName) {
      return new Response(JSON.stringify({ error: 'Tableau credentials not configured' }), { status: 500, headers: corsHeaders });
    }

    const siteUrl = 'https://10ax.online.tableau.com';

    // Log start
    const { data: logEntry } = await supabase.from('tableau_refresh_logs').insert({
      resource_type,
      resource_id,
      resource_name: resource_name || '',
      status: 'running',
      triggered_by: userId,
    } as any).select().single();

    try {
      // Generate JWT and sign in to Tableau REST API
      const jwt = await createTableauJWT(clientId, secretId, secretValue, userEmail || userId);
      const { token: apiToken, siteId } = await tableauSignIn(siteUrl, siteName, jwt);

      // Trigger refresh
      const { jobId } = await triggerRefresh(siteUrl, apiToken, siteId, resource_type, resource_id);

      // Update log
      if (logEntry?.id) {
        await supabase.from('tableau_refresh_logs').update({
          status: 'success',
          finished_at: new Date().toISOString(),
        } as any).eq('id', logEntry.id);
      }

      return new Response(JSON.stringify({ success: true, job_id: jobId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (refreshError) {
      const errMsg = refreshError instanceof Error ? refreshError.message : 'Unknown refresh error';
      if (logEntry?.id) {
        await supabase.from('tableau_refresh_logs').update({
          status: 'error',
          finished_at: new Date().toISOString(),
          error: errMsg,
        } as any).eq('id', logEntry.id);
      }
      throw refreshError;
    }
  } catch (error) {
    console.error('Tableau refresh error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
