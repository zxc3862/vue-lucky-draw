@echo off
echo 🚀 Vue Lucky Draw 快速部署腳本
echo.

echo ✅ 1. 安裝依賴套件...
call npm install
if %errorlevel% neq 0 (
    echo ❌ npm install 失敗！
    pause
    exit /b 1
)

echo ✅ 2. 建構專案...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 建構失敗！
    pause
    exit /b 1
)

echo ✅ 3. 推送到 GitHub...
git add .
git commit -m "🚀 Ready for Vercel deployment"
git push

echo.
echo 🎉 準備完成！
echo.
echo 📋 接下來的步驟：
echo 1. 前往 https://vercel.com
echo 2. 用 GitHub 登入
echo 3. Import 您的 Repository
echo 4. 設置環境變數：
echo    - VITE_SUPABASE_URL
echo    - VITE_SUPABASE_ANON_KEY
echo 5. 點擊 Deploy
echo.
pause
