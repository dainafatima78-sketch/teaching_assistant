import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherProfile } from "./useTeacherProfile";
import { toast } from "sonner";

export interface ChatConversation {
  id: string;
  teacher_id: string;
  title: string;
  document_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  attachments: any | null;
  created_at: string;
}

export function useChatConversations() {
  const { data: profile } = useTeacherProfile();

  return useQuery({
    queryKey: ["chat-conversations", profile?.id],
    queryFn: async (): Promise<ChatConversation[]> => {
      if (!profile) return [];

      const { data, error } = await (supabase as any)
        .from("chat_conversations")
        .select("*")
        .eq("teacher_id", profile.id)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching conversations:", error);
        throw error;
      }

      return (data || []) as ChatConversation[];
    },
    enabled: !!profile,
  });
}

export function useChatMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: async (): Promise<ChatMessage[]> => {
      if (!conversationId) return [];

      const { data, error } = await (supabase as any)
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        throw error;
      }

      return (data || []).map((msg: any) => ({
        ...msg,
        role: msg.role as "user" | "assistant"
      })) as ChatMessage[];
    },
    enabled: !!conversationId,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { data: profile } = useTeacherProfile();

  return useMutation({
    mutationFn: async (data: { title?: string; document_id?: string | null }) => {
      if (!profile) throw new Error("No teacher profile");

      const { data: result, error } = await (supabase as any)
        .from("chat_conversations")
        .insert({
          teacher_id: profile.id,
          title: data.title || "New Chat",
          document_id: data.document_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result as ChatConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await (supabase as any)
        .from("chat_conversations")
        .update({ title })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("chat_conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      toast.success("Chat deleted");
    },
  });
}

export function useSaveMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      conversation_id: string;
      role: "user" | "assistant";
      content: string;
      attachments?: any;
    }) => {
      const { data: result, error } = await (supabase as any)
        .from("chat_messages")
        .insert({
          conversation_id: data.conversation_id,
          role: data.role,
          content: data.content,
          attachments: data.attachments || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update conversation timestamp
      await (supabase as any)
        .from("chat_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", data.conversation_id);

      return result as ChatMessage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chat-messages", variables.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });
}
