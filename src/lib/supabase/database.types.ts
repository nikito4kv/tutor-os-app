/**
 * Hand-written to match supabase/migrations. Once a Supabase project is linked,
 * regenerate with:
 *   pnpm dlx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 * and delete this notice. Keep it in sync with the migrations until then.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type LessonStatus = "scheduled" | "done" | "canceled" | "no_show";
export type HomeworkStatus = "assigned" | "submitted" | "reviewed";
export type ChatSender = "tutor" | "student";

export type Database = {
  public: {
    Tables: {
      tutor: {
        Row: {
          id: string;
          name: string;
          email: string;
          currency: string;
          created_at: string;
          telegram_chat_id: number | null;
          telegram_linked_at: string | null;
          telegram_link_code: string | null;
          telegram_link_code_expires_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          name?: string;
          currency?: string;
          created_at?: string;
          telegram_chat_id?: number | null;
          telegram_linked_at?: string | null;
          telegram_link_code?: string | null;
          telegram_link_code_expires_at?: string | null;
        };
        Update: {
          name?: string;
          email?: string;
          currency?: string;
          telegram_chat_id?: number | null;
          telegram_linked_at?: string | null;
          telegram_link_code?: string | null;
          telegram_link_code_expires_at?: string | null;
        };
        Relationships: [];
      };
      student: {
        Row: {
          id: string;
          tutor_id: string;
          name: string;
          contact: string | null;
          parent_contact: string | null;
          subject: string | null;
          level: string | null;
          share_token: string;
          created_at: string;
          telegram_chat_id: number | null;
          telegram_linked_at: string | null;
        };
        Insert: {
          id?: string;
          tutor_id: string;
          name: string;
          contact?: string | null;
          parent_contact?: string | null;
          subject?: string | null;
          level?: string | null;
          share_token?: string;
          created_at?: string;
          telegram_chat_id?: number | null;
          telegram_linked_at?: string | null;
        };
        Update: {
          name?: string;
          contact?: string | null;
          parent_contact?: string | null;
          subject?: string | null;
          level?: string | null;
          share_token?: string;
          telegram_chat_id?: number | null;
          telegram_linked_at?: string | null;
        };
        Relationships: [];
      };
      package: {
        Row: {
          id: string;
          student_id: string;
          total_lessons: number;
          lessons_left: number;
          price: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          total_lessons: number;
          lessons_left: number;
          price?: number | null;
          created_at?: string;
        };
        Update: { total_lessons?: number; lessons_left?: number; price?: number | null };
        Relationships: [];
      };
      payment: {
        Row: {
          id: string;
          student_id: string;
          amount: number;
          paid_at: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          amount: number;
          paid_at?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: { amount?: number; paid_at?: string; note?: string | null };
        Relationships: [];
      };
      lesson: {
        Row: {
          id: string;
          student_id: string;
          starts_at: string;
          duration_min: number;
          status: LessonStatus;
          topic: string | null;
          note: string | null;
          room_name: string | null;
          series_id: string | null;
          color: string | null;
          charged_package_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          starts_at: string;
          duration_min?: number;
          status?: LessonStatus;
          topic?: string | null;
          note?: string | null;
          room_name?: string | null;
          series_id?: string | null;
          color?: string | null;
          charged_package_id?: string | null;
          created_at?: string;
        };
        Update: {
          starts_at?: string;
          duration_min?: number;
          status?: LessonStatus;
          topic?: string | null;
          note?: string | null;
          room_name?: string | null;
          series_id?: string | null;
          color?: string | null;
          charged_package_id?: string | null;
        };
        Relationships: [];
      };
      lesson_series: {
        Row: {
          id: string;
          student_id: string;
          rrule: string;
          dtstart: string;
          duration_min: number;
          topic: string | null;
          color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          rrule: string;
          dtstart: string;
          duration_min?: number;
          topic?: string | null;
          color?: string | null;
          created_at?: string;
        };
        Update: {
          rrule?: string;
          dtstart?: string;
          duration_min?: number;
          topic?: string | null;
          color?: string | null;
        };
        Relationships: [];
      };
      homework: {
        Row: {
          id: string;
          student_id: string;
          lesson_id: string | null;
          title: string;
          description: string | null;
          attachment_url: string | null;
          status: HomeworkStatus;
          submission_text: string | null;
          submission_url: string | null;
          feedback: string | null;
          due_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          lesson_id?: string | null;
          title: string;
          description?: string | null;
          attachment_url?: string | null;
          status?: HomeworkStatus;
          submission_text?: string | null;
          submission_url?: string | null;
          feedback?: string | null;
          due_at?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          attachment_url?: string | null;
          status?: HomeworkStatus;
          submission_text?: string | null;
          submission_url?: string | null;
          feedback?: string | null;
          due_at?: string | null;
        };
        Relationships: [];
      };
      chat_message: {
        Row: {
          id: string;
          student_id: string;
          sender: ChatSender;
          body: string;
          attachment_path: string | null;
          attachment_name: string | null;
          attachment_type: string | null;
          attachment_size: number | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          sender: ChatSender;
          body?: string;
          attachment_path?: string | null;
          attachment_name?: string | null;
          attachment_type?: string | null;
          attachment_size?: number | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          sender?: ChatSender;
          body?: string;
          attachment_path?: string | null;
          attachment_name?: string | null;
          attachment_type?: string | null;
          attachment_size?: number | null;
          read_at?: string | null;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          tutor_id: string | null;
          category: "bug" | "idea" | "question" | "other";
          message: string;
          contact: string | null;
          page_url: string | null;
          user_agent: string | null;
          status: "new" | "seen" | "closed";
          created_at: string;
        };
        Insert: {
          id?: string;
          tutor_id?: string | null;
          category?: "bug" | "idea" | "question" | "other";
          message: string;
          contact?: string | null;
          page_url?: string | null;
          user_agent?: string | null;
          status?: "new" | "seen" | "closed";
          created_at?: string;
        };
        Update: {
          tutor_id?: string | null;
          category?: "bug" | "idea" | "question" | "other";
          message?: string;
          contact?: string | null;
          page_url?: string | null;
          user_agent?: string | null;
          status?: "new" | "seen" | "closed";
        };
        Relationships: [];
      };
      admin_user: {
        Row: { user_id: string; note: string | null; created_at: string };
        Insert: { user_id: string; note?: string | null; created_at?: string };
        Update: { note?: string | null };
        Relationships: [];
      };
      notification: {
        Row: {
          id: string;
          channel: string;
          recipient_kind: "tutor" | "student";
          recipient_id: string;
          event: string;
          dedup_key: string | null;
          status: "sent" | "failed";
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel?: string;
          recipient_kind: "tutor" | "student";
          recipient_id: string;
          event: string;
          dedup_key?: string | null;
          status?: "sent" | "failed";
          error?: string | null;
          created_at?: string;
        };
        Update: {
          channel?: string;
          status?: "sent" | "failed";
          error?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      complete_lesson: {
        Args: {
          p_lesson_id: string;
          p_topic?: string | null;
          p_note?: string | null;
          p_status?: string;
        };
        Returns: Json;
      };
      reopen_lesson: {
        Args: { p_lesson_id: string };
        Returns: Json;
      };
      owns_student: { Args: { p_student_id: string }; Returns: boolean };
      create_lesson_series: {
        Args: { p_student_id: string; p_series: Json };
        Returns: undefined;
      };
      shift_series_lessons: {
        Args: {
          p_series_id: string;
          p_exclude_id: string;
          p_from: string | null;
          p_delta_secs: number;
          p_duration_min: number;
        };
        Returns: undefined;
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      admin_stats: { Args: Record<string, never>; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
