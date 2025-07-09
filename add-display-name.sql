-- 為玩家表添加顯示名稱欄位
-- 在 Supabase SQL Editor 中執行

-- 1. 添加 display_name 欄位到 players 表
ALTER TABLE players ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. 更新現有玩家的顯示名稱（使用現有的 name 欄位）
UPDATE players 
SET display_name = name 
WHERE display_name IS NULL;

-- 3. 檢查更新結果
SELECT 
  id,
  user_id,
  name,
  display_name,
  balls,
  is_participating
FROM players;

-- 4. 驗證結果
SELECT '✅ 玩家表已添加顯示名稱欄位' as result;
