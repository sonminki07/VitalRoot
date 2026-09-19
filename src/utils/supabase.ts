import { createClient, SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://biruuwsoinqtlhdwbajh.supabase.co";
const DEFAULT_KEY = "sb_publishable_Rx-4GGZmbY2eZwIkTAvqTw_Yrxk_13Y";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY;

function initSupabase(): SupabaseClient {
  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  } catch (err) {
    console.warn("Supabase init failed, creating fallback client:", err);
    return createClient(DEFAULT_URL, DEFAULT_KEY);
  }
}

export const supabase = initSupabase();

/**
 * Supabase DB 연결 테스트 헬퍼 함수
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase.from("wellness_places").select("id").limit(1);
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: "Supabase 연결 성공 (wellness_places 테이블 감지)" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg };
  }
}
