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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          cancel_reason: string | null
          channel: Database["public"]["Enums"]["appointment_channel"]
          created_at: string
          doctor_id: string
          duration_min: number
          establishment_code: string
          id: string
          patient_id: string
          reason: string | null
          reschedule_count: number
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          channel?: Database["public"]["Enums"]["appointment_channel"]
          created_at?: string
          doctor_id: string
          duration_min?: number
          establishment_code: string
          id?: string
          patient_id: string
          reason?: string | null
          reschedule_count?: number
          scheduled_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          channel?: Database["public"]["Enums"]["appointment_channel"]
          created_at?: string
          doctor_id?: string
          duration_min?: number
          establishment_code?: string
          id?: string
          patient_id?: string
          reason?: string | null
          reschedule_count?: number
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_establishment_code_fkey"
            columns: ["establishment_code"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      cie10: {
        Row: {
          code: string
          label: string
        }
        Insert: {
          code: string
          label: string
        }
        Update: {
          code?: string
          label?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          active: boolean
          establishment_code: string
          full_name: string
          id: string
          license_number: string
          specialty_code: string
        }
        Insert: {
          active?: boolean
          establishment_code: string
          full_name: string
          id?: string
          license_number: string
          specialty_code: string
        }
        Update: {
          active?: boolean
          establishment_code?: string
          full_name?: string
          id?: string
          license_number?: string
          specialty_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_establishment_code_fkey"
            columns: ["establishment_code"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "doctors_specialty_code_fkey"
            columns: ["specialty_code"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "doctors_specialty_code_fkey"
            columns: ["specialty_code"]
            isOneToOne: false
            referencedRelation: "v_appointments"
            referencedColumns: ["specialty_code"]
          },
        ]
      }
      encounters: {
        Row: {
          appointment_id: string | null
          bp_diastolic: number | null
          bp_systolic: number | null
          chief_complaint: string | null
          diagnosis_code: string | null
          diagnosis_notes: string | null
          doctor_id: string
          establishment_code: string
          findings: string | null
          finished_at: string | null
          heart_rate: number | null
          height_cm: number | null
          id: string
          patient_id: string
          plan: string | null
          started_at: string
          temperature_c: number | null
          weight_kg: number | null
        }
        Insert: {
          appointment_id?: string | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          chief_complaint?: string | null
          diagnosis_code?: string | null
          diagnosis_notes?: string | null
          doctor_id: string
          establishment_code: string
          findings?: string | null
          finished_at?: string | null
          heart_rate?: number | null
          height_cm?: number | null
          id?: string
          patient_id: string
          plan?: string | null
          started_at?: string
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Update: {
          appointment_id?: string | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          chief_complaint?: string | null
          diagnosis_code?: string | null
          diagnosis_notes?: string | null
          doctor_id?: string
          establishment_code?: string
          findings?: string | null
          finished_at?: string | null
          heart_rate?: number | null
          height_cm?: number | null
          id?: string
          patient_id?: string
          plan?: string | null
          started_at?: string
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "encounters_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "v_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_diagnosis_code_fkey"
            columns: ["diagnosis_code"]
            isOneToOne: false
            referencedRelation: "cie10"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "encounters_diagnosis_code_fkey"
            columns: ["diagnosis_code"]
            isOneToOne: false
            referencedRelation: "v_diagnoses_30d"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "encounters_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_establishment_code_fkey"
            columns: ["establishment_code"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "encounters_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      establishments: {
        Row: {
          active: boolean
          code: string
          kind: string
          name: string
          zone: string
        }
        Insert: {
          active?: boolean
          code: string
          kind: string
          name: string
          zone: string
        }
        Update: {
          active?: boolean
          code?: string
          kind?: string
          name?: string
          zone?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          actor: string | null
          created_at: string
          id: string
          lot_id: string | null
          medication_code: string
          note: string | null
          prescription_item_id: string | null
          quantity: number
          type: Database["public"]["Enums"]["movement_type"]
        }
        Insert: {
          actor?: string | null
          created_at?: string
          id?: string
          lot_id?: string | null
          medication_code: string
          note?: string | null
          prescription_item_id?: string | null
          quantity: number
          type: Database["public"]["Enums"]["movement_type"]
        }
        Update: {
          actor?: string | null
          created_at?: string
          id?: string
          lot_id?: string | null
          medication_code?: string
          note?: string | null
          prescription_item_id?: string | null
          quantity?: number
          type?: Database["public"]["Enums"]["movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "stock_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "v_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_medication_code_fkey"
            columns: ["medication_code"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "inventory_movements_medication_code_fkey"
            columns: ["medication_code"]
            isOneToOne: false
            referencedRelation: "v_medication_stock"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "inventory_movements_medication_code_fkey"
            columns: ["medication_code"]
            isOneToOne: false
            referencedRelation: "v_top_medications_30d"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "inventory_movements_prescription_item_id_fkey"
            columns: ["prescription_item_id"]
            isOneToOne: false
            referencedRelation: "prescription_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_prescription_item_id_fkey"
            columns: ["prescription_item_id"]
            isOneToOne: false
            referencedRelation: "v_prescription_items"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean
          allergen_group: string | null
          category: string
          code: string
          concentration: string | null
          form: string
          high_rotation: boolean
          min_stock: number
          name: string
          unit_price: number
        }
        Insert: {
          active?: boolean
          allergen_group?: string | null
          category: string
          code: string
          concentration?: string | null
          form: string
          high_rotation?: boolean
          min_stock?: number
          name: string
          unit_price: number
        }
        Update: {
          active?: boolean
          allergen_group?: string | null
          category?: string
          code?: string
          concentration?: string | null
          form?: string
          high_rotation?: boolean
          min_stock?: number
          name?: string
          unit_price?: number
        }
        Relationships: []
      }
      patients: {
        Row: {
          address: string | null
          affiliation_sector: string
          allergies: string[]
          birth_date: string
          blood_type: string | null
          chronic_conditions: string[]
          created_at: string
          email: string | null
          first_names: string
          home_establishment: string | null
          id: string
          insured_type: string
          last_names: string
          matricula: string
          phone: string | null
          sex: string
        }
        Insert: {
          address?: string | null
          affiliation_sector: string
          allergies?: string[]
          birth_date: string
          blood_type?: string | null
          chronic_conditions?: string[]
          created_at?: string
          email?: string | null
          first_names: string
          home_establishment?: string | null
          id?: string
          insured_type: string
          last_names: string
          matricula: string
          phone?: string | null
          sex: string
        }
        Update: {
          address?: string | null
          affiliation_sector?: string
          allergies?: string[]
          birth_date?: string
          blood_type?: string | null
          chronic_conditions?: string[]
          created_at?: string
          email?: string | null
          first_names?: string
          home_establishment?: string | null
          id?: string
          insured_type?: string
          last_names?: string
          matricula?: string
          phone?: string | null
          sex?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_home_establishment_fkey"
            columns: ["home_establishment"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["code"]
          },
        ]
      }
      prescription_items: {
        Row: {
          dose: string
          duration_days: number | null
          frequency: string
          id: string
          instructions: string | null
          line_no: number
          medication_code: string
          prescription_id: string
          quantity_dispensed: number
          quantity_prescribed: number
        }
        Insert: {
          dose: string
          duration_days?: number | null
          frequency: string
          id?: string
          instructions?: string | null
          line_no: number
          medication_code: string
          prescription_id: string
          quantity_dispensed?: number
          quantity_prescribed: number
        }
        Update: {
          dose?: string
          duration_days?: number | null
          frequency?: string
          id?: string
          instructions?: string | null
          line_no?: number
          medication_code?: string
          prescription_id?: string
          quantity_dispensed?: number
          quantity_prescribed?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_medication_code_fkey"
            columns: ["medication_code"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "prescription_items_medication_code_fkey"
            columns: ["medication_code"]
            isOneToOne: false
            referencedRelation: "v_medication_stock"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "prescription_items_medication_code_fkey"
            columns: ["medication_code"]
            isOneToOne: false
            referencedRelation: "v_top_medications_30d"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "v_encounters"
            referencedColumns: ["prescription_id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "v_prescription_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          dispensed_at: string | null
          doctor_id: string
          encounter_id: string
          folio: number
          id: string
          issued_at: string
          last_dispensed_at: string | null
          notes: string | null
          patient_id: string
          status: Database["public"]["Enums"]["prescription_status"]
        }
        Insert: {
          dispensed_at?: string | null
          doctor_id: string
          encounter_id: string
          folio?: never
          id?: string
          issued_at?: string
          last_dispensed_at?: string | null
          notes?: string | null
          patient_id: string
          status?: Database["public"]["Enums"]["prescription_status"]
        }
        Update: {
          dispensed_at?: string | null
          doctor_id?: string
          encounter_id?: string
          folio?: never
          id?: string
          issued_at?: string
          last_dispensed_at?: string | null
          notes?: string | null
          patient_id?: string
          status?: Database["public"]["Enums"]["prescription_status"]
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: true
            referencedRelation: "encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_encounter_id_fkey"
            columns: ["encounter_id"]
            isOneToOne: true
            referencedRelation: "v_encounters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      specialties: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
      }
      stock_lots: {
        Row: {
          expires_at: string
          id: string
          lot_number: string
          medication_code: string
          quantity: number
          received_at: string
        }
        Insert: {
          expires_at: string
          id?: string
          lot_number: string
          medication_code: string
          quantity: number
          received_at?: string
        }
        Update: {
          expires_at?: string
          id?: string
          lot_number?: string
          medication_code?: string
          quantity?: number
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_lots_medication_code_fkey"
            columns: ["medication_code"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "stock_lots_medication_code_fkey"
            columns: ["medication_code"]
            isOneToOne: false
            referencedRelation: "v_medication_stock"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "stock_lots_medication_code_fkey"
            columns: ["medication_code"]
            isOneToOne: false
            referencedRelation: "v_top_medications_30d"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      v_appointments: {
        Row: {
          cancel_reason: string | null
          channel: Database["public"]["Enums"]["appointment_channel"] | null
          created_at: string | null
          doctor_id: string | null
          doctor_name: string | null
          duration_min: number | null
          establishment_code: string | null
          establishment_name: string | null
          establishment_zone: string | null
          id: string | null
          local_date: string | null
          matricula: string | null
          patient_id: string | null
          patient_name: string | null
          reason: string | null
          reschedule_count: number | null
          scheduled_at: string | null
          specialty_code: string | null
          specialty_name: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_establishment_code_fkey"
            columns: ["establishment_code"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      v_daily_activity: {
        Row: {
          appointments: number | null
          attended: number | null
          day: string | null
          no_show: number | null
          prescriptions: number | null
          units_dispensed: number | null
        }
        Relationships: []
      }
      v_diagnoses_30d: {
        Row: {
          code: string | null
          encounters: number | null
          label: string | null
        }
        Relationships: []
      }
      v_encounters: {
        Row: {
          appointment_id: string | null
          bp_diastolic: number | null
          bp_systolic: number | null
          chief_complaint: string | null
          diagnosis_code: string | null
          diagnosis_label: string | null
          diagnosis_notes: string | null
          doctor_id: string | null
          doctor_name: string | null
          establishment_code: string | null
          establishment_name: string | null
          findings: string | null
          finished_at: string | null
          heart_rate: number | null
          height_cm: number | null
          id: string | null
          patient_id: string | null
          plan: string | null
          prescription_folio: number | null
          prescription_id: string | null
          prescription_status:
            | Database["public"]["Enums"]["prescription_status"]
            | null
          specialty_name: string | null
          started_at: string | null
          temperature_c: number | null
          weight_kg: number | null
        }
        Relationships: [
          {
            foreignKeyName: "encounters_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "v_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_diagnosis_code_fkey"
            columns: ["diagnosis_code"]
            isOneToOne: false
            referencedRelation: "cie10"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "encounters_diagnosis_code_fkey"
            columns: ["diagnosis_code"]
            isOneToOne: false
            referencedRelation: "v_diagnoses_30d"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "encounters_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_establishment_code_fkey"
            columns: ["establishment_code"]
            isOneToOne: false
            referencedRelation: "establishments"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "encounters_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      v_kpis_today: {
        Row: {
          appointments_today: number | null
          attended_today: number | null
          dispensed_today: number | null
          inventory_value: number | null
          lots_expired: number | null
          lots_expiring_90d: number | null
          meds_in_alert: number | null
          no_show_today: number | null
          pharmacy_queue: number | null
          prescriptions_today: number | null
          units_dispensed_today: number | null
          waiting_today: number | null
        }
        Relationships: []
      }
      v_lots: {
        Row: {
          concentration: string | null
          days_to_expiry: number | null
          expires_at: string | null
          expiry_status: string | null
          form: string | null
          id: string | null
          lot_number: string | null
          medication_code: string | null
          medication_name: string | null
          quantity: number | null
          received_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_lots_medication_code_fkey"
            columns: ["medication_code"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "stock_lots_medication_code_fkey"
            columns: ["medication_code"]
            isOneToOne: false
            referencedRelation: "v_medication_stock"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "stock_lots_medication_code_fkey"
            columns: ["medication_code"]
            isOneToOne: false
            referencedRelation: "v_top_medications_30d"
            referencedColumns: ["code"]
          },
        ]
      }
      v_medication_stock: {
        Row: {
          allergen_group: string | null
          available: number | null
          category: string | null
          code: string | null
          concentration: string | null
          expired: number | null
          expiring_90d: number | null
          form: string | null
          high_rotation: boolean | null
          lots: number | null
          min_stock: number | null
          name: string | null
          next_expiry: string | null
          stock_status: string | null
          stock_value: number | null
          unit_price: number | null
        }
        Relationships: []
      }
      v_prescription_items: {
        Row: {
          allergen_group: string | null
          available: number | null
          concentration: string | null
          dose: string | null
          duration_days: number | null
          form: string | null
          frequency: string | null
          id: string | null
          instructions: string | null
          line_no: number | null
          medication_code: string | null
          medication_name: string | null
          prescription_id: string | null
          quantity_dispensed: number | null
          quantity_pending: number | null
          quantity_prescribed: number | null
          stock_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_medication_code_fkey"
            columns: ["medication_code"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "prescription_items_medication_code_fkey"
            columns: ["medication_code"]
            isOneToOne: false
            referencedRelation: "v_medication_stock"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "prescription_items_medication_code_fkey"
            columns: ["medication_code"]
            isOneToOne: false
            referencedRelation: "v_top_medications_30d"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "v_encounters"
            referencedColumns: ["prescription_id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "v_prescription_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      v_prescription_queue: {
        Row: {
          allergies: string[] | null
          doctor_name: string | null
          establishment_name: string | null
          folio: number | null
          folio_label: string | null
          id: string | null
          issued_at: string | null
          items: number | null
          matricula: string | null
          patient_id: string | null
          patient_name: string | null
          specialty_name: string | null
          status: Database["public"]["Enums"]["prescription_status"] | null
          stock_ok: boolean | null
          units_pending: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      v_top_medications_30d: {
        Row: {
          code: string | null
          concentration: string | null
          form: string | null
          name: string | null
          units: number | null
          value_bs: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      available_slots: {
        Args: { p_date: string; p_doctor_id: string }
        Returns: {
          slot: string
        }[]
      }
      bo_today: { Args: never; Returns: string }
      book_appointment: {
        Args: {
          p_channel?: Database["public"]["Enums"]["appointment_channel"]
          p_doctor_id: string
          p_patient_id: string
          p_reason?: string
          p_scheduled_at: string
        }
        Returns: {
          cancel_reason: string | null
          channel: Database["public"]["Enums"]["appointment_channel"]
          created_at: string
          doctor_id: string
          duration_min: number
          establishment_code: string
          id: string
          patient_id: string
          reason: string | null
          reschedule_count: number
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_appointment: {
        Args: { p_appointment_id: string; p_reason?: string }
        Returns: {
          cancel_reason: string | null
          channel: Database["public"]["Enums"]["appointment_channel"]
          created_at: string
          doctor_id: string
          duration_min: number
          establishment_code: string
          id: string
          patient_id: string
          reason: string | null
          reschedule_count: number
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_prescription: {
        Args: { p_prescription_id: string }
        Returns: {
          dispensed_at: string | null
          doctor_id: string
          encounter_id: string
          folio: number
          id: string
          issued_at: string
          last_dispensed_at: string | null
          notes: string | null
          patient_id: string
          status: Database["public"]["Enums"]["prescription_status"]
        }
        SetofOptions: {
          from: "*"
          to: "prescriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_encounter: {
        Args: {
          p_data: Json
          p_encounter_id: string
          p_items?: Json
          p_notes?: string
        }
        Returns: string
      }
      day_slots: {
        Args: { p_date: string }
        Returns: {
          slot: string
        }[]
      }
      demo_schedule: { Args: never; Returns: Record<string, unknown> }
      dispense_prescription: {
        Args: {
          p_actor?: string
          p_at?: string
          p_lines?: Json
          p_prescription_id: string
        }
        Returns: Json
      }
      mark_no_show: {
        Args: { p_appointment_id: string }
        Returns: {
          cancel_reason: string | null
          channel: Database["public"]["Enums"]["appointment_channel"]
          created_at: string
          doctor_id: string
          duration_min: number
          establishment_code: string
          id: string
          patient_id: string
          reason: string | null
          reschedule_count: number
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      receive_stock: {
        Args: {
          p_actor?: string
          p_at?: string
          p_expires_at: string
          p_lot_number: string
          p_medication_code: string
          p_quantity: number
        }
        Returns: {
          expires_at: string
          id: string
          lot_number: string
          medication_code: string
          quantity: number
          received_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stock_lots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reschedule_appointment: {
        Args: { p_appointment_id: string; p_new_at: string }
        Returns: {
          cancel_reason: string | null
          channel: Database["public"]["Enums"]["appointment_channel"]
          created_at: string
          doctor_id: string
          duration_min: number
          establishment_code: string
          id: string
          patient_id: string
          reason: string | null
          reschedule_count: number
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reset_demo: { Args: never; Returns: Json }
      start_encounter: { Args: { p_appointment_id: string }; Returns: string }
      write_off_expired_lot: {
        Args: { p_actor?: string; p_lot_id: string }
        Returns: {
          expires_at: string
          id: string
          lot_number: string
          medication_code: string
          quantity: number
          received_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stock_lots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      appointment_channel: "app" | "ventanilla" | "telefono"
      appointment_status:
        | "programada"
        | "en_atencion"
        | "atendida"
        | "cancelada"
        | "no_asistio"
      movement_type: "ingreso" | "dispensacion" | "ajuste" | "baja_vencimiento"
      prescription_status: "emitida" | "parcial" | "dispensada" | "anulada"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      appointment_channel: ["app", "ventanilla", "telefono"],
      appointment_status: [
        "programada",
        "en_atencion",
        "atendida",
        "cancelada",
        "no_asistio",
      ],
      movement_type: ["ingreso", "dispensacion", "ajuste", "baja_vencimiento"],
      prescription_status: ["emitida", "parcial", "dispensada", "anulada"],
    },
  },
} as const
