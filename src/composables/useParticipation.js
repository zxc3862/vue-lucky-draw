import { ref, computed } from 'vue'
import { supabase } from '../../supabaseClient'
import { useAuth } from './useAuth'

export function useParticipation() {
  const { currentUser, userRole, isAdmin } = useAuth()
  
  // 響應式數據
  const isParticipating = ref(false)
  const userPlayer = ref(null)
  const isLoading = ref(false)

  // 檢查用戶參與狀態
  const checkParticipationStatus = async () => {
    if (!currentUser.value) return
    
    isLoading.value = true
    try {
      // 查找用戶關聯的玩家
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', currentUser.value.id)
        .single()

      if (playerError && playerError.code !== 'PGRST116') {
        throw playerError
      }

      userPlayer.value = player
      isParticipating.value = player?.is_participating || false
    } catch (error) {
      console.error('檢查參與狀態失敗:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 切換參與狀態
  const toggleParticipation = async () => {
    if (!currentUser.value) return { success: false, error: '請先登入' }
    
    isLoading.value = true
    try {
      if (!userPlayer.value) {
        // 創建新玩家記錄
        const playerName = currentUser.value.email.split('@')[0] // 使用 email 前綴作為預設名稱
        
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert([{
            user_id: currentUser.value.id,
            name: playerName,
            balls: 0,
            is_participating: true
          }])
          .select()
          .single()

        if (createError) throw createError
        
        userPlayer.value = newPlayer
        isParticipating.value = true
        
        return { success: true, message: '成功加入抽球活動！' }
      } else {
        // 更新現有玩家的參與狀態
        const newStatus = !isParticipating.value
        
        const { error } = await supabase
          .from('players')
          .update({ is_participating: newStatus })
          .eq('id', userPlayer.value.id)

        if (error) throw error
        
        isParticipating.value = newStatus
        userPlayer.value = { ...userPlayer.value, is_participating: newStatus }
        
        return { 
          success: true, 
          message: newStatus ? '重新加入抽球活動！' : '已暫停參與抽球'
        }
      }
    } catch (error) {
      console.error('切換參與狀態失敗:', error)
      return { success: false, error: '操作失敗，請稍後再試' }
    } finally {
      isLoading.value = false
    }
  }

  // 更新玩家名稱
  const updatePlayerName = async (newName) => {
    if (!userPlayer.value) return { success: false, error: '找不到玩家資料' }
    
    try {
      const { error } = await supabase
        .from('players')
        .update({ name: newName })
        .eq('id', userPlayer.value.id)

      if (error) {
        if (error.message.includes('duplicate')) {
          return { success: false, error: '此名稱已被使用' }
        }
        throw error
      }
      
      userPlayer.value = { ...userPlayer.value, name: newName }
      return { success: true, message: '名稱更新成功' }
    } catch (error) {
      console.error('更新名稱失敗:', error)
      return { success: false, error: '更新失敗，請稍後再試' }
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
    return isParticipating.value ? '暫停參與' : '重新參與'
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
