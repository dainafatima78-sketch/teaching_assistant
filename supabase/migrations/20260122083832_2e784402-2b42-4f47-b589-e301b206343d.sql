-- Add sharing columns to quiz_history
ALTER TABLE public.quiz_history 
ADD COLUMN IF NOT EXISTS is_shared boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
ADD COLUMN IF NOT EXISTS share_expires_at timestamp with time zone;

-- Create index for share_token lookup
CREATE INDEX IF NOT EXISTS idx_quiz_history_share_token ON public.quiz_history(share_token);

-- Create student_profiles table
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  class_level text,
  roll_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on student_profiles
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- Students can view and update their own profile
CREATE POLICY "Students can view own profile" ON public.student_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can create own profile" ON public.student_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own profile" ON public.student_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Teachers can view all student profiles (for submissions)
CREATE POLICY "Teachers can view student profiles" ON public.student_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teacher_profiles WHERE user_id = auth.uid())
  );

-- Create quiz_submissions table
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quiz_history(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  student_name text NOT NULL,
  student_class text,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  score numeric,
  total_questions integer,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  is_reviewed boolean DEFAULT false,
  teacher_feedback text
);

-- Enable RLS on quiz_submissions
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Students can create submissions
CREATE POLICY "Students can submit quiz" ON public.quiz_submissions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Students can view their own submissions
CREATE POLICY "Students can view own submissions" ON public.quiz_submissions
  FOR SELECT USING (auth.uid() = student_id);

-- Teachers can view submissions for their quizzes
CREATE POLICY "Teachers can view quiz submissions" ON public.quiz_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_history qh
      WHERE qh.id = quiz_submissions.quiz_id 
      AND qh.teacher_id = get_teacher_id_for_user(auth.uid())
    )
  );

-- Teachers can update submissions (for feedback)
CREATE POLICY "Teachers can update submissions" ON public.quiz_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.quiz_history qh
      WHERE qh.id = quiz_submissions.quiz_id 
      AND qh.teacher_id = get_teacher_id_for_user(auth.uid())
    )
  );

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Teachers can view their notifications
CREATE POLICY "Teachers can view own notifications" ON public.notifications
  FOR SELECT USING (teacher_id = get_teacher_id_for_user(auth.uid()));

-- Teachers can update (mark as read)
CREATE POLICY "Teachers can update own notifications" ON public.notifications
  FOR UPDATE USING (teacher_id = get_teacher_id_for_user(auth.uid()));

-- Teachers can delete notifications
CREATE POLICY "Teachers can delete own notifications" ON public.notifications
  FOR DELETE USING (teacher_id = get_teacher_id_for_user(auth.uid()));

-- Service role can insert notifications (from edge functions)
CREATE POLICY "Service can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON public.quiz_submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student_id ON public.quiz_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_teacher_id ON public.notifications(teacher_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Allow public access to shared quizzes (for the share link)
CREATE POLICY "Anyone can view shared quizzes" ON public.quiz_history
  FOR SELECT USING (is_shared = true AND share_token IS NOT NULL);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;