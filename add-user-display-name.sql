-- 添加 display_name 欄位到 user_roles 表
-- 在 Supabase SQL Editor 中執行此腳本

-- 1. 檢查 user_roles 表的當前結構
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_roles' 
ORDER BY ordinal_position;

-- 2. 添加 display_name 欄位（如果不存在）
DO $$ 
BEGIN
    -- 檢查欄位是否已存在
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_roles' 
        AND column_name = 'display_name'
    ) THEN
        -- 添加 display_name 欄位
        ALTER TABLE user_roles 
        ADD COLUMN display_name text;
        
        RAISE NOTICE 'display_name 欄位已成功添加到 user_roles 表';
    ELSE
        RAISE NOTICE 'display_name 欄位已存在於 user_roles 表中';
    END IF;
END $$;

-- 3. 為現有記錄設置預設的 display_name（從 email 提取用戶名部分）
UPDATE user_roles 
SET display_name = split_part(email, '@', 1)
WHERE display_name IS NULL AND email IS NOT NULL;

-- 4. 檢查更新後的表結構
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_roles' 
ORDER BY ordinal_position;

-- 5. 檢查更新後的資料
SELECT id, email, display_name, role, created_at 
FROM user_roles 
ORDER BY created_at DESC 
LIMIT 10;

-- 6. 驗證結果
SELECT '✅ user_roles 表已成功添加 display_name 欄位' as result;
