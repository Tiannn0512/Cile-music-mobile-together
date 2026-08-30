export type TogetherConnectionStatus =

  | 'disconnected'

  | 'connecting'

  | 'connected'





let connectionStatus: TogetherConnectionStatus =

  'disconnected'





export const setConnectionStatus = (

  value: TogetherConnectionStatus

) => {

  connectionStatus = value

}





export const getConnectionStatus = () => {

  return connectionStatus

}