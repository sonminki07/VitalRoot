import { User, Session } from "@supabase/supabase-js";

export type AuthView = "emailInput" | "otpInput" | "success";

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitializing: boolean;
  isModalOpen: boolean;
  authView: AuthView;
  errorMessage: string | null;
  successMessage: string | null;
  targetEmail: string;

  // 액션
  openModal: (view?: AuthView) => void;
  closeModal: () => void;
  setAuthView: (view: AuthView) => void;
  setTargetEmail: (email: string) => void;
  clearMessages: () => void;
  signInWithGoogle: () => Promise<void>;
  sendOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  initAuth: () => () => void;
}
