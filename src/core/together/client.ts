const createId = () => {

  return (
    Date.now().toString(36)
    +
    Math.random()
      .toString(36)
      .substring(2)
  )

}


// 当前设备唯一ID
export const clientId = createId()