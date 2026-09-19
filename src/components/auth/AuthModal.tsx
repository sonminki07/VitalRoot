import { useState, FormEvent } from "react";
import { useAuthStore } from "../../store/authStore";

export function AuthModal() {
  const {
    isModalOpen,
    closeModal,
    authView,
    setAuthView,
    isLoading,
    errorMessage,
    successMessage,
    registeredEmail,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    clearMessages,
  } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isModalOpen) return null;

  const handleSwitchView = (newView: "signIn" | "signUp") => {
    clearMessages();
    setLocalError(null);
    setAuthView(newView);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // 기본 유효성 검사
    if (!email || !email.includes("@")) {
      setLocalError("올바른 이메일 주소를 입력해 주세요.");
      return;
    }

    if (password.length < 6) {
      setLocalError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (authView === "signUp") {
      if (password !== confirmPassword) {
        setLocalError("비밀번호가 일치하지 않습니다.");
        return;
      }
      await signUpWithEmail(email, password);
    } else {
      await signInWithEmail(email, password);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-gray-900 border border-gray-700/70 rounded-2xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 닫기 버튼 */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
          aria-label="닫기"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 1. 이메일 인증 메일 발송 안내 뷰 (엄격한 이메일 인증 모드) */}
        {authView === "verifyEmail" ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              ✉️
            </div>
            <h3 className="text-xl font-bold text-white">가입 확인 메일 발송 완료</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              <span className="font-semibold text-emerald-400">{registeredEmail}</span>(으)로 인증 링크가 발송되었습니다.
            </p>
            <p className="text-xs text-gray-400 bg-gray-800/80 p-3 rounded-xl border border-gray-700/60">
              💡 메일함에서 링크를 클릭하여 인증을 완료하시면 VitalRoot 로그인이 가능합니다.
            </p>
            <button
              onClick={() => handleSwitchView("signIn")}
              className="mt-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              로그인 화면으로 이동
            </button>
          </div>
        ) : (
          <>
            {/* 타이틀 및 서브텍스트 */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="text-2xl">🌿</span>
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                  VitalRoot
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">
                {authView === "signIn" ? "웰니스 여행 로그인" : "신규 회원가입"}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {authView === "signIn"
                  ? "개인 맞춤형 웰니스 헬스케어 투어를 시작하세요"
                  : "간편 가입 후 맞춤형 식단과 산책로를 추천받으세요"}
              </p>
            </div>

            {/* Google 소셜 로그인 버튼 */}
            <button
              type="button"
              disabled={isLoading}
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-gray-100 text-gray-900 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-98 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google로 계속하기</span>
            </button>

            {/* 구분선 */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700/80"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-gray-900 px-3 text-gray-400">또는 이메일로 {authView === "signIn" ? "로그인" : "가입"}</span>
              </div>
            </div>

            {/* 에러 메시지 Alert */}
            {(localError || errorMessage) && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs flex items-center gap-2">
                <span>⚠️</span>
                <span>{localError || errorMessage}</span>
              </div>
            )}

            {/* 성공 메시지 Alert */}
            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2">
                <span>✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* 이메일 / 비밀번호 폼 */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">이메일 주소</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">비밀번호</label>
                <input
                  type="password"
                  required
                  placeholder="6자 이상 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {authView === "signUp" && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">비밀번호 확인</label>
                  <input
                    type="password"
                    required
                    placeholder="비밀번호 재입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>처리 중...</span>
                  </>
                ) : (
                  <span>{authView === "signIn" ? "이메일 로그인" : "회원가입 완료"}</span>
                )}
              </button>
            </form>

            {/* 하단 뷰 전환 링크 */}
            <div className="mt-5 text-center text-xs text-gray-400">
              {authView === "signIn" ? (
                <span>
                  계정이 없으신가요?{" "}
                  <button
                    type="button"
                    onClick={() => handleSwitchView("signUp")}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 ml-1"
                  >
                    회원가입
                  </button>
                </span>
              ) : (
                <span>
                  이미 계정이 있으신가요?{" "}
                  <button
                    type="button"
                    onClick={() => handleSwitchView("signIn")}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 ml-1"
                  >
                    로그인
                  </button>
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
