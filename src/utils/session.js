import {
  FRONTEND_REMEMBER_KEY,
  FRONTEND_SESSION_USER_KEY,
  FRONTEND_REMEMBER_DURATION,
  ROLE_USERS_KEY,
} from './constants.js'

export const rememberFrontendSession = (userId = 'admin') => {
  try {
    localStorage.setItem(FRONTEND_REMEMBER_KEY, String(Date.now() + FRONTEND_REMEMBER_DURATION))
    localStorage.setItem(FRONTEND_SESSION_USER_KEY, userId)
  } catch {}
}

export const clearFrontendRememberedSession = () => {
  try {
    localStorage.removeItem(FRONTEND_REMEMBER_KEY)
    localStorage.removeItem(FRONTEND_SESSION_USER_KEY)
  } catch {}
}

export const hasFrontendRememberedSession = () => {
  try {
    const expiresAt = Number(localStorage.getItem(FRONTEND_REMEMBER_KEY))
    if (expiresAt > Date.now()) return true
    clearFrontendRememberedSession()
  } catch {}
  return false
}

export function loadRoleUsers() {
  try {
    const stored = localStorage.getItem(ROLE_USERS_KEY)
    const users = stored ? JSON.parse(stored) : []
    if (
      !Array.isArray(users) ||
      users.some(
        (user) =>
          !user ||
          typeof user.id !== 'string' ||
          typeof user.name !== 'string' ||
          !/^\d{4}$/.test(user.pin) ||
          !Array.isArray(user.permissions)
      )
    ) {
      throw new Error('The saved user list is not valid.')
    }
    return { users, error: '' }
  } catch (error) {
    return { users: [], error: `Could not load saved users: ${error.message}` }
  }
}
