import { useState, FormEvent, useEffect } from "react";
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
    targetEmail,
    signInWithGoogle,
    sendOtp,
    verifyOtp,
    clearMessages,
  } = useAuthStore();

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (targetEmail) {
      setEmail(targetEmail);
    }
  }, [targetEmail]);

  if (!isModalOpen) return null;

  // 1. 이메일로 6자리 인증번호 전송
  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !email.includes("@")) {
      setLocalError("올바른 이메일 주소를 입력해 주세요.");
      return;
    }

    await sendOtp(email.trim());
  };

  // 2. 6자리 인증번호 검증 및 로그인
  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setLocalError("6자리 인증번호를 정확히 입력해 주세요.");
      return;
    }

    await verifyOtp(email.trim(), cleanCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-gray-900 border border-gray-700/80 rounded-2xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 우측 상단 닫기 버튼 */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
          aria-label="닫기"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* VIEW 3: 인증 성공 피드백 (새로고침 직전) */}
        {authView === "success" ? (
          <div className="text-center py-8 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              ✓
            </div>
            <h3 className="text-xl font-bold text-white">로그인 인증 완료!</h3>
            <p className="text-sm text-gray-300">
              사용자 인증이 확인되었습니다.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 pt-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>잠시 후 화면이 새로고침됩니다...</span>
            </div>
          </div>
        ) : (
          <>
            {/* 상단 타이틀 */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="text-2xl">🌿</span>
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                  VitalRoot
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">
                {authView === "emailInput" ? "간편 로그인 및 회원가입" : "인증번호 입력"}
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                {authView === "emailInput"
                  ? "비밀번호 없이 이메일 인증번호로 안전하게 시작하세요"
                  : "수신된 이메일의 6자리 인증코드를 입력해 주세요"}
              </p>
            </div>

            {/* Google 원클릭 소셜 로그인 */}
            {authView === "emailInput" && (
              <>
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
                    <span className="bg-gray-900 px-3 text-gray-400">또는 이메일 인증번호로 시작</span>
                  </div>
                </div>
              </>
            )}

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

            {/* VIEW 1: 이메일 입력 폼 */}
            {authView === "emailInput" && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">이메일 주소</label>
                  <input
                    type="email"
                    required
                    placeholder="example@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    입력하신 이메일로 6자리 숫자 인증코드가 즉시 발송됩니다.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>인증번호 발송 중...</span>
                    </>
                  ) : (
                    <span>인증번호 받기</span>
                  )}
                </button>
              </form>
            )}

            {/* VIEW 2: 6자리 인증번호 입력 폼 */}
            {authView === "otpInput" && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in">
                <div className="bg-gray-800/60 p-3 rounded-xl border border-gray-700/60 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-gray-400 block text-[11px]">인증 이메일</span>
                    <span className="font-semibold text-emerald-400">{email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setLocalError(null);
                      setAuthView("emailInput");
                    }}
                    className="text-gray-400 hover:text-white underline text-[11px]"
                  >
                    이메일 변경
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    6자리 인증번호 입력
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    required
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-gray-800 border-2 border-emerald-500/60 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest text-white placeholder-gray-600 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otpCode.length < 6}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>인증 확인 중...</span>
                    </>
                  ) : (
                    <span>인증 완료 및 로그인</span>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => sendOtp(email)}
                    className="text-xs text-gray-400 hover:text-emerald-400 transition-colors underline"
                  >
                    인증번호를 받지 못하셨나요? 재발송
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
