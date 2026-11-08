export const FRONTEND_ONLY = import.meta.env.VITE_FRONTEND_ONLY === 'true'

export const STATUSES = ['To Do', 'In Progress', 'Review', 'Done']

export const STATUS_COLORS = { 'To Do': '#94a3b8', 'In Progress': '#3b82f6', Review: '#f59e0b', Done: '#10b981' }

export const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent']

export const PRIORITY_COLORS = { Low: '#94a3b8', Normal: '#3b82f6', High: '#f59e0b', Urgent: '#ef4444' }

export const FRONTEND_REMEMBER_KEY = 'taskflow_demo_remember_until'

export const FRONTEND_SESSION_USER_KEY = 'taskflow_demo_session_user'

export const ROLE_USERS_KEY = 'taskflow_role_users'

export const FRONTEND_REMEMBER_DURATION = 30 * 24 * 60 * 60 * 1000

export const DEFAULT_PROJECTS = [
  { id: 'nathilco', name: 'Natheelco', color: '#1e40af', parent: '' },
  { id: 'hajiss', name: 'Hajiss Café', color: '#b45309', parent: 'nathilco' },
  { id: 'odin', name: 'Odun Pide', color: '#7c3aed', parent: 'nathilco' },
  { id: 'ghalia', name: 'Ghalia', color: '#db2777', parent: 'nathilco' },
  { id: 'danny', name: 'Dani Designs', color: '#0891b2', parent: 'nathilco' },
]

export const TEAM = [
  ['ابراهيم عبدالكريم موسى الربيعان', 'ir@natheelco.com'],
  ['Natheel Management', 'info@natheelco.com'],
  ['Nourah Alrubaian', 'n.r@natheelco.com'],
  ['Abdulkareem Alrubaian', 'ar@natheelco.com'],
  ['Hajar Hanafi', 'hh@natheelco.com'],
  ['Hamza Tahrir', 'ht@natheelco.com'],
  ['Asma Ghidhaoui', 'asma.g@natheelco.com'],
  ['Hana Alqabaa', ''],
  ['Zineb Bouhoush', 'Zineb.b@natheelco.com'],
  ['Bilel Maghrebi', 'bilel.m@natheelco.com'],
  ['Aziz Latrache', 'Aziz.l@natheelco.com'],
]

export const EMAIL_DEFAULTS = Object.fromEntries(TEAM.filter((person) => person[1]))

export const DEFAULT_CONFIG = {
  team: TEAM.map((person) => person[0]),
  emails: EMAIL_DEFAULTS,
  ceoEmail: '',
  projects: DEFAULT_PROJECTS,
  w: { ontime: 35, target: 20, overdue: 15, volume: 30 },
  target: 10,
  credit: { name: 'Asma', list: '', tag: '', before: '' },
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

export const ALL_ROLE_PERMISSIONS = [...ROLE_PERMISSION_PAGES.map(([key]) => key), 'gulf']

export const ROLE_PERMISSION_LABELS = Object.fromEntries([...ROLE_PERMISSION_PAGES, ['gulf', 'Natheel Gulf']].map(([key, , label]) => [key, label || 'Natheel Gulf']))

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
  { id: 'hajiss-holding', name: 'Hajiss Cafe Holding Block', parent: 'natheel-gulf', color: '#b45309' },
  { id: 'hajiss-outlet', name: 'Hajiss Cafe Outlet', parent: 'hajiss-holding', color: '#c2410c' },
  { id: 'hajiss-ecommerce', name: 'Hajiss Ecommerce System', parent: 'hajiss-holding', color: '#ea580c' },
  { id: 'hajiss-supply', name: 'Hajiss Supply Chain Inflow', parent: 'hajiss-holding', color: '#d97706' },
  { id: 'odun-pide', name: 'ÖDÜN Pide', parent: 'natheel-gulf', color: '#7c3aed' },
  { id: 'ghalia', name: 'Ghalia', parent: 'natheel-gulf', color: '#db2777' },
  { id: 'dani-square', name: 'Dani Square', parent: 'natheel-gulf', color: '#0891b2' },
  { id: 'unfiled', name: 'Unfiled files', parent: 'natheel-gulf', color: '#94a3b8' },
]

export const GULF_INITIAL_ASSETS = [
  { id: 'gulf-zatca', name: 'التصريح الضريبي لZATCA عن سند صرف منصة ايجار.pdf', description: 'ZATCA IJAR first post', node: 'natheel-gulf', security: 'Internal Only', size: '162 KB', uploadedBy: 'Protected', added: 'Oct 28, 2026', type: 'PDF' },
  { id: 'gulf-crn', name: 'Commercia CRN Natheel.pdf', description: 'Natheel commercial number CRN', node: 'natheel-gulf', security: 'Internal Only', size: '904 KB', uploadedBy: 'Protected', added: 'Oct 28, 2026', type: 'PDF' },
  { id: 'gulf-presentations', name: 'Dani square+ Hajiss Presentations.pdf', description: 'PDF', node: 'natheel-gulf', security: 'Internal Only', size: '2.5 MB', uploadedBy: 'Protected', added: 'Oct 26, 2026', type: 'PDF' },
  { id: 'gulf-dani-presentation', name: 'Dani_Square_Presentation.pdf', description: 'Dani Square presentation', node: 'dani-square', security: 'Internal Only', size: '1.1 MB', uploadedBy: 'Protected', added: 'Oct 26, 2026', type: 'PDF' },
  { id: 'gulf-hajiss-spreadsheet', name: 'SPRHail_Cafes_Influencers_Database.xlsx', description: 'Hajiss Decription for the suppliers', node: 'hajiss-outlet', security: 'Internal Only', size: '32.1 KB', uploadedBy: 'Protected', added: 'Oct 25, 2026', type: 'XLSX' },
  { id: 'gulf-hajiss-suppliers', name: 'هاجس — تعريف للموردينfinal.pdf', description: 'Hajiss supplier information', node: 'hajiss-outlet', security: 'Internal Only', size: '2.9 MB', uploadedBy: 'Protected', added: 'Oct 25, 2026', type: 'PDF' },
  { id: 'gulf-hajiss-data', name: 'SPRHail_Cafes_Influencers_Database.xlsx', description: 'Spreadsheets & data', node: 'hajiss-holding', security: 'Internal Only', size: '32.1 KB', uploadedBy: 'Not recorded', added: 'Oct 25, 2026', type: 'XLSX' },
]
