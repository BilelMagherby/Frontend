export const today = () => new Date().toLocaleDateString('en-CA')

export const endOf = (date) => (date ? new Date(`${date}T23:59:59`).getTime() : Infinity)

export const isLate = (task) => task.status !== 'Done' && task.due && endOf(task.due) < Date.now()

export const normalize = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

export const fmtDay = (timestamp, options = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(timestamp).toLocaleDateString(undefined, options)

export const projectName = (projects, id) => projects?.find((project) => project.id === id)?.name || id || '—'

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatBytes(bytes = 0) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function dueStatus(date) {
  if (!date) return { label: 'Date needed', className: 'needs-date' }
  const due = new Date(`${date}T00:00:00`)
  const current = new Date()
  current.setHours(0, 0, 0, 0)
  const days = Math.ceil((due.getTime() - current.getTime()) / 86_400_000)
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, className: 'overdue' }
  if (days === 0) return { label: 'Due today', className: 'due-soon' }
  if (days <= 14) return { label: `Due in ${days}d`, className: 'due-soon' }
  return { label: 'Scheduled', className: 'scheduled' }
}

