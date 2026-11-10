/** 网络静默看门狗只约束单次无数据等待，不限制有心跳的长任务，也不重投生成请求。 */
export async function readWithIdleTimeout<T>(
  reader: ReadableStreamDefaultReader<T>,
  idleMs = 90_000,
): Promise<ReadableStreamReadResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          const error = new Error('连接暂时没有响应，正在核对已保存的结果。已收到的内容会保留。')
          error.name = 'AIStreamInterruptedError'
          reject(error)
          void reader.cancel().catch(() => undefined)
        }, idleMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
