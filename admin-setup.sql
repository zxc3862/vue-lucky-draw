-- 管理員初始化腳本
-- 在 Supabase SQL Editor 中執行此腳本來設定第一個管理員

-- 方法一：如果您知道用戶的 UUID（註冊後可以在 Authentication > Users 中查看）
-- 請將 'USER_UUID_HERE' 替換為實際的用戶 UUID
-- 請將 'admin@example.com' 替換為管理員的 Email
/*
INSERT INTO user_roles (user_id, email, role) 
VALUES ('USER_UUID_HERE', 'admin@example.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';
*/

-- 方法二：透過 Email 設定管理員（推薦）
-- 請將 'your-admin@example.com' 替換為您的管理員 Email
-- 注意：該用戶必須先註冊帳號
/*
INSERT INTO user_roles (user_id, email, role) 
SELECT 
    au.id,
    'your-admin@example.com',
    'admin'
FROM auth.users au 
WHERE au.email = 'your-admin@example.com'
ON CONFLICT (email) DO UPDATE SET role = 'admin';
*/

-- 方法三：建立一個函數來設定管理員
CREATE OR REPLACE FUNCTION set_admin_by_email(admin_email TEXT)
RETURNS TEXT AS $$
DECLARE
    user_id UUID;
BEGIN
    -- 查找用戶 ID
    SELECT id INTO user_id 
    FROM auth.users 
    WHERE email = admin_email;
    
    -- 檢查用戶是否存在
    IF user_id IS NULL THEN
        RETURN '錯誤：找不到 Email 為 ' || admin_email || ' 的用戶，請先註冊帳號';
    END IF;
    
    -- 設定為管理員
    INSERT INTO user_roles (user_id, email, role) 
    VALUES (user_id, admin_email, 'admin')
    ON CONFLICT (email) DO UPDATE SET role = 'admin';
    
    RETURN '成功：' || admin_email || ' 已設定為管理員';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 使用範例：
-- SELECT set_admin_by_email('your-admin@example.com');

-- 查看所有管理員
SELECT ur.email, ur.role, ur.created_at
FROM user_roles ur
WHERE ur.role = 'admin'
ORDER BY ur.created_at;

-- 查看所有註冊用戶（供參考）
SELECT au.email, au.created_at, ur.role
FROM auth.users au
LEFT JOIN user_roles ur ON au.id = ur.user_id
ORDER BY au.created_at;
