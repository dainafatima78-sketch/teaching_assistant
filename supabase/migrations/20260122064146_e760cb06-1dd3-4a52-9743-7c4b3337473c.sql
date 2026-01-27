-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Subjects RLS policies
CREATE POLICY "Teachers can view own subjects" ON public.subjects FOR SELECT USING (teacher_id = get_teacher_id_for_user(auth.uid()));
CREATE POLICY "Teachers can create subjects" ON public.subjects FOR INSERT WITH CHECK (teacher_id = get_teacher_id_for_user(auth.uid()));
CREATE POLICY "Teachers can update own subjects" ON public.subjects FOR UPDATE USING (teacher_id = get_teacher_id_for_user(auth.uid()));
CREATE POLICY "Teachers can delete own subjects" ON public.subjects FOR DELETE USING (teacher_id = get_teacher_id_for_user(auth.uid()));

-- Create chapters table (extracted from documents)
CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.uploaded_documents(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on chapters
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Chapters RLS policies
CREATE POLICY "Teachers can view own chapters" ON public.chapters FOR SELECT USING (teacher_id = get_teacher_id_for_user(auth.uid()));
CREATE POLICY "Teachers can create chapters" ON public.chapters FOR INSERT WITH CHECK (teacher_id = get_teacher_id_for_user(auth.uid()));
CREATE POLICY "Teachers can update own chapters" ON public.chapters FOR UPDATE USING (teacher_id = get_teacher_id_for_user(auth.uid()));
CREATE POLICY "Teachers can delete own chapters" ON public.chapters FOR DELETE USING (teacher_id = get_teacher_id_for_user(auth.uid()));

-- Create syllabus_history table
CREATE TABLE public.syllabus_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.uploaded_documents(id) ON DELETE SET NULL,
  subject TEXT,
  class_level TEXT,
  chapters TEXT[], -- Array of chapter names used
  title TEXT,
  content TEXT NOT NULL,
  file_url TEXT, -- URL to generated PDF/DOCX
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on syllabus_history
ALTER TABLE public.syllabus_history ENABLE ROW LEVEL SECURITY;

-- Syllabus history RLS policies
CREATE POLICY "Teachers can view own syllabus history" ON public.syllabus_history FOR SELECT USING (teacher_id = get_teacher_id_for_user(auth.uid()));
CREATE POLICY "Teachers can create syllabus history" ON public.syllabus_history FOR INSERT WITH CHECK (teacher_id = get_teacher_id_for_user(auth.uid()));
CREATE POLICY "Teachers can update own syllabus history" ON public.syllabus_history FOR UPDATE USING (teacher_id = get_teacher_id_for_user(auth.uid()));
CREATE POLICY "Teachers can delete own syllabus history" ON public.syllabus_history FOR DELETE USING (teacher_id = get_teacher_id_for_user(auth.uid()));

-- Create quiz_history table
CREATE TABLE public.quiz_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.uploaded_documents(id) ON DELETE SET NULL,
  subject TEXT,
  class_level TEXT,
  chapters TEXT[], -- Array of chapter names used
  title TEXT,
  content TEXT NOT NULL,
  question_type TEXT, -- MCQs, Short, Long, Mixed
  difficulty TEXT, -- Easy, Medium, Hard
  num_questions INTEGER,
  file_url TEXT, -- URL to generated PDF/DOCX
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on quiz_history
ALTER TABLE public.quiz_history ENABLE ROW LEVEL SECURITY;

-- Quiz history RLS policies
CREATE POLICY "Teachers can view own quiz history" ON public.quiz_history FOR SELECT USING (teacher_id = get_teacher_id_for_user(auth.uid()));
CREATE POLICY "Teachers can create quiz history" ON public.quiz_history FOR INSERT WITH CHECK (teacher_id = get_teacher_id_for_user(auth.uid()));
CREATE POLICY "Teachers can update own quiz history" ON public.quiz_history FOR UPDATE USING (teacher_id = get_teacher_id_for_user(auth.uid()));
CREATE POLICY "Teachers can delete own quiz history" ON public.quiz_history FOR DELETE USING (teacher_id = get_teacher_id_for_user(auth.uid()));

-- Create storage bucket for generated files
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-files', 'generated-files', true) ON CONFLICT DO NOTHING;

-- Storage policies for generated-files bucket
CREATE POLICY "Teachers can upload generated files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'generated-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Generated files are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'generated-files');
CREATE POLICY "Teachers can delete own generated files" ON storage.objects FOR DELETE USING (bucket_id = 'generated-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add indexes for better performance
CREATE INDEX idx_chapters_document_id ON public.chapters(document_id);
CREATE INDEX idx_chapters_teacher_id ON public.chapters(teacher_id);
CREATE INDEX idx_syllabus_history_teacher_id ON public.syllabus_history(teacher_id);
CREATE INDEX idx_quiz_history_teacher_id ON public.quiz_history(teacher_id);
CREATE INDEX idx_uploaded_documents_class_level ON public.uploaded_documents(class_level);