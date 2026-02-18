import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const tools = [
  {
    type: "function",
    function: {
      name: "clean_data",
      description: "Clean and prepare the currently loaded dataset. Removes duplicates, trims whitespace, handles missing values, detects outliers.",
      parameters: {
        type: "object",
        properties: {
          strategy: {
            type: "string",
            enum: ["auto", "aggressive", "gentle"],
            description: "Cleaning strategy: auto (default), aggressive (remove more), gentle (preserve more)"
          }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "build_dashboard",
      description: "Build a dashboard visualization from the current dataset. Use when user asks for charts, dashboard, visualization, or graphs.",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["auto", "executive", "sales", "finance", "marketing", "hr", "education", "quality", "3d"],
            description: "Dashboard template mode. 'auto' picks the best template based on data. '3d' creates 3D interactive dashboard."
          },
          charts: {
            type: "array",
            items: { type: "string" },
            description: "Specific chart types to include: bar, line, pie, area, scatter, heatmap, funnel"
          }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_insights",
      description: "Generate deep analytical insights from the dataset including KPIs, trends, anomalies, and recommendations.",
      parameters: {
        type: "object",
        properties: {
          focus: {
            type: "string",
            enum: ["overview", "trends", "anomalies", "kpis", "recommendations", "risks"],
            description: "Focus area for insight generation"
          }
        },
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "export_report",
      description: "Export the current dashboard or analysis as a file.",
      parameters: {
        type: "object",
        properties: {
          format: {
            type: "string",
            enum: ["pdf", "csv", "xlsx", "png", "txt"],
            description: "Export file format"
          }
        },
        required: ["format"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "profile_data",
      description: "Profile the current dataset: show row/column counts, data types, missing values, quality score, and statistics.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "navigate_to",
      description: "Navigate user to a specific page or section of the application.",
      parameters: {
        type: "object",
        properties: {
          destination: {
            type: "string",
            enum: ["dashboard", "home", "upload", "my_dashboards", "settings"],
            description: "Where to navigate"
          }
        },
        required: ["destination"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "compare_datasets",
      description: "Compare two time periods or segments within the current dataset.",
      parameters: {
        type: "object",
        properties: {
          dimension: {
            type: "string",
            description: "Column to compare by (e.g., date, category, region)"
          },
          metric: {
            type: "string",
            description: "Metric column to measure (e.g., revenue, count, score)"
          }
        },
        required: ["dimension"],
        additionalProperties: false
      }
    }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { question, datasetContext, conversationHistory, stream } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const systemPrompt = `Sen AIDA — real-time ovozli AI Data Analyst va buyruq ijrochisi.

REJIM: Siri + ChatGPT aralashmasi. Foydalanuvchi gapiradi — sen ijro etasan va javob berasan.

BUYRUQLARNI TANIB OLISH:
Foydalanuvchi so'rovini 5 turga ajrat:
1) SAVOL → javob ber
2) BUYRUQ → tegishli tool chaqir, natijani ayt
3) DATA TAHLIL → dataset tahlil qil
4) DASHBOARD → dashboard yarat
5) SOZLAMALAR → export, filtr, navigatsiya

TOOL CHAQIRISH QOIDALARI:
- Agar foydalanuvchi "tozala", "clean" desa → clean_data tool chaqir
- Agar "dashboard", "grafik", "vizualizatsiya" desa → build_dashboard tool chaqir
- Agar "3D dashboard" desa → build_dashboard(mode="3d") tool chaqir
- Agar "tahlil", "insight", "ko'rsatkich" desa → generate_insights tool chaqir
- Agar "eksport", "yuklab ol", "PDF", "Excel" desa → export_report tool chaqir
- Agar "profil", "ma'lumot haqida" desa → profile_data tool chaqir
- Agar "bosh sahifa", "dashboard'ga o't" desa → navigate_to tool chaqir
- Agar "solishtir", "taqqosla" desa → compare_datasets tool chaqir

TOOL CHAQIRGANDA:
1. Bir jumlada nima qilishingni tasdiqlaydi
2. Tool'ni chaqir
3. Natijani ovozli xabar qilib ayt

OVOZ USLUBI — JUDA MUHIM:
- Xuddi odam gaplashgandek, tabiiy va ravon gapir
- Har bir javob 2-4 jumladan iborat bo'lsin, QISQA va ANIQ
- Oddiy so'zlashuv uslubi — rasmiy emas, do'stona ohangda
- Raqamlarni to'liq ayt: "357 ming" emas "uch yuz ellik yetti ming"
- Pauza o'rniga vergul va nuqta ishlatma — ravon oqib ketsin
- ASLO "menimcha", "bilmayman" dema — ishonchli gapir
- Emoji yo'q, maxsus belgi yo'q — faqat oddiy matn
- 10 soniyalik javob ideal — 15 soniyadan oshmasin
- Har javobni bir nafasda aytsa bo'ladigan qilib yoz

JAVOB FORMATI:
Bitta aniq xulosa jumlasi + bitta raqamli fakt + kerak bo'lsa qisqa tavsiya. Hammasi.

WAKE WORD JAVOB:
Agar foydalanuvchi "AIDA" yoki "Hey AIDA" desa:
"Ha, men shu yerdaman. Tinglayapman."

${datasetContext ? `\nMAVJUD DATASET KONTEKSTI:\n${datasetContext}` : '\nHozirda dataset yuklanmagan. Foydalanuvchiga dataset yuklashni tavsiya qil.'}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []),
      { role: 'user', content: question },
    ];

    // Streaming mode
    if (stream) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages,
          tools,
          tool_choice: 'auto',
          stream: true,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('AI gateway stream error:', response.status, text);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Tizim band. Iltimos, keyinroq urinib ko'ring." }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      // Forward the SSE stream directly
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming mode (fallback)
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        tools,
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Tizim band. Iltimos, keyinroq urinib ko'ring." }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Kredit tugagan. Iltimos, hisobni to'ldiring." }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      console.error('AI gateway error:', response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCalls = choice.message.tool_calls.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}'),
      }));
      
      return new Response(JSON.stringify({ 
        answer: choice.message.content || '',
        toolCalls,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const answer = choice?.message?.content || 'Javob olinmadi.';

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('aida-voice-agent error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
