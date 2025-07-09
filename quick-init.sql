-- 🚀 Vue Lucky Draw 快速初始化腳本
-- 複製此腳本到 Supabase SQL Editor 並執行

-- 1. 建立玩家表
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL UNIQUE,
  balls INTEGER DEFAULT 1 CHECK (balls >= 0),
  is_participating BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 建立用戶角色表
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'participant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- 3. 建立用戶參與狀態表
CREATE TABLE IF NOT EXISTS user_participations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  is_participating BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 4. 建立抽球歷史表
CREATE TABLE IF NOT EXISTS draw_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  winner_id UUID REFERENCES players(id) ON DELETE CASCADE,
  winner_name TEXT NOT NULL,
  balls_before INTEGER NOT NULL,
  drawn_by UUID REFERENCES auth.users(id),
  draw_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 建立抽球狀態表
CREATE TABLE IF NOT EXISTS draw_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'drawing', 'completed')),
  current_winner TEXT,
  total_participants INTEGER DEFAULT 0,
  total_balls INTEGER DEFAULT 0,
  last_draw_time TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 插入預設抽球狀態
INSERT INTO draw_status (status, total_participants, total_balls) 
SELECT 'waiting', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM draw_status);

-- 7. 插入測試資料
INSERT INTO players (name, balls) 
SELECT '張三', 3 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = '張三')
UNION ALL
SELECT '李四', 2 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = '李四')
UNION ALL
SELECT '王五', 5 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = '王五')
UNION ALL
SELECT '趙六', 1 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = '趙六')
UNION ALL
SELECT '小明', 4 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = '小明')
UNION ALL
SELECT '小美', 2 WHERE NOT EXISTS (SELECT 1 FROM players WHERE name = '小美');

-- 8. 設置 RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_status ENABLE ROW LEVEL SECURITY;

-- 9. 設置政策 - 玩家表
DROP POLICY IF EXISTS "Allow public read players" ON players;
CREATE POLICY "Allow public read players" ON players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin modify players" ON players;
CREATE POLICY "Allow admin modify players" ON players FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 10. 設置政策 - 用戶角色表
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
CREATE POLICY "Users can view own role" ON user_roles FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Allow admin manage roles" ON user_roles;
CREATE POLICY "Allow admin manage roles" ON user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 11. 設置政策 - 抽球歷史
DROP POLICY IF EXISTS "Allow public read history" ON draw_history;
CREATE POLICY "Allow public read history" ON draw_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin insert history" ON draw_history;
CREATE POLICY "Allow admin insert history" ON draw_history FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 12. 設置政策 - 抽球狀態
DROP POLICY IF EXISTS "Allow public read status" ON draw_status;
CREATE POLICY "Allow public read status" ON draw_status FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin modify status" ON draw_status;
CREATE POLICY "Allow admin modify status" ON draw_status FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ✅ 初始化完成！
SELECT '🎉 資料庫初始化完成！' as result;
