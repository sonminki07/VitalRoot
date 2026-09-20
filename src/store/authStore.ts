import { create } from "zustand";
import { AuthState, AuthTab, AuthStep, AuthView } from "../types/auth.types";
import { supabase } from "../utils/supabase";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitializing: true,
  isModalOpen: false,
  authTab: "signin",
  authStep: "form",
  authView: "emailInput",
  errorMessage: null,
  successMessage: null,
  targetEmail: "",

  openModal: (initialView?: AuthTab | AuthView) => {
    let tab: AuthTab = "signin";
    if (initialView === "signup") {
      tab = "signup";
    }
    set({
      isModalOpen: true,
      authTab: tab,
      authStep: "form",
      authView: "emailInput",
      errorMessage: null,
      successMessage: null,
    });
  },

  closeModal: () =>
    set({
      isModalOpen: false,
      authStep: "form",
      errorMessage: null,
      successMessage: null,
    }),

  setAuthTab: (tab: AuthTab) =>
    set({
      authTab: tab,
      authStep: "form",
      errorMessage: null,
      successMessage: null,
    }),

  setAuthStep: (step: AuthStep) =>
    set({
      authStep: step,
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

  // 1. 기존 회원: 이메일 + 비밀번호로 즉각 로그인
  signInWithPassword: async (email: string, password: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const trimmedEmail = email.trim();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          set({
            targetEmail: trimmedEmail,
            authStep: "otp",
            errorMessage: "이메일 인증이 완료되지 않은 계정입니다. 인증번호를 확인해 주세요.",
            isLoading: false,
          });
          return { success: false, error: "Email not confirmed" };
        }
        if (error.message.includes("Invalid login credentials") || error.message.includes("invalid")) {
          throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        throw error;
      }

      set({
        user: data.user,
        session: data.session,
        authStep: "success",
        isLoading: false,
        errorMessage: null,
        successMessage: "로그인되었습니다!",
      });

      setTimeout(() => {
        window.location.reload();
      }, 600);

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "로그인에 실패했습니다.";
      set({ errorMessage: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  // 2. 신규 회원: 이메일 + 비밀번호로 가입 요청 및 인증번호(OTP) 발송
  signUpWithPassword: async (email: string, password: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const trimmedEmail = email.trim();
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes("already registered") || lower.includes("user already exists")) {
          throw new Error("이미 등록된 이메일 계정입니다. [로그인] 탭을 이용해 주세요.");
        }
        throw error;
      }

      // Supabase Email Enumeration Protection:
      // 이미 존재하는 사용자의 경우 identities가 빈 배열([])로 반환됨
      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        throw new Error("이미 등록된 이메일 계정입니다. [로그인] 탭을 이용해 주세요.");
      }

      set({
        targetEmail: trimmedEmail,
        authStep: "otp",
        isLoading: false,
        errorMessage: null,
        successMessage: "가입 인증번호가 이메일로 발송되었습니다.",
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "회원가입 요청에 실패했습니다.";
      set({ errorMessage: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  // 3. 회원가입 이메일 인증번호(OTP) 검증 및 세션 확정
  verifySignupOtp: async (email: string, token: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const cleanToken = token.trim();
      const trimmedEmail = email.trim();

      // type: 'signup' 시도 후 호환성을 위해 'email'도 폴백
      let res = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: cleanToken,
        type: "signup",
      });

      if (res.error) {
        const retry = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token: cleanToken,
          type: "email",
        });
        if (!retry.error) {
          res = retry;
        }
      }

      if (res.error) {
        if (res.error.message.includes("Token has expired") || res.error.message.includes("invalid")) {
          throw new Error("인증번호가 올바르지 않거나 유효시간이 만료되었습니다.");
        }
        throw res.error;
      }

      set({
        user: res.data.user,
        session: res.data.session,
        authStep: "success",
        isLoading: false,
        errorMessage: null,
        successMessage: "회원가입 및 이메일 인증이 완료되었습니다!",
      });

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

  // 4. 회원가입 인증번호 재발송
  resendSignupOtp: async (email: string) => {
    set({ isLoading: true, errorMessage: null, successMessage: null });
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });
      if (error) throw error;
      set({
        isLoading: false,
        successMessage: "새 인증번호가 이메일로 재발송되었습니다.",
      });
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "인증번호 재전송에 실패했습니다.";
      set({ errorMessage: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  // 레거시 호환 OTP 발송 및 검증
  sendOtp: async (email: string) => {
    return get().signUpWithPassword(email, "TempPass123!@#");
  },
  verifyOtp: async (email: string, token: string) => {
    return get().verifySignupOtp(email, token);
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

      if (session?.user) {
        import("./wellnessStore").then(({ useWellnessStore }) => {
          useWellnessStore.getState().syncProfileWithDb(session.user.id);
        });
      }

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

      if (event === "SIGNED_IN" && session?.user) {
        set({ isModalOpen: false, errorMessage: null });
        import("./wellnessStore").then(({ useWellnessStore }) => {
          useWellnessStore.getState().syncProfileWithDb(session.user.id);
        });
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
