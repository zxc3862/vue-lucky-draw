-- 完整檢查 user_roles 創建情況的腳本
-- 請在 Supabase SQL Editor 中執行

-- 1. 檢查 user_roles 表結構
SELECT '=== user_roles 表結構 ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_roles' 
ORDER BY ordinal_position;

-- 2. 檢查 RLS 狀態
SELECT '=== RLS 狀態 ===' as info;
SELECT 
    schemaname, 
    tablename, 
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN '🔒 啟用'
        ELSE '🔓 關閉'
    END as rls_status
FROM pg_tables 
WHERE tablename = 'user_roles';

-- 3. 檢查表權限
SELECT '=== 表權限 ===' as info;
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_name = 'user_roles'
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- 4. 檢查現有 user_roles 數據
SELECT '=== 現有 user_roles 數據 ===' as info;
SELECT 
    id,
    email,
    role,
    display_name,
    created_at,
    CASE 
        WHEN created_at > NOW() - INTERVAL '1 hour' THEN '🕐 最近1小時'
        WHEN created_at > NOW() - INTERVAL '1 day' THEN '📅 今天'
        ELSE '📆 較早'
    END as created_time
FROM user_roles 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. 檢查 auth.users 中的用戶
SELECT '=== auth.users 中的用戶 ===' as info;
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data->>'display_name' as display_name_in_metadata,
    CASE 
        WHEN created_at > NOW() - INTERVAL '1 hour' THEN '🕐 最近1小時'
        WHEN created_at > NOW() - INTERVAL '1 day' THEN '📅 今天'
        ELSE '📆 較早'
    END as created_time
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- 6. 檢查用戶不匹配的情況
SELECT '=== auth.users 中存在但 user_roles 中不存在的用戶 ===' as info;
SELECT 
    u.id,
    u.email,
    u.email_confirmed_at,
    u.created_at,
    u.raw_user_meta_data->>'display_name' as display_name_in_metadata,
    '❌ 缺失 user_roles 記錄' as status
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
ORDER BY u.created_at DESC;

-- 7. 檢查最近註冊的用戶統計
SELECT '=== 最近註冊統計 ===' as info;
SELECT 
    COUNT(*) as total_auth_users,
    COUNT(ur.user_id) as users_with_roles,
    COUNT(*) - COUNT(ur.user_id) as missing_roles,
    CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND((COUNT(ur.user_id)::float / COUNT(*)::float) * 100, 2)
    END as role_coverage_percentage
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.created_at > NOW() - INTERVAL '1 day';

-- 8. 嘗試手動插入測試（檢查權限）
SELECT '=== 測試插入權限 ===' as info;
-- 注意：下面的 INSERT 只是為了測試權限，不會實際執行
-- 如果想測試實際插入，請取消註解下面的行
/*
INSERT INTO user_roles (user_id, email, role, display_name, created_at) 
SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test-permission@example.com',
    'participant',
    'Test User',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles WHERE email = 'test-permission@example.com'
);
*/

SELECT 'SQL 權限檢查完成 - 如需測試實際插入，請取消註解上面的 INSERT 語句' as message;
