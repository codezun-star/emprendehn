import "server-only";

import { createClient } from "@supabase/supabase-js";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Cliente anónimo SIN cookies para las páginas públicas.
 * Al no leer cookies, Next.js puede prerenderizar y cachear (ISR) las páginas
 * del directorio. La seguridad la pone RLS: el rol anon solo ve negocios aprobados.
 */
export function crearClientePublico() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
