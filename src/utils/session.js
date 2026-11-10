export function parseLegacyRoleUsers(saved) {
  const users = JSON.parse(saved)
  if (!Array.isArray(users) || users.some((user) =>
    !user || typeof user.id !== 'string' || typeof user.name !== 'string' ||
    !/^\d{4}$/.test(user.pin) || !Array.isArray(user.permissions)
  )) {
    throw new Error('Legacy role data has an invalid format; it was not removed.')
  }
  return users
}
