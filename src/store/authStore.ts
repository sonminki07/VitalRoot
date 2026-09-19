import { create } from "zustand";
import { AuthState, AuthView } from "../types/auth.types";
import { supabase } from "../utils/supabase";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitializing: true,
  isModalOpen: false,
  authView: "emailInput",
  errorMessage: null,
  successMessage: null,
  targetEmail: "",

  openModal: (view: AuthView = "emailInput") =>
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

  setTargetEmail: (targetEmail: string) => set({ targetEmail }),

  clearMessages: () =>
    set({
      errorMessage: null,
      successMessage: null,
    }),

  // Google OAuth 소셜 로그인
  signInWithGoogle: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
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

  // 1. 이메일로 6자리 인증번호(OTP) 발송 (회원가입/로그인 공통)
  sendOtp: async (email: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, // 미가입 회원이면 자동 신규 가입
        },
      });

      if (error) throw error;

      set({
        targetEmail: email,
        authView: "otpInput",
        isLoading: false,
        errorMessage: null,
        successMessage: "6자리 인증번호가 이메일로 발송되었습니다.",
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "인증번호 발송에 실패했습니다.";
      set({ errorMessage: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  // 2. 6자리 인증번호 검증 및 즉각 로그인 처리
  verifyOtp: async (email: string, token: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const cleanToken = token.trim();
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: cleanToken,
        type: "email",
      });

      if (error) {
        if (error.message.includes("Token has expired") || error.message.includes("invalid")) {
          throw new Error("인증번호가 올바르지 않거나 유효시간이 만료되었습니다.");
        }
        throw error;
      }

      set({
        user: data.user,
        session: data.session,
        authView: "success",
        isLoading: false,
        errorMessage: null,
        successMessage: "인증이 성공적으로 완료되었습니다!",
      });

      // 사용자가 로그인 완료를 즉각 체감할 수 있도록 0.6초 후 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 600);

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "인증번호 확인에 실패했습니다.";
      set({ errorMessage: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  // 로그아웃
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
      // 로그아웃 시에도 새로고침하여 초기 상태 반영
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (err) {
      console.warn("SignOut error:", err);
      set({ user: null, session: null, isLoading: false });
    }
  },

  // 초기 세션 복원 및 리스너 등록
  initAuth: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        session,
        user: session?.user ?? null,
        isInitializing: false,
      });

      if (window.location.search.includes("code=") || window.location.hash.includes("access_token=")) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });

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

    return () => {
      subscription.unsubscribe();
    };
  },
}));
