
CREATE TABLE public.aida_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Yangi suhbat',
  dataset_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.aida_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.aida_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.aida_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aida_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations" ON public.aida_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own conversations" ON public.aida_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.aida_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.aida_conversations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON public.aida_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.aida_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_aida_conversations_updated_at BEFORE UPDATE ON public.aida_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_aida_messages_conversation ON public.aida_messages(conversation_id);
CREATE INDEX idx_aida_conversations_user ON public.aida_conversations(user_id);
