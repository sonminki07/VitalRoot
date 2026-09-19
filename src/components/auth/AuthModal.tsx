import { useState, FormEvent, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";

export function AuthModal() {
  const {
    isModalOpen,
    closeModal,
    authTab,
    setAuthTab,
    authStep,
    setAuthStep,
    isLoading,
    errorMessage,
    successMessage,
    targetEmail,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    verifySignupOtp,
    resendSignupOtp,
    clearMessages,
  } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (targetEmail) {
      setEmail(targetEmail);
    }
  }, [targetEmail]);

  // 모달 닫힐 때 폼 초기화
  useEffect(() => {
    if (!isModalOpen) {
      setPassword("");
      setConfirmPassword("");
      setOtpCode("");
      setLocalError(null);
      clearMessages();
    }
  }, [isModalOpen, clearMessages]);

  if (!isModalOpen) return null;

  // 1. 기존 회원 로그인 제출
  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setLocalError("올바른 이메일 주소를 입력해 주세요.");
      return;
    }
    if (!password) {
      setLocalError("비밀번호를 입력해 주세요.");
      return;
    }

    await signInWithPassword(trimmedEmail, password);
  };

  // 2. 신규 회원가입 제출 (이메일+비번 검증 후 OTP 발송)
  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setLocalError("올바른 이메일 주소를 입력해 주세요.");
      return;
    }
    if (!password || password.length < 6) {
      setLocalError("비밀번호는 최소 6자리 이상 입력해 주세요.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    await signUpWithPassword(trimmedEmail, password);
  };

  // 3. 수신된 인증번호 검증 (6~8자리 유연 지원)
  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length < 6) {
      setLocalError("이메일로 받으신 인증번호(6~8자리)를 입력해 주세요.");
      return;
    }

    await verifySignupOtp(email.trim(), cleanCode);
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

        {/* STEP 3: 인증/로그인 성공 피드백 (새로고침 직전) */}
        {authStep === "success" ? (
          <div className="text-center py-8 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl">
              ✓
            </div>
            <h3 className="text-xl font-bold text-white">인증 및 로그인 완료!</h3>
            <p className="text-sm text-gray-300">
              계정 인증이 확인되었습니다.
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
            {/* 상단 브랜드 타이틀 */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-2 mb-1.5">
                <span className="text-2xl">🌿</span>
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                  VitalRoot
                </span>
              </div>
              <h2 className="text-base font-bold text-white">
                {authStep === "otp"
                  ? "이메일 인증번호 확인"
                  : authTab === "signin"
                  ? "로그인"
                  : "회원가입"}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {authStep === "otp"
                  ? "수신된 이메일의 인증코드를 입력해 주세요"
                  : authTab === "signin"
                  ? "이메일과 비밀번호를 입력해 접속하세요"
                  : "안전한 웰니스 케어를 위해 계정을 생성하세요"}
              </p>
            </div>

            {/* STEP 1: 입력 폼 (로그인 / 회원가입 탭) */}
            {authStep === "form" && (
              <>
                {/* 로그인 / 회원가입 상단 탭 */}
                <div className="flex bg-gray-800/80 p-1 rounded-xl mb-5 border border-gray-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      setLocalError(null);
                      clearMessages();
                      setAuthTab("signin");
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      authTab === "signin"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    로그인
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocalError(null);
                      clearMessages();
                      setAuthTab("signup");
                    }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      authTab === "signup"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    회원가입
                  </button>
                </div>

                {/* Google 원클릭 소셜 로그인 */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={signInWithGoogle}
                  className="w-full flex items-center justify-center gap-3 py-2 px-4 bg-white hover:bg-gray-100 text-gray-900 rounded-xl text-xs font-semibold transition-all shadow-md active:scale-98 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700/80"></div>
                  </div>
                  <div className="relative flex justify-center text-[11px]">
                    <span className="bg-gray-900 px-3 text-gray-400">또는 이메일 계정으로 계속</span>
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

            {/* FORM A: 로그인 폼 */}
            {authStep === "form" && authTab === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">이메일 주소</label>
                  <input
                    type="email"
                    required
                    placeholder="example@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">비밀번호</label>
                  <input
                    type="password"
                    required
                    placeholder="비밀번호 입력"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>로그인 처리 중...</span>
                    </>
                  ) : (
                    <span>로그인</span>
                  )}
                </button>

                <div className="text-center pt-2 text-xs text-gray-400">
                  계정이 없으신가요?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setLocalError(null);
                      clearMessages();
                      setAuthTab("signup");
                    }}
                    className="text-emerald-400 hover:underline font-semibold ml-1"
                  >
                    회원가입
                  </button>
                </div>
              </form>
            )}

            {/* FORM B: 회원가입 폼 */}
            {authStep === "form" && authTab === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">이메일 주소</label>
                  <input
                    type="email"
                    required
                    placeholder="example@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">비밀번호 설정</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="6자리 이상 비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">비밀번호 확인</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="비밀번호 다시 입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <p className="text-[11px] text-gray-400">
                  가입 요청 시 입력하신 이메일로 인증번호가 발송됩니다.
                </p>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>인증번호 발송 중...</span>
                    </>
                  ) : (
                    <span>인증번호 받고 가입하기</span>
                  )}
                </button>

                <div className="text-center pt-2 text-xs text-gray-400">
                  이미 계정이 있으신가요?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setLocalError(null);
                      clearMessages();
                      setAuthTab("signin");
                    }}
                    className="text-emerald-400 hover:underline font-semibold ml-1"
                  >
                    로그인
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: 이메일 인증번호(OTP) 입력 폼 */}
            {authStep === "otp" && (
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
                      setAuthStep("form");
                    }}
                    className="text-gray-400 hover:text-white underline text-[11px]"
                  >
                    정보 변경
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    인증번호 입력
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    autoFocus
                    required
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-gray-800 border-2 border-emerald-500/60 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest text-white placeholder-gray-600 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                  <p className="text-[11px] text-gray-400 text-center mt-1.5">
                    이메일로 받으신 숫자 인증코드를 입력해 주세요 (예: 123456)
                  </p>
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
                    <span>인증 완료 및 가입</span>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => resendSignupOtp(email)}
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
