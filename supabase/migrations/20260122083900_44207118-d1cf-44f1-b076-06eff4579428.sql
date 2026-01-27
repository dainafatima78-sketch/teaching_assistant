-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;

-- Create a more restrictive policy - only authenticated users can insert notifications
-- (Edge functions with service role will bypass RLS anyway)
CREATE POLICY "Authenticated can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);