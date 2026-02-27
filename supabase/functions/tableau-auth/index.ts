import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Base64url encode
function base64url(input: Uint8Array): string {
  let str = '';
  for (const byte of input) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlString(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createTableauJWT(
  clientId: string,
  secretId: string,
  secretValue: string,
  username: string,
  userAttributes: Record<string, string> = {}
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'HS256',
    typ: 'JWT',
    kid: secretId,
    iss: clientId,
  };

  const payload: Record<string, unknown> = {
    iss: clientId,
    sub: username,
    aud: 'tableau',
    exp: now + 600, // 10 minutes
    jti: crypto.randomUUID(),
    iat: now,
    scp: ['tableau:views:embed', 'tableau:views:embed_authoring'],
  };

  // Add user attributes for RLS
  if (Object.keys(userAttributes).length > 0) {
    payload['https://tableau.com/oda'] = userAttributes;
  }

  const encodedHeader = base64urlString(JSON.stringify(header));
  const encodedPayload = base64urlString(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // HMAC-SHA256 sign
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretValue),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput));
  const encodedSignature = base64url(new Uint8Array(signature));

  return `${signingInput}.${encodedSignature}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authenticated user
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

    // Get user profile for attributes
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', userId)
      .single();

    // Get Tableau secrets
    const clientId = Deno.env.get('TABLEAU_CLIENT_ID');
    const secretId = Deno.env.get('TABLEAU_SECRET_ID');
    const secretValue = Deno.env.get('TABLEAU_SECRET_VALUE');

    if (!clientId || !secretId || !secretValue) {
      return new Response(JSON.stringify({ error: 'Tableau credentials not configured' }), { status: 500, headers: corsHeaders });
    }

    // Parse request body for optional user attributes
    let userAttributes: Record<string, string> = {};
    try {
      const body = await req.json();
      if (body.userAttributes) {
        userAttributes = body.userAttributes;
      }
    } catch {
      // No body, that's fine
    }

    // Always include base attributes
    userAttributes['user_id'] = userId;
    if (userEmail) userAttributes['email'] = userEmail;
    if (profile?.full_name) userAttributes['full_name'] = profile.full_name;

    const jwt = await createTableauJWT(clientId, secretId, secretValue, userEmail || userId, userAttributes);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    return new Response(JSON.stringify({ token: jwt, expires_at: expiresAt }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Tableau auth error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
