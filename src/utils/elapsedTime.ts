/** 将毫秒耗时向下取整为 h/m/s 文案；非法或负输入按零处理。 */
export const formatElapsedTime = (milliseconds: number) => {
  const safeMilliseconds = Number.isFinite(milliseconds) ? milliseconds : 0
  const totalSeconds = Math.max(0, Math.floor(safeMilliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours ? `${hours}h` : '', minutes || hours ? `${minutes}m` : '', `${seconds}s`]
    .filter(Boolean)
    .join(' ')
}
