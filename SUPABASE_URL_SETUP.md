# Supabase URL 設定指南

## 問題說明
當前重置密碼連結導向到 `localhost:3000`，需要在 Supabase Dashboard 中修正 URL 設定。

## 解決步驟

### 1. 登入 Supabase Dashboard
- 前往：https://supabase.com/dashboard
- 選擇您的專案：`qzffahnlwvxgfovmrjia`

### 2. 修正 Authentication 設定
導航至：**Authentication → Settings → General**

#### A. Site URL (關鍵設定！)
**目前錯誤設定：**
```
http://localhost:3000
```

**必須修改為：**
```
https://vue-lucky-draw.vercel.app
```

**說明：**
- Site URL 是 Supabase 產生所有 email 連結的基礎 URL
- 當 redirect URL 未指定或不在允許清單中時，會使用此預設值
- 這就是為什麼您的重置密碼連結導向 `localhost:3000` 的原因

#### B. Redirect URLs (允許清單)
**目前設定：**
```
http://localhost:5173
```

**需要新增生產環境 URL：**
```
https://vue-lucky-draw.vercel.app
https://vue-lucky-draw.vercel.app/#/verify-email
https://vue-lucky-draw.vercel.app/#/reset-password
https://vue-lucky-draw.vercel.app/#/admin/dashboard
```

**建議完整設定：**
```
http://localhost:5173                                    (開發環境)
http://localhost:5173/#/verify-email                     (開發環境)
http://localhost:5173/#/reset-password                   (開發環境)
https://vue-lucky-draw.vercel.app                        (生產環境)
https://vue-lucky-draw.vercel.app/#/verify-email         (生產環境)
https://vue-lucky-draw.vercel.app/#/reset-password       (生產環境)
https://vue-lucky-draw.vercel.app/#/admin/dashboard      (生產環境)
```

**或使用萬用字元：**
```
https://vue-lucky-draw.vercel.app/*
http://localhost:5173/*
```

**說明：**
- Redirect URLs 是認證提供者被允許重新導向的 URL 白名單
- 如果 redirectTo 參數不在此清單中，系統會回退到使用 Site URL
- 萬用字元 `*` 可以匹配所有子路徑

### 3. 開發環境設定（可選）
如果需要本地開發，可以同時保留：
```
http://localhost:5173/#/verify-email
http://localhost:5173/#/reset-password
```

### 4. 保存設定
點擊 **Save** 儲存所有變更。

## 設定完成後
- 新的重置密碼連結會正確導向到 `https://vue-lucky-draw.vercel.app`
- Email 驗證連結也會正確導向到生產環境

## 驗證步驟
1. 重新測試重置密碼功能
2. 檢查 email 中的連結是否正確導向生產環境
3. 確認所有認證流程都正常運作

---
**重要：** 這些設定需要在 Supabase Dashboard 中手動完成，無法透過程式碼修改。
