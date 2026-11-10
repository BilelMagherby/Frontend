export const STATUSES = ['To Do', 'In Progress', 'Review', 'Done']

export const STATUS_COLORS = { 'To Do': '#94a3b8', 'In Progress': '#3b82f6', Review: '#f59e0b', Done: '#10b981' }

export const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent']

export const PRIORITY_COLORS = { Low: '#94a3b8', Normal: '#3b82f6', High: '#f59e0b', Urgent: '#ef4444' }

export const DEFAULT_CONFIG = {
  team: [],
  emails: {},
  ceoEmail: '',
  projects: [],
  w: { ontime: 35, target: 20, overdue: 15, volume: 30 },
  target: 10,
  credit: { name: '', list: '', tag: '', before: '' },
  logo: '/img/logo.png',
}

export const PAGES = [
  ['dash', 'dashboard', 'CEO Dashboard'],
  ['notices', 'bell', 'Notices'],
  ['mails', 'mail', 'Mails'],
  ['meet', 'google-meet', 'Google Meet'],
  ['zoom', 'zoom', 'Zoom'],
  ['cal', 'calendar-clock', 'Calendar & Reminders'],
  ['kpi', 'analytics', 'KPI Analytics'],
  ['day', 'sun', 'My Day'],
  ['tasks', 'tasks', 'Tasks'],
  ['clickup', 'clickup', 'ClickUp'],
  ['projects', 'projects', 'Projects'],
  ['team', 'team', 'Team & KPIs'],
  ['hr', 'hr', 'HR'],
  ['foodics', 'folder', 'Foodics Management'],
  ['roles', 'roles', 'Roles'],
  ['activity', 'database', 'Activity Log'],
]

export const ROLE_PERMISSION_PAGES = PAGES.filter(([key]) => !['roles', 'activity'].includes(key))

export const ALL_ROLE_PERMISSIONS = [...ROLE_PERMISSION_PAGES.map(([key]) => key), 'gulf', 'cashbank']

export const ROLE_PERMISSION_LABELS = Object.fromEntries([
  ...ROLE_PERMISSION_PAGES.map(([key, , label]) => [key, label]),
  ['gulf', 'Natheel Gulf'],
  ['cashbank', 'Cash & Bank'],
])

export const NATHEEL_GULF_SECTIONS = [
  ['hajiss', 'Hajiss cafe Holding Block'],
  ['odin', 'ÖDÜN Pide'],
  ['ghalia', 'Ghalia'],
  ['danny', 'dani Square'],
]

export const GULF_PROJECT_NODES = {
  hajiss: 'hajiss-holding',
  odin: 'odun-pide',
  ghalia: 'ghalia',
  danny: 'dani-square',
}

export const GULF_INITIAL_NODES = [
  { id: 'natheel-gulf', name: 'Natheel Gulf', parent: null, color: '#d99b18' },
  { id: 'unfiled', name: 'Unfiled files', parent: 'natheel-gulf', color: '#94a3b8' },
]
