export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chapters: {
        Row: {
          content: string | null
          created_at: string
          document_id: string
          id: string
          name: string
          order_index: number
          teacher_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          document_id: string
          id?: string
          name: string
          order_index?: number
          teacher_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          document_id?: string
          id?: string
          name?: string
          order_index?: number
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          document_id: string | null
          id: string
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          id?: string
          teacher_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          id?: string
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_content: {
        Row: {
          content: string
          document_id: string
          extracted_at: string
          id: string
        }
        Insert: {
          content: string
          document_id: string
          extracted_at?: string
          id?: string
        }
        Update: {
          content?: string
          document_id?: string
          extracted_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extracted_content_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_content: {
        Row: {
          content: string
          content_type: string
          created_at: string
          id: string
          metadata: Json | null
          source_document_id: string | null
          teacher_id: string
          title: string | null
        }
        Insert: {
          content: string
          content_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          source_document_id?: string | null
          teacher_id: string
          title?: string | null
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          source_document_id?: string | null
          teacher_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_content_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_content_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          teacher_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          teacher_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          teacher_id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      quiz_history: {
        Row: {
          chapters: string[] | null
          class_level: string | null
          content: string
          created_at: string
          difficulty: string | null
          document_id: string | null
          file_url: string | null
          id: string
          is_shared: boolean | null
          metadata: Json | null
          num_questions: number | null
          question_type: string | null
          share_expires_at: string | null
          share_token: string | null
          subject: string | null
          teacher_id: string
          title: string | null
        }
        Insert: {
          chapters?: string[] | null
          class_level?: string | null
          content: string
          created_at?: string
          difficulty?: string | null
          document_id?: string | null
          file_url?: string | null
          id?: string
          is_shared?: boolean | null
          metadata?: Json | null
          num_questions?: number | null
          question_type?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          subject?: string | null
          teacher_id: string
          title?: string | null
        }
        Update: {
          chapters?: string[] | null
          class_level?: string | null
          content?: string
          created_at?: string
          difficulty?: string | null
          document_id?: string | null
          file_url?: string | null
          id?: string
          is_shared?: boolean | null
          metadata?: Json | null
          num_questions?: number | null
          question_type?: string | null
          share_expires_at?: string | null
          share_token?: string | null
          subject?: string | null
          teacher_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_history_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_submissions: {
        Row: {
          answers: Json
          id: string
          is_reviewed: boolean | null
          quiz_id: string
          score: number | null
          student_class: string | null
          student_id: string
          student_name: string
          submitted_at: string
          teacher_feedback: string | null
          total_questions: number | null
        }
        Insert: {
          answers?: Json
          id?: string
          is_reviewed?: boolean | null
          quiz_id: string
          score?: number | null
          student_class?: string | null
          student_id: string
          student_name: string
          submitted_at?: string
          teacher_feedback?: string | null
          total_questions?: number | null
        }
        Update: {
          answers?: Json
          id?: string
          is_reviewed?: boolean | null
          quiz_id?: string
          score?: number | null
          student_class?: string | null
          student_id?: string
          student_name?: string
          submitted_at?: string
          teacher_feedback?: string | null
          total_questions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_submissions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_history"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          class_level: string | null
          created_at: string
          full_name: string
          id: string
          roll_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          class_level?: string | null
          created_at?: string
          full_name: string
          id?: string
          roll_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          class_level?: string | null
          created_at?: string
          full_name?: string
          id?: string
          roll_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          name: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      syllabus_history: {
        Row: {
          chapters: string[] | null
          class_level: string | null
          content: string
          created_at: string
          document_id: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          subject: string | null
          teacher_id: string
          title: string | null
        }
        Insert: {
          chapters?: string[] | null
          class_level?: string | null
          content: string
          created_at?: string
          document_id?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          subject?: string | null
          teacher_id: string
          title?: string | null
        }
        Update: {
          chapters?: string[] | null
          class_level?: string | null
          content?: string
          created_at?: string
          document_id?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          subject?: string | null
          teacher_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_history_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          school_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          school_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          school_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      uploaded_documents: {
        Row: {
          chapter_name: string | null
          class_level: string | null
          created_at: string
          file_name: string
          file_type: string
          id: string
          storage_path: string
          subject: string | null
          teacher_id: string
        }
        Insert: {
          chapter_name?: string | null
          class_level?: string | null
          created_at?: string
          file_name: string
          file_type: string
          id?: string
          storage_path: string
          subject?: string | null
          teacher_id: string
        }
        Update: {
          chapter_name?: string | null
          class_level?: string | null
          created_at?: string
          file_name?: string
          file_type?: string
          id?: string
          storage_path?: string
          subject?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_documents_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_teacher_id_for_user: { Args: { p_user_id: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
