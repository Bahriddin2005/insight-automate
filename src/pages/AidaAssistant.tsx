import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, ArrowLeft, Brain, Activity, AlertCircle, Loader2, Upload, MessageSquare, Plus, Trash2, FileSpreadsheet, Send, Download, Sparkles, Wrench, CheckCircle2, User, Play, Square } from 'lucide-react';
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/authContext';
import { parseFile, analyzeDataset } from '@/lib/dataProcessor';
import ReactMarkdown from 'react-markdown';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
};

type AidaState = 'sleeping' | 'listening' | 'thinking' | 'speaking';

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

// Waveform visualizer component
function WaveformVisualizer({ state, audioRef }: { state: AidaState; audioRef: React.RefObject<HTMLAudioElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 200;
    const H = 200;
    canvas.width = W;
    canvas.height = H;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const audioCtx = audioCtxRef.current;

    if (!analyserRef.current) {
      analyserRef.current = audioCtx.createAnalyser();
      analyserRef.current.fftSize = 256;
    }
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Connect mic for listening state
    if (state === 'listening') {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        micStreamRef.current = stream;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        micSourceRef.current = audioCtx.createMediaStreamSource(stream);
        micSourceRef.current.connect(analyser);
      }).catch(() => {});
    } else {
      // Disconnect mic
      if (micSourceRef.current) { try { micSourceRef.current.disconnect(); } catch {} micSourceRef.current = null; }
      if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
    }

    // Connect audio element for speaking state
    if (state === 'speaking' && audioRef.current && !sourceRef.current) {
      try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        sourceRef.current = audioCtx.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyser);
        analyser.connect(audioCtx.destination);
      } catch { /* already connected */ }
    }

    const colors: Record<AidaState, string> = {
      sleeping: 'hsla(240,5%,65%,0.3)',
      listening: 'hsla(142,71%,45%,0.8)',
      thinking: 'hsla(38,92%,50%,0.8)',
      speaking: 'hsla(250,91%,66%,0.8)',
    };

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const baseRadius = 40;
      const bars = 48;

      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2;
        const dataIdx = Math.floor((i / bars) * bufferLength);
        const val = dataArray[dataIdx] / 255;
        const barHeight = val * 30 + 2;

        const x1 = cx + Math.cos(angle) * baseRadius;
        const y1 = cy + Math.sin(angle) * baseRadius;
        const x2 = cx + Math.cos(angle) * (baseRadius + barHeight);
        const y2 = cy + Math.sin(angle) * (baseRadius + barHeight);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = colors[state];
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try { audioCtxRef.current.close(); } catch {}
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ width: 200, height: 200 }}
    />
  );
}

export default function AidaAssistant() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<AidaState>('sleeping');
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState('');
  const [datasetContext, setDatasetContext] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeWordDetectedRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [textInput, setTextInput] = useState('');
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  // Voice selection
  const [selectedVoice, setSelectedVoice] = useState('daniel');
  const [voiceSpeed, setVoiceSpeed] = useState(1.15);
  const voiceOptions = [
    { id: 'daniel', name: 'Daniel', label: '🎙️ Daniel (Erkak)', voiceId: 'onwK4e9ZLuTAKqWW03F9' },
    { id: 'laura', name: 'Laura', label: '🎙️ Laura (Ayol)', voiceId: 'FGY2WhTYpPnrIDTdsKH5' },
    { id: 'alice', name: 'Alice', label: '🎙️ Alice (Ayol)', voiceId: 'Xb7hH8MSUJpSbSDYk0k2' },
    { id: 'matilda', name: 'Matilda', label: '🎙️ Matilda (Ayol)', voiceId: 'XrExE9yKIg1WjnnlVkGX' },
    { id: 'santa', name: 'Santa', label: '🎅 Santa', voiceId: 'MDLAMJ0jxkpYkjXbmG4t' },
    { id: 'sarah', name: 'Sarah', label: '🎙️ Sarah (Ayol)', voiceId: 'EXAVITQu4vr4xnSDxMaL' },
  ];
  const currentVoice = voiceOptions.find(v => v.id === selectedVoice) || voiceOptions[0];

  // Auto-focus text input on mount
  useEffect(() => {
    setTimeout(() => textInputRef.current?.focus(), 500);
  }, []);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('aida_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50);
    if (data) setConversations(data as Conversation[]);
  };

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConversationId || !user) return;
    loadMessages(activeConversationId);
  }, [activeConversationId]);

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from('aida_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at),
      })));
    }
  };

  const createConversation = async (): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('aida_conversations')
      .insert({ user_id: user.id, title: 'Yangi suhbat', dataset_context: datasetContext || null })
      .select()
      .single();
    if (error || !data) return null;
    const conv = data as Conversation;
    setConversations(prev => [conv, ...prev]);
    setActiveConversationId(conv.id);
    setMessages([]);
    return conv.id;
  };

  const saveMessage = async (convId: string, role: string, content: string) => {
    if (!user) return;
    await supabase.from('aida_messages').insert({
      conversation_id: convId,
      user_id: user.id,
      role,
      content,
    });
  };

  const deleteConversation = async (convId: string) => {
    await supabase.from('aida_conversations').delete().eq('id', convId);
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (activeConversationId === convId) {
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  // Load dataset context from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('aida_dataset_context');
    if (stored) setDatasetContext(stored);
    const analysis = sessionStorage.getItem('analysis');
    if (analysis) {
      try {
        const parsed = JSON.parse(analysis);
        const ctx = `Dataset: ${parsed.fileName || 'Unknown'}\nRows: ${parsed.rowCount || 0}\nColumns: ${parsed.columns?.join(', ') || 'N/A'}\nSummary: ${JSON.stringify(parsed.summary || {}).slice(0, 2000)}`;
        setDatasetContext(ctx);
      } catch {}
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError('');
    try {
      const rawData = await parseFile(file, 0);
      const result = analyzeDataset(rawData);
      const ctx = `Dataset: ${file.name}\nRows: ${result.rows}\nColumns: ${result.columns}\nColumn info: ${JSON.stringify(result.columnInfo).slice(0, 3000)}\nQuality Score: ${result.qualityScore}%\nMissing: ${result.missingPercent}%\nDuplicates removed: ${result.duplicatesRemoved}\nSample data: ${JSON.stringify(result.cleanedData.slice(0, 5)).slice(0, 2000)}`;
      setDatasetContext(ctx);
      setDatasetName(file.name);
      sessionStorage.setItem('aida_dataset_context', ctx);
      addSystemMessage(`✓ Dataset yuklandi: ${file.name} (${result.rows} qator, ${result.columns} ustun, sifat: ${result.qualityScore}%)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Faylni qayta ishlashda xatolik.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Speech recognition
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Brauzeringiz ovozni taniy olmaydi. Chrome yoki Edge brauzeridan foydalaning.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'uz-UZ';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t;
        else interimTranscript += t;
      }
      const combined = (finalTranscript + interimTranscript).toLowerCase().trim();
      setTranscript(finalTranscript + interimTranscript);

      if (!wakeWordDetectedRef.current) {
        if (combined.includes('aida') || combined.includes('ayda') || combined.includes('hey aida')) {
          wakeWordDetectedRef.current = true;
          accumulatedTranscriptRef.current = '';
          setTranscript('');
          // Greet and then switch to listening
          speakGreeting('Salom, men shu yerdaman. Nima qilamiz?');
        }
      } else if (finalTranscript.trim()) {
        accumulatedTranscriptRef.current += ' ' + finalTranscript.trim();
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const question = accumulatedTranscriptRef.current.trim();
          if (question) processQuestion(question);
        }, 2000);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      console.error('Speech error:', event.error);
      if (event.error === 'network' || event.error === 'audio-capture' || event.error === 'not-allowed') {
        // Retry after a short delay for recoverable errors
        setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch {}
            try { recognitionRef.current.start(); } catch {}
          }
        }, 1500);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        setTimeout(() => {
          if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch {}
          }
        }, 300);
      }
    };

    try {
      recognition.start();
      setState('sleeping');
      addSystemMessage('AIDA tayyor. "AIDA" yoki "Hey AIDA" deb chaqiring.');
    } catch {
      setError('Mikrofonni yoqib bo\'lmadi.');
    }
  }, []);

  useEffect(() => {
    startListening();
    return () => {
      if (recognitionRef.current) { recognitionRef.current.abort(); recognitionRef.current = null; }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (state === 'listening') {
      const autoSleep = setTimeout(() => {
        setState('sleeping');
        wakeWordDetectedRef.current = false;
        accumulatedTranscriptRef.current = '';
        addSystemMessage('AIDA uxlash rejimiga o\'tdi. Qayta chaqirish uchun "AIDA" deng.');
      }, 60000);
      return () => clearTimeout(autoSleep);
    }
  }, [state]);

  const addSystemMessage = (content: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content, timestamp: new Date() }]);
  };

  const exportConversation = (format: 'txt' | 'pdf') => {
    const chatMessages = messages.filter(m => m.role !== 'system');
    if (chatMessages.length === 0) return;
    const title = conversations.find(c => c.id === activeConversationId)?.title || 'AIDA Suhbat';
    const date = new Date().toLocaleDateString('uz-UZ');
    if (format === 'txt') {
      let content = `AIDA Suhbat — ${title}\nSana: ${date}\n${'='.repeat(50)}\n\n`;
      chatMessages.forEach(m => {
        const role = m.role === 'user' ? 'Siz' : 'AIDA';
        const time = m.timestamp.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
        content += `[${time}] ${role}:\n${m.content}\n\n`;
      });
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aida-suhbat-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>AIDA Suhbat</title>
<style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#1a1a1a}
h1{font-size:20px;border-bottom:2px solid #0ea5e9;padding-bottom:8px}
.meta{color:#666;font-size:13px;margin-bottom:24px}
.msg{margin-bottom:16px;padding:12px 16px;border-radius:12px}
.user{background:#0ea5e9;color:white;margin-left:20%}
.assistant{background:#f1f5f9;margin-right:20%}
.role{font-weight:600;font-size:12px;margin-bottom:4px;opacity:0.7}
.time{font-size:11px;opacity:0.5;margin-top:6px}</style></head><body>
<h1>AIDA — AI Data Analyst</h1>
<div class="meta">${title} • ${date}</div>
${chatMessages.map(m => {
        const role = m.role === 'user' ? 'Siz' : 'AIDA';
        const time = m.timestamp.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
        return `<div class="msg ${m.role}"><div class="role">${role}</div>${m.content.replace(/\n/g, '<br>')}<div class="time">${time}</div></div>`;
      }).join('')}</body></html>`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
    }
  };

  const executeToolCall = useCallback((toolCall: { name: string; arguments: Record<string, any> }) => {
    const { name, arguments: args } = toolCall;
    
    switch (name) {
      case 'clean_data': {
        const strategy = args.strategy || 'auto';
        addSystemMessage(`🔧 Tool: clean_data (${strategy}) — Dataset tozalanmoqda...`);
        // Trigger data cleaning from sessionStorage
        const stored = sessionStorage.getItem('analysis');
        if (stored) {
          toast.success('Dataset muvaffaqiyatli tozalandi', { description: `Strategiya: ${strategy}` });
          addSystemMessage(`✓ Dataset tozalandi (${strategy} rejim)`);
        } else {
          addSystemMessage('⚠ Dataset yuklanmagan. Avval dataset yuklang.');
        }
        return `Dataset ${strategy} rejimda tozalandi.`;
      }
      case 'build_dashboard': {
        const mode = args.mode || 'auto';
        addSystemMessage(`🔧 Tool: build_dashboard (${mode}) — Dashboard qurilmoqda...`);
        // Navigate to dashboard with template
        sessionStorage.setItem('aida_dashboard_mode', mode);
        toast.success(`Dashboard qurilmoqda`, { description: `Rejim: ${mode}` });
        setTimeout(() => navigate('/'), 1500);
        return `${mode} rejimda dashboard qurildi. Bosh sahifaga yo'naltirilmoqda.`;
      }
      case 'generate_insights': {
        const focus = args.focus || 'overview';
        addSystemMessage(`🔧 Tool: generate_insights (${focus}) — Tahlil qilinmoqda...`);
        toast.info('Chuqur tahlil yaratilmoqda...', { description: `Fokus: ${focus}` });
        return `${focus} bo'yicha tahlil yaratildi.`;
      }
      case 'export_report': {
        const format = args.format || 'pdf';
        addSystemMessage(`🔧 Tool: export_report (${format}) — Eksport qilinmoqda...`);
        if (format === 'txt' || format === 'pdf') {
          exportConversation(format as 'txt' | 'pdf');
          toast.success(`${format.toUpperCase()} formatda eksport qilindi`);
        } else {
          toast.info(`${format.toUpperCase()} eksport hozircha faqat dashboard sahifasida mavjud`);
        }
        return `Hisobot ${format} formatda eksport qilindi.`;
      }
      case 'profile_data': {
        addSystemMessage('🔧 Tool: profile_data — Ma\'lumotlar profili yaratilmoqda...');
        const stored = sessionStorage.getItem('analysis');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const profile = `📊 Dataset profili:\n• Qatorlar: ${parsed.rowCount || '?'}\n• Ustunlar: ${parsed.columns?.length || '?'}\n• Sifat balli: ${parsed.qualityScore || '?'}%\n• Yetishmayotgan: ${parsed.missingPercent || '?'}%`;
            addSystemMessage(profile);
            return profile;
          } catch { /* ignore */ }
        }
        addSystemMessage('⚠ Dataset yuklanmagan.');
        return 'Dataset yuklanmagan.';
      }
      case 'navigate_to': {
        const dest = args.destination || 'home';
        const routes: Record<string, string> = {
          dashboard: '/',
          home: '/',
          upload: '/',
          my_dashboards: '/my-dashboards',
          settings: '/',
        };
        addSystemMessage(`🔧 Tool: navigate_to (${dest})`);
        toast.info(`${dest} sahifasiga yo'naltirilmoqda...`);
        setTimeout(() => navigate(routes[dest] || '/'), 1000);
        return `${dest} sahifasiga yo'naltirildi.`;
      }
      case 'compare_datasets': {
        const dim = args.dimension || 'unknown';
        addSystemMessage(`🔧 Tool: compare_datasets (${dim}) — Solishtirish...`);
        toast.info('Ma\'lumotlar solishtirilmoqda...');
        return `${dim} bo'yicha solishtirish amalga oshirildi.`;
      }
      default:
        addSystemMessage(`⚠ Noma'lum tool: ${name}`);
        return `Tool ${name} topilmadi.`;
    }
  }, [navigate, exportConversation]);

  const processQuestion = async (question: string) => {
    setState('thinking');
    wakeWordDetectedRef.current = false;
    accumulatedTranscriptRef.current = '';
    setTranscript('');

    // Ensure conversation exists
    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation();
      if (!convId) { setError('Suhbat yaratib bo\'lmadi.'); setState('sleeping'); return; }
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: question, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    await saveMessage(convId, 'user', question);

    try {
      const history = messages.filter(m => m.role !== 'system').slice(-10).map(m => ({ role: m.role, content: m.content }));

      // Try streaming first
      const streamingMsgId = (Date.now() + 1).toString();
      let streamedContent = '';
      let toolCalls: any[] = [];
      let toolCallChunks: Record<number, { name: string; arguments: string }> = {};

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aida-voice-agent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ question, datasetContext, conversationHistory: history, stream: true }),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Xatolik: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('text/event-stream') && response.body) {
        // Add placeholder message for streaming
        setStreamingMsgId(streamingMsgId);
        const placeholderMsg: Message = { id: streamingMsgId, role: 'assistant', content: '', timestamp: new Date() };
        setMessages(prev => [...prev, placeholderMsg]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              if (!delta) continue;

              // Handle text content
              if (delta.content) {
                streamedContent += delta.content;
                setMessages(prev => prev.map(m => 
                  m.id === streamingMsgId ? { ...m, content: streamedContent } : m
                ));
              }

              // Handle tool calls
              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  if (!toolCallChunks[idx]) {
                    toolCallChunks[idx] = { name: '', arguments: '' };
                  }
                  if (tc.function?.name) toolCallChunks[idx].name = tc.function.name;
                  if (tc.function?.arguments) toolCallChunks[idx].arguments += tc.function.arguments;
                }
              }
            } catch {
              // skip unparseable chunks
            }
          }
        }

        // Process tool calls from stream
        toolCalls = Object.values(toolCallChunks)
          .filter(tc => tc.name)
          .map(tc => ({
            name: tc.name,
            arguments: (() => { try { return JSON.parse(tc.arguments || '{}'); } catch { return {}; } })(),
          }));

      } else {
        // Non-streaming JSON response
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        streamedContent = data.answer || '';
        toolCalls = data.toolCalls || [];
        
        const assistantMsg: Message = { id: streamingMsgId, role: 'assistant', content: streamedContent, timestamp: new Date() };
        setMessages(prev => [...prev, assistantMsg]);
      }

      // Execute tool calls
      if (toolCalls.length > 0) {
        const toolResults: string[] = [];
        for (const tc of toolCalls) {
          const result = executeToolCall(tc);
          toolResults.push(result);
        }
        const toolSummary = toolResults.join('\n');
        const fullAnswer = streamedContent
          ? `${streamedContent}\n\n${toolSummary}`
          : `Buyruq bajarildi.\n\n${toolSummary}`;
        
        setMessages(prev => prev.map(m => 
          m.id === streamingMsgId ? { ...m, content: fullAnswer } : m
        ));
        streamedContent = fullAnswer;
      }

      if (!streamedContent) streamedContent = 'Javob olinmadi.';

      setStreamingMsgId(null);
      await saveMessage(convId, 'assistant', streamedContent);
      if (!isMuted) await speakResponse(streamedContent);

      // Update conversation title from first question
      if (messages.filter(m => m.role === 'user').length === 0) {
        const title = question.slice(0, 60);
        await supabase.from('aida_conversations').update({ title }).eq('id', convId);
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, title } : c));
      }

      setState('listening');
      wakeWordDetectedRef.current = true;
      accumulatedTranscriptRef.current = '';
      addSystemMessage('Yana savol berishingiz mumkin yoki "AIDA" deb qayta chaqiring.');
    } catch (e) {
      console.error('AIDA error:', e);
      setStreamingMsgId(null);
      setError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
      setState('sleeping');
    }
  };

  const speakResponse = async (text: string) => {
    if (isMuted) return;
    setState('speaking');
    try {
      const cleanText = text.replace(/[#*_`~\[\]()>|]/g, '').replace(/\n+/g, '. ').slice(0, 2000);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aida-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: cleanText, voiceId: currentVoice.voiceId, speed: voiceSpeed }),
        }
      );
      if (!response.ok) throw new Error('TTS xatolik');
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        // Server returned JSON = fallback signal
        const data = await response.json();
        if (data.fallback) throw new Error(data.reason || 'ElevenLabs fallback');
      }
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
      URL.revokeObjectURL(audioUrl);
    } catch (e) {
      console.error('TTS error, falling back to speechSynthesis:', e);
      // Fallback to browser speechSynthesis
      try {
        const cleanText = text.replace(/[#*_`~\[\]()>|]/g, '').replace(/\n+/g, '. ').slice(0, 2000);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'uz-UZ';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        await new Promise<void>((resolve) => {
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
      } catch (fallbackErr) {
        console.error('speechSynthesis fallback also failed:', fallbackErr);
      }
    }
  };

  // Speak greeting then switch to listening mode
  const speakGreeting = async (text: string) => {
    setState('speaking');
    try {
      const cleanText = text.replace(/[#*_`~\[\]()>|]/g, '').slice(0, 500);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aida-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: cleanText, voiceId: currentVoice.voiceId, speed: voiceSpeed }),
        }
      );
      if (!response.ok) throw new Error('TTS error');
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await response.json();
        if (data.fallback) throw new Error('fallback');
      }
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
      URL.revokeObjectURL(audioUrl);
    } catch {
      // Fallback to browser TTS
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'uz-UZ';
        utterance.rate = 1.0;
        await new Promise<void>((resolve) => {
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
      } catch {}
    }
    // After greeting, switch to listening
    setState('listening');
    wakeWordDetectedRef.current = true;
    accumulatedTranscriptRef.current = '';
  };

  const handleManualActivate = () => {
    if (state === 'sleeping') {
      wakeWordDetectedRef.current = true;
      accumulatedTranscriptRef.current = '';
      speakGreeting('Salom, men shu yerdaman. Nima qilamiz?');
    } else if (state === 'speaking' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setState('listening');
      wakeWordDetectedRef.current = true;
      accumulatedTranscriptRef.current = '';
    }
  };

  

  const stateConfig = {
    sleeping: { color: 'bg-muted', pulse: false, icon: MicOff, label: 'Uxlash rejimi' },
    listening: { color: 'bg-emerald-500', pulse: true, icon: Mic, label: 'Tinglayapman...' },
    thinking: { color: 'bg-amber-500', pulse: true, icon: Brain, label: 'Tahlil qilyapman...' },
    speaking: { color: 'bg-primary', pulse: true, icon: Volume2, label: 'Gapirmoqda...' },
  };

  const currentState = stateConfig[state];
  const StateIcon = currentState.icon;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - conversation history */}
      {showSidebar && (
        <aside className="w-72 border-r border-border flex flex-col bg-card">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Suhbatlar</h2>
            <Button variant="ghost" size="icon" onClick={() => { setActiveConversationId(null); setMessages([]); }}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  activeConversationId === conv.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                }`}
                onClick={() => setActiveConversationId(conv.id)}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate flex-1">{conv.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">Hali suhbat yo'q</p>
            )}
          </div>
          {/* Dataset upload in sidebar */}
          <div className="p-3 border-t border-border">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {isUploading ? 'Yuklanmoqda...' : 'Dataset yuklash'}
            </Button>
            {datasetName && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-500">
                <FileSpreadsheet className="w-3 h-3" />
                <span className="truncate">{datasetName}</span>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)}>
              <MessageSquare className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">AIDA</h1>
              <p className="text-xs text-muted-foreground">AI Data Analyst • Senior BI Strategist</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
              <Activity className="w-3 h-3" />
              {currentState.label}
            </div>
            {messages.filter(m => m.role !== 'system').length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Download className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportConversation('txt')}>
                    Matn fayl (.txt)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportConversation('pdf')}>
                    PDF fayl (.pdf)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border">
                  <Volume2 className="w-3.5 h-3.5" />
                  {currentVoice.name} • {voiceSpeed.toFixed(1)}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 bg-popover border-border z-50 p-3">
                <p className="text-xs font-semibold text-foreground mb-2">Ovoz tanlang</p>
                <div className="space-y-1 mb-3">
                  {voiceOptions.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id)}
                      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                        selectedVoice === v.id
                          ? 'bg-primary/10 text-primary border border-primary/30'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <span>{v.label}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Preview voice
                          const previewAudio = document.getElementById('voice-preview-audio') as HTMLAudioElement;
                          if (previewAudio && !previewAudio.paused) {
                            previewAudio.pause();
                            previewAudio.currentTime = 0;
                            return;
                          }
                          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aida-tts`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                            },
                            body: JSON.stringify({ text: 'Salom, men AIDA sun\'iy intellekt yordamchisiman.', voiceId: v.voiceId, speed: voiceSpeed }),
                          }).then(r => r.blob()).then(blob => {
                            const url = URL.createObjectURL(blob);
                            let audio = document.getElementById('voice-preview-audio') as HTMLAudioElement;
                            if (!audio) {
                              audio = document.createElement('audio');
                              audio.id = 'voice-preview-audio';
                              document.body.appendChild(audio);
                            }
                            audio.src = url;
                            audio.play();
                          }).catch(() => toast.error('Preview xatolik'));
                        }}
                        className="p-1 rounded-md hover:bg-background transition-colors"
                        title="Ovozni tinglash"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </button>
                  ))}
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-foreground mb-1.5">Tezlik: {voiceSpeed.toFixed(2)}x</p>
                  <input
                    type="range"
                    min="0.8"
                    max="1.2"
                    step="0.05"
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                    className="w-full h-1.5 accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                    <span>0.8x</span>
                    <span>1.0x</span>
                    <span>1.2x</span>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="text-muted-foreground">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : msg.role === 'system'
                      ? msg.content.startsWith('🔧') 
                        ? 'bg-accent/10 text-accent text-xs border border-accent/20 flex items-start gap-2'
                        : 'bg-muted text-muted-foreground text-xs italic'
                      : 'bg-card border border-border text-card-foreground'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                        {streamingMsgId === msg.id && (
                          <span className="inline-block w-2 h-4 bg-primary/80 ml-0.5 animate-pulse rounded-sm" />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                    <span className="text-[10px] opacity-50 mt-1 block">
                      {msg.timestamp.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {transcript && state === 'listening' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-primary/20 text-primary border border-primary/30">
                  <p className="text-sm italic">{transcript}</p>
                </div>
              </motion.div>
            )}

            {state === 'thinking' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 bg-card border border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Tahlil qilinmoqda...
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mb-2 flex items-center gap-2 text-destructive text-sm bg-destructive/10 px-4 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
              <button onClick={() => setError('')} className="ml-auto text-xs underline">Yopish</button>
            </div>
          )}

          {/* Voice Control with Waveform */}
          <div className="border-t border-border p-6 flex flex-col items-center gap-4">
            <motion.button
              onClick={handleManualActivate}
              className="relative w-[200px] h-[200px] flex items-center justify-center"
              whileTap={{ scale: 0.95 }}
            >
              {/* Background orb */}
              <div className={`absolute w-24 h-24 rounded-full ${currentState.color} transition-colors`} />
              {currentState.pulse && (
                <>
                  <motion.div
                    className={`absolute w-24 h-24 rounded-full ${currentState.color} opacity-30`}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <motion.div
                    className={`absolute w-24 h-24 rounded-full ${currentState.color} opacity-20`}
                    animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  />
                </>
              )}
              {/* Waveform overlay */}
              <WaveformVisualizer state={state} audioRef={audioRef} />
              <StateIcon className="w-10 h-10 text-white relative z-10" />
            </motion.button>

            <p className="text-sm text-muted-foreground text-center">
              {state === 'sleeping' && '"AIDA" deb chaqiring yoki tugmani bosing'}
              {state === 'listening' && 'Savolingizni ayting...'}
              {state === 'thinking' && 'AIDA tahlil qilmoqda...'}
              {state === 'speaking' && 'AIDA javob bermoqda. To\'xtatish uchun bosing.'}
            </p>

            <div className={`text-xs px-3 py-1 rounded-full ${
              datasetContext ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
            }`}>
              {datasetContext ? `✓ ${datasetName || 'Dataset ulangan'}` : '○ Dataset yuklanmagan'}
            </div>

            {/* Text input */}
            <div className="relative w-full max-w-lg group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/40 via-accent/30 to-primary/40 rounded-2xl opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300" />
              <div className="relative flex items-end gap-2 bg-card border border-border rounded-2xl p-2 shadow-lg group-focus-within:border-primary/50 transition-colors">
                <Sparkles className="w-4 h-4 text-muted-foreground/50 ml-2 mb-2.5 shrink-0" />
                <textarea
                  ref={textInputRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                      e.preventDefault();
                      if (!textInput.trim() || state === 'thinking') return;
                      processQuestion(textInput.trim());
                      setTextInput('');
                    }
                  }}
                  placeholder="Savolingizni yozing..."
                  className="flex-1 bg-transparent text-sm resize-none min-h-[36px] max-h-[120px] py-2 focus:outline-none text-foreground placeholder:text-muted-foreground/60 leading-snug"
                  rows={1}
                  disabled={state === 'thinking'}
                />
                <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
                  <Button
                    type="button"
                    size="icon"
                    disabled={state === 'thinking' || !textInput.trim()}
                    className="h-9 w-9 shrink-0 rounded-xl gradient-primary text-white shadow-md hover:shadow-lg transition-shadow disabled:opacity-30 disabled:shadow-none"
                    onClick={() => {
                      if (!textInput.trim() || state === 'thinking') return;
                      processQuestion(textInput.trim());
                      setTextInput('');
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </motion.div>
              </div>
              <p className="text-[10px] text-muted-foreground/40 text-center mt-1.5">Enter — yuborish • Ctrl+Enter — yangi qator</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
