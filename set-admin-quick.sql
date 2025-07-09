-- 快速設定管理員腳本
-- 執行這個腳本來將指定用戶設為管理員

-- 方法1: 如果知道用戶 email，直接設定為管理員
UPDATE user_roles 
SET role = 'admin' 
WHERE email = 'test@example.com';  -- 替換成您的測試 email

-- 方法2: 將最新註冊的用戶設為管理員
UPDATE user_roles 
SET role = 'admin' 
WHERE id = (
    SELECT id 
    FROM user_roles 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- 方法3: 直接插入管理員記錄 (如果用戶還沒有角色記錄)
INSERT INTO user_roles (user_id, email, role, display_name, created_at)
VALUES (
    'your-user-id-here',  -- 替換成實際的 user ID
    'admin@example.com',  -- 替換成管理員 email
    'admin',
    '系統管理員',
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- 檢查現有的用戶角色
SELECT 
    id,
    email,
    role,
    display_name,
    created_at
FROM user_roles 
ORDER BY created_at DESC;

-- 檢查是否有管理員
SELECT COUNT(*) as admin_count 
FROM user_roles 
WHERE role = 'admin';
