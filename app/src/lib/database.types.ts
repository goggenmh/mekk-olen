// Autogenererte databasetypar (supabase gen types). Ikkje rediger for hand.
// Regenerer med Supabase sitt verktoy om skjemaet endrar seg.

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ansatte: {
        Row: {
          aktiv: boolean
          butikk_id: string | null
          created_at: string
          email: string
          farge: string
          feriedagar: number
          feriepengesats: number
          frikortgrense: number | null
          id: string
          init: string
          konsern_admin: boolean
          leder: boolean
          lonn: string
          navn: string
          rolle: string
          sats: number
          skatteprosent: number | null
          skattetype: string | null
          telefon: string
          tidlegare_andre: number
          tidlegare_ar: number | null
          tidlegare_mekk: number
        }
        Insert: {
          aktiv?: boolean
          butikk_id?: string | null
          created_at?: string
          email: string
          farge?: string
          feriedagar?: number
          feriepengesats?: number
          frikortgrense?: number | null
          id: string
          init?: string
          konsern_admin?: boolean
          leder?: boolean
          lonn?: string
          navn: string
          rolle?: string
          sats?: number
          skatteprosent?: number | null
          skattetype?: string | null
          telefon?: string
          tidlegare_andre?: number
          tidlegare_ar?: number | null
          tidlegare_mekk?: number
        }
        Update: {
          aktiv?: boolean
          butikk_id?: string | null
          created_at?: string
          email?: string
          farge?: string
          feriedagar?: number
          feriepengesats?: number
          frikortgrense?: number | null
          id?: string
          init?: string
          konsern_admin?: boolean
          leder?: boolean
          lonn?: string
          navn?: string
          rolle?: string
          sats?: number
          skatteprosent?: number | null
          skattetype?: string | null
          telefon?: string
          tidlegare_andre?: number
          tidlegare_ar?: number | null
          tidlegare_mekk?: number
        }
        Relationships: [
          {
            foreignKeyName: "ansatte_butikk_fk"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
        ]
      }
      bestilling_purring: {
        Row: {
          dag: string
          order_id: string
        }
        Insert: {
          dag: string
          order_id: string
        }
        Update: {
          dag?: string
          order_id?: string
        }
        Relationships: []
      }
      butikkar: {
        Row: {
          aktiv: boolean
          created_at: string
          farge: string | null
          id: string
          namn: string
        }
        Insert: {
          aktiv?: boolean
          created_at?: string
          farge?: string | null
          id?: string
          namn: string
        }
        Update: {
          aktiv?: boolean
          created_at?: string
          farge?: string | null
          id?: string
          namn?: string
        }
        Relationships: []
      }
      doc_stadfesting: {
        Row: {
          ansatt: string
          butikk_id: string
          doc_id: string
          id: string
          stadfesta_at: string
        }
        Insert: {
          ansatt: string
          butikk_id: string
          doc_id: string
          id?: string
          stadfesta_at?: string
        }
        Update: {
          ansatt?: string
          butikk_id?: string
          doc_id?: string
          id?: string
          stadfesta_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_stadfesting_ansatt_fkey"
            columns: ["ansatt"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_stadfesting_butikk_id_fkey"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doc_stadfesting_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "docs"
            referencedColumns: ["id"]
          },
        ]
      }
      docs: {
        Row: {
          butikk_id: string
          dato: string
          fil_namn: string | null
          fil_url: string | null
          id: string
          kategori: string
          notat: string
          tittel: string
        }
        Insert: {
          butikk_id: string
          dato?: string
          fil_namn?: string | null
          fil_url?: string | null
          id?: string
          kategori?: string
          notat?: string
          tittel: string
        }
        Update: {
          butikk_id?: string
          dato?: string
          fil_namn?: string | null
          fil_url?: string | null
          id?: string
          kategori?: string
          notat?: string
          tittel?: string
        }
        Relationships: [
          {
            foreignKeyName: "docs_butikk_fk"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
        ]
      }
      ferie: {
        Row: {
          ansatt: string
          behandla_at: string | null
          behandla_av: string | null
          butikk_id: string
          created_at: string
          fra: string | null
          id: string
          status: string
          svar: string
          tekst: string
          til: string | null
          type: string
        }
        Insert: {
          ansatt: string
          behandla_at?: string | null
          behandla_av?: string | null
          butikk_id: string
          created_at?: string
          fra?: string | null
          id?: string
          status?: string
          svar?: string
          tekst?: string
          til?: string | null
          type: string
        }
        Update: {
          ansatt?: string
          behandla_at?: string | null
          behandla_av?: string | null
          butikk_id?: string
          created_at?: string
          fra?: string | null
          id?: string
          status?: string
          svar?: string
          tekst?: string
          til?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferie_ansatt_fkey"
            columns: ["ansatt"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferie_behandla_av_fkey"
            columns: ["behandla_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferie_butikk_fk"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
        ]
      }
      innlogging_status: {
        Row: {
          ansatt_id: string
          feil: number
          laast_til: string | null
          v2: boolean
        }
        Insert: {
          ansatt_id: string
          feil?: number
          laast_til?: string | null
          v2?: boolean
        }
        Update: {
          ansatt_id?: string
          feil?: number
          laast_til?: string | null
          v2?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "innlogging_status_ansatt_id_fkey"
            columns: ["ansatt_id"]
            isOneToOne: true
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      ledige_vakter: {
        Row: {
          butikk_id: string
          created_at: string
          date: string
          grunn: string | null
          id: string
          oppretta_av: string
          skift: string
          slutt: string
          start: string
          teken_av: string | null
        }
        Insert: {
          butikk_id: string
          created_at?: string
          date: string
          grunn?: string | null
          id?: string
          oppretta_av: string
          skift?: string
          slutt: string
          start: string
          teken_av?: string | null
        }
        Update: {
          butikk_id?: string
          created_at?: string
          date?: string
          grunn?: string | null
          id?: string
          oppretta_av?: string
          skift?: string
          slutt?: string
          start?: string
          teken_av?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledige_vakter_butikk_id_fkey"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledige_vakter_oppretta_av_fkey"
            columns: ["oppretta_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledige_vakter_teken_av_fkey"
            columns: ["teken_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      meldinger: {
        Row: {
          butikk_id: string
          created_at: string
          fra: string
          id: string
          tekst: string
          til: string | null
        }
        Insert: {
          butikk_id: string
          created_at?: string
          fra: string
          id?: string
          tekst: string
          til?: string | null
        }
        Update: {
          butikk_id?: string
          created_at?: string
          fra?: string
          id?: string
          tekst?: string
          til?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meldinger_butikk_fk"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meldinger_fra_fkey"
            columns: ["fra"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meldinger_til_fkey"
            columns: ["til"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      oppgave_rutinar: {
        Row: {
          aktiv: boolean
          ansvar: string
          butikk_id: string | null
          created_at: string
          dagar: number[]
          detalj: string
          id: string
          kategori: string
          manadsdag: number | null
          prioritet: string
          sjekkliste: Json
          tittel: string
        }
        Insert: {
          aktiv?: boolean
          ansvar?: string
          butikk_id?: string | null
          created_at?: string
          dagar?: number[]
          detalj?: string
          id?: string
          kategori?: string
          manadsdag?: number | null
          prioritet?: string
          sjekkliste?: Json
          tittel: string
        }
        Update: {
          aktiv?: boolean
          ansvar?: string
          butikk_id?: string | null
          created_at?: string
          dagar?: number[]
          detalj?: string
          id?: string
          kategori?: string
          manadsdag?: number | null
          prioritet?: string
          sjekkliste?: Json
          tittel?: string
        }
        Relationships: [
          {
            foreignKeyName: "oppgave_rutinar_butikk_id_fkey"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          antal: number
          bilde: string | null
          butikk_id: string
          created_at: string
          dato: string
          id: string
          kunde: string
          lenke: string | null
          leverandor: string
          notat: string
          pris: number | null
          registrert_av: string | null
          status: string
          telefon: string
          vare: string
          varenr: string
          varsla: string | null
        }
        Insert: {
          antal?: number
          bilde?: string | null
          butikk_id: string
          created_at?: string
          dato: string
          id?: string
          kunde: string
          lenke?: string | null
          leverandor?: string
          notat?: string
          pris?: number | null
          registrert_av?: string | null
          status?: string
          telefon?: string
          vare?: string
          varenr?: string
          varsla?: string | null
        }
        Update: {
          antal?: number
          bilde?: string | null
          butikk_id?: string
          created_at?: string
          dato?: string
          id?: string
          kunde?: string
          lenke?: string | null
          leverandor?: string
          notat?: string
          pris?: number | null
          registrert_av?: string | null
          status?: string
          telefon?: string
          vare?: string
          varenr?: string
          varsla?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_butikk_fk"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_registrert_av_fkey"
            columns: ["registrert_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      paaminning_sendt: {
        Row: {
          sendt_at: string
          shift_id: string
          type: string
        }
        Insert: {
          sendt_at?: string
          shift_id: string
          type: string
        }
        Update: {
          sendt_at?: string
          shift_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "paaminning_sendt_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          ansatt: string
          butikk_id: string
          kan_godkjenne: boolean
        }
        Insert: {
          ansatt: string
          butikk_id: string
          kan_godkjenne?: boolean
        }
        Update: {
          ansatt?: string
          butikk_id?: string
          kan_godkjenne?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "permissions_ansatt_fkey"
            columns: ["ansatt"]
            isOneToOne: true
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissions_butikk_fk"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
        ]
      }
      push_noklar: {
        Row: {
          created_at: string
          id: number
          private_key: string
          public_key: string
        }
        Insert: {
          created_at?: string
          id?: number
          private_key: string
          public_key: string
        }
        Update: {
          created_at?: string
          id?: number
          private_key?: string
          public_key?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          ansatt: string
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
        }
        Insert: {
          ansatt: string
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
        }
        Update: {
          ansatt?: string
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_ansatt_fkey"
            columns: ["ansatt"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_swaps: {
        Row: {
          butikk_id: string
          created_at: string
          dag: string
          fra: string
          id: string
          shift_id: string
          status: string
          tid: string
          til: string
        }
        Insert: {
          butikk_id: string
          created_at?: string
          dag: string
          fra: string
          id?: string
          shift_id: string
          status?: string
          tid: string
          til: string
        }
        Update: {
          butikk_id?: string
          created_at?: string
          dag?: string
          fra?: string
          id?: string
          shift_id?: string
          status?: string
          tid?: string
          til?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_swaps_butikk_fk"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swaps_fra_fkey"
            columns: ["fra"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swaps_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swaps_til_fkey"
            columns: ["til"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          ansatt: string
          butikk_id: string
          date: string
          id: string
          skift: string
          slutt: string
          start: string
        }
        Insert: {
          ansatt: string
          butikk_id: string
          date: string
          id?: string
          skift: string
          slutt: string
          start: string
        }
        Update: {
          ansatt?: string
          butikk_id?: string
          date?: string
          id?: string
          skift?: string
          slutt?: string
          start?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_ansatt_fkey"
            columns: ["ansatt"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_butikk_fk"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
        ]
      }
      standardveke: {
        Row: {
          ansatt: string
          butikk_id: string
          created_at: string
          dag: string
          id: string
          slutt: string
          start: string
        }
        Insert: {
          ansatt: string
          butikk_id: string
          created_at?: string
          dag: string
          id?: string
          slutt: string
          start: string
        }
        Update: {
          ansatt?: string
          butikk_id?: string
          created_at?: string
          dag?: string
          id?: string
          slutt?: string
          start?: string
        }
        Relationships: [
          {
            foreignKeyName: "standardveke_ansatt_fkey"
            columns: ["ansatt"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standardveke_butikk_fk"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          ansatt: string
          blokkert: boolean
          blokkert_grunn: string
          butikk_id: string
          detalj: string
          ferdig: boolean
          ferdig_at: string | null
          ferdig_av: string | null
          frist: string | null
          gjentak: string
          id: string
          kategori: string
          oppretta_at: string
          oppretta_av: string | null
          order_id: string | null
          prioritet: string
          rutine_id: string | null
          sjekkliste: Json
          tittel: string
        }
        Insert: {
          ansatt?: string
          blokkert?: boolean
          blokkert_grunn?: string
          butikk_id: string
          detalj?: string
          ferdig?: boolean
          ferdig_at?: string | null
          ferdig_av?: string | null
          frist?: string | null
          gjentak?: string
          id?: string
          kategori?: string
          oppretta_at?: string
          oppretta_av?: string | null
          order_id?: string | null
          prioritet?: string
          rutine_id?: string | null
          sjekkliste?: Json
          tittel: string
        }
        Update: {
          ansatt?: string
          blokkert?: boolean
          blokkert_grunn?: string
          butikk_id?: string
          detalj?: string
          ferdig?: boolean
          ferdig_at?: string | null
          ferdig_av?: string | null
          frist?: string | null
          gjentak?: string
          id?: string
          kategori?: string
          oppretta_at?: string
          oppretta_av?: string | null
          order_id?: string | null
          prioritet?: string
          rutine_id?: string | null
          sjekkliste?: Json
          tittel?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_butikk_fk"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_ferdig_av_fkey"
            columns: ["ferdig_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_oppretta_av_fkey"
            columns: ["oppretta_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_rutine_id_fkey"
            columns: ["rutine_id"]
            isOneToOne: false
            referencedRelation: "oppgave_rutinar"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          ansatt: string
          auto: boolean
          butikk_id: string
          date: string
          id: string
          pause: number
          slutt: string
          start: string
          status: string
        }
        Insert: {
          ansatt: string
          auto?: boolean
          butikk_id: string
          date: string
          id?: string
          pause?: number
          slutt: string
          start: string
          status?: string
        }
        Update: {
          ansatt?: string
          auto?: boolean
          butikk_id?: string
          date?: string
          id?: string
          pause?: number
          slutt?: string
          start?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_ansatt_fkey"
            columns: ["ansatt"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_butikk_fk"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
        ]
      }
      utilgjengeleg: {
        Row: {
          ansatt: string
          butikk_id: string
          created_at: string
          dato: string
          grunn: string | null
          id: string
        }
        Insert: {
          ansatt: string
          butikk_id: string
          created_at?: string
          dato: string
          grunn?: string | null
          id?: string
        }
        Update: {
          ansatt?: string
          butikk_id?: string
          created_at?: string
          dato?: string
          grunn?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "utilgjengeleg_ansatt_fkey"
            columns: ["ansatt"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utilgjengeleg_butikk_fk"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
        ]
      }
      utleige_eining: {
        Row: {
          butikk_id: string
          created_at: string
          id: string
          kode: string
          notat: string
          produkt_id: string
          status: string
        }
        Insert: {
          butikk_id: string
          created_at?: string
          id?: string
          kode: string
          notat?: string
          produkt_id: string
          status?: string
        }
        Update: {
          butikk_id?: string
          created_at?: string
          id?: string
          kode?: string
          notat?: string
          produkt_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "utleige_eining_butikk_id_fkey"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utleige_eining_produkt_id_fkey"
            columns: ["produkt_id"]
            isOneToOne: false
            referencedRelation: "utleige_produkt"
            referencedColumns: ["id"]
          },
        ]
      }
      utleige_epost: {
        Row: {
          butikk_id: string
          created_at: string
          emne: string
          feil: string | null
          id: string
          reservasjon_id: string | null
          sendt_at: string | null
          status: string
          tekst: string
          til: string
          type: string
        }
        Insert: {
          butikk_id: string
          created_at?: string
          emne: string
          feil?: string | null
          id?: string
          reservasjon_id?: string | null
          sendt_at?: string | null
          status?: string
          tekst: string
          til: string
          type: string
        }
        Update: {
          butikk_id?: string
          created_at?: string
          emne?: string
          feil?: string | null
          id?: string
          reservasjon_id?: string | null
          sendt_at?: string | null
          status?: string
          tekst?: string
          til?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "utleige_epost_butikk_id_fkey"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utleige_epost_reservasjon_id_fkey"
            columns: ["reservasjon_id"]
            isOneToOne: false
            referencedRelation: "utleige_reservasjon"
            referencedColumns: ["id"]
          },
        ]
      }
      utleige_innstillingar: {
        Row: {
          avbestillingsfrist_timar: number
          butikk_id: string
          hente_tid: string
          kontakt_epost: string
          kontakt_telefon: string
          maks_dagar: number
          offentleg: boolean
          retur_tid: string
          svarfrist_timar: number
          updated_at: string
          vilkar: string
        }
        Insert: {
          avbestillingsfrist_timar?: number
          butikk_id: string
          hente_tid?: string
          kontakt_epost?: string
          kontakt_telefon?: string
          maks_dagar?: number
          offentleg?: boolean
          retur_tid?: string
          svarfrist_timar?: number
          updated_at?: string
          vilkar?: string
        }
        Update: {
          avbestillingsfrist_timar?: number
          butikk_id?: string
          hente_tid?: string
          kontakt_epost?: string
          kontakt_telefon?: string
          maks_dagar?: number
          offentleg?: boolean
          retur_tid?: string
          svarfrist_timar?: number
          updated_at?: string
          vilkar?: string
        }
        Relationships: [
          {
            foreignKeyName: "utleige_innstillingar_butikk_id_fkey"
            columns: ["butikk_id"]
            isOneToOne: true
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
        ]
      }
      utleige_kunde: {
        Row: {
          butikk_id: string
          created_at: string
          epost: string
          id: string
          namn: string
          notat: string
          telefon: string
        }
        Insert: {
          butikk_id: string
          created_at?: string
          epost?: string
          id?: string
          namn: string
          notat?: string
          telefon: string
        }
        Update: {
          butikk_id?: string
          created_at?: string
          epost?: string
          id?: string
          namn?: string
          notat?: string
          telefon?: string
        }
        Relationships: [
          {
            foreignKeyName: "utleige_kunde_butikk_id_fkey"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
        ]
      }
      utleige_produkt: {
        Row: {
          aktiv: boolean
          beskriving: string
          bilete_url: string | null
          butikk_id: string
          created_at: string
          depositum: number
          dogn_pris: number
          gebyr: number
          halvdag_pris: number | null
          helg_pris: number | null
          id: string
          kategori: string
          namn: string
          sortering: number
          tilbehor: string[]
        }
        Insert: {
          aktiv?: boolean
          beskriving?: string
          bilete_url?: string | null
          butikk_id: string
          created_at?: string
          depositum?: number
          dogn_pris: number
          gebyr?: number
          halvdag_pris?: number | null
          helg_pris?: number | null
          id?: string
          kategori?: string
          namn: string
          sortering?: number
          tilbehor?: string[]
        }
        Update: {
          aktiv?: boolean
          beskriving?: string
          bilete_url?: string | null
          butikk_id?: string
          created_at?: string
          depositum?: number
          dogn_pris?: number
          gebyr?: number
          halvdag_pris?: number | null
          helg_pris?: number | null
          id?: string
          kategori?: string
          namn?: string
          sortering?: number
          tilbehor?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "utleige_produkt_butikk_id_fkey"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
        ]
      }
      utleige_reservasjon: {
        Row: {
          bilete: Json
          butikk_id: string
          created_at: string
          depositum: number
          eining_id: string
          forleng_til: string | null
          gebyr: number
          gruppe_id: string | null
          id: string
          internt_notat: string
          kunde_id: string
          kunde_melding: string
          nummer: number
          oppgave_id: string | null
          pris_leige: number
          pris_total: number
          produkt_id: string
          retur_sjekk: Json | null
          returnert_at: string | null
          returnert_av: string | null
          slutt: string
          start: string
          status: string
          updated_at: string
          utlevert_at: string | null
          utlevert_av: string | null
          vilkar_godtatt_at: string | null
        }
        Insert: {
          bilete?: Json
          butikk_id: string
          created_at?: string
          depositum?: number
          eining_id: string
          forleng_til?: string | null
          gebyr?: number
          gruppe_id?: string | null
          id?: string
          internt_notat?: string
          kunde_id: string
          kunde_melding?: string
          nummer?: number
          oppgave_id?: string | null
          pris_leige?: number
          pris_total?: number
          produkt_id: string
          retur_sjekk?: Json | null
          returnert_at?: string | null
          returnert_av?: string | null
          slutt: string
          start: string
          status?: string
          updated_at?: string
          utlevert_at?: string | null
          utlevert_av?: string | null
          vilkar_godtatt_at?: string | null
        }
        Update: {
          bilete?: Json
          butikk_id?: string
          created_at?: string
          depositum?: number
          eining_id?: string
          forleng_til?: string | null
          gebyr?: number
          gruppe_id?: string | null
          id?: string
          internt_notat?: string
          kunde_id?: string
          kunde_melding?: string
          nummer?: number
          oppgave_id?: string | null
          pris_leige?: number
          pris_total?: number
          produkt_id?: string
          retur_sjekk?: Json | null
          returnert_at?: string | null
          returnert_av?: string | null
          slutt?: string
          start?: string
          status?: string
          updated_at?: string
          utlevert_at?: string | null
          utlevert_av?: string | null
          vilkar_godtatt_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utleige_reservasjon_butikk_id_fkey"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utleige_reservasjon_eining_id_fkey"
            columns: ["eining_id"]
            isOneToOne: false
            referencedRelation: "utleige_eining"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utleige_reservasjon_kunde_id_fkey"
            columns: ["kunde_id"]
            isOneToOne: false
            referencedRelation: "utleige_kunde"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utleige_reservasjon_oppgave_id_fkey"
            columns: ["oppgave_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utleige_reservasjon_produkt_id_fkey"
            columns: ["produkt_id"]
            isOneToOne: false
            referencedRelation: "utleige_produkt"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utleige_reservasjon_returnert_av_fkey"
            columns: ["returnert_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utleige_reservasjon_utlevert_av_fkey"
            columns: ["utlevert_av"]
            isOneToOne: false
            referencedRelation: "ansatte"
            referencedColumns: ["id"]
          },
        ]
      }
      utleige_sperre: {
        Row: {
          butikk_id: string
          created_at: string
          eining_id: string
          grunn: string
          id: string
          notat: string
          oppgave_id: string | null
          slutt: string | null
          start: string
        }
        Insert: {
          butikk_id: string
          created_at?: string
          eining_id: string
          grunn?: string
          id?: string
          notat?: string
          oppgave_id?: string | null
          slutt?: string | null
          start: string
        }
        Update: {
          butikk_id?: string
          created_at?: string
          eining_id?: string
          grunn?: string
          id?: string
          notat?: string
          oppgave_id?: string | null
          slutt?: string | null
          start?: string
        }
        Relationships: [
          {
            foreignKeyName: "utleige_sperre_butikk_id_fkey"
            columns: ["butikk_id"]
            isOneToOne: false
            referencedRelation: "butikkar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utleige_sperre_eining_id_fkey"
            columns: ["eining_id"]
            isOneToOne: false
            referencedRelation: "utleige_eining"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utleige_sperre_oppgave_id_fkey"
            columns: ["oppgave_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bestilling_status: {
        Args: { p_id: string }
        Returns: {
          butikk: string
          dato: string
          status: string
          vare: string
        }[]
      }
      butikk_detalj: { Args: { bid: string }; Returns: Json }
      er_konsern_admin: { Args: never; Returns: boolean }
      for_leiartimar: {
        Args: { p_fra?: string; p_til?: string }
        Returns: number
      }
      fyll_standardveke: {
        Args: { p_rader: Json; p_veke: string }
        Returns: {
          ansatt: string
          butikk_id: string
          date: string
          id: string
          skift: string
          slutt: string
          start: string
        }[]
        SetofOptions: {
          from: "*"
          to: "shifts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_active_leder: { Args: never; Returns: boolean }
      kan_godkjenne: { Args: never; Returns: boolean }
      konsern_oversikt: {
        Args: never
        Returns: {
          aktive_bestillingar: number
          butikk: string
          farge: string
          hoyprio_oppgaver: number
          leiar: string
          namn: string
          opne_oppgaver: number
          til_godkjenning: number
          tilsette: number
          timar_forrige: number
          timar_veka: number
          vakt_folk: Json
          vakter_i_dag: number
        }[]
      }
      kopier_veke: {
        Args: { p_fra: string; p_til: string }
        Returns: {
          ansatt: string
          butikk_id: string
          date: string
          id: string
          skift: string
          slutt: string
          start: string
        }[]
        SetofOptions: {
          from: "*"
          to: "shifts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      lag_rutineoppgaver: { Args: never; Returns: number }
      lager_sok: {
        Args: { p_q: string }
        Returns: {
          eining: string
          namn: string
          nr: string
          plassar: Json
          strekkode: string
          total: number
        }[]
      }
      lager_status: {
        Args: never
        Returns: {
          hendingar: number
          plassar: number
          varer_med_beholdning: number
        }[]
      }
      lagre_standardveke: {
        Args: { p_rader: Json }
        Returns: {
          ansatt: string
          butikk_id: string
          created_at: string
          dag: string
          id: string
          slutt: string
          start: string
        }[]
        SetofOptions: {
          from: "*"
          to: "standardveke"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      login_ansatte: {
        Args: never
        Returns: {
          aktiv: boolean
          butikk_id: string
          email: string
          farge: string
          id: string
          init: string
          konsern_admin: boolean
          leder: boolean
          navn: string
          rolle: string
        }[]
      }
      login_liste: {
        Args: never
        Returns: {
          aktiv: boolean
          butikk_id: string
          farge: string
          id: string
          init: string
          leder: boolean
          navn: string
          rolle: string
        }[]
      }
      login_status: {
        Args: never
        Returns: {
          id: string
          slutt: string
          start: string
        }[]
      }
      lonsdata: {
        Args: never
        Returns: {
          feriepengesats: number
          frikortgrense: number
          id: string
          sats: number
          skatteprosent: number
          skattetype: string
          tidlegare_andre: number
          tidlegare_ar: number
          tidlegare_mekk: number
        }[]
      }
      lonssatsar: {
        Args: never
        Returns: {
          frikortgrense: number
          id: string
          sats: number
          skatteprosent: number
          skattetype: string
        }[]
      }
      min_butikk: { Args: never; Returns: string }
      min_profil: {
        Args: never
        Returns: {
          aktiv: boolean
          butikk_id: string | null
          created_at: string
          email: string
          farge: string
          feriedagar: number
          feriepengesats: number
          frikortgrense: number | null
          id: string
          init: string
          konsern_admin: boolean
          leder: boolean
          lonn: string
          navn: string
          rolle: string
          sats: number
          skatteprosent: number | null
          skattetype: string | null
          telefon: string
          tidlegare_andre: number
          tidlegare_ar: number | null
          tidlegare_mekk: number
        }[]
        SetofOptions: {
          from: "*"
          to: "ansatte"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      registrer_push: {
        Args: { p_auth: string; p_endpoint: string; p_p256dh: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      utleige_eining_ledig: {
        Args: {
          p_eining: string
          p_slutt: string
          p_start: string
          p_utan?: string
        }
        Returns: boolean
      }
      utleige_epost_lag: {
        Args: { p_res: string; p_type: string }
        Returns: undefined
      }
      utleige_frigjer: { Args: { p_eining: string }; Returns: undefined }
      utleige_katalog: {
        Args: never
        Returns: {
          beskriving: string
          bilete_url: string
          butikk: string
          butikk_id: string
          depositum: number
          dogn_pris: number
          einingar: number
          gebyr: number
          halvdag_pris: number
          helg_pris: number
          hente_tid: string
          id: string
          kategori: string
          maks_dagar: number
          namn: string
          retur_tid: string
          tilbehor: string[]
          vilkar: string
        }[]
      }
      utleige_kr: { Args: { n: number }; Returns: string }
      utleige_kunde_avbestill: { Args: { p_res: string }; Returns: Json }
      utleige_kunde_forleng: {
        Args: { p_res: string; p_til: string }
        Returns: Json
      }
      utleige_ledigheit: {
        Args: { p_dagar?: number; p_fra: string; p_produkt: string }
        Returns: {
          dato: string
          ledige: number
          totalt: number
        }[]
      }
      utleige_mine_leige: { Args: never; Returns: Json }
      utleige_paaminningar: { Args: never; Returns: number }
      utleige_pris: {
        Args: { p_produkt: string; p_slutt: string; p_start: string }
        Returns: Json
      }
      utleige_retur: {
        Args: {
          p_notat: string
          p_res: string
          p_sjekk: Json
          p_vedlikehald: boolean
        }
        Returns: Json
      }
      utleige_send_forespurnad: {
        Args: {
          p_epost: string
          p_melding: string
          p_namn: string
          p_produkt: string
          p_slutt: string
          p_start: string
          p_telefon: string
          p_vilkar: boolean
        }
        Returns: Json
      }
      utleige_send_korg: {
        Args: {
          p_epost: string
          p_melding: string
          p_namn: string
          p_produkt: string[]
          p_slutt: string
          p_start: string
          p_telefon: string
          p_vilkar: boolean
        }
        Returns: Json
      }
      utleige_sjekk: {
        Args: { p_produkt: string; p_slutt: string; p_start: string }
        Returns: Json
      }
      utleige_tid: { Args: { t: string }; Returns: string }
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
    Enums: {},
  },
} as const

