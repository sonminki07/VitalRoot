# VitalRoot Automated Environment Restoration Script (PowerShell)
# 용도: 새 컴퓨터에서 저장소를 클론한 후 원클릭으로 React, Vite, 종속성 및 환경을 자동 세팅합니다.

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🌿 VitalRoot 개발 환경 자동 복원 시작..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Node.js 및 npm 설치 확인
try {
    $nodeVersion = node -v
    $npmVersion = npm -v
    Write-Host "✔ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "✔ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js 또는 npm이 설치되어 있지 않습니다. Node.js를 먼저 설치해 주세요." -ForegroundColor Red
    exit 1
}

# 2. .env 환경설정 파일 복원
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" -Destination ".env"
        Write-Host "✔ .env.example로부터 .env 파일 생성 완료" -ForegroundColor Green
    } else {
        Write-Host "⚠ .env.example을 찾을 수 없습니다." -ForegroundColor Yellow
    }
} else {
    Write-Host "✔ 기존 .env 파일 확인 완료" -ForegroundColor Green
}

# 3. npm 종속성 설치 (React 19, Vite, Tailwind v4, Zustand v5 등)
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 node_modules가 없습니다. npm install을 실행합니다..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install 실패. 네트워크 또는 권한을 확인하세요." -ForegroundColor Red
        exit 1
    }
    Write-Host "✔ 의존성 패키지 설치 완료" -ForegroundColor Green
} else {
    Write-Host "✔ node_modules가 이미 존재합니다." -ForegroundColor Green
}

# 4. TypeScript 타입 검증
Write-Host "🔍 TypeScript 컴파일 검사 (tsc -b) 진행 중..." -ForegroundColor Yellow
npx tsc -b
if ($LASTEXITCODE -eq 0) {
    Write-Host "✔ TypeScript 컴파일 통과 (0 errors)" -ForegroundColor Green
} else {
    Write-Host "❌ TypeScript 컴파일 오류 발생" -ForegroundColor Red
}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✨ 환경 복원 완료!" -ForegroundColor Green
Write-Host "Antigravity 채팅창에 '집에서 이어해줘' 또는 '안그래비티 대화창 불러와줘'를 입력하세요." -ForegroundColor Cyan
Write-Host "로컬 개발 서버 실행: npm run dev" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
