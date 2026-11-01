/** 只允许复用已有合法FileId与输入支持类型，发送时服务端仍重新授权。 */
export const canReuseAttachment = (file: { FileId?: string; FileName?: string }) =>
  typeof file.FileId === 'string' &&
  /^[A-Za-z0-9_-]{1,128}$/.test(file.FileId) &&
  /\.(pdf|docx|xlsx|txt|md|csv|png|jpe?g|webp|gif)$/i.test(file.FileName || '')
