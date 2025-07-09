-- 檢查 user_roles 表的 RLS 和權限設置
SELECT 'user_roles 表的 RLS 狀態' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_roles';

-- 檢查 RLS 政策
SELECT 'user_roles 表的 RLS 政策' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_roles';

-- 檢查表權限
SELECT 'user_roles 表權限' as info;
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'user_roles'
AND table_schema = 'public';

-- 嘗試以 anon 身份直接插入記錄（模擬註冊情況）
SELECT '測試插入權限' as info;
-- 注意：這只是檢查權限，不會實際插入
