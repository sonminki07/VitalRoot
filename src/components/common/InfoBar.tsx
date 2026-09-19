import { useWellnessStore } from "../../store/wellnessStore";

export function InfoBar() {
  const { isSupabaseConnected } = useWellnessStore();

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-gray-950/80 backdrop-blur-md text-white px-5 py-2 rounded-full text-xs border border-gray-700/60 shadow-xl">
      <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
        <span>🌿</span> VitalRoot 2026
      </span>
      <span className="text-gray-600">|</span>
      <span className="text-gray-300">
        React 19 • Mapbox GL • 한국관광공사 Tour API
      </span>
      <span className="text-gray-600">|</span>
      <span className="flex items-center gap-1.5">
        <span
          className={`w-2 h-2 rounded-full ${
            isSupabaseConnected ? "bg-emerald-400" : "bg-teal-400 animate-pulse"
          }`}
        />
        <span className="text-[11px] text-gray-300">
          {isSupabaseConnected ? "Supabase Live" : "Supabase Cloud"}
        </span>
      </span>
    </div>
  );
}
