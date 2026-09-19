import { User, Session } from "@supabase/supabase-js";

export type AuthView = "signIn" | "signUp" | "verifyEmail";

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitializing: boolean;
  isModalOpen: boolean;
  authView: AuthView;
  errorMessage: string | null;
  successMessage: string | null;
  registeredEmail: string | null;

  // 액션
  openModal: (view?: AuthView) => void;
  closeModal: () => void;
  setAuthView: (view: AuthView) => void;
  clearMessages: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  initAuth: () => () => void; // 구독 해제 함수 반환
}
