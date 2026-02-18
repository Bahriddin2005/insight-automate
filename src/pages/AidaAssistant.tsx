import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, ArrowLeft, Brain, Activity, AlertCircle, Loader2, Upload, MessageSquare, Plus, Trash2, FileSpreadsheet, Send, Download } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeWordDetectedRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [textInput, setTextInput] = useState('');
  const textInputRef = useRef<HTMLTextAreaElement>(null);

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
          setState('listening');
          accumulatedTranscriptRef.current = '';
          speakResponse('Ha, tinglayapman.');
          setTranscript('');
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
      if (event.error !== 'no-speech') console.error('Speech error:', event.error);
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        try { recognition.start(); } catch {}
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
      }, 30000);
      return () => clearTimeout(autoSleep);
    }
  }, [state]);

  const addSystemMessage = (content: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content, timestamp: new Date() }]);
  };

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

      const { data, error: fnError } = await supabase.functions.invoke('aida-voice-agent', {
        body: { question, datasetContext, conversationHistory: history },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const answer = data?.answer || 'Javob olinmadi.';
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: answer, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);
      await saveMessage(convId, 'assistant', answer);

      // Update conversation title from first question
      if (messages.filter(m => m.role === 'user').length === 0) {
        const title = question.slice(0, 60);
        await supabase.from('aida_conversations').update({ title }).eq('id', convId);
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, title } : c));
      }

      if (!isMuted) await speakResponse(answer);
      setState('sleeping');
      addSystemMessage('Qayta chaqirish uchun "AIDA" deng.');
    } catch (e) {
      console.error('AIDA error:', e);
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
          body: JSON.stringify({ text: cleanText }),
        }
      );
      if (!response.ok) throw new Error('TTS xatolik');
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
      console.error('TTS error:', e);
    }
  };

  const handleManualActivate = () => {
    if (state === 'sleeping') {
      wakeWordDetectedRef.current = true;
      setState('listening');
      accumulatedTranscriptRef.current = '';
      speakResponse('Ha, tinglayapman.');
    } else if (state === 'speaking' && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setState('listening');
      wakeWordDetectedRef.current = true;
      accumulatedTranscriptRef.current = '';
    }
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
                      ? 'bg-muted text-muted-foreground text-xs italic'
                      : 'bg-card border border-border text-card-foreground'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
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
            <div className="flex gap-2 w-full max-w-md">
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
                  } else if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
                    // Allow newline
                  }
                }}
                placeholder="Savolingizni yozing... (Enter — yuborish, Ctrl+Enter — yangi qator)"
                className="flex-1 bg-secondary border border-border text-sm rounded-md px-3 py-2 resize-none min-h-[40px] max-h-[120px] focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
                rows={1}
                disabled={state === 'thinking'}
              />
              <Button
                type="button"
                size="icon"
                disabled={state === 'thinking' || !textInput.trim()}
                className="h-10 w-10 shrink-0 self-end"
                onClick={() => {
                  if (!textInput.trim() || state === 'thinking') return;
                  processQuestion(textInput.trim());
                  setTextInput('');
                }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
