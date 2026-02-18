import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, ArrowLeft, Brain, Activity, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
};

type AidaState = 'sleeping' | 'listening' | 'thinking' | 'speaking';

export default function AidaAssistant() {
  const navigate = useNavigate();
  const [state, setState] = useState<AidaState>('sleeping');
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState('');
  const [datasetContext, setDatasetContext] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeWordDetectedRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');

  // Load dataset context from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('aida_dataset_context');
    if (stored) setDatasetContext(stored);
    
    // Also check for analysis data
    const analysis = sessionStorage.getItem('analysis');
    if (analysis) {
      try {
        const parsed = JSON.parse(analysis);
        const ctx = `Dataset: ${parsed.fileName || 'Unknown'}\nRows: ${parsed.rowCount || 0}\nColumns: ${parsed.columns?.join(', ') || 'N/A'}\nSummary: ${JSON.stringify(parsed.summary || {}).slice(0, 2000)}`;
        setDatasetContext(ctx);
      } catch { /* ignore */ }
    }
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Web Speech API for wake word + question listening
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
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interimTranscript += t;
        }
      }

      const combined = (finalTranscript + interimTranscript).toLowerCase().trim();
      setTranscript(finalTranscript + interimTranscript);

      // Wake word detection
      if (!wakeWordDetectedRef.current) {
        if (combined.includes('aida') || combined.includes('ayda') || combined.includes('hey aida')) {
          wakeWordDetectedRef.current = true;
          setState('listening');
          accumulatedTranscriptRef.current = '';
          speakResponse('Ha, tinglayapman.');
          // Reset transcript after wake word
          setTranscript('');
        }
      } else if (state === 'listening' && finalTranscript.trim()) {
        // Accumulate the question
        accumulatedTranscriptRef.current += ' ' + finalTranscript.trim();

        // Reset silence timer
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const question = accumulatedTranscriptRef.current.trim();
          if (question) {
            processQuestion(question);
          }
        }, 2000); // 2 second silence = question complete
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error);
      }
    };

    recognition.onend = () => {
      // Restart if still in listening mode
      if (state !== 'sleeping' && recognitionRef.current) {
        try { recognition.start(); } catch { /* already started */ }
      }
    };

    try {
      recognition.start();
      setState('sleeping');
      addSystemMessage('AIDA tayyor. "AIDA" yoki "Hey AIDA" deb chaqiring.');
    } catch (e) {
      setError('Mikrofonni yoqib bo\'lmadi.');
    }
  }, [state]);

  // Start on mount
  useEffect(() => {
    startListening();
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Auto-sleep after 30s of silence
  useEffect(() => {
    if (state === 'listening') {
      const autoSleep = setTimeout(() => {
        if (state === 'listening') {
          setState('sleeping');
          wakeWordDetectedRef.current = false;
          accumulatedTranscriptRef.current = '';
          addSystemMessage('AIDA uxlash rejimiga o\'tdi. Qayta chaqirish uchun "AIDA" deng.');
        }
      }, 30000);
      return () => clearTimeout(autoSleep);
    }
  }, [state]);

  const addSystemMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'system',
      content,
      timestamp: new Date(),
    }]);
  };

  const processQuestion = async (question: string) => {
    setState('thinking');
    wakeWordDetectedRef.current = false;
    accumulatedTranscriptRef.current = '';
    setTranscript('');

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const history = messages
        .filter(m => m.role !== 'system')
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const { data, error: fnError } = await supabase.functions.invoke('aida-voice-agent', {
        body: { question, datasetContext, conversationHistory: history },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const answer = data?.answer || 'Javob olinmadi.';

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Speak the answer
      if (!isMuted) {
        await speakResponse(answer);
      }

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
      // Clean markdown for TTS
      const cleanText = text
        .replace(/[#*_`~\[\]()>|]/g, '')
        .replace(/\n+/g, '. ')
        .slice(0, 2000);

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
      // Barge-in: stop speaking
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="text-muted-foreground"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages */}
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

          {/* Live transcript */}
          {transcript && state === 'listening' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-end"
            >
              <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-primary/20 text-primary border border-primary/30">
                <p className="text-sm italic">{transcript}</p>
              </div>
            </motion.div>
          )}

          {state === 'thinking' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
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

        {/* Voice Control */}
        <div className="border-t border-border p-6 flex flex-col items-center gap-4">
          {/* Main activation orb */}
          <motion.button
            onClick={handleManualActivate}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-colors ${currentState.color}`}
            whileTap={{ scale: 0.95 }}
          >
            {currentState.pulse && (
              <>
                <motion.div
                  className={`absolute inset-0 rounded-full ${currentState.color} opacity-30`}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className={`absolute inset-0 rounded-full ${currentState.color} opacity-20`}
                  animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
              </>
            )}
            <StateIcon className="w-10 h-10 text-white relative z-10" />
          </motion.button>

          <p className="text-sm text-muted-foreground text-center">
            {state === 'sleeping' && '"AIDA" deb chaqiring yoki tugmani bosing'}
            {state === 'listening' && 'Savolingizni ayting...'}
            {state === 'thinking' && 'AIDA tahlil qilmoqda...'}
            {state === 'speaking' && 'AIDA javob bermoqda. To\'xtatish uchun bosing.'}
          </p>

          {/* Dataset indicator */}
          <div className={`text-xs px-3 py-1 rounded-full ${
            datasetContext ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
          }`}>
            {datasetContext ? '✓ Dataset ulangan' : '○ Dataset yuklanmagan'}
          </div>
        </div>
      </div>
    </div>
  );
}
