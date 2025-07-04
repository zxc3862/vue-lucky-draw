import { ref, computed } from 'vue'
import { supabase } from '../../supabaseClient'

// 全域狀態管理
const currentUser = ref(null)
const userRole = ref(null)
const isLoading = ref(false)

export function useAuth() {
  
  // 檢查用戶身份
  const checkAuth = async () => {
    isLoading.value = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      currentUser.value = user
      
      if (user) {
        await fetchUserRole(user.id)
      } else {
        userRole.value = null
      }
    } catch (error) {
      console.error('檢查身份失敗:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 取得用戶角色
  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') { // 忽略找不到資料的錯誤
        throw error
      }
      
      userRole.value = data?.role || null
    } catch (error) {
      console.error('取得用戶角色失敗:', error)
      userRole.value = null
    }
  }

  // 設置用戶角色（只有管理員可以使用）
  const setUserRole = async (email, role) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .upsert([{ email, role }], { onConflict: 'email' })
      
      if (error) throw error
      
      return { success: true, data }
    } catch (error) {
      console.error('設置用戶角色失敗:', error)
      return { success: false, error: error.message }
    }
  }

  // 登入
  const login = async (email) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email,
        options: {
          shouldCreateUser: true
        }
      })
      if (error) throw error
      
      return { success: true, message: '請至信箱收信完成登入' }
    } catch (error) {
      console.error('登入失敗:', error)
      return { success: false, error: error.message }
    }
  }

  // 忘記密碼 / 重設密碼
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      
      return { success: true, message: '重設密碼連結已發送至您的信箱' }
    } catch (error) {
      console.error('重設密碼失敗:', error)
      return { success: false, error: error.message }
    }
  }

  // 更新密碼
  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (error) throw error
      
      return { success: true, message: '密碼更新成功' }
    } catch (error) {
      console.error('更新密碼失敗:', error)
      return { success: false, error: error.message }
    }
  }

  // 登出
  const logout = async () => {
    try {
      await supabase.auth.signOut()
      currentUser.value = null
      userRole.value = null
      return { success: true }
    } catch (error) {
      console.error('登出失敗:', error)
      return { success: false, error: error.message }
    }
  }

  // 監聽認證狀態變化
  const setupAuthListener = () => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        currentUser.value = session.user
        await fetchUserRole(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        currentUser.value = null
        userRole.value = null
      }
    })
  }

  // 計算屬性
  const isAuthenticated = computed(() => !!currentUser.value)
  const isAdmin = computed(() => userRole.value === 'admin')
  const isParticipant = computed(() => userRole.value === 'participant')
  const hasRole = computed(() => !!userRole.value)

  return {
    // 狀態
    currentUser: computed(() => currentUser.value),
    userRole: computed(() => userRole.value),
    isLoading: computed(() => isLoading.value),
    isAuthenticated,
    isAdmin,
    isParticipant,
    hasRole,
    
    // 方法
    checkAuth,
    fetchUserRole,
    setUserRole,
    login,
    resetPassword,
    updatePassword,
    logout,
    setupAuthListener
  }
}
