import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 8000, // 원하는 포트 번호로 변경 (기본값: 5173)
    host: true, // 네트워크 접근 허용 (0.0.0.0)
    open: true, // 브라우저 자동 열기
    strictPort: false, // 포트가 사용 중이면 다음 사용 가능한 포트 찾기
    cors: true, // CORS 활성화
  },
  preview: {
    port: 4173, // 프리뷰 서버 포트
    host: true,
    open: true,
    strictPort: false,
  },
  // 빌드 설정
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
