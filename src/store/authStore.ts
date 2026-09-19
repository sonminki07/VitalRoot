import { create } from "zustand";
import { AuthState, AuthView } from "../types/auth.types";
import { supabase } from "../utils/supabase";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitializing: true,
  isModalOpen: false,
  authView: "signIn",
  errorMessage: null,
  successMessage: null,
  registeredEmail: null,

  openModal: (view: AuthView = "signIn") =>
    set({
      isModalOpen: true,
      authView: view,
      errorMessage: null,
      successMessage: null,
    }),

  closeModal: () =>
    set({
      isModalOpen: false,
      errorMessage: null,
      successMessage: null,
    }),

  setAuthView: (view: AuthView) =>
    set({
      authView: view,
      errorMessage: null,
      successMessage: null,
    }),

  clearMessages: () =>
    set({
      errorMessage: null,
      successMessage: null,
    }),

  signInWithGoogle: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      // 로컬(localhost:8000) 및 Vercel 프로덕션 도메인 자동 적응
      const redirectTo = `${window.location.origin}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "구글 로그인 중 오류가 발생했습니다.";
      set({ errorMessage: msg, isLoading: false });
    }
  },

  signInWithEmail: async (email: string, password: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        if (error.message.includes("Email not confirmed")) {
          throw new Error("이메일 인증이 완료되지 않았습니다. 메일함을 확인해 주세요.");
        }
        throw error;
      }

      set({
        user: data.user,
        session: data.session,
        isModalOpen: false,
        isLoading: false,
        errorMessage: null,
      });
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "로그인에 실패했습니다.";
      set({ errorMessage: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  signUpWithEmail: async (email: string, password: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const redirectTo = `${window.location.origin}`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          throw new Error("이미 등록된 이메일 계정입니다. 로그인을 진행해 주세요.");
        }
        throw error;
      }

      // 엄격한 이메일 인증 모드: 가입 안내 화면으로 전환
      set({
        registeredEmail: email,
        authView: "verifyEmail",
        isLoading: false,
        errorMessage: null,
        successMessage: "가입 확인 메일이 성공적으로 발송되었습니다.",
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "회원가입에 실패했습니다.";
      set({ errorMessage: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({
        user: null,
        session: null,
        isModalOpen: false,
        isLoading: false,
      });
    } catch (err) {
      console.warn("SignOut error:", err);
      set({ user: null, session: null, isLoading: false });
    }
  },

  initAuth: () => {
    // 1. 현재 세션 로드
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        session,
        user: session?.user ?? null,
        isInitializing: false,
      });

      // OAuth 리턴 후 URL에 남아있는 ?code= 나 hash 정리
      if (window.location.search.includes("code=") || window.location.hash.includes("access_token=")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });

    // 2. 인증 상태 변화 실시간 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      set({
        session,
        user: session?.user ?? null,
        isInitializing: false,
      });

      if (event === "SIGNED_IN") {
        set({ isModalOpen: false, errorMessage: null });
        if (window.location.search.includes("code=") || window.location.hash.includes("access_token=")) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    });

    // 구독 해제 함수 반환
    return () => {
      subscription.unsubscribe();
    };
  },
}));
