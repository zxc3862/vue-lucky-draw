import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import AdminLogin from '../views/AdminLogin.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import ResetPassword from '../views/ResetPassword.vue'
import EmailVerify from '../views/EmailVerify.vue'

const routes = [
  { 
    path: '/', 
    name: 'Home',
    component: Home 
  },
  { 
    path: '/admin/login', 
    name: 'AdminLogin',
    component: AdminLogin 
  },
  { 
    path: '/admin/dashboard', 
    name: 'AdminDashboard',
    component: AdminDashboard 
  },
  { 
    path: '/reset-password', 
    name: 'ResetPassword',
    component: ResetPassword 
  },
  { 
    path: '/verify-email', 
    name: 'EmailVerify',
    component: EmailVerify 
  },
  // Supabase email 驗證重定向路由
  { path: '/auth/callback', redirect: '/verify-email' },
  // 捕獲包含驗證參數的路由
  { path: '/access_token', redirect: to => `/verify-email${to.fullPath}` },
  // 捕獲所有包含 Supabase 參數的錯誤路由
  { 
    path: '/:pathMatch(.*)*', 
    name: 'NotFound',
    redirect: to => {
      console.log('🔄 捕獲未匹配路由:', to.path, to.query)
      
      // 檢查是否是 Supabase 重設密碼回調的錯誤格式
      if (to.path.includes('access_token=') && to.path.includes('type=recovery')) {
        console.log('✅ 檢測到重設密碼回調錯誤格式，重定向...')
        
        try {
          // 從路徑中提取參數
          const pathParams = to.path.substring(1) // 移除開頭的 /
          console.log('🔍 解析路徑參數:', pathParams)
          
          const parsedParams = new URLSearchParams(pathParams)
          
          const accessToken = parsedParams.get('access_token')
          const refreshToken = parsedParams.get('refresh_token')
          const type = parsedParams.get('type')
          
          console.log('🔍 解析到的參數:', {
            accessToken: !!accessToken,
            refreshToken: !!refreshToken,
            type: type,
            accessTokenLength: accessToken?.length || 0,
            refreshTokenLength: refreshToken?.length || 0
          })
          
          if (accessToken && refreshToken && type === 'recovery') {
            const resetUrl = `/reset-password?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&type=recovery`
            console.log('🔀 重定向到:', resetUrl)
            return resetUrl
          } else {
            console.warn('❌ 參數不完整，無法重定向:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type })
          }
        } catch (parseError) {
          console.warn('解析路由參數失敗:', parseError)
        }
      }
      
      // 檢查是否是 email 驗證回調的錯誤格式
      if (to.path.includes('access_token=') && to.path.includes('type=signup')) {
        console.log('✅ 檢測到註冊驗證回調錯誤格式，重定向...')
        
        try {
          // 從路徑中提取參數
          const pathParams = to.path.substring(1) // 移除開頭的 /
          const parsedParams = new URLSearchParams(pathParams)
          
          const accessToken = parsedParams.get('access_token')
          const refreshToken = parsedParams.get('refresh_token')
          const type = parsedParams.get('type')
          
          if (accessToken && refreshToken && type === 'signup') {
            const verifyUrl = `/verify-email?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&type=signup`
            return verifyUrl
          }
        } catch (parseError) {
          console.warn('解析路由參數失敗:', parseError)
        }
      }
      
      // 檢查是否是 Supabase 錯誤回調的錯誤格式
      if (to.path.includes('error=') && (to.path.includes('error_description=') || to.path.includes('error_code='))) {
        console.log('✅ 檢測到 Supabase 錯誤回調錯誤格式，重定向...')
        
        try {
          // 從路徑中提取參數
          const pathParams = to.path.substring(1) // 移除開頭的 /
          const parsedParams = new URLSearchParams(pathParams)
          
          const error = parsedParams.get('error')
          const errorDescription = parsedParams.get('error_description')
          const errorCode = parsedParams.get('error_code')
          
          if (error) {
            let verifyUrl = `/verify-email?error=${encodeURIComponent(error)}`
            if (errorDescription) {
              verifyUrl += `&error_description=${encodeURIComponent(errorDescription)}`
            }
            if (errorCode) {
              verifyUrl += `&error_code=${encodeURIComponent(errorCode)}`
            }
            
            return verifyUrl
          }
        } catch (parseError) {
          console.warn('解析錯誤參數失敗:', parseError)
        }
      }
      
      // 如果不是 Supabase 回調，重定向到首頁
      console.log('🔄 未知路由，重定向到首頁')
      return '/'
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 添加路由守衛用於調試
router.beforeEach((to, from, next) => {
  console.log('🔄 路由跳轉:', from.path, '->', to.path)
  next()
})

router.afterEach((to, from) => {
  console.log('✅ 路由跳轉完成:', from.path, '->', to.path)
})

export default router
