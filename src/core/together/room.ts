let roomCode: string | null = null

// 当前用户是否为房主
let hostStatus = false

export const setRoomCode = (code: string) => {
  roomCode = code
}

export const getRoomCode = () => {
  return roomCode
}

export const clearRoom = () => {
  roomCode = null
  hostStatus = false
}

export const setHost = (value: boolean) => {
  hostStatus = value
}

export const isHost = () => {
  return hostStatus
}
