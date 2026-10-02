import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getApiConfig } from "../config/apiConfig";

const apiConfig = getApiConfig();
const supabaseUrl = apiConfig.supabase.url;
const supabaseAnonKey = apiConfig.supabase.anonKey;

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
    return createClient(supabaseUrl, supabaseAnonKey);
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
