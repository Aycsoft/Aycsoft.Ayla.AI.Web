/** 整秒展示耗时，正数不足一秒单独说明，避免小数秒和假零耗时。 */
export const formatElapsedTime = (milliseconds: number) => {
  const safeMilliseconds = Number.isFinite(milliseconds) ? milliseconds : 0
  const totalSeconds = Math.max(0, Math.floor(safeMilliseconds / 1000))
  if (safeMilliseconds > 0 && safeMilliseconds < 1000) return '不足 1 秒'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours ? `${hours} 小时` : '', minutes || hours ? `${minutes} 分钟` : '', `${seconds} 秒`]
    .filter(Boolean)
    .join(' ')
}
