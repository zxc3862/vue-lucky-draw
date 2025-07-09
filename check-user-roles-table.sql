-- 檢查 user_roles 表的結構和數據
-- 執行這個查詢來確認表格設定正確

-- 1. 檢查表結構
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;

-- 2. 檢查現有數據
SELECT 
    id,
    user_id,
    email,
    role,
    display_name,
    created_at,
    updated_at
FROM user_roles 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. 檢查是否有重複的 user_id
SELECT 
    user_id,
    COUNT(*) as count
FROM user_roles 
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- 4. 檢查 RLS 策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_roles';

-- 5. 檢查用戶角色統計
SELECT 
    role,
    COUNT(*) as count
FROM user_roles 
GROUP BY role;
