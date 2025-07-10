/**
 * WebStorage 異步服務
 * 提供類似 WebStorageService.SetItemAsync 的機制
 * 確保 localStorage 操作的可靠性和一致性
 */

class WebStorageService {
  /**
   * 異步設置 localStorage 項目
   * @param {string} key - 鍵名
   * @param {string} value - 值
   * @returns {Promise<boolean>} - 是否成功
   */
  static async setItemAsync(key, value) {
    return new Promise((resolve) => {
      try {
        // 使用 setTimeout 確保操作在下一個事件循環中執行
        setTimeout(() => {
          try {
            localStorage.setItem(key, value)
            
            // 立即驗證是否設置成功
            const verified = localStorage.getItem(key)
            if (verified === value) {
              console.log(`✅ WebStorage.setItemAsync 成功: ${key} = ${value}`)
              resolve(true)
            } else {
              console.error(`❌ WebStorage.setItemAsync 驗證失敗: ${key}`)
              console.error(`  預期: ${value}`)
              console.error(`  實際: ${verified}`)
              resolve(false)
            }
          } catch (error) {
            console.error(`❌ WebStorage.setItemAsync 錯誤: ${key}`, error)
            resolve(false)
          }
        }, 0)
      } catch (error) {
        console.error(`❌ WebStorage.setItemAsync 外層錯誤: ${key}`, error)
        resolve(false)
      }
    })
  }

  /**
   * 異步獲取 localStorage 項目
   * @param {string} key - 鍵名
   * @returns {Promise<string|null>} - 值或 null
   */
  static async getItemAsync(key) {
    return new Promise((resolve) => {
      try {
        setTimeout(() => {
          try {
            const value = localStorage.getItem(key)
            console.log(`🔍 WebStorage.getItemAsync: ${key} = ${value}`)
            resolve(value)
          } catch (error) {
            console.error(`❌ WebStorage.getItemAsync 錯誤: ${key}`, error)
            resolve(null)
          }
        }, 0)
      } catch (error) {
        console.error(`❌ WebStorage.getItemAsync 外層錯誤: ${key}`, error)
        resolve(null)
      }
    })
  }

  /**
   * 異步移除 localStorage 項目
   * @param {string} key - 鍵名
   * @returns {Promise<boolean>} - 是否成功
   */
  static async removeItemAsync(key) {
    return new Promise((resolve) => {
      try {
        setTimeout(() => {
          try {
            localStorage.removeItem(key)
            
            // 驗證是否移除成功
            const verified = localStorage.getItem(key)
            if (verified === null) {
              console.log(`✅ WebStorage.removeItemAsync 成功: ${key}`)
              resolve(true)
            } else {
              console.error(`❌ WebStorage.removeItemAsync 驗證失敗: ${key} 仍然存在`)
              resolve(false)
            }
          } catch (error) {
            console.error(`❌ WebStorage.removeItemAsync 錯誤: ${key}`, error)
            resolve(false)
          }
        }, 0)
      } catch (error) {
        console.error(`❌ WebStorage.removeItemAsync 外層錯誤: ${key}`, error)
        resolve(false)
      }
    })
  }

  /**
   * 檢查 localStorage 是否可用
   * @returns {Promise<boolean>} - 是否可用
   */
  static async isAvailableAsync() {
    return new Promise((resolve) => {
      try {
        const testKey = '__webStorageTest__'
        const testValue = 'test'
        
        setTimeout(() => {
          try {
            localStorage.setItem(testKey, testValue)
            const retrieved = localStorage.getItem(testKey)
            localStorage.removeItem(testKey)
            
            const available = retrieved === testValue
            console.log(`🔍 WebStorage 可用性檢查: ${available}`)
            resolve(available)
          } catch (error) {
            console.error('❌ WebStorage 不可用:', error)
            resolve(false)
          }
        }, 0)
      } catch (error) {
        console.error('❌ WebStorage 可用性檢查錯誤:', error)
        resolve(false)
      }
    })
  }

  /**
   * 等待 localStorage 準備就緒
   * @param {number} timeout - 超時時間（毫秒）
   * @returns {Promise<boolean>} - 是否準備就緒
   */
  static async waitForReady(timeout = 5000) {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      if (await this.isAvailableAsync()) {
        console.log('✅ WebStorage 已準備就緒')
        return true
      }
      
      // 等待 100ms 再重試
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.error('❌ WebStorage 準備超時')
    return false
  }
}

export default WebStorageService
