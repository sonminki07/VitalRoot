import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";

export function AuthButton() {
  const { user, isInitializing, openModal, signOut } = useAuthStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isInitializing) {
    return (
      <div className="h-8 w-24 bg-gray-800/80 rounded-xl animate-pulse border border-gray-700/60" />
    );
  }

  // 1. 미로그인 상태: [로그인 / 회원가입] 버튼
  if (!user) {
    return (
      <button
        onClick={() => openModal("signIn")}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/90 hover:bg-gray-800 backdrop-blur-md text-emerald-400 hover:text-emerald-300 font-medium text-xs rounded-xl border border-emerald-500/40 shadow-xl transition-all active:scale-95"
      >
        <span className="text-sm">👤</span>
        <span>로그인 / 가입</span>
      </button>
    );
  }

  // 2. 로그인 완료 상태: 프로필 아바타 / 이메일 + 로그아웃 드롭다운
  const userAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "웰니스 회원";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-2.5 py-1 bg-gray-900/90 hover:bg-gray-800 backdrop-blur-md text-white text-xs rounded-xl border border-gray-700/70 shadow-xl transition-all"
      >
        {userAvatar ? (
          <img
            src={userAvatar}
            alt="프로필"
            className="w-5 h-5 rounded-full object-cover border border-emerald-400"
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white">
            {displayName[0]?.toUpperCase() || "U"}
          </div>
        )}
        <span className="max-w-[100px] truncate font-medium text-gray-200">
          {displayName}
        </span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 사용자 드롭다운 메뉴 */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-2.5 text-xs text-gray-300 z-50 animate-in fade-in zoom-in-95">
          <div className="px-2 py-1.5 border-b border-gray-800 mb-1">
            <p className="font-semibold text-white truncate">{displayName}</p>
            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
          </div>

          <div className="px-2 py-1 text-[11px] text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Supabase 인증 활성</span>
          </div>

          <button
            onClick={() => {
              setIsDropdownOpen(false);
              signOut();
            }}
            className="mt-2 w-full text-left px-2 py-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <span>🚪</span>
            <span>로그아웃</span>
          </button>
        </div>
      )}
    </div>
  );
}
