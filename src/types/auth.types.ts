import { User, Session } from "@supabase/supabase-js";

export type AuthTab = "signin" | "signup";
export type AuthStep = "form" | "otp" | "success";
export type AuthView = "emailInput" | "otpInput" | "success";

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitializing: boolean;
  isModalOpen: boolean;
  authTab: AuthTab;
  authStep: AuthStep;
  authView: AuthView;
  errorMessage: string | null;
  successMessage: string | null;
  targetEmail: string;

  // 액션
  openModal: (tab?: AuthTab | AuthView) => void;
  closeModal: () => void;
  setAuthTab: (tab: AuthTab) => void;
  setAuthStep: (step: AuthStep) => void;
  setAuthView: (view: AuthView) => void;
  setTargetEmail: (email: string) => void;
  clearMessages: () => void;
  signInWithGoogle: () => Promise<void>;

  // 이메일 + 비밀번호 및 회원가입 OTP 플로우
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  verifySignupOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  resendSignupOtp: (email: string) => Promise<{ success: boolean; error?: string }>;

  // 레거시 호환
  sendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;

  signOut: () => Promise<void>;
  initAuth: () => () => void;
}
