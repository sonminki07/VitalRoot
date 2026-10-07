// 상태 관리 라이브러리 Zustand 스토어 생성 함수 불러오기
import { create } from "zustand";
// 인증 상태, 탭('signin'|'signup'), 단계('form'|'otp'|'success'), 뷰 타입 불러오기
import { AuthState, AuthTab, AuthStep, AuthView } from "../types/auth.types";
// Supabase 클라우드 인증 클라이언트 불러오기
import { supabase } from "../utils/supabase";

// 전역 인증 상태 관리 스토어 (Supabase Auth 연동 및 인증 모달 상태 머신 제어)
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,             // 현재 로그인된 Supabase 사용자 객체
  session: null,          // 활성 JWT 세션 객체
  isLoading: false,       // 비동기 인증 요청 처리 중 플래그
  isInitializing: true,   // 초기 세션 복구 및 검증 진행 중 플래그
  isModalOpen: false,     // 인증 팝업 모달 노출 여부
  authTab: "signin",      // 현재 선택된 탭: 'signin'(로그인) 또는 'signup'(회원가입)
  authStep: "form",       // 모달 단계: 'form'(입력폼) -> 'otp'(6자리 인증번호) -> 'success'(완료)
  authView: "emailInput", // 상세 뷰: 'emailInput' 또는 기타 인증 단계
  errorMessage: null,     // 오류 발생 시 사용자 노출 에러 메시지
  successMessage: null,   // 성공 시 안내 메시지 (예: OTP 발송 완료)
  targetEmail: "",        // 인증번호 검증 대상 이메일 주소

  // 인증 모달 열기 액션 (로그인 모드 또는 회원가입 모드로 진입)
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

  // 인증 모달 닫기 액션 (상태 초기화)
  closeModal: () =>
    set({
      isModalOpen: false,
      authStep: "form",
      errorMessage: null,
      successMessage: null,
    }),

  // 로그인 탭 ↔ 회원가입 탭 전환 액션
  setAuthTab: (tab: AuthTab) =>
    set({
      authTab: tab,
      authStep: "form",
      errorMessage: null,
      successMessage: null,
    }),

  // 모달 단계('form' | 'otp' | 'success') 수동 전환 액션
  setAuthStep: (step: AuthStep) =>
    set({
      authStep: step,
      errorMessage: null,
      successMessage: null,
    }),

  // 세부 뷰 전환 액션
  setAuthView: (view: AuthView) =>
    set({
      authView: view,
      errorMessage: null,
      successMessage: null,
    }),

  // 인증 대상 이메일 주소 저장 액션
  setTargetEmail: (targetEmail: string) => set({ targetEmail }),

  // 에러 및 성공 메시지 초기화 액션
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

  // [레거시 호환 OTP 발송]: Supabase 기본 설정상 비밀번호 없는 이메일 OTP 가입을 에뮬레이트하기 위해
  // 임시 고정 비밀번호("TempPass123!@#")를 전송하여 계정을 생성하고 6자리 OTP 메일을 유도하는 우회 패턴
  sendOtp: async (email: string) => {
    return get().signUpWithPassword(email, "TempPass123!@#");
  },
  // 6자리 OTP 인증번호 검증 및 세션 확정
  verifyOtp: async (email: string, token: string) => {
    return get().verifySignupOtp(email, token);
  },

  // Supabase 세션 종료(로그아웃) 처리
  signOut: async () => {
    set({ isLoading: true });
    try {
      // 백엔드 세션 무효화
      await supabase.auth.signOut();
      // 프론트엔드 상태 초기화
      set({
        user: null,
        session: null,
        isModalOpen: false,
        isLoading: false,
      });
      // [주의]: Supabase 로컬 토큰 캐시 및 인메모리 상태를 완전히 비우고 초기 화면으로 원복하기 위해 300ms 후 새로고침 수행
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (err) {
      console.warn("SignOut error:", err);
      set({ user: null, session: null, isLoading: false });
    }
  },

  // 애플리케이션 시작 시 세션 복원 및 전역 authStateChange 리스너 등록
  initAuth: () => {
    // 1. 현재 로컬에 저장된 기존 JWT 세션 조회
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({
        session,
        user: session?.user ?? null,
        isInitializing: false,
      });

      // OAuth 소셜 로그인 완료 후 URL에 남아있는 '?code=' 또는 '#access_token=' 파라미터를 브라우저 히스토리에서 깔끔하게 정리
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
