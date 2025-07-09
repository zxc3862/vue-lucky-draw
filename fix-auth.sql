-- 🔧 暫時關閉 Email 驗證來解決註冊問題
-- 在 Supabase SQL Editor 中執行此腳本

-- 檢查當前 auth 設定
SELECT 
  'auth 配置檢查' as check_type,
  'ready' as status;

-- 建立一個簡單的測試用戶（如果需要）
-- 注意：這只是為了測試，正常情況下應該透過註冊頁面

-- 如果您想要直接建立測試用戶，可以使用以下語法（但建議先修復註冊功能）
-- INSERT INTO auth.users (
--   instance_id,
--   id,
--   aud,
--   role,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   created_at,
--   updated_at,
--   confirmation_token,
--   email_change,
--   email_change_token_new,
--   recovery_token
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated',
--   'authenticated',
--   'test@example.com',
--   crypt('password123', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW(),
--   '',
--   '',
--   '',
--   ''
-- );

-- 顯示提示
SELECT '💡 請前往 Supabase Dashboard > Authentication > Settings 關閉 Email confirmation' as instruction;
