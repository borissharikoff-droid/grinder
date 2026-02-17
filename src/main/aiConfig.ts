/**
 * Internal AI key provider.
 * This keeps key resolution in one place so renderer/users never provide keys.
 */
const INTERNAL_DEEPSEEK_API_KEY = 'sk-b2c365a48862461fb4f9ea74887a3f5c'

export function getDeepSeekApiKey(): string {
  return process.env.DEEPSEEK_API_KEY || INTERNAL_DEEPSEEK_API_KEY
}

