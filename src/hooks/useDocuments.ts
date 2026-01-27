import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherProfile } from "./useTeacherProfile";
import { toast } from "sonner";

export interface Document {
  id: string;
  teacher_id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  subject: string | null;
  class_level: string | null;
  chapter_name: string | null;
  created_at: string;
  extracted_content?: {
    id: string;
    content: string;
    extracted_at: string;
  } | null;
}

export function useDocuments() {
  const { data: profile } = useTeacherProfile();

  return useQuery({
    queryKey: ["documents", profile?.id],
    queryFn: async (): Promise<Document[]> => {
      if (!profile) return [];

      const { data, error } = await supabase
        .from("uploaded_documents")
        .select(`
          *,
          extracted_content (
            id,
            content,
            extracted_at
          )
        `)
        .eq("teacher_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching documents:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!profile,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { data: profile } = useTeacherProfile();

  return useMutation({
    mutationFn: async ({
      file,
      subject,
      classLevel,
      chapterName,
    }: {
      file: File;
      subject?: string;
      classLevel?: string;
      chapterName?: string;
    }) => {
      if (!profile) throw new Error("No teacher profile found");

      // Get current user for storage path
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const storagePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("syllabus-documents")
        .upload(storagePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to upload file");
      }

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from("uploaded_documents")
        .insert({
          teacher_id: profile.id,
          file_name: file.name,
          file_type: file.type || fileExt || "unknown",
          storage_path: storagePath,
          subject,
          class_level: classLevel,
          chapter_name: chapterName,
        })
        .select()
        .single();

      if (docError) {
        console.error("Document insert error:", docError);
        throw new Error("Failed to create document record");
      }

      // Trigger text extraction
      const { error: extractError } = await supabase.functions.invoke("extract-document", {
        body: {
          documentId: docData.id,
          storagePath,
          fileType: file.type || fileExt,
        },
      });

      if (extractError) {
        console.error("Extraction error:", extractError);
        toast.warning("Document uploaded but text extraction failed. You can retry later.");
      }

      return docData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document uploaded successfully!");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to upload document");
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (document: Document) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("syllabus-documents")
        .remove([document.storage_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // Delete document record (cascades to extracted_content)
      const { error } = await supabase
        .from("uploaded_documents")
        .delete()
        .eq("id", document.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted");
    },
    onError: () => {
      toast.error("Failed to delete document");
    },
  });
}
