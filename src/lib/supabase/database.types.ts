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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action: Database["public"]["Enums"]["admin_action"]
          actor_id: string | null
          created_at: string
          id: string
          reason: string
          subject_id: string | null
          subject_label: string
        }
        Insert: {
          action: Database["public"]["Enums"]["admin_action"]
          actor_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          subject_id?: string | null
          subject_label?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["admin_action"]
          actor_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          subject_id?: string | null
          subject_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_answer_verdicts: {
        Row: {
          answer_id: string
          level: number
          option_id: string
        }
        Insert: {
          answer_id: string
          level: number
          option_id: string
        }
        Update: {
          answer_id?: string
          level?: number
          option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_answer_verdicts_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "ask_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ask_answer_verdicts_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "ask_question_options"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_answer_votes: {
        Row: {
          answer_id: string
          created_at: string
          user_id: string
          vote: Database["public"]["Enums"]["reader_vote"]
        }
        Insert: {
          answer_id: string
          created_at?: string
          user_id: string
          vote: Database["public"]["Enums"]["reader_vote"]
        }
        Update: {
          answer_id?: string
          created_at?: string
          user_id?: string
          vote?: Database["public"]["Enums"]["reader_vote"]
        }
        Relationships: [
          {
            foreignKeyName: "ask_answer_votes_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "ask_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ask_answer_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ask_answer_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_answers: {
        Row: {
          created_at: string
          dislikes: number
          id: string
          likes: number
          next_steps: string[]
          pick: number
          professional_id: string
          question_id: string
          reasoning: string
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dislikes?: number
          id?: string
          likes?: number
          next_steps?: string[]
          pick?: number
          professional_id: string
          question_id: string
          reasoning?: string
          summary: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dislikes?: number
          id?: string
          likes?: number
          next_steps?: string[]
          pick?: number
          professional_id?: string
          question_id?: string
          reasoning?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_answers_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ask_answers_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ask_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "ask_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_categories: {
        Row: {
          blurb: string
          examples: string[]
          id: Database["public"]["Enums"]["ask_category"]
          label: string
          short: string
          sort_order: number
        }
        Insert: {
          blurb: string
          examples?: string[]
          id: Database["public"]["Enums"]["ask_category"]
          label: string
          short: string
          sort_order?: number
        }
        Update: {
          blurb?: string
          examples?: string[]
          id?: Database["public"]["Enums"]["ask_category"]
          label?: string
          short?: string
          sort_order?: number
        }
        Relationships: []
      }
      ask_comment_votes: {
        Row: {
          comment_id: string
          created_at: string
          user_id: string
          vote: Database["public"]["Enums"]["reader_vote"]
        }
        Insert: {
          comment_id: string
          created_at?: string
          user_id: string
          vote: Database["public"]["Enums"]["reader_vote"]
        }
        Update: {
          comment_id?: string
          created_at?: string
          user_id?: string
          vote?: Database["public"]["Enums"]["reader_vote"]
        }
        Relationships: [
          {
            foreignKeyName: "ask_comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "ask_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ask_comment_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ask_comment_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_comments: {
        Row: {
          answer_id: string
          author_id: string
          body: string
          created_at: string
          depth: number
          dislikes: number
          hidden_at: string | null
          id: string
          likes: number
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          answer_id: string
          author_id: string
          body: string
          created_at?: string
          depth?: number
          dislikes?: number
          hidden_at?: string | null
          id?: string
          likes?: number
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          answer_id?: string
          author_id?: string
          body?: string
          created_at?: string
          depth?: number
          dislikes?: number
          hidden_at?: string | null
          id?: string
          likes?: number
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_comments_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "ask_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ask_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ask_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ask_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ask_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_matches: {
        Row: {
          id: string
          matched_at: string
          professional_id: string
          question_id: string
          reasons: string[]
          revoked_at: string | null
        }
        Insert: {
          id?: string
          matched_at?: string
          professional_id: string
          question_id: string
          reasons?: string[]
          revoked_at?: string | null
        }
        Update: {
          id?: string
          matched_at?: string
          professional_id?: string
          question_id?: string
          reasons?: string[]
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ask_matches_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ask_matches_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ask_matches_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "ask_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          professional_id: string
          question_id: string
          read_at: string | null
          sender_id: string
          sender_role: Database["public"]["Enums"]["sender_role"]
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          professional_id: string
          question_id: string
          read_at?: string | null
          sender_id: string
          sender_role: Database["public"]["Enums"]["sender_role"]
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          professional_id?: string
          question_id?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["sender_role"]
        }
        Relationships: [
          {
            foreignKeyName: "ask_messages_question_id_professional_id_fkey"
            columns: ["question_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "ask_threads"
            referencedColumns: ["question_id", "professional_id"]
          },
          {
            foreignKeyName: "ask_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ask_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_question_options: {
        Row: {
          id: string
          label: string
          question_id: string
          slot: Database["public"]["Enums"]["option_slot"]
        }
        Insert: {
          id?: string
          label: string
          question_id: string
          slot: Database["public"]["Enums"]["option_slot"]
        }
        Update: {
          id?: string
          label?: string
          question_id?: string
          slot?: Database["public"]["Enums"]["option_slot"]
        }
        Relationships: [
          {
            foreignKeyName: "ask_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "ask_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_questions: {
        Row: {
          asker_id: string
          category: Database["public"]["Enums"]["ask_category"]
          closed_at: string | null
          context: string
          created_at: string
          deadline: string
          id: string
          place_id: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["question_visibility"]
        }
        Insert: {
          asker_id: string
          category: Database["public"]["Enums"]["ask_category"]
          closed_at?: string | null
          context?: string
          created_at?: string
          deadline?: string
          id?: string
          place_id: string
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["question_visibility"]
        }
        Update: {
          asker_id?: string
          category?: Database["public"]["Enums"]["ask_category"]
          closed_at?: string | null
          context?: string
          created_at?: string
          deadline?: string
          id?: string
          place_id?: string
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["question_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "ask_questions_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ask_questions_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ask_questions_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      ask_ratings: {
        Row: {
          created_at: string
          helpfulness: number
          professional_id: string
          question_id: string
        }
        Insert: {
          created_at?: string
          helpfulness: number
          professional_id: string
          question_id: string
        }
        Update: {
          created_at?: string
          helpfulness?: number
          professional_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_ratings_question_id_professional_id_fkey"
            columns: ["question_id", "professional_id"]
            isOneToOne: true
            referencedRelation: "ask_threads"
            referencedColumns: ["question_id", "professional_id"]
          },
        ]
      }
      ask_threads: {
        Row: {
          outcome: Database["public"]["Enums"]["thread_outcome"] | null
          private_opened_at: string | null
          professional_id: string
          question_id: string
          status: Database["public"]["Enums"]["thread_status"]
          updated_at: string
        }
        Insert: {
          outcome?: Database["public"]["Enums"]["thread_outcome"] | null
          private_opened_at?: string | null
          professional_id: string
          question_id: string
          status?: Database["public"]["Enums"]["thread_status"]
          updated_at?: string
        }
        Update: {
          outcome?: Database["public"]["Enums"]["thread_outcome"] | null
          private_opened_at?: string | null
          professional_id?: string
          question_id?: string
          status?: Database["public"]["Enums"]["thread_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ask_threads_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ask_threads_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ask_threads_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "ask_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          blurb: string
          id: string
          label: string
          reserved: boolean
          short: string
          sort_order: number
        }
        Insert: {
          blurb: string
          id: string
          label: string
          reserved?: boolean
          short: string
          sort_order?: number
        }
        Update: {
          blurb?: string
          id?: string
          label?: string
          reserved?: boolean
          short?: string
          sort_order?: number
        }
        Relationships: []
      }
      credential_submissions: {
        Row: {
          credential_id: string
          purged_at: string | null
          storage_path: string
          submitted_at: string
        }
        Insert: {
          credential_id: string
          purged_at?: string | null
          storage_path: string
          submitted_at?: string
        }
        Update: {
          credential_id?: string
          purged_at?: string | null
          storage_path?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credential_submissions_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: true
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      credentials: {
        Row: {
          category: Database["public"]["Enums"]["ask_category"]
          evidence_category: string
          expires_at: string | null
          id: string
          proof_type: Database["public"]["Enums"]["proof_type"]
          public_label: string
          review_note: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["credential_status"]
          submitted_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["ask_category"]
          evidence_category: string
          expires_at?: string | null
          id?: string
          proof_type: Database["public"]["Enums"]["proof_type"]
          public_label: string
          review_note?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["credential_status"]
          submitted_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["ask_category"]
          evidence_category?: string
          expires_at?: string | null
          id?: string
          proof_type?: Database["public"]["Enums"]["proof_type"]
          public_label?: string
          review_note?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["credential_status"]
          submitted_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credentials_proof_type_fkey"
            columns: ["proof_type"]
            isOneToOne: false
            referencedRelation: "proof_kinds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credentials_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "credentials_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      facet_responses: {
        Row: {
          aspect_id: string
          created_at: string
          option_id: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aspect_id: string
          created_at?: string
          option_id: string
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aspect_id?: string
          created_at?: string
          option_id?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facet_responses_aspect_id_fkey"
            columns: ["aspect_id"]
            isOneToOne: false
            referencedRelation: "topic_aspects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facet_responses_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "topic_aspect_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facet_responses_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topic_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facet_responses_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facet_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "facet_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      facet_set_facets: {
        Row: {
          id: string
          key: string
          label: string
          position: number
          prompt: string
          set_id: string
        }
        Insert: {
          id?: string
          key: string
          label: string
          position: number
          prompt: string
          set_id: string
        }
        Update: {
          id?: string
          key?: string
          label?: string
          position?: number
          prompt?: string
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "facet_set_facets_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "facet_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      facet_set_options: {
        Row: {
          facet_id: string
          id: string
          key: string
          label: string
          position: number
          tone: Database["public"]["Enums"]["sentiment"]
        }
        Insert: {
          facet_id: string
          id?: string
          key: string
          label: string
          position: number
          tone: Database["public"]["Enums"]["sentiment"]
        }
        Update: {
          facet_id?: string
          id?: string
          key?: string
          label?: string
          position?: number
          tone?: Database["public"]["Enums"]["sentiment"]
        }
        Relationships: [
          {
            foreignKeyName: "facet_set_options_facet_id_fkey"
            columns: ["facet_id"]
            isOneToOne: false
            referencedRelation: "facet_set_facets"
            referencedColumns: ["id"]
          },
        ]
      }
      facet_sets: {
        Row: {
          id: string
          label: string
        }
        Insert: {
          id: string
          label: string
        }
        Update: {
          id?: string
          label?: string
        }
        Relationships: []
      }
      interactive_blocks: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["interactive_kind"]
          prompt: string
          section_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["interactive_kind"]
          prompt: string
          section_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["interactive_kind"]
          prompt?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactive_blocks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: true
            referencedRelation: "opinion_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      interactive_options: {
        Row: {
          block_id: string
          id: string
          label: string
          position: number
        }
        Insert: {
          block_id: string
          id?: string
          label: string
          position?: number
        }
        Update: {
          block_id?: string
          id?: string
          label?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "interactive_options_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "interactive_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      interactive_responses: {
        Row: {
          block_id: string
          created_at: string
          option_id: string
          user_id: string
        }
        Insert: {
          block_id: string
          created_at?: string
          option_id: string
          user_id: string
        }
        Update: {
          block_id?: string
          created_at?: string
          option_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactive_responses_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "interactive_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactive_responses_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "interactive_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactive_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "interactive_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      occupations: {
        Row: {
          counts_in_breakdowns: boolean
          label: string
          sort_order: number
        }
        Insert: {
          counts_in_breakdowns?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          counts_in_breakdowns?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      opinion_helpful: {
        Row: {
          created_at: string
          opinion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          opinion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          opinion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opinion_helpful_opinion_id_fkey"
            columns: ["opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opinion_helpful_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "opinion_helpful_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opinion_reactions: {
        Row: {
          created_at: string
          opinion_id: string
          reaction: Database["public"]["Enums"]["pro_reaction"]
          user_id: string
        }
        Insert: {
          created_at?: string
          opinion_id: string
          reaction: Database["public"]["Enums"]["pro_reaction"]
          user_id: string
        }
        Update: {
          created_at?: string
          opinion_id?: string
          reaction?: Database["public"]["Enums"]["pro_reaction"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opinion_reactions_opinion_id_fkey"
            columns: ["opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opinion_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "opinion_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opinion_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          depth: number
          dislikes: number
          hidden_at: string | null
          hidden_reason: string | null
          id: string
          likes: number
          opinion_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          depth?: number
          dislikes?: number
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          likes?: number
          opinion_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          depth?: number
          dislikes?: number
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          likes?: number
          opinion_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opinion_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "opinion_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opinion_replies_opinion_id_fkey"
            columns: ["opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opinion_replies_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "opinion_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      opinion_reply_votes: {
        Row: {
          created_at: string
          reply_id: string
          user_id: string
          vote: Database["public"]["Enums"]["reader_vote"]
        }
        Insert: {
          created_at?: string
          reply_id: string
          user_id: string
          vote: Database["public"]["Enums"]["reader_vote"]
        }
        Update: {
          created_at?: string
          reply_id?: string
          user_id?: string
          vote?: Database["public"]["Enums"]["reader_vote"]
        }
        Relationships: [
          {
            foreignKeyName: "opinion_reply_votes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "opinion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opinion_reply_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "opinion_reply_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opinion_saves: {
        Row: {
          created_at: string
          opinion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          opinion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          opinion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opinion_saves_opinion_id_fkey"
            columns: ["opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opinion_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "opinion_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opinion_sections: {
        Row: {
          body: string | null
          created_at: string
          id: string
          opinion_id: string
          points: string[] | null
          position: number
          type: Database["public"]["Enums"]["pro_section_type"]
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          opinion_id: string
          points?: string[] | null
          position?: number
          type: Database["public"]["Enums"]["pro_section_type"]
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          opinion_id?: string
          points?: string[] | null
          position?: number
          type?: Database["public"]["Enums"]["pro_section_type"]
        }
        Relationships: [
          {
            foreignKeyName: "opinion_sections_opinion_id_fkey"
            columns: ["opinion_id"]
            isOneToOne: false
            referencedRelation: "opinions"
            referencedColumns: ["id"]
          },
        ]
      }
      opinions: {
        Row: {
          age_band: Database["public"]["Enums"]["age_band"] | null
          author_id: string
          author_line: string | null
          body: string
          created_at: string
          edited_at: string | null
          format: Database["public"]["Enums"]["contribution_format"]
          gender: Database["public"]["Enums"]["gender"] | null
          helpful_count: number
          hidden_at: string | null
          hidden_reason: string | null
          id: string
          insightful_count: number
          occupation: string | null
          place_id: string | null
          reply_count: number
          save_count: number
          topic_id: string
          updated_at: string
          useful_count: number
          verified_label: string | null
          vote: Database["public"]["Enums"]["sentiment"]
          well_explained_count: number
        }
        Insert: {
          age_band?: Database["public"]["Enums"]["age_band"] | null
          author_id: string
          author_line?: string | null
          body?: string
          created_at?: string
          edited_at?: string | null
          format?: Database["public"]["Enums"]["contribution_format"]
          gender?: Database["public"]["Enums"]["gender"] | null
          helpful_count?: number
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          insightful_count?: number
          occupation?: string | null
          place_id?: string | null
          reply_count?: number
          save_count?: number
          topic_id: string
          updated_at?: string
          useful_count?: number
          verified_label?: string | null
          vote: Database["public"]["Enums"]["sentiment"]
          well_explained_count?: number
        }
        Update: {
          age_band?: Database["public"]["Enums"]["age_band"] | null
          author_id?: string
          author_line?: string | null
          body?: string
          created_at?: string
          edited_at?: string | null
          format?: Database["public"]["Enums"]["contribution_format"]
          gender?: Database["public"]["Enums"]["gender"] | null
          helpful_count?: number
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          insightful_count?: number
          occupation?: string | null
          place_id?: string | null
          reply_count?: number
          save_count?: number
          topic_id?: string
          updated_at?: string
          useful_count?: number
          verified_label?: string | null
          vote?: Database["public"]["Enums"]["sentiment"]
          well_explained_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "opinions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "opinions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opinions_occupation_fkey"
            columns: ["occupation"]
            isOneToOne: false
            referencedRelation: "occupations"
            referencedColumns: ["label"]
          },
          {
            foreignKeyName: "opinions_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opinions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topic_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opinions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          id: string
          label: string
          level: Database["public"]["Enums"]["place_level"]
          parent_id: string | null
          path: string[]
          short: string
          sort_order: number
        }
        Insert: {
          id: string
          label: string
          level: Database["public"]["Enums"]["place_level"]
          parent_id?: string | null
          path?: string[]
          short: string
          sort_order?: number
        }
        Update: {
          id?: string
          label?: string
          level?: Database["public"]["Enums"]["place_level"]
          parent_id?: string | null
          path?: string[]
          short?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "places_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_history: {
        Row: {
          event: string | null
          pcts: number[]
          poll_id: string
          recorded_on: string
          total_votes: number
        }
        Insert: {
          event?: string | null
          pcts: number[]
          poll_id: string
          recorded_on: string
          total_votes?: number
        }
        Update: {
          event?: string | null
          pcts?: number[]
          poll_id?: string
          recorded_on?: string
          total_votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_history_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "poll_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_history_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          blurb: string
          id: string
          name: string
          poll_id: string
          slot: Database["public"]["Enums"]["option_slot"]
          vote_count: number
        }
        Insert: {
          blurb?: string
          id?: string
          name: string
          poll_id: string
          slot: Database["public"]["Enums"]["option_slot"]
          vote_count?: number
        }
        Update: {
          blurb?: string
          id?: string
          name?: string
          poll_id?: string
          slot?: Database["public"]["Enums"]["option_slot"]
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "poll_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_reason_helpful: {
        Row: {
          created_at: string
          reason_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          reason_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          reason_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_reason_helpful_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "poll_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_reason_helpful_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "poll_reason_helpful_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_reasons: {
        Row: {
          body: string
          created_at: string
          helpful_count: number
          hidden_at: string | null
          hidden_reason: string | null
          id: string
          option_id: string
          poll_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          helpful_count?: number
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          option_id: string
          poll_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          helpful_count?: number
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          option_id?: string
          poll_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_reasons_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_reasons_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "poll_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_reasons_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_reasons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "poll_reasons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_region_overrides: {
        Row: {
          note: string | null
          pcts: number[]
          place_id: string
          poll_id: string
        }
        Insert: {
          note?: string | null
          pcts: number[]
          place_id: string
          poll_id: string
        }
        Update: {
          note?: string | null
          pcts?: number[]
          place_id?: string
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_region_overrides_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_region_overrides_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "poll_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_region_overrides_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_stats: {
        Row: {
          last_activity_at: string | null
          poll_id: string
          reason_count: number
          total_votes: number
          trend_score: number
          updated_at: string
        }
        Insert: {
          last_activity_at?: string | null
          poll_id: string
          reason_count?: number
          total_votes?: number
          trend_score?: number
          updated_at?: string
        }
        Update: {
          last_activity_at?: string | null
          poll_id?: string
          reason_count?: number
          total_votes?: number
          trend_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_stats_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: true
            referencedRelation: "poll_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_stats_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: true
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          age_band: Database["public"]["Enums"]["age_band"] | null
          created_at: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          occupation: string | null
          option_id: string
          place_id: string | null
          poll_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age_band?: Database["public"]["Enums"]["age_band"] | null
          created_at?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          occupation?: string | null
          option_id: string
          place_id?: string | null
          poll_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age_band?: Database["public"]["Enums"]["age_band"] | null
          created_at?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          occupation?: string | null
          option_id?: string
          place_id?: string | null
          poll_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_occupation_fkey"
            columns: ["occupation"]
            isOneToOne: false
            referencedRelation: "occupations"
            referencedColumns: ["label"]
          },
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "poll_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          about: string
          archived_at: string | null
          category_id: string
          closes_at: string | null
          created_at: string
          created_by: string | null
          id: string
          place_id: string
          published_at: string | null
          question: string
          slug: string
          spread: number | null
          status: Database["public"]["Enums"]["artifact_status"]
          summary: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          about?: string
          archived_at?: string | null
          category_id: string
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          place_id: string
          published_at?: string | null
          question: string
          slug: string
          spread?: number | null
          status?: Database["public"]["Enums"]["artifact_status"]
          summary?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          about?: string
          archived_at?: string | null
          category_id?: string
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          place_id?: string
          published_at?: string | null
          question?: string
          slug?: string
          spread?: number | null
          status?: Database["public"]["Enums"]["artifact_status"]
          summary?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_stats: {
        Row: {
          answered: number
          computed_at: string
          helpful_pct: number | null
          user_id: string
        }
        Insert: {
          answered?: number
          computed_at?: string
          helpful_pct?: number | null
          user_id: string
        }
        Update: {
          answered?: number
          computed_at?: string
          helpful_pct?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "professional_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          dob: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          mobile: string | null
          occupation: string | null
          place_id: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          dob?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          mobile?: string | null
          occupation?: string | null
          place_id?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          dob?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          mobile?: string | null
          occupation?: string | null
          place_id?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_occupation_fkey"
            columns: ["occupation"]
            isOneToOne: false
            referencedRelation: "occupations"
            referencedColumns: ["label"]
          },
          {
            foreignKeyName: "profile_private_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_private_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profile_private_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_tone: string
          created_at: string
          display_name: string
          expertise: string[]
          headline: string
          id: string
          initials: string | null
          role: Database["public"]["Enums"]["account_role"]
          suspended_at: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_tone?: string
          created_at?: string
          display_name: string
          expertise?: string[]
          headline?: string
          id: string
          initials?: string | null
          role?: Database["public"]["Enums"]["account_role"]
          suspended_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_tone?: string
          created_at?: string
          display_name?: string
          expertise?: string[]
          headline?: string
          id?: string
          initials?: string | null
          role?: Database["public"]["Enums"]["account_role"]
          suspended_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      proof_kinds: {
        Row: {
          category: Database["public"]["Enums"]["ask_category"]
          evidence_category: string
          evidence_label: string
          id: Database["public"]["Enums"]["proof_type"]
          not_verified: string
          public_label: string
          weight: number
        }
        Insert: {
          category: Database["public"]["Enums"]["ask_category"]
          evidence_category: string
          evidence_label: string
          id: Database["public"]["Enums"]["proof_type"]
          not_verified: string
          public_label: string
          weight?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["ask_category"]
          evidence_category?: string
          evidence_label?: string
          id?: Database["public"]["Enums"]["proof_type"]
          not_verified?: string
          public_label?: string
          weight?: number
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          detail: string
          id: string
          reason: string
          reporter_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          subject_id: string
          subject_type: Database["public"]["Enums"]["report_subject"]
        }
        Insert: {
          created_at?: string
          detail?: string
          id?: string
          reason: string
          reporter_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          subject_id: string
          subject_type: Database["public"]["Enums"]["report_subject"]
        }
        Update: {
          created_at?: string
          detail?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["report_subject"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          plan: string
          provider: string | null
          provider_ref: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          plan?: string
          provider?: string | null
          provider_ref?: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          plan?: string
          provider?: string | null
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          occurred_on: string
          source_name: string
          source_url: string | null
          status: Database["public"]["Enums"]["artifact_status"]
          title: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          occurred_on: string
          source_name: string
          source_url?: string | null
          status: Database["public"]["Enums"]["artifact_status"]
          title: string
          topic_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          occurred_on?: string
          source_name?: string
          source_url?: string | null
          status?: Database["public"]["Enums"]["artifact_status"]
          title?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "timeline_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topic_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_aspect_options: {
        Row: {
          aspect_id: string
          id: string
          key: string
          label: string
          position: number
          tone: Database["public"]["Enums"]["sentiment"]
        }
        Insert: {
          aspect_id: string
          id?: string
          key: string
          label: string
          position?: number
          tone: Database["public"]["Enums"]["sentiment"]
        }
        Update: {
          aspect_id?: string
          id?: string
          key?: string
          label?: string
          position?: number
          tone?: Database["public"]["Enums"]["sentiment"]
        }
        Relationships: [
          {
            foreignKeyName: "topic_aspect_options_aspect_id_fkey"
            columns: ["aspect_id"]
            isOneToOne: false
            referencedRelation: "topic_aspects"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_aspects: {
        Row: {
          id: string
          key: string
          label: string
          position: number
          prompt: string
          topic_id: string
        }
        Insert: {
          id?: string
          key: string
          label: string
          position?: number
          prompt: string
          topic_id: string
        }
        Update: {
          id?: string
          key?: string
          label?: string
          position?: number
          prompt?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_aspects_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topic_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_aspects_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_context: {
        Row: {
          explain: string
          topic_id: string
          updated_at: string
          updated_note: string
        }
        Insert: {
          explain?: string
          topic_id: string
          updated_at?: string
          updated_note?: string
        }
        Update: {
          explain?: string
          topic_id?: string
          updated_at?: string
          updated_note?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_context_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: true
            referencedRelation: "topic_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_context_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: true
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_daily_stats: {
        Row: {
          measured_on: string
          negative_count: number
          neutral_count: number
          participants: number
          positive_count: number
          topic_id: string
        }
        Insert: {
          measured_on: string
          negative_count?: number
          neutral_count?: number
          participants?: number
          positive_count?: number
          topic_id: string
        }
        Update: {
          measured_on?: string
          negative_count?: number
          neutral_count?: number
          participants?: number
          positive_count?: number
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_daily_stats_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topic_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_daily_stats_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_follows: {
        Row: {
          created_at: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_follows_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topic_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_follows_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "topic_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_requests: {
        Row: {
          category_id: string | null
          created_at: string
          decline_note: string | null
          declined_at: string | null
          id: string
          name: string
          place_id: string | null
          rationale: string
          requested_by: string
          reviewed_by: string | null
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          decline_note?: string | null
          declined_at?: string | null
          id?: string
          name: string
          place_id?: string | null
          rationale?: string
          requested_by: string
          reviewed_by?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          decline_note?: string | null
          declined_at?: string | null
          id?: string
          name?: string
          place_id?: string | null
          rationale?: string
          requested_by?: string
          reviewed_by?: string | null
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_requests_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "topic_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "topic_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_requests_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topic_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_requests_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_stats: {
        Row: {
          change_direction:
            | Database["public"]["Enums"]["change_direction"]
            | null
          change_metric: Database["public"]["Enums"]["change_metric"] | null
          change_value: number | null
          follower_count: number
          last_activity_at: string | null
          negative_count: number
          neutral_count: number
          participants: number
          positive_count: number
          reply_count: number
          topic_id: string
          trend_score: number
          updated_at: string
          written_count: number
        }
        Insert: {
          change_direction?:
            | Database["public"]["Enums"]["change_direction"]
            | null
          change_metric?: Database["public"]["Enums"]["change_metric"] | null
          change_value?: number | null
          follower_count?: number
          last_activity_at?: string | null
          negative_count?: number
          neutral_count?: number
          participants?: number
          positive_count?: number
          reply_count?: number
          topic_id: string
          trend_score?: number
          updated_at?: string
          written_count?: number
        }
        Update: {
          change_direction?:
            | Database["public"]["Enums"]["change_direction"]
            | null
          change_metric?: Database["public"]["Enums"]["change_metric"] | null
          change_value?: number | null
          follower_count?: number
          last_activity_at?: string | null
          negative_count?: number
          neutral_count?: number
          participants?: number
          positive_count?: number
          reply_count?: number
          topic_id?: string
          trend_score?: number
          updated_at?: string
          written_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "topic_stats_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: true
            referencedRelation: "topic_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_stats_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: true
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_trend_markers: {
        Row: {
          id: string
          label: string
          offset_ratio: number
          topic_id: string
        }
        Insert: {
          id?: string
          label: string
          offset_ratio: number
          topic_id: string
        }
        Update: {
          id?: string
          label?: string
          offset_ratio?: number
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_trend_markers_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topic_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_trend_markers_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          about: string
          archived_at: string | null
          category_id: string
          created_at: string
          created_by: string | null
          facet_set_id: string | null
          id: string
          name: string
          place_id: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["artifact_status"]
          summary: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          about?: string
          archived_at?: string | null
          category_id: string
          created_at?: string
          created_by?: string | null
          facet_set_id?: string | null
          id?: string
          name: string
          place_id: string
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["artifact_status"]
          summary?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          about?: string
          archived_at?: string | null
          category_id?: string
          created_at?: string
          created_by?: string | null
          facet_set_id?: string | null
          id?: string
          name?: string
          place_id?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["artifact_status"]
          summary?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "topics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_facet_set_id_fkey"
            columns: ["facet_set_id"]
            isOneToOne: false
            referencedRelation: "facet_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      poll_cards: {
        Row: {
          category_id: string | null
          closes_at: string | null
          id: string | null
          last_activity_at: string | null
          place_id: string | null
          place_path: string[] | null
          published_at: string | null
          question: string | null
          reason_count: number | null
          slug: string | null
          status: Database["public"]["Enums"]["artifact_status"] | null
          summary: string | null
          tags: string[] | null
          total_votes: number | null
          trend_score: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polls_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          answered: number | null
          areas: Database["public"]["Enums"]["ask_category"][] | null
          expertise: string[] | null
          headline: string | null
          helpful_pct: number | null
          initials: string | null
          name: string | null
          tone: string | null
          user_id: string | null
        }
        Relationships: []
      }
      topic_cards: {
        Row: {
          category_id: string | null
          change_direction:
            | Database["public"]["Enums"]["change_direction"]
            | null
          change_metric: Database["public"]["Enums"]["change_metric"] | null
          change_value: number | null
          follower_count: number | null
          id: string | null
          last_activity_at: string | null
          name: string | null
          negative_count: number | null
          neutral_count: number | null
          participants: number | null
          place_id: string | null
          place_path: string[] | null
          positive_count: number | null
          published_at: string | null
          reply_count: number | null
          slug: string | null
          status: Database["public"]["Enums"]["artifact_status"] | null
          summary: string | null
          tags: string[] | null
          trend_score: number | null
          updated_at: string | null
          written_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      age_band: {
        Args: { at?: string; dob: string }
        Returns: Database["public"]["Enums"]["age_band"]
      }
      answer_aspect: {
        Args: { aspect: string; choice: string }
        Returns: {
          aspect_id: string
          created_at: string
          option_id: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "facet_responses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_facet_set: {
        Args: { set_id: string; target_topic: string }
        Returns: number
      }
      archive_poll: {
        Args: { target: string }
        Returns: {
          about: string
          archived_at: string | null
          category_id: string
          closes_at: string | null
          created_at: string
          created_by: string | null
          id: string
          place_id: string
          published_at: string | null
          question: string
          slug: string
          spread: number | null
          status: Database["public"]["Enums"]["artifact_status"]
          summary: string
          tags: string[]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "polls"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      asks_used: { Args: { uid?: string }; Returns: number }
      aspect_tallies: {
        Args: { target: string }
        Returns: {
          aspect_id: string
          option_id: string
          responses: number
        }[]
      }
      author_poll: {
        Args: {
          about: string
          category_id: string
          closes_at?: string
          options: Json
          place_id: string
          publish?: boolean
          question: string
          slug: string
          status: Database["public"]["Enums"]["artifact_status"]
          summary: string
          tags: string[]
        }
        Returns: {
          about: string
          archived_at: string | null
          category_id: string
          closes_at: string | null
          created_at: string
          created_by: string | null
          id: string
          place_id: string
          published_at: string | null
          question: string
          slug: string
          spread: number | null
          status: Database["public"]["Enums"]["artifact_status"]
          summary: string
          tags: string[]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "polls"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      author_topic: {
        Args: {
          about: string
          aspects: Json
          category_id: string
          name: string
          place_id: string
          publish?: boolean
          slug: string
          status: Database["public"]["Enums"]["artifact_status"]
          summary: string
          tags: string[]
        }
        Returns: {
          about: string
          archived_at: string | null
          category_id: string
          created_at: string
          created_by: string | null
          facet_set_id: string | null
          id: string
          name: string
          place_id: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["artifact_status"]
          summary: string
          tags: string[]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "topics"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      block_tallies: {
        Args: { target: string }
        Returns: {
          option_id: string
          responses: number
        }[]
      }
      can_ask: { Args: { uid?: string }; Returns: boolean }
      can_view_question: {
        Args: { qid: string; uid?: string }
        Returns: boolean
      }
      cast_poll_vote: {
        Args: {
          option_slot: Database["public"]["Enums"]["option_slot"]
          poll_slug: string
        }
        Returns: {
          age_band: Database["public"]["Enums"]["age_band"] | null
          created_at: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          occupation: string | null
          option_id: string
          place_id: string | null
          poll_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "poll_votes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cast_vote: {
        Args: {
          body?: string
          topic_slug: string
          vote: Database["public"]["Enums"]["sentiment"]
        }
        Returns: {
          age_band: Database["public"]["Enums"]["age_band"] | null
          author_id: string
          author_line: string | null
          body: string
          created_at: string
          edited_at: string | null
          format: Database["public"]["Enums"]["contribution_format"]
          gender: Database["public"]["Enums"]["gender"] | null
          helpful_count: number
          hidden_at: string | null
          hidden_reason: string | null
          id: string
          insightful_count: number
          occupation: string | null
          place_id: string | null
          reply_count: number
          save_count: number
          topic_id: string
          updated_at: string
          useful_count: number
          verified_label: string | null
          vote: Database["public"]["Enums"]["sentiment"]
          well_explained_count: number
        }
        SetofOptions: {
          from: "*"
          to: "opinions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      clear_aspect: { Args: { aspect: string }; Returns: boolean }
      current_role_is: {
        Args: { target: Database["public"]["Enums"]["account_role"] }
        Returns: boolean
      }
      delete_account: {
        Args: { reason?: string; target: string }
        Returns: undefined
      }
      email_for_username: { Args: { handle: string }; Returns: string }
      explain_poll_vote: {
        Args: { poll_slug: string; reason: string }
        Returns: {
          body: string
          created_at: string
          helpful_count: number
          hidden_at: string | null
          hidden_reason: string | null
          id: string
          option_id: string
          poll_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "poll_reasons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      initials: { Args: { full_name: string }; Returns: string }
      is_active: { Args: { uid?: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_editor: { Args: never; Returns: boolean }
      is_pro: { Args: { uid?: string }; Returns: boolean }
      is_verified_for: {
        Args: {
          area: Database["public"]["Enums"]["ask_category"]
          uid?: string
        }
        Returns: boolean
      }
      my_facet_answers: {
        Args: never
        Returns: {
          aspect_id: string
          option_id: string
          topic_slug: string
        }[]
      }
      my_poll_votes: {
        Args: never
        Returns: {
          option_slot: Database["public"]["Enums"]["option_slot"]
          poll_slug: string
          updated_at: string
        }[]
      }
      my_reply_votes: {
        Args: { opinion: string }
        Returns: {
          reply_id: string
          vote: Database["public"]["Enums"]["reader_vote"]
        }[]
      }
      my_votes: {
        Args: never
        Returns: {
          body: string
          topic_slug: string
          updated_at: string
          vote: Database["public"]["Enums"]["sentiment"]
        }[]
      }
      place_covers: {
        Args: { filter_id: string; place_id: string }
        Returns: boolean
      }
      poll_audience: {
        Args: { target: string }
        Returns: {
          dimension: string
          segment: string
          slot: Database["public"]["Enums"]["option_slot"]
          voters: number
        }[]
      }
      poll_daily_series: {
        Args: { target: string }
        Returns: {
          cast_on: string
          slot: Database["public"]["Enums"]["option_slot"]
          votes: number
        }[]
      }
      poll_demographic_opt_in: { Args: { target: string }; Returns: number }
      poll_reason_counts: {
        Args: { target: string }
        Returns: {
          reasons: number
          slot: Database["public"]["Enums"]["option_slot"]
        }[]
      }
      publish_poll: {
        Args: { target: string }
        Returns: {
          about: string
          archived_at: string | null
          category_id: string
          closes_at: string | null
          created_at: string
          created_by: string | null
          id: string
          place_id: string
          published_at: string | null
          question: string
          slug: string
          spread: number | null
          status: Database["public"]["Enums"]["artifact_status"]
          summary: string
          tags: string[]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "polls"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_admin_action: {
        Args: {
          action: Database["public"]["Enums"]["admin_action"]
          reason?: string
          subject_id: string
          subject_label?: string
        }
        Returns: undefined
      }
      reply_to_opinion: {
        Args: { body: string; opinion: string; parent?: string }
        Returns: {
          author_id: string
          body: string
          created_at: string
          depth: number
          dislikes: number
          hidden_at: string | null
          hidden_reason: string | null
          id: string
          likes: number
          opinion_id: string
          parent_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "opinion_replies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      restore_poll: {
        Args: { target: string }
        Returns: {
          about: string
          archived_at: string | null
          category_id: string
          closes_at: string | null
          created_at: string
          created_by: string | null
          id: string
          place_id: string
          published_at: string | null
          question: string
          slug: string
          spread: number | null
          status: Database["public"]["Enums"]["artifact_status"]
          summary: string
          tags: string[]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "polls"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      retract_poll_reason: { Args: { poll_slug: string }; Returns: boolean }
      review_credential: {
        Args: {
          approve: boolean
          expires?: string
          note?: string
          target: string
        }
        Returns: {
          category: Database["public"]["Enums"]["ask_category"]
          evidence_category: string
          expires_at: string | null
          id: string
          proof_type: Database["public"]["Enums"]["proof_type"]
          public_label: string
          review_note: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["credential_status"]
          submitted_at: string
          user_id: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "credentials"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_account_role: {
        Args: {
          new_role: Database["public"]["Enums"]["account_role"]
          target: string
        }
        Returns: {
          avatar_tone: string
          created_at: string
          display_name: string
          expertise: string[]
          headline: string
          id: string
          initials: string | null
          role: Database["public"]["Enums"]["account_role"]
          suspended_at: string | null
          updated_at: string
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_account_suspended: {
        Args: { reason?: string; suspended: boolean; target: string }
        Returns: {
          avatar_tone: string
          created_at: string
          display_name: string
          expertise: string[]
          headline: string
          id: string
          initials: string | null
          role: Database["public"]["Enums"]["account_role"]
          suspended_at: string | null
          updated_at: string
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      slug_available: { Args: { candidate: string }; Returns: boolean }
      toggle_reason_helpful: { Args: { reason: string }; Returns: boolean }
      topic_audience: {
        Args: { target: string }
        Returns: {
          dimension: string
          responses: number
          segment: string
          vote: Database["public"]["Enums"]["sentiment"]
        }[]
      }
      topic_daily_series: {
        Args: { target: string }
        Returns: {
          cast_on: string
          negative: number
          neutral: number
          positive: number
          votes: number
        }[]
      }
      topic_demographic_opt_in: { Args: { target: string }; Returns: number }
      topic_gender_opt_in: { Args: { target: string }; Returns: number }
      vote_on_reply: {
        Args: {
          kind: Database["public"]["Enums"]["reader_vote"]
          reply: string
        }
        Returns: Database["public"]["Enums"]["reader_vote"]
      }
      withdraw_poll_vote: { Args: { poll_slug: string }; Returns: boolean }
      withdraw_vote: { Args: { topic_slug: string }; Returns: boolean }
    }
    Enums: {
      account_role: "member" | "editor" | "admin"
      admin_action:
        | "role_granted"
        | "account_suspended"
        | "account_restored"
        | "account_deleted"
        | "topic_deleted"
        | "poll_deleted"
        | "credential_reviewed"
      age_band: "Under 17" | "17–20" | "21–24" | "25–30" | "31 and over"
      artifact_status:
        | "Proposed"
        | "Upcoming"
        | "Ongoing"
        | "Live"
        | "Announced"
        | "Under Investigation"
        | "Disputed"
        | "Confirmed"
        | "Resolved"
        | "Completed"
        | "Cancelled"
        | "Delayed"
        | "Inactive"
      ask_category: "career" | "college" | "exam"
      change_direction: "up" | "down"
      change_metric:
        | "negative-sentiment"
        | "positive-sentiment"
        | "participation"
        | "discussion"
        | "trending"
      contribution_format: "standard" | "pro"
      credential_status: "pending" | "verified" | "rejected" | "revoked"
      gender: "Woman" | "Man" | "Non-binary" | "Prefer not to say"
      interactive_kind:
        | "poll"
        | "rating"
        | "rank"
        | "scenario"
        | "agree_challenge"
        | "verdict"
      option_slot: "a" | "b" | "c" | "d"
      place_level: "world" | "country" | "state" | "city"
      pro_reaction: "insightful" | "useful" | "well_explained"
      pro_section_type:
        | "headline"
        | "quick_take"
        | "breakdown"
        | "key_points"
        | "interactive"
        | "final_verdict"
      proof_type:
        | "employment"
        | "experience-letter"
        | "linkedin"
        | "portfolio"
        | "student-id"
        | "degree"
        | "alumni"
        | "scorecard"
        | "rank-card"
        | "admission-letter"
      question_visibility: "public" | "private"
      reader_vote: "like" | "dislike"
      report_subject:
        | "topic"
        | "poll"
        | "contribution"
        | "reply"
        | "poll_reason"
        | "ask_answer"
        | "ask_comment"
        | "profile"
      sender_role: "asker" | "professional"
      sentiment: "Positive" | "Neutral" | "Negative"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "expired"
      thread_outcome: "Resolved" | "Not useful"
      thread_status:
        | "Awaiting answer"
        | "Answered"
        | "In discussion"
        | "Resolved"
        | "Closed"
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
    Enums: {
      account_role: ["member", "editor", "admin"],
      admin_action: [
        "role_granted",
        "account_suspended",
        "account_restored",
        "account_deleted",
        "topic_deleted",
        "poll_deleted",
        "credential_reviewed",
      ],
      age_band: ["Under 17", "17–20", "21–24", "25–30", "31 and over"],
      artifact_status: [
        "Proposed",
        "Upcoming",
        "Ongoing",
        "Live",
        "Announced",
        "Under Investigation",
        "Disputed",
        "Confirmed",
        "Resolved",
        "Completed",
        "Cancelled",
        "Delayed",
        "Inactive",
      ],
      ask_category: ["career", "college", "exam"],
      change_direction: ["up", "down"],
      change_metric: [
        "negative-sentiment",
        "positive-sentiment",
        "participation",
        "discussion",
        "trending",
      ],
      contribution_format: ["standard", "pro"],
      credential_status: ["pending", "verified", "rejected", "revoked"],
      gender: ["Woman", "Man", "Non-binary", "Prefer not to say"],
      interactive_kind: [
        "poll",
        "rating",
        "rank",
        "scenario",
        "agree_challenge",
        "verdict",
      ],
      option_slot: ["a", "b", "c", "d"],
      place_level: ["world", "country", "state", "city"],
      pro_reaction: ["insightful", "useful", "well_explained"],
      pro_section_type: [
        "headline",
        "quick_take",
        "breakdown",
        "key_points",
        "interactive",
        "final_verdict",
      ],
      proof_type: [
        "employment",
        "experience-letter",
        "linkedin",
        "portfolio",
        "student-id",
        "degree",
        "alumni",
        "scorecard",
        "rank-card",
        "admission-letter",
      ],
      question_visibility: ["public", "private"],
      reader_vote: ["like", "dislike"],
      report_subject: [
        "topic",
        "poll",
        "contribution",
        "reply",
        "poll_reason",
        "ask_answer",
        "ask_comment",
        "profile",
      ],
      sender_role: ["asker", "professional"],
      sentiment: ["Positive", "Neutral", "Negative"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "expired",
      ],
      thread_outcome: ["Resolved", "Not useful"],
      thread_status: [
        "Awaiting answer",
        "Answered",
        "In discussion",
        "Resolved",
        "Closed",
      ],
    },
  },
} as const
