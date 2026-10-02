#!/usr/bin/env bash
# VitalRoot Automated Environment Restoration Script (Bash)
# Purpose: Automatically restore React, Vite, dependencies and environment on a new machine.

set -e

echo "=========================================="
echo "🌿 VitalRoot 개발 환경 자동 복원 시작..."
echo "=========================================="

# 1. Node & npm check
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "❌ Node.js or npm is not installed. Please install Node.js."
    exit 1
fi
echo "✔ Node.js: $(node -v)"
echo "✔ npm: $(npm -v)"

# 2. .env check
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✔ .env created from .env.example"
    fi
else
    echo "✔ .env file exists"
fi

# 3. Dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
    echo "✔ Dependencies installed successfully"
else
    echo "✔ node_modules exists"
fi

# 4. TypeScript check
echo "🔍 Checking TypeScript (tsc -b)..."
npx tsc -b
echo "✔ TypeScript compilation passed (0 errors)"

echo "=========================================="
echo "✨ Environment restored successfully!"
echo "Type '집에서 이어해줘' or '안그래비티 대화창 불러와줘' in Antigravity."
echo "Dev server: npm run dev"
echo "=========================================="
