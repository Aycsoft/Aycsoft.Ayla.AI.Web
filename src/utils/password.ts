export const passwordCategoryCount = (value: string) => [/[a-z]/.test(value), /[A-Z]/.test(value), /\d/.test(value), /[^a-z\d]/i.test(value)].filter(Boolean).length
export const isStrongExternalPassword = (value: string) => value.length >= 10 && passwordCategoryCount(value) >= 3
