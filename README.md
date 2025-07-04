# 🎯 Vue Lucky Draw - 抽獎系統

一個基於 Vue 3 + Supabase + Vercel 的完全免費抽獎系統。

## 🌟 功能特色

- 🎮 **玩家管理** - 顯示參與者及球數排行榜
- 🔐 **管理員系統** - 安全的 Magic Link 登入
- 🎯 **智能抽獎** - 根據球數加權的公平抽獎
- 📱 **響應式設計** - 完美支援手機和桌面
- ☁️ **雲端部署** - Vercel + Supabase 零成本部署

## 🚀 部署步驟

### 1. Supabase 設置

1. 前往 [Supabase](https://supabase.com) 註冊免費帳號
2. 建立新專案
3. 在 SQL Editor 中執行以下建表語句：

```sql
-- 建立玩家表
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  balls INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入測試資料
INSERT INTO players (name, balls) VALUES 
('張三', 3),
('李四', 2),
('王五', 5),
('趙六', 1);

-- 設置 RLS (Row Level Security)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- 允許所有人讀取
CREATE POLICY "Allow public read" ON players FOR SELECT USING (true);

-- 只允許認證用戶修改
CREATE POLICY "Allow authenticated users to modify" ON players 
FOR ALL USING (auth.role() = 'authenticated');
```

4. 複製您的專案 URL 和 anon key

### 2. Vercel 部署

1. 將程式碼推到 GitHub
2. 前往 [Vercel](https://vercel.com) 用 GitHub 登入
3. Import 您的 Repository
4. 在環境變數中設置：
   - `VITE_SUPABASE_URL`: 您的 Supabase 專案 URL
   - `VITE_SUPABASE_ANON_KEY`: 您的 Supabase anon key
5. 點擊 Deploy

### 3. 本地開發

```bash
# 安裝依賴
npm install

# 複製環境變數範例
cp .env.example .env

# 編輯 .env 填入您的 Supabase 資訊
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 啟動開發伺服器
npm run dev
```

## 📱 使用說明

### 玩家頁面 (/)
- 查看所有參與者及其球數排行

### 管理員登入 (/admin/login)
- 輸入管理員 Email
- 點擊發送登入連結
- 前往信箱點擊 Magic Link 完成登入

### 管理後台 (/admin/dashboard)
- 增加/減少玩家球數
- 刪除玩家
- 執行抽獎

## 🛠️ 技術架構

- **前端**: Vue 3 + Vue Router + Vite
- **後端**: Supabase (PostgreSQL + Auth + Storage)
- **部署**: Vercel (Edge Functions + CDN)
- **成本**: 完全免費 (Supabase 免費額度 + Vercel Hobby Plan)

## 🔧 自定義

您可以輕鬆修改：
- 抽獎算法邏輯
- UI 樣式和主題
- 添加更多管理功能
- 集成其他通知方式

## 📞 支援

如有問題，歡迎建立 Issue 或聯繫開發者。

---

Made with ❤️ using Vue 3 + Supabase + Vercel
