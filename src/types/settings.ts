export const SECRET_SETTING_KEYS = [
  "deepgramApiKey",
  "openaiApiKey",
  "groqApiKey",
  "claudeApiKey",
  "openRouterApiKey",
  "sermonOpenAiApiKey",
  "decisionsApiKey",
] as const

export type SecretSettingKey = (typeof SECRET_SETTING_KEYS)[number]
export type SecureSettings = Partial<Record<SecretSettingKey, string>>
