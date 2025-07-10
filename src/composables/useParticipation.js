import { ref, computed } from 'vue'
import { supabase } from '../../supabaseClient'
import { useAuth } from './useAuth'

export function useParticipation() {
  const { currentUser, userRole, isAdmin, displayName } = useAuth()
  
  // 響應式數據
  const isParticipating = ref(false)
  const userPlayer = ref(null)
  const isLoading = ref(false)

  // 檢查用戶參與狀態
  const checkParticipationStatus = async () => {
    if (!currentUser.value) {
      console.log('🔍 checkParticipationStatus: 沒有當前用戶，清空參與狀態')
      userPlayer.value = null
      isParticipating.value = false
      return
    }
    
    console.log('🔍 checkParticipationStatus: 開始檢查，用戶:', currentUser.value.email)
    
    isLoading.value = true
    try {
      // 查找用戶關聯的玩家
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', currentUser.value.id)
        .single()

      if (playerError && playerError.code !== 'PGRST116') {
        console.error('查找玩家失敗:', playerError)
        throw playerError
      }

      console.log('📊 checkParticipationStatus: 查找到玩家:', player)

      userPlayer.value = player
      isParticipating.value = player?.is_participating || false
      
      console.log('📊 checkParticipationStatus: 設置狀態')
      console.log('  - userPlayer:', userPlayer.value)
      console.log('  - isParticipating:', isParticipating.value)
    } catch (error) {
      console.error('檢查參與狀態失敗:', error)
      // 發生錯誤時也清空狀態
      userPlayer.value = null
      isParticipating.value = false
    } finally {
      isLoading.value = false
    }
  }

  // 加入抽球（只能加入，不能暫停）
  const toggleParticipation = async () => {
    if (!currentUser.value) return { success: false, error: '請先登入' }
    
    console.log('🎯 toggleParticipation: 開始')
    console.log('  - 當前用戶:', currentUser.value.email)
    console.log('  - 當前 userPlayer:', userPlayer.value)
    console.log('  - 當前 isParticipating:', isParticipating.value)
    
    isLoading.value = true
    try {
      if (!userPlayer.value) {
        console.log('🆕 創建新玩家記錄')
        // 創建新玩家記錄
        // 獲取用戶的真實顯示名稱
        const userDisplayName = displayName.value || currentUser.value.email.split('@')[0]
        console.log('📝 使用顯示名稱:', userDisplayName)
        
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert([{
            user_id: currentUser.value.id,
            name: userDisplayName, // 使用顯示名稱作為 name
            display_name: userDisplayName, // 顯示用名稱
            balls: 0,
            is_participating: true
          }])
          .select()
          .single()

        if (createError) {
          console.error('創建玩家失敗:', createError)
          throw createError
        }
        
        console.log('✅ 創建新玩家成功:', newPlayer)
        userPlayer.value = newPlayer
        isParticipating.value = true
        
        return { success: true, message: '成功加入抽球活動！' }
      } else {
        console.log('🔄 已有玩家記錄，檢查參與狀態')
        // 如果已經有玩家記錄，檢查是否已經參與
        if (isParticipating.value) {
          console.log('❌ 已經參與中，不能重複加入')
          return { success: false, error: '您已經參與抽球活動了' }
        } else {
          console.log('🔄 重新加入抽球')
          // 重新加入抽球
          const { error } = await supabase
            .from('players')
            .update({ is_participating: true })
            .eq('id', userPlayer.value.id)

          if (error) {
            console.error('重新加入失敗:', error)
            throw error
          }
          
          console.log('✅ 重新加入成功')
          isParticipating.value = true
          userPlayer.value = { ...userPlayer.value, is_participating: true }
          
          return { success: true, message: '重新加入抽球活動！' }
        }
      }
    } catch (error) {
      console.error('加入抽球失敗:', error)
      return { success: false, error: '操作失敗，請稍後再試' }
    } finally {
      isLoading.value = false
    }
  }

  // 更新玩家顯示名稱
  const updatePlayerName = async (newDisplayName) => {
    if (!userPlayer.value) return { success: false, error: '找不到玩家資料' }
    
    try {
      // 同時更新 players 表和 user_roles 表
      const [playersResult, userRolesResult] = await Promise.allSettled([
        supabase
          .from('players')
          .update({ 
            name: newDisplayName,  // 同時更新 name 欄位
            display_name: newDisplayName 
          })
          .eq('id', userPlayer.value.id),
        supabase
          .from('user_roles')
          .update({ display_name: newDisplayName })
          .eq('user_id', currentUser.value?.id)
      ])

      // 檢查 players 表更新結果
      if (playersResult.status === 'rejected' || playersResult.value.error) {
        throw new Error('更新玩家資料失敗: ' + (playersResult.value?.error?.message || playersResult.reason))
      }

      // user_roles 表更新可以失敗（不是致命錯誤）
      if (userRolesResult.status === 'rejected' || userRolesResult.value.error) {
        console.warn('更新用戶角色表顯示名稱失敗:', userRolesResult.value?.error || userRolesResult.reason)
      }
      
      userPlayer.value = { 
        ...userPlayer.value, 
        name: newDisplayName,
        display_name: newDisplayName 
      }
      return { success: true, message: '顯示名稱更新成功' }
    } catch (error) {
      console.error('更新顯示名稱失敗:', error)
      return { success: false, error: error.message || '更新失敗，請稍後再試' }
    }
  }

  // 管理員設定玩家參與狀態
  const setPlayerParticipation = async (playerId, isParticipating) => {
    if (!isAdmin.value) return { success: false, error: '權限不足' }
    
    try {
      const { error } = await supabase
        .from('players')
        .update({ is_participating: isParticipating })
        .eq('id', playerId)

      if (error) throw error
      
      return { success: true }
    } catch (error) {
      console.error('設定參與狀態失敗:', error)
      return { success: false, error: '操作失敗' }
    }
  }

  // 計算屬性
  const canParticipate = computed(() => {
    return currentUser.value && (userRole.value === 'participant' || userRole.value === 'admin')
  })

  const participationText = computed(() => {
    if (!canParticipate.value) return '需要參加者或管理員權限'
    if (!userPlayer.value) return '加入抽球'
    return '已加入抽球'
  })

  return {
    // 狀態
    isParticipating: computed(() => isParticipating.value),
    userPlayer: computed(() => userPlayer.value),
    isLoading: computed(() => isLoading.value),
    canParticipate,
    participationText,
    
    // 方法
    checkParticipationStatus,
    toggleParticipation,
    updatePlayerName,
    setPlayerParticipation
  }
}
