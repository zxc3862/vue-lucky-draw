// 取得正確的 base URL，優先使用環境變數，否則動態檢測
export function getBaseUrl() {
  // 優先使用環境變數中的生產環境 URL
  if (import.meta.env.VITE_PRODUCTION_URL) {
    return import.meta.env.VITE_PRODUCTION_URL
  }
  
  // 如果是生產環境（domain 不是 localhost），使用當前 origin
  if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')) {
    return window.location.origin
  }
  
  // 開發環境預設使用 localhost
  return 'http://localhost:5173'
}

// 取得完整的 redirect URL
export function getRedirectUrl(path) {
  const baseUrl = getBaseUrl()
  return `${baseUrl}/#${path}`
}
