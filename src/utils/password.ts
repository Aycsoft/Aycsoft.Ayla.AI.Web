/** 统计小写、大写、数字、符号四类字符，用于外部账号密码强度提示。 */
export const passwordCategoryCount = (value: string) =>
  [/[a-z]/.test(value), /[A-Z]/.test(value), /\d/.test(value), /[^a-z\d]/i.test(value)].filter(
    Boolean,
  ).length
/** 当前表单要求至少 10 字符、3 类字符；最终密码策略仍由服务端执行。 */
export const isStrongExternalPassword = (value: string) =>
  value.length >= 10 && passwordCategoryCount(value) >= 3
