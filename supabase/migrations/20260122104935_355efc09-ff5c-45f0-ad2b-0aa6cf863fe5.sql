-- Create chat_conversations table for saving chat history
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  document_id UUID REFERENCES public.uploaded_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_conversations
CREATE POLICY "Teachers can view their own conversations" 
ON public.chat_conversations 
FOR SELECT 
USING (teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can create their own conversations" 
ON public.chat_conversations 
FOR INSERT 
WITH CHECK (teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can update their own conversations" 
ON public.chat_conversations 
FOR UPDATE 
USING (teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can delete their own conversations" 
ON public.chat_conversations 
FOR DELETE 
USING (teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()));

-- RLS policies for chat_messages
CREATE POLICY "Teachers can view messages from their conversations" 
ON public.chat_messages 
FOR SELECT 
USING (conversation_id IN (
  SELECT id FROM public.chat_conversations 
  WHERE teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid())
));

CREATE POLICY "Teachers can insert messages to their conversations" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (conversation_id IN (
  SELECT id FROM public.chat_conversations 
  WHERE teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid())
));

CREATE POLICY "Teachers can delete messages from their conversations" 
ON public.chat_messages 
FOR DELETE 
USING (conversation_id IN (
  SELECT id FROM public.chat_conversations 
  WHERE teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid())
));

-- Trigger for updated_at
CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_conversations_teacher_id ON public.chat_conversations(teacher_id);