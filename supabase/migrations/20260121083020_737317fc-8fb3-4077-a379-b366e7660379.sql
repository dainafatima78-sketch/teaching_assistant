-- Create teacher_profiles table
CREATE TABLE public.teacher_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  school_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create uploaded_documents table
CREATE TABLE public.uploaded_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  subject TEXT,
  class_level TEXT,
  chapter_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create extracted_content table
CREATE TABLE public.extracted_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL UNIQUE REFERENCES public.uploaded_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create generated_content table
CREATE TABLE public.generated_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  source_document_id UUID REFERENCES public.uploaded_documents(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL, -- 'lesson_plan', 'quiz', 'qa_response', 'homework_explanation'
  title TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;

-- Helper function to get teacher_id from user_id
CREATE OR REPLACE FUNCTION public.get_teacher_id_for_user(p_user_id UUID)
RETURNS UUID AS $$
  SELECT id FROM public.teacher_profiles WHERE user_id = p_user_id LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- RLS Policies for teacher_profiles
CREATE POLICY "Users can view own profile" ON public.teacher_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profile" ON public.teacher_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.teacher_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for uploaded_documents
CREATE POLICY "Teachers can view own documents" ON public.uploaded_documents
  FOR SELECT USING (teacher_id = public.get_teacher_id_for_user(auth.uid()));

CREATE POLICY "Teachers can create documents" ON public.uploaded_documents
  FOR INSERT WITH CHECK (teacher_id = public.get_teacher_id_for_user(auth.uid()));

CREATE POLICY "Teachers can update own documents" ON public.uploaded_documents
  FOR UPDATE USING (teacher_id = public.get_teacher_id_for_user(auth.uid()));

CREATE POLICY "Teachers can delete own documents" ON public.uploaded_documents
  FOR DELETE USING (teacher_id = public.get_teacher_id_for_user(auth.uid()));

-- RLS Policies for extracted_content
CREATE POLICY "Teachers can view own extracted content" ON public.extracted_content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.uploaded_documents ud
      WHERE ud.id = document_id AND ud.teacher_id = public.get_teacher_id_for_user(auth.uid())
    )
  );

-- RLS Policies for generated_content
CREATE POLICY "Teachers can view own generated content" ON public.generated_content
  FOR SELECT USING (teacher_id = public.get_teacher_id_for_user(auth.uid()));

CREATE POLICY "Teachers can create generated content" ON public.generated_content
  FOR INSERT WITH CHECK (teacher_id = public.get_teacher_id_for_user(auth.uid()));

CREATE POLICY "Teachers can update own generated content" ON public.generated_content
  FOR UPDATE USING (teacher_id = public.get_teacher_id_for_user(auth.uid()));

CREATE POLICY "Teachers can delete own generated content" ON public.generated_content
  FOR DELETE USING (teacher_id = public.get_teacher_id_for_user(auth.uid()));

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('syllabus-documents', 'syllabus-documents', false);

-- Storage RLS Policies
CREATE POLICY "Teachers can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'syllabus-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Teachers can view own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'syllabus-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Teachers can delete own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'syllabus-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Trigger to auto-create teacher profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.teacher_profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_teacher_profiles_updated_at
  BEFORE UPDATE ON public.teacher_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_uploaded_documents_teacher ON public.uploaded_documents(teacher_id);
CREATE INDEX idx_extracted_content_document ON public.extracted_content(document_id);
CREATE INDEX idx_generated_content_teacher ON public.generated_content(teacher_id);
CREATE INDEX idx_generated_content_type ON public.generated_content(content_type);