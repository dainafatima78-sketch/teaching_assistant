import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherProfile } from "./useTeacherProfile";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface SyllabusHistory {
  id: string;
  teacher_id: string;
  document_id: string | null;
  subject: string | null;
  class_level: string | null;
  chapters: string[] | null;
  title: string | null;
  content: string;
  file_url: string | null;
  metadata: Json | null;
  created_at: string;
}

export interface QuizHistory {
  id: string;
  teacher_id: string;
  document_id: string | null;
  subject: string | null;
  class_level: string | null;
  chapters: string[] | null;
  title: string | null;
  content: string;
  question_type: string | null;
  difficulty: string | null;
  num_questions: number | null;
  file_url: string | null;
  metadata: Json | null;
  created_at: string;
}

export function useSyllabusHistory() {
  const { data: profile } = useTeacherProfile();

  return useQuery({
    queryKey: ["syllabus-history", profile?.id],
    queryFn: async (): Promise<SyllabusHistory[]> => {
      if (!profile) return [];

      const { data, error } = await supabase
        .from("syllabus_history")
        .select("*")
        .eq("teacher_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching syllabus history:", error);
        throw error;
      }

      return (data || []) as SyllabusHistory[];
    },
    enabled: !!profile,
  });
}

export function useQuizHistory() {
  const { data: profile } = useTeacherProfile();

  return useQuery({
    queryKey: ["quiz-history", profile?.id],
    queryFn: async (): Promise<QuizHistory[]> => {
      if (!profile) return [];

      const { data, error } = await supabase
        .from("quiz_history")
        .select("*")
        .eq("teacher_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching quiz history:", error);
        throw error;
      }

      return (data || []) as QuizHistory[];
    },
    enabled: !!profile,
  });
}

export function useSaveSyllabusHistory() {
  const queryClient = useQueryClient();
  const { data: profile } = useTeacherProfile();

  return useMutation({
    mutationFn: async (data: {
      document_id?: string | null;
      subject?: string | null;
      class_level?: string | null;
      chapters?: string[] | null;
      title?: string | null;
      content: string;
      file_url?: string | null;
      metadata?: Json | null;
    }) => {
      if (!profile) throw new Error("No teacher profile");

      const { data: result, error } = await supabase
        .from("syllabus_history")
        .insert({
          teacher_id: profile.id,
          document_id: data.document_id || null,
          subject: data.subject || null,
          class_level: data.class_level || null,
          chapters: data.chapters || null,
          title: data.title || null,
          content: data.content,
          file_url: data.file_url || null,
          metadata: data.metadata || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-history"] });
      toast.success("Lesson plan saved to history!");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    },
  });
}

export function useSaveQuizHistory() {
  const queryClient = useQueryClient();
  const { data: profile } = useTeacherProfile();

  return useMutation({
    mutationFn: async (data: {
      document_id?: string | null;
      subject?: string | null;
      class_level?: string | null;
      chapters?: string[] | null;
      title?: string | null;
      content: string;
      question_type?: string | null;
      difficulty?: string | null;
      num_questions?: number | null;
      file_url?: string | null;
      metadata?: Json | null;
    }) => {
      if (!profile) throw new Error("No teacher profile");

      const { data: result, error } = await supabase
        .from("quiz_history")
        .insert({
          teacher_id: profile.id,
          document_id: data.document_id || null,
          subject: data.subject || null,
          class_level: data.class_level || null,
          chapters: data.chapters || null,
          title: data.title || null,
          content: data.content,
          question_type: data.question_type || null,
          difficulty: data.difficulty || null,
          num_questions: data.num_questions || null,
          file_url: data.file_url || null,
          metadata: data.metadata || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-history"] });
      toast.success("Quiz saved to history!");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    },
  });
}

export function useDeleteSyllabusHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("syllabus_history")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-history"] });
      toast.success("Deleted from history");
    },
    onError: () => {
      toast.error("Failed to delete");
    },
  });
}

export function useDeleteQuizHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("quiz_history")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-history"] });
      toast.success("Deleted from history");
    },
    onError: () => {
      toast.error("Failed to delete");
    },
  });
}
