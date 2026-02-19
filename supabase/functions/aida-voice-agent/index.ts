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
      description: "Build a full interactive dashboard with multiple charts (bar, line, pie, area, scatter, heatmap) directly in the chat. Use when user asks for charts, dashboard, visualization, or graphs.",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["auto", "executive", "sales", "finance", "marketing", "hr", "education", "quality", "3d"],
            description: "Dashboard template mode. 'auto' picks the best template based on data."
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
      description: "Generate deep analytical insights with specific numbers, trends, anomalies, KPIs, and visual charts from the dataset.",
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
      description: "Profile the current dataset: show row/column counts, data types, missing values, quality score, statistics, and visual charts.",
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
      description: "Compare segments or categories within the current dataset with visual charts.",
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

    const systemPrompt = `Sen AIDA — eng yuqori darajadagi AI Data Analyst. Sen haqiqiy inson kabi fikrlaysan, chuqur tahlil qilasan va ANIQ raqamlar bilan javob berasan.

SENING KUCHLARING:
1. Ma'lumotlarni 100% aniqlikda tahlil qilish
2. Har bir raqamni izohlab berish — nima uchun bunday, nima sababi, qanday ta'sir qiladi
3. Vizual dashboard yaratish — bir necha xil diagramma (bar, line, pie, area, scatter)
4. Ma'lumotni tozalash va sifatini baholash
5. Strategik tavsiyalar — CEO darajasida

MUHIM QOIDALAR:
- DOIMO raqamlar bilan gapir. "Ko'p" dema, "1,247 ta" de.
- Har bir javobda MUAYYAN RAQAMLARNI keltir.
- Agar foydalanuvchi "dashboard", "grafik", "vizual", "diagramma", "ko'rsat" desa → build_dashboard tool chaqir
- Agar "tozala", "clean" desa → clean_data tool chaqir  
- Agar "tahlil", "analiz", "insight" desa → generate_insights tool chaqir
- Agar "profil", "ma'lumot haqida" desa → profile_data tool chaqir
- Agar "solishtir", "taqqosla" desa → compare_datasets tool chaqir

TOOL CHAQIRGANDAN KEYIN:
1. Nima qilganingni OVOZDA gapirib tushuntir
2. Asosiy topilmalarni 3-5 ta nuqtada ayt
3. Keyingi qadam tavsiya qil

JAVOB USLUBI:
- Professional, ishonchli, ANIQ
- Har doim raqamlar bilan
- Qisqa va mazmunli
- O'zbek tilida javob ber
- "Menimcha" dema — sen BILASAN
- Emoji ishlatma (faqat tool natijalarida)

JAVOB TUZILMASI:
1. XULOSA: 1-2 jumlada asosiy topilma
2. RAQAMLAR: Asosiy ko'rsatkichlar (min 3 ta)
3. TAHLIL: Nima uchun bunday? Sabab va ta'sir
4. TAVSIYA: Nima qilish kerak? Aniq qadam
5. "Chuqurroq tahlil yoki dashboard yaratishni xohlaysizmi?"

WAKE WORD:
"AIDA" yoki "Hey AIDA" eshitganda: "Ha, men shu yerdaman. Buyuring."

${datasetContext ? `\nMAVJUD DATASET:\n${datasetContext}` : '\nDataset yuklanmagan. Foydalanuvchiga "Chap tomonda dataset yuklash tugmasini bosing" deb ayt.'}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []),
      { role: 'user', content: question },
    ];

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
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Kredit tugagan. Iltimos, hisobni to'ldiring." }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Non-streaming fallback
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
