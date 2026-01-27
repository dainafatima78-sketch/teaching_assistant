import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface TeacherProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  school_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useTeacherProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["teacher-profile", user?.id],
    queryFn: async (): Promise<TeacherProfile | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("teacher_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching teacher profile:", error);
        return null;
      }

      return data;
    },
    enabled: !!user,
  });
}
