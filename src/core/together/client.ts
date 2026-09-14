// 当前设备唯一ID
const createId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export const clientId = createId()
