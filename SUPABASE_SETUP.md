# ✅ Supabase 設定檢查清單

## 🏗️ 專案建立
- [ ] 在 https://supabase.com/ 建立新專案
- [ ] 專案名稱：`vue-lucky-draw`
- [ ] 資料庫密碼已設定並記錄
- [ ] 選擇亞洲區域（Tokyo 或 Singapore）

## 🔑 API 金鑰
- [ ] 取得 Project URL（格式：https://xxx.supabase.co）
- [ ] 取得 Anon Key（長 JWT token）
- [ ] 已填入 `.env` 檔案中的 `VITE_SUPABASE_URL`
- [ ] 已填入 `.env` 檔案中的 `VITE_SUPABASE_ANON_KEY`

## 🗄️ 資料庫初始化
- [ ] 在 SQL Editor 中執行 `supabase-init.sql`
- [ ] 確認 5 個表格已建立：
  - [ ] `players`
  - [ ] `user_roles`
  - [ ] `user_participations`
  - [ ] `draw_history`
  - [ ] `draw_status`
- [ ] 確認測試資料已插入
- [ ] 確認 RLS 政策已設定

## 👤 管理員設定
- [ ] 在網站註冊第一個管理員帳號
- [ ] 在 SQL Editor 中設定管理員權限
- [ ] 測試管理員登入功能
- [ ] 確認可以進入管理後台

## 🧪 功能測試
- [ ] 前端可以正常連接 Supabase
- [ ] 可以顯示玩家列表
- [ ] 管理員可以執行抽球
- [ ] 可以查看抽球歷史

## 🚀 部署準備
- [ ] Vercel 環境變數已設定
- [ ] GitHub 程式碼已推送
- [ ] 生產環境正常運作

---

## 📍 當前狀態
- ✅ 開發伺服器已啟動：http://localhost:5173/
- ⏳ 等待 Supabase 專案建立和設定

## 🔧 如果遇到問題
1. **白屏問題**：檢查 `.env` 檔案是否正確
2. **連接錯誤**：確認 Supabase URL 和 API Key
3. **權限錯誤**：檢查 RLS 政策和管理員設定
4. **部署問題**：確認 Vercel 環境變數
