export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			billing_events: {
				Row: {
					id: string;
					payload: NonNullable<Json>;
					processed_at: string;
					type: string;
				};
				ComputedFields: never;
				Insert: {
					id: string;
					payload: NonNullable<Json>;
					processed_at?: string;
					type: string;
				};
				Update: {
					id?: string;
					payload?: NonNullable<Json>;
					processed_at?: string;
					type?: string;
				};
				Relationships: [];
			};
			breaks: {
				Row: {
					bloque_id: string | null;
					completed_at: string | null;
					created_at: string;
					device_id: string | null;
					ended_at: string | null;
					id: string;
					local_date: string;
					minutes_actual: number | null;
					minutes_planned: number;
					started_at: string | null;
					status: string;
					tipo: string;
					updated_at: string;
					user_id: string;
				};
				ComputedFields: never;
				Insert: {
					bloque_id?: string | null;
					completed_at?: string | null;
					created_at?: string;
					device_id?: string | null;
					ended_at?: string | null;
					id?: string;
					local_date?: string;
					minutes_actual?: number | null;
					minutes_planned: number;
					started_at?: string | null;
					status: string;
					tipo: string;
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					bloque_id?: string | null;
					completed_at?: string | null;
					created_at?: string;
					device_id?: string | null;
					ended_at?: string | null;
					id?: string;
					local_date?: string;
					minutes_actual?: number | null;
					minutes_planned?: number;
					started_at?: string | null;
					status?: string;
					tipo?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "breaks_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
			devices: {
				Row: {
					created_at: string;
					id: string;
					last_seen_at: string;
					name: string;
					platform: string | null;
					theme: string | null;
					user_id: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					id: string;
					last_seen_at?: string;
					name?: string;
					platform?: string | null;
					theme?: string | null;
					user_id?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					last_seen_at?: string;
					name?: string;
					platform?: string | null;
					theme?: string | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "devices_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
			pomodoros: {
				Row: {
					bloque_id: string | null;
					completed_at: string | null;
					created_at: string;
					cycle_position: number | null;
					device_id: string | null;
					ended_at: string | null;
					id: string;
					local_date: string;
					minutes_actual: number | null;
					minutes_planned: number;
					started_at: string | null;
					status: string;
					tarea_id: string | null;
					updated_at: string;
					user_id: string;
				};
				ComputedFields: never;
				Insert: {
					bloque_id?: string | null;
					completed_at?: string | null;
					created_at?: string;
					cycle_position?: number | null;
					device_id?: string | null;
					ended_at?: string | null;
					id?: string;
					local_date?: string;
					minutes_actual?: number | null;
					minutes_planned?: number;
					started_at?: string | null;
					status: string;
					tarea_id?: string | null;
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					bloque_id?: string | null;
					completed_at?: string | null;
					created_at?: string;
					cycle_position?: number | null;
					device_id?: string | null;
					ended_at?: string | null;
					id?: string;
					local_date?: string;
					minutes_actual?: number | null;
					minutes_planned?: number;
					started_at?: string | null;
					status?: string;
					tarea_id?: string | null;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "pomodoros_tarea_id_fkey";
						columns: ["tarea_id"];
						isOneToOne: false;
						referencedRelation: "tareas";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "pomodoros_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
			profiles: {
				Row: {
					created_at: string;
					display_name: string | null;
					id: string;
					leaderboard_opt_in: boolean;
					locale: string;
					public_slug: string | null;
					timezone: string;
					updated_at: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					display_name?: string | null;
					id: string;
					leaderboard_opt_in?: boolean;
					locale?: string;
					public_slug?: string | null;
					timezone?: string;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					display_name?: string | null;
					id?: string;
					leaderboard_opt_in?: boolean;
					locale?: string;
					public_slug?: string | null;
					timezone?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			subscriptions: {
				Row: {
					cancel_at_period_end: boolean;
					created_at: string;
					current_period_end: string | null;
					plan: string;
					provider: string;
					provider_customer_id: string | null;
					provider_subscription_id: string | null;
					status: string;
					updated_at: string;
					user_id: string;
				};
				ComputedFields: never;
				Insert: {
					cancel_at_period_end?: boolean;
					created_at?: string;
					current_period_end?: string | null;
					plan?: string;
					provider?: string;
					provider_customer_id?: string | null;
					provider_subscription_id?: string | null;
					status?: string;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					cancel_at_period_end?: boolean;
					created_at?: string;
					current_period_end?: string | null;
					plan?: string;
					provider?: string;
					provider_customer_id?: string | null;
					provider_subscription_id?: string | null;
					status?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "subscriptions_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: true;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
			tareas: {
				Row: {
					bloque_id: string | null;
					client_updated_at: string;
					completada_en_focus_id: string | null;
					completed_at: string | null;
					creada_en_focus_id: string | null;
					created_at: string;
					deleted_at: string | null;
					eliminada_en_focus_id: string | null;
					estado: string;
					id: string;
					last_device_id: string | null;
					nombre: string;
					updated_at: string;
					user_id: string;
				};
				ComputedFields: never;
				Insert: {
					bloque_id?: string | null;
					client_updated_at?: string;
					completada_en_focus_id?: string | null;
					completed_at?: string | null;
					creada_en_focus_id?: string | null;
					created_at?: string;
					deleted_at?: string | null;
					eliminada_en_focus_id?: string | null;
					estado?: string;
					id?: string;
					last_device_id?: string | null;
					nombre: string;
					updated_at?: string;
					user_id?: string;
				};
				Update: {
					bloque_id?: string | null;
					client_updated_at?: string;
					completada_en_focus_id?: string | null;
					completed_at?: string | null;
					creada_en_focus_id?: string | null;
					created_at?: string;
					deleted_at?: string | null;
					eliminada_en_focus_id?: string | null;
					estado?: string;
					id?: string;
					last_device_id?: string | null;
					nombre?: string;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "tareas_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "profiles";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			get_dashboard: { Args: { p_device_id?: string; p_dias?: number }; Returns: Json };
			purgar_tombstones: { Args: { dias?: number }; Returns: number };
			registrar_dispositivo: {
				Args: { p_id: string; p_name: string; p_platform?: string; p_theme?: string };
				Returns: undefined;
			};
			upsert_tarea: { Args: { payload: Json }; Returns: string };
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema["Enums"]
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	graphql_public: {
		Enums: {},
	},
	public: {
		Enums: {},
	},
} as const;
