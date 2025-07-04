# 🚀 Vercel + Supabase 部署清單

## ✅ 部署前準備

### 1. Supabase 設置
- [ ] 註冊 Supabase 帳號：https://supabase.com
- [ ] 建立新專案
- [ ] 執行 `supabase-init.sql` 腳本建立資料表
- [ ] 複製專案 URL 和 anon key
- [ ] 設置認證 (Authentication) 啟用 Email login

### 2. GitHub 準備
- [ ] 將程式碼推送到 GitHub Repository
- [ ] 確保 `.env` 檔案已被 `.gitignore` 忽略

### 3. Vercel 部署
- [ ] 註冊 Vercel 帳號：https://vercel.com
- [ ] 連接 GitHub 帳號
- [ ] Import Repository
- [ ] 設置環境變數：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] 部署

## 🔧 本地開發設置

```bash
# 1. 安裝依賴
npm install

# 2. 設置環境變數
cp .env.example .env
# 編輯 .env 檔案

# 3. 啟動開發伺服器
npm run dev
```

## 📋 功能測試清單

### 首頁 (/)
- [ ] 顯示玩家排行榜
- [ ] 顯示統計數據
- [ ] 響應式設計正常

### 管理員登入 (/admin/login)
- [ ] 輸入 email 發送 Magic Link
- [ ] 收到登入郵件
- [ ] 點擊連結成功登入

### 管理後台 (/admin/dashboard)
- [ ] 身份驗證檢查
- [ ] 新增玩家
- [ ] 增加/減少球數
- [ ] 刪除玩家
- [ ] 執行抽獎
- [ ] 查看抽獎歷史

## 🌐 生產環境 URLs

- **前端**: https://your-project.vercel.app
- **管理員**: https://your-project.vercel.app/admin/login
- **Supabase Dashboard**: https://app.supabase.com

## 🔒 安全設置

- [ ] Supabase RLS 政策已設置
- [ ] 只有認證用戶可修改資料
- [ ] 環境變數安全存儲

## 💰 免費額度

### Supabase 免費版
- ✅ 500MB 資料庫
- ✅ 50,000 月活用戶
- ✅ 無限 API 請求

### Vercel Hobby Plan
- ✅ 無限靜態網站
- ✅ 100GB 頻寬/月
- ✅ 自定義域名

## 🆘 常見問題

### Q: 無法登入管理後台？
A: 確認 Supabase Authentication 已啟用 Email provider

### Q: 資料無法載入？
A: 檢查環境變數是否正確設置

### Q: 建構失敗？
A: 確保所有依賴已正確安裝：`npm install`

---

🎉 完成以上清單後，您的抽獎系統就可以免費運行了！
