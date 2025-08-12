import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Morador = Tables<"moradores">;
export type MoradorInsert = TablesInsert<"moradores">;
export type MoradorUpdate = TablesUpdate<"moradores">;
