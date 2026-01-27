import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherProfile } from "./useTeacherProfile";

export interface Chapter {
  id: string;
  document_id: string;
  teacher_id: string;
  name: string;
  content: string | null;
  order_index: number;
  created_at: string;
}

export function useChapters(documentId?: string) {
  const { data: profile } = useTeacherProfile();

  return useQuery({
    queryKey: ["chapters", profile?.id, documentId],
    queryFn: async (): Promise<Chapter[]> => {
      if (!profile) return [];

      let query = supabase
        .from("chapters")
        .select("*")
        .eq("teacher_id", profile.id)
        .order("order_index", { ascending: true });

      if (documentId) {
        query = query.eq("document_id", documentId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching chapters:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!profile,
  });
}

export function useChaptersByGrade(classLevel?: string) {
  const { data: profile } = useTeacherProfile();

  return useQuery({
    queryKey: ["chapters-by-grade", profile?.id, classLevel],
    queryFn: async (): Promise<Chapter[]> => {
      if (!profile || !classLevel) return [];

      // First get documents for this class level
      const { data: docs, error: docsError } = await supabase
        .from("uploaded_documents")
        .select("id")
        .eq("teacher_id", profile.id)
        .eq("class_level", classLevel);

      if (docsError || !docs || docs.length === 0) {
        return [];
      }

      const docIds = docs.map(d => d.id);

      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("teacher_id", profile.id)
        .in("document_id", docIds)
        .order("order_index", { ascending: true });

      if (error) {
        console.error("Error fetching chapters by grade:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!profile && !!classLevel,
  });
}
