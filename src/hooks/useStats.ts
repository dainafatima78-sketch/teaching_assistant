import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherProfile } from "./useTeacherProfile";

export interface DashboardStats {
  totalDocuments: number;
  totalLessonPlans: number;
  totalQuizzes: number;
  totalChapters: number;
  recentActivity: {
    action: string;
    subject: string;
    time: string;
    type: "document" | "lesson" | "quiz";
  }[];
}

export function useStats() {
  const { data: profile } = useTeacherProfile();

  return useQuery({
    queryKey: ["dashboard-stats", profile?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!profile) {
        return {
          totalDocuments: 0,
          totalLessonPlans: 0,
          totalQuizzes: 0,
          totalChapters: 0,
          recentActivity: [],
        };
      }

      // Fetch all counts in parallel
      const [docsResult, syllabusResult, quizResult, chaptersResult] = await Promise.all([
        supabase
          .from("uploaded_documents")
          .select("id, file_name, created_at, subject")
          .eq("teacher_id", profile.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("syllabus_history")
          .select("id, title, subject, created_at")
          .eq("teacher_id", profile.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("quiz_history")
          .select("id, title, subject, created_at")
          .eq("teacher_id", profile.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("chapters")
          .select("id")
          .eq("teacher_id", profile.id),
      ]);

      const docs = docsResult.data || [];
      const syllabi = syllabusResult.data || [];
      const quizzes = quizResult.data || [];
      const chapters = chaptersResult.data || [];

      // Build recent activity from real data
      const recentActivity: DashboardStats["recentActivity"] = [];

      // Add recent documents
      docs.slice(0, 3).forEach(doc => {
        recentActivity.push({
          action: "Uploaded syllabus",
          subject: doc.subject || doc.file_name,
          time: doc.created_at,
          type: "document",
        });
      });

      // Add recent lesson plans
      syllabi.slice(0, 3).forEach(item => {
        recentActivity.push({
          action: "Created lesson plan",
          subject: item.title || item.subject || "Lesson Plan",
          time: item.created_at,
          type: "lesson",
        });
      });

      // Add recent quizzes
      quizzes.slice(0, 3).forEach(item => {
        recentActivity.push({
          action: "Generated quiz",
          subject: item.title || item.subject || "Quiz",
          time: item.created_at,
          type: "quiz",
        });
      });

      // Sort by time and take top 5
      recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      return {
        totalDocuments: docs.length,
        totalLessonPlans: syllabi.length,
        totalQuizzes: quizzes.length,
        totalChapters: chapters.length,
        recentActivity: recentActivity.slice(0, 5),
      };
    },
    enabled: !!profile,
  });
}
