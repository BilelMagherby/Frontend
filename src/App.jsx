import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './styles.css'
import { Icon } from './components/ui/Icon.jsx'
import { AppLayout } from './components/layout/AppLayout.jsx'
import { FOODICS_PROJECTS, FOODICS_SECTIONS } from './pages/FoodicsManagement/foodicsData.js'
import {
  DEFAULT_CONFIG,
  PAGES,
  ALL_ROLE_PERMISSIONS,
  GULF_INITIAL_NODES,
} from './utils/constants.js'
import { migrateLegacyBrowserData } from './services/legacyBrowserMigration.js'
import { isLate, endOf, normalize, today } from './utils/helpers.js'
import { request, api } from './services/api.js'

// Dialog components
import { PinGate } from './components/dialogs/PinGate.jsx'
import { TaskForm } from './components/dialogs/TaskForm.jsx'
import { MeetingForm } from './components/dialogs/MeetingForm.jsx'
import { ImportForm } from './components/dialogs/ImportForm.jsx'
import { MeetingDetail } from './components/dialogs/MeetingDetail.jsx'
import { CalendarEventDetail } from './components/dialogs/CalendarEventDetail.jsx'

// Independent Page components
import { DashboardPage } from './pages/Dashboard/DashboardPage.jsx'
import { TasksPage } from './pages/Tasks/TasksPage.jsx'
import { MyDayPage } from './pages/MyDay/MyDayPage.jsx'
import { ClickUpPage } from './pages/ClickUp/ClickUpPage.jsx'
import { ProjectsPage } from './pages/Projects/ProjectsPage.jsx'
import { TeamPage } from './pages/Team/TeamPage.jsx'
import { HRWorkspace } from './pages/HR/HRWorkspace.jsx'
import { NoticesPage } from './pages/Notices/NoticesPage.jsx'
import { KPIAnalyticsPage } from './pages/KPIAnalytics/KPIAnalyticsPage.jsx'
import { MeetingsPage } from './pages/Meetings/MeetingsPage.jsx'
import { MailsPage } from './pages/Mails/MailsPage.jsx'
import { CalendarPage } from './pages/Calendar/CalendarPage.jsx'
import { NatheelGulfPage } from './pages/NatheelGulf/NatheelGulfPage.jsx'
import { FoodicsManagementPage } from './pages/FoodicsManagement/FoodicsManagementPage.jsx'
import { RolesPage } from './pages/Roles/RolesPage.jsx'
import { ActivityLogPage } from './pages/ActivityLog/ActivityLogPage.jsx'

export function App() {
  const [auth, setAuth] = useState(null)
  const [preferencesLoadedFor, setPreferencesLoadedFor] = useState('')
  const [roleStore, setRoleStore] = useState({ users: [], error: '' })
  const roleUsers = roleStore.users
  const [page, setPage] = useState('dash')
  const [foodicsSection, setFoodicsSection] = useState('overview')
  const [foodicsProject, setFoodicsProject] = useState('')
  const [foodicsProjectOpen, setFoodicsProjectOpen] = useState('')
  const [foodicsNavOpen, setFoodicsNavOpen] = useState(true)
  const [natheelGulfOpen, setNatheelGulfOpen] = useState(false)
  const [gulfActiveSection, setGulfActiveSection] = useState('files')
  const [gulfNodes, setGulfNodes] = useState([])
  const [gulfAssets, setGulfAssets] = useState([])
  const [gulfContacts, setGulfContacts] = useState([])
  const [gulfSelectedNode, setGulfSelectedNode] = useState('natheel-gulf')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [tasks, setTasks] = useState([])
  const [history, setHistory] = useState([])
  const [employeeReviews, setEmployeeReviews] = useState([])
  const [ceoNotes, setCeoNotes] = useState([])
  const [ceoDashboardSummary, setCeoDashboardSummary] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [clickup, setClickup] = useState({ configured: false, tasks: [], members: [], workspaces: [], spaces: [] })
  const [integrations, setIntegrations] = useState({ google: false, zoom: false, timezone: 'Asia/Riyadh' })
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ project: '', assignee: '', status: '', search: '', space: '', closed: true })
  const [taskDialog, setTaskDialog] = useState(false)
  const [meetingDialog, setMeetingDialog] = useState('')
  const [importDialog, setImportDialog] = useState(false)
  const [meetingDetail, setMeetingDetail] = useState(null)
  const [newProject, setNewProject] = useState('')
  const [newColor, setNewColor] = useState('#2563eb')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [calendarEventDetail, setCalendarEventDetail] = useState(null)
  const [seenReminderIds, setSeenReminderIds] = useState([])
  const [currentDate, setCurrentDate] = useState(today)
  const [calendarPerson, setCalendarPerson] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [clickupStatus, setClickupStatus] = useState('Not connected')
  const [lastSync, setLastSync] = useState(0)
  const [taskMode, setTaskMode] = useState('list')
  const [minutesBusy, setMinutesBusy] = useState(false)
  const configDraftDirty = useRef(false)
  const ceoDashboardRequestVersion = useRef(0)
  useEffect(() => {
    const interval = window.setInterval(() => setCurrentDate(today()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const showError = useCallback((message) => {
    setError(message)
    setToast('')
  }, [])
  const showToast = useCallback((message) => {
    setToast(message)
    setError('')
    window.setTimeout(() => setToast(''), 4500)
  }, [])

  const taskDataPermissions = ['dash', 'notices', 'tasks', 'day', 'kpi', 'team', 'projects', 'cal', 'clickup']
  const canReadTaskData =
    auth?.activeUser?.isAdmin || taskDataPermissions.some((permission) => auth?.activeUser?.permissions?.includes(permission))
  const canReadMeetings =
    auth?.activeUser?.isAdmin || ['notices', 'meet', 'zoom', 'cal'].some((permission) => auth?.activeUser?.permissions?.includes(permission))
  const canReadCeoDashboard = auth?.activeUser?.isAdmin || auth?.activeUser?.permissions?.includes('dash')
  const isAdmin = Boolean(auth?.activeUser?.isAdmin)
  const canReadGulf = auth?.activeUser?.isAdmin || auth?.activeUser?.permissions?.includes('gulf')

  const refresh = useCallback(async () => {
    const dashboardQuery = new URLSearchParams({
      project: filters.project,
      assignee: filters.assignee,
      status: filters.status,
    })
    const dashboardRequestVersion = ++ceoDashboardRequestVersion.current
    if (canReadCeoDashboard) {
      request(`/api/dashboard/ceo?${dashboardQuery}`)
        .then((summary) => {
          if (dashboardRequestVersion === ceoDashboardRequestVersion.current) setCeoDashboardSummary(summary)
        })
        .catch((cause) => {
          if (dashboardRequestVersion === ceoDashboardRequestVersion.current) {
            setCeoDashboardSummary(null)
            showError(`Could not load CEO dashboard summary: ${cause.message}`)
          }
        })
    } else {
      setCeoDashboardSummary(null)
    }
    const [taskRows, historyRows, meetingRows, configRow, employeeReviewRows, ceoNoteRows] = await Promise.all([
      canReadTaskData ? api.list('tasks') : Promise.resolve([]),
      canReadTaskData ? api.list('history') : Promise.resolve([]),
      canReadMeetings ? api.list('meetings') : Promise.resolve([]),
      api.get('config/main'),
      isAdmin ? api.list('kpiReviews') : Promise.resolve([]),
      isAdmin ? api.list('kpiNotes') : Promise.resolve([]),
    ])
    setTasks(taskRows.map((row) => ({ id: row.id, ...row.data })))
    setHistory(historyRows.map((row) => ({ id: row.id, ...row.data })))
    setMeetings(meetingRows.map((row) => ({ id: row.id, ...row.data })))
    setEmployeeReviews(employeeReviewRows)
    setCeoNotes(ceoNoteRows)
    if (!configDraftDirty.current) {
      const data = configRow.exists ? configRow.data : {}
      setConfig({
        ...DEFAULT_CONFIG,
        ...data,
        w: { ...DEFAULT_CONFIG.w, ...(data.w || {}) },
        credit: { ...DEFAULT_CONFIG.credit, ...(data.credit || {}) },
        projects: data.projects || [],
        team: data.team || [],
        emails: data.emails || {},
      })
    }
  }, [
    auth?.activeUser?.id,
    auth?.activeUser?.permissions,
    canReadCeoDashboard,
    canReadMeetings,
    canReadTaskData,
    filters.assignee,
    filters.project,
    filters.status,
    isAdmin,
    showError,
  ])

  const syncClickup = useCallback(async (force = false) => {
    try {
      setClickupStatus('Syncing…')
      const data = await request(`/api/clickup${force ? '?force=1' : ''}`)
      setClickup(data)
      setClickupStatus(data.configured ? `${data.tasks?.length || 0} tasks • live` : 'Not connected')
      setLastSync(Date.now())
      return data
    } catch (cause) {
      setClickupStatus(`ClickUp: ${cause.message}`)
      return null
    }
  }, [])

  async function addEmployeeReview(data) {
    const id = `review-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    try {
      const saved = await api.put(`kpiReviews/${id}`, {
        ...data,
        author: auth.activeUser.name,
        createdAt: new Date().toISOString(),
      })
      setEmployeeReviews((current) => [...current, { id: saved.id, data: saved.data }])
      showToast('Employee review saved.')
      return true
    } catch (cause) {
      showError(`Could not save employee review: ${cause.message}`)
      return false
    }
  }

  async function deleteEmployeeReview(review) {
    try {
      await api.remove(`kpiReviews/${review.id}`)
      setEmployeeReviews((current) => current.filter((entry) => entry.id !== review.id))
      showToast('Employee review deleted.')
      return true
    } catch (cause) {
      showError(`Could not delete employee review: ${cause.message}`)
      return false
    }
  }

  async function addCeoNote(data) {
    const id = `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    try {
      const saved = await api.put(`kpiNotes/${id}`, {
        ...data,
        author: auth.activeUser.name,
        createdAt: new Date().toISOString(),
      })
      setCeoNotes((current) => [...current, { id: saved.id, data: saved.data }])
      showToast('CEO note saved.')
      return true
    } catch (cause) {
      showError(`Could not save CEO note: ${cause.message}`)
      return false
    }
  }

  async function deleteCeoNote(note) {
    try {
      await api.remove(`kpiNotes/${note.id}`)
      setCeoNotes((current) => current.filter((entry) => entry.id !== note.id))
      showToast('CEO note deleted.')
      return true
    } catch (cause) {
      showError(`Could not delete CEO note: ${cause.message}`)
      return false
    }
  }

  useEffect(() => {
    let active = true
    request('/api/auth')
      .then(async (data) => {
        if (data.authed && data.activeUser?.isAdmin) {
          try {
            const migrated = await migrateLegacyBrowserData(data.activeUser)
            if (migrated.migrated && (migrated.documents || migrated.files)) {
              setToast(`Moved ${migrated.documents} record(s) and ${migrated.files} file(s) to the shared backend.`)
            }
          } catch (cause) {
            if (active) setError(`Could not migrate saved browser data to the backend: ${cause.message}`)
          }
        }
        if (active) setAuth(data)
      })
      .catch((cause) => {
        if (active) {
          setAuth({
            configured: false,
            authed: false,
            error: `Cannot connect to the backend: ${cause.message}`,
          })
        }
      })
    return () => {
      active = false
    }
  }, [])

  async function completeAuthentication(nextAuth) {
    if (nextAuth.activeUser?.isAdmin) {
      try {
        const migrated = await migrateLegacyBrowserData(nextAuth.activeUser)
        if (migrated.migrated && (migrated.documents || migrated.files)) {
          setToast(`Moved ${migrated.documents} record(s) and ${migrated.files} file(s) to the shared backend.`)
        }
      } catch (cause) {
        setError(`Could not migrate saved browser data to the backend: ${cause.message}`)
      }
    }
    const permissions = nextAuth.activeUser?.permissions || []
    setPage(nextAuth.activeUser?.isAdmin ? 'dash' : permissions[0] || 'dash')
    setAuth(nextAuth)
  }

  async function saveRoleUsers(users) {
    try {
      const savedUsers = await request('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users }),
      })
      setRoleStore({ users: savedUsers, error: '' })
      return true
    } catch (cause) {
      setRoleStore((current) => ({ ...current, error: `Could not save users: ${cause.message}` }))
      return false
    }
  }

  useEffect(() => {
    if (!auth?.authed) return undefined
    let active = true
    const load = async () => {
      try {
        await refresh()
      } catch (cause) {
        if (active) showError(cause.message)
      }
    }
    load()
    const loadIntegrations = async () => {
      if (!canReadMeetings) return
      try {
        const data = await request('/api/meetings')
        if (active) setIntegrations(data)
      } catch (cause) {
        if (active) showError(cause.message)
      }
    }
    loadIntegrations()
    if (auth.activeUser?.isAdmin) {
      request('/api/users')
        .then((users) => setRoleStore({ users, error: '' }))
        .catch((cause) => setRoleStore((current) => ({ ...current, error: `Could not load users: ${cause.message}` })))
    }
    const poll = window.setInterval(load, 5000)
    return () => {
      active = false
      window.clearInterval(poll)
    }
  }, [
    auth?.activeUser?.id,
    auth?.activeUser?.isAdmin,
    auth?.authed,
    canReadMeetings,
    refresh,
    showError,
  ])

  useEffect(() => {
    if (!auth?.authed || !canReadGulf) return undefined
    let active = true
    const loadGulf = async () => {
      try {
        const result = await api.get('gulf/main')
        if (!result.exists) {
          await api.put('gulf/main', { nodes: GULF_INITIAL_NODES, assets: [], contacts: [] })
          if (!active) return
          setGulfNodes(GULF_INITIAL_NODES)
          setGulfAssets([])
          setGulfContacts([])
        } else {
          if (
            !Array.isArray(result.data?.nodes) ||
            !Array.isArray(result.data?.assets) ||
            (result.data.contacts !== undefined && !Array.isArray(result.data.contacts))
          ) {
            throw new Error('Stored Natheel Gulf data has an invalid format.')
          }
          if (!active) return
          setGulfNodes(result.data.nodes)
          setGulfAssets(result.data.assets)
          setGulfContacts(result.data.contacts || [])
        }
      } catch (cause) {
        if (active) showError(`Could not load Natheel Gulf data: ${cause.message}`)
      }
    }
    loadGulf()
    const poll = window.setInterval(() => {
      if (!document.hidden) loadGulf()
    }, 15000)
    return () => {
      active = false
      window.clearInterval(poll)
    }
  }, [auth?.authed, canReadGulf, showError])

  const saveGulfContacts = useCallback(async (contacts) => {
    await api.patch('gulf/main', { contacts })
    setGulfContacts(contacts)
  }, [])

  useEffect(() => {
    if (!auth?.authed || !canReadTaskData) return undefined
    syncClickup()
    const sync = window.setInterval(() => {
      if (!document.hidden) syncClickup()
    }, 30_000)
    return () => window.clearInterval(sync)
  }, [auth?.authed, canReadTaskData, syncClickup])

  useEffect(() => {
    const user = auth?.activeUser
    if (!auth?.authed || !user?.id) {
      setPreferencesLoadedFor('')
      return undefined
    }
    let active = true
    const applyPreferences = (preferences = {}) => {
      const permissions = user.permissions || []
      const allowedPage = (candidate) =>
        user.isAdmin ||
        (candidate === 'gulf'
          ? permissions.includes('gulf')
          : candidate !== 'roles' && candidate !== 'activity' &&
            (candidate === 'notices' ? ['dash', 'notices'].some((permission) => permissions.includes(permission)) :
              permissions.includes(candidate)))
      if (typeof preferences.page === 'string' && allowedPage(preferences.page)) setPage(preferences.page)
      if (preferences.filters && typeof preferences.filters === 'object' && !Array.isArray(preferences.filters)) {
        setFilters((current) => ({ ...current, ...preferences.filters }))
      }
      if (typeof preferences.calendarDate === 'string') {
        const date = new Date(preferences.calendarDate)
        if (!Number.isNaN(date.getTime())) setCalendarDate(date)
      }
      if (typeof preferences.calendarPerson === 'string') {
        setCalendarPerson(preferences.calendarPerson)
      }
      if (['list', 'board', 'calendar'].includes(preferences.taskMode)) setTaskMode(preferences.taskMode)
      if (typeof preferences.foodicsSection === 'string') setFoodicsSection(preferences.foodicsSection)
      if (typeof preferences.foodicsProject === 'string') setFoodicsProject(preferences.foodicsProject)
      if (typeof preferences.foodicsProjectOpen === 'string') setFoodicsProjectOpen(preferences.foodicsProjectOpen)
      if (typeof preferences.foodicsNavOpen === 'boolean') setFoodicsNavOpen(preferences.foodicsNavOpen)
      if (typeof preferences.natheelGulfOpen === 'boolean') setNatheelGulfOpen(preferences.natheelGulfOpen)
      if (typeof preferences.gulfActiveSection === 'string') setGulfActiveSection(preferences.gulfActiveSection)
      if (typeof preferences.gulfSelectedNode === 'string') setGulfSelectedNode(preferences.gulfSelectedNode)
      if (Array.isArray(preferences.seenReminderIds)) {
        setSeenReminderIds(preferences.seenReminderIds.filter((id) => typeof id === 'string').slice(-500))
      }
      setPreferencesLoadedFor(user.id)
    }
    api.get(`preferences/${user.id}`)
      .then((result) => {
        if (active) applyPreferences(result.exists ? result.data : {})
      })
      .catch((cause) => {
        if (active) {
          showError(`Could not load your dashboard preferences: ${cause.message}`)
        }
      })
    return () => {
      active = false
    }
  }, [
    auth?.activeUser?.id,
    auth?.activeUser?.isAdmin,
    auth?.activeUser?.permissions,
    auth?.authed,
    showError,
  ])

  useEffect(() => {
    const user = auth?.activeUser
    if (!auth?.authed || !user?.id || preferencesLoadedFor !== user.id) return undefined
    const preferences = {
      page,
      filters,
      calendarDate: calendarDate.toISOString(),
      calendarPerson,
      taskMode,
      foodicsSection,
      foodicsProject,
      foodicsProjectOpen,
      foodicsNavOpen,
      natheelGulfOpen,
      gulfActiveSection,
      gulfSelectedNode,
      seenReminderIds: seenReminderIds.slice(-500),
    }
    const timer = window.setTimeout(() => {
      api.patch(`preferences/${user.id}`, preferences)
        .catch((cause) => {
          showError(`Could not save your dashboard preferences: ${cause.message}`)
        })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [
    auth?.activeUser?.id,
    auth?.authed,
    calendarDate,
    calendarPerson,
    filters,
    foodicsNavOpen,
    foodicsProject,
    foodicsProjectOpen,
    foodicsSection,
    gulfActiveSection,
    gulfSelectedNode,
    natheelGulfOpen,
    page,
    preferencesLoadedFor,
    seenReminderIds,
    showError,
    taskMode,
  ])

  useEffect(() => {
    const user = auth?.activeUser
    if (!auth?.authed || !user || user.isAdmin || user.permissions?.includes(page)) return
    setPage(user.permissions?.find((permission) => ALL_ROLE_PERMISSIONS.includes(permission)) || 'dash')
  }, [auth?.activeUser, auth?.authed, page])

  const projects = useMemo(() => {
    const configured = config.projects || []
    const known = new Set(configured.map((project) => project.id))
    const extras = [
      ...new Set([...tasks, ...history].map((task) => task.project).filter((id) => id && !known.has(id))),
    ].map((id) => ({ id, name: id, color: '#64748b', parent: 'nathilco' }))
    return [...configured, ...extras]
  }, [config.projects, tasks, history])

  const cuTasks = useMemo(
    () => {
      const membersById = new Map(
        (clickup.members || []).map((member) => [String(member.id), member.name])
      )
      return (clickup.tasks || []).map((task) => {
        const rawStatus = typeof task.status === 'string' ? task.status : task.status?.status || ''
        const status = rawStatus.toLowerCase()
        const type = task.status_type || task.status?.type || ''
        const priority = typeof task.priority === 'string' ? task.priority : task.priority?.priority
        const done = type === 'done' || type === 'closed' || (!type && /complete|closed|done/.test(status))
        const assignees = (task.assignees || [])
          .map(
            (person) =>
              membersById.get(String(person.id)) || person.username || person.email || person.name || String(person.id || '')
          )
          .filter(Boolean)
        const clickupProject = [task.list?.name, task.folder?.name, task.space?.name]
          .map((name) =>
            projects.find(
              (project) => normalize(project.name) === normalize(name) || normalize(project.id) === normalize(name)
            )
          )
          .find(Boolean)
        return {
          id: `cu:${task.id}`,
          externalId: task.id,
          url: task.url,
          title: task.name,
          description: task.description || task.text_content || '',
          project: clickupProject?.id || task.list?.name || 'ClickUp',
          assignee: assignees[0] || '',
          assignees,
          status: done
            ? 'Done'
            : type === 'open' || status === 'to do' || status === 'open'
            ? 'To Do'
            : /review|approv|qa/.test(status)
            ? 'Review'
            : 'In Progress',
          rawStatus,
          statusColor: task.status_color || task.status?.color,
          due: task.due_date ? new Date(+task.due_date).toLocaleDateString('en-CA') : '',
          priority:
            typeof priority === 'string' && priority ? priority[0].toUpperCase() + priority.slice(1) : 'Normal',
          tags: (task.tags || []).map((tag) => tag.name),
          doneAt: task.date_closed ? +task.date_closed : 0,
          space: task.space?.name || '',
          folder: task.folder?.name || '',
          list: task.list?.name || '',
          created: task.date_created ? +task.date_created : 0,
          updated: task.date_updated ? +task.date_updated : 0,
          parent: task.parent || '',
          demo: false,
          source: 'clickup',
        }
      })
    },
    [clickup.members, clickup.tasks, projects]
  )

  const historicalTasks = useMemo(() => {
    const used = new Set()
    const normalizedHistory = new Map()
    history.forEach((item) => {
      const key = normalize(item.title)
      if (key && !normalizedHistory.has(key)) normalizedHistory.set(key, item)
    })
    const credited = cuTasks.map((task) => {
      const imported = normalizedHistory.get(normalize(task.title))
      const rule = config.credit || {}
      const matchesRule =
        (rule.list &&
          [task.list, task.folder, task.space].some((value) => normalize(value) === normalize(rule.list))) ||
        (rule.tag && task.tags.some((tag) => normalize(tag) === normalize(rule.tag))) ||
        (rule.before && task.created && task.created <= endOf(rule.before))
      if (!imported && !(config.credit?.name && matchesRule)) return task
      if (imported) used.add(normalize(task.title))
      const owner = imported?.assignee || config.credit?.name || ''
      return {
        ...task,
        assignee: owner,
        assignees: owner ? [owner] : [],
        status: imported?.status === 'Done' ? 'Done' : task.status,
        doneAt: imported?.doneAt || task.doneAt,
        due: task.due || imported?.due || '',
        credited: true,
        imported,
      }
    })
    const importedRows = history
      .filter((item) => !used.has(normalize(item.title)))
      .map((item) => ({
        id: `history:${item.id}`,
        title: item.title,
        project: item.project || 'nathilco',
        assignee: item.assignee || '',
        assignees: item.assignee ? [item.assignee] : [],
        status: item.status || 'Done',
        priority: item.priority || 'Normal',
        due: item.due || '',
        doneAt: item.doneAt || 0,
        note: item.note || '',
        hist: true,
        tags: ['Google Sheets'],
        source: 'history',
      }))
    return [
      ...credited,
      ...tasks.map((task) => ({ ...task, assignees: task.assignee ? [task.assignee] : [], source: 'taskflow' })),
      ...importedRows,
    ]
  }, [config.credit, cuTasks, history, tasks])

  const allTasks = historicalTasks
  const people = useMemo(
    () => [
      ...new Set([
        'CEO',
        ...(config.team || []),
        ...(clickup.members || []).map((person) => person.name),
        ...allTasks.flatMap((task) => task.assignees || []),
      ]),
    ],
    [allTasks, clickup.members, config.team]
  )
  const kpiPeople = useMemo(() => {
    const workers = new Map()
    ;[
      ...(clickup.members || []).map((member) => member.name),
      ...allTasks.flatMap((task) => task.assignees || (task.assignee ? [task.assignee] : [])),
    ].forEach((name) => {
      const label = String(name || '').trim()
      const key = normalize(label)
      if (key && key !== normalize('CEO') && !workers.has(key)) workers.set(key, label)
    })
    return [...workers.values()].sort((a, b) => a.localeCompare(b))
  }, [allTasks, clickup.members])

  const projectScope = useCallback(
    (projectId, source = allTasks) =>
      source.filter((task) => {
        if (!projectId) return true
        let taskProject = projects.find((item) => item.id === task.project)
        while (taskProject) {
          if (taskProject.id === projectId) return true
          taskProject = projects.find((item) => item.id === taskProject.parent)
        }
        return task.project === projectId
      }),
    [allTasks, projects]
  )

  const scopedTasks = useMemo(
    () =>
      projectScope(filters.project).filter((task) => {
        const matchesPerson =
          !filters.assignee ||
          (task.assignees || [task.assignee]).some((name) => normalize(name) === normalize(filters.assignee))
        const matchesStatus =
          !filters.status || (filters.status === 'Overdue' ? isLate(task) : task.status === filters.status)
        return matchesPerson && matchesStatus
      }),
    [filters.assignee, filters.project, filters.status, projectScope]
  )

  const teamTasks = useMemo(
    () =>
      projectScope(filters.project).filter((task) =>
        !filters.status || (filters.status === 'Overdue' ? isLate(task) : task.status === filters.status)
      ),
    [filters.project, filters.status, projectScope]
  )

  const kpiRows = useMemo(() => {
    const staff = kpiPeople
    const busiest = Math.max(
      1,
      ...staff.map((person) =>
        teamTasks.filter((task) =>
          (task.assignees || [task.assignee]).some((name) => normalize(name) === normalize(person))
        ).length
      )
    )
    return staff
      .map((name) => {
        const owned = teamTasks.filter((task) =>
          (task.assignees || [task.assignee]).some((assignee) => normalize(assignee) === normalize(name))
        )
        const completed = owned.filter((task) => task.status === 'Done')
        const onTime = completed.filter((task) => !task.due || task.doneAt <= endOf(task.due)).length
        const overdue = owned.filter(isLate).length
        const weights = config.w || DEFAULT_CONFIG.w
        const metrics = {
          ontime: completed.length ? (onTime / completed.length) * 100 : owned.length ? 0 : 100,
          target: Math.min(completed.length / Math.max(1, config.target || 1), 1) * 100,
          overdue: owned.length ? (1 - overdue / owned.length) * 100 : 100,
          volume: (owned.length / busiest) * 100,
        }
        const weightTotal = Object.values(weights).reduce((sum, value) => sum + (+value || 0), 0) || 1
        const score = owned.length
          ? Object.keys(metrics).reduce((sum, key) => sum + metrics[key] * (+weights[key] || 0), 0) / weightTotal
          : 0
        return {
          name,
          total: owned.length,
          done: completed.length,
          open: owned.length - completed.length,
          overdue,
          onTime,
          score,
          tasks: owned,
        }
      })
      .sort((a, b) => b.score - a.score || b.total - a.total)
  }, [config.target, config.w, kpiPeople, teamTasks])

  const saveConfig = useCallback(async (updated) => {
    await api.put('config/main', updated)
    configDraftDirty.current = false
    setConfig(updated)
  }, [])

  const updateConfigDraft = useCallback((update) => {
    configDraftDirty.current = true
    setConfig(update)
  }, [])

  const saveTask = async (data, id = `t${Date.now()}`) => {
    await api.put(`tasks/${id}`, {
      ...data,
      status: data.status || 'To Do',
      created: data.created || Date.now(),
      doneAt: data.status === 'Done' ? Date.now() : data.doneAt || 0,
    })
    setTaskDialog(false)
    await refresh()
    showToast('Task saved.')
  }

  const visibleClickup = useMemo(
    () =>
      cuTasks.filter(
        (task) =>
          (!filters.space || task.space === filters.space) &&
          (!filters.assignee || task.assignees.includes(filters.assignee)) &&
          (filters.closed ||
            !['closed', 'done'].includes(
              (clickup.tasks?.find((item) => item.id === task.externalId)?.status_type || '').toLowerCase()
            )) &&
          (!filters.search || task.title.toLowerCase().includes(filters.search.toLowerCase()))
      ),
    [clickup.tasks, cuTasks, filters.assignee, filters.closed, filters.search, filters.space]
  )

  async function syncClickupNow() {
    const data = await syncClickup(true)
    if (!data) showError('ClickUp sync failed. Check the connection and server configuration.')
    else if (!data.configured) showError('Configure CLICKUP_API_TOKEN on the optional serverless ClickUp endpoint to enable sync.')
    else showToast('ClickUp sync complete.')
  }

  async function createMeeting(data) {
    const result = await request('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setMeetingDialog('')
    await refresh()
    setMeetingDetail(result.meeting)
    if (result.warning) showError(result.warning)
    else showToast('Meeting saved.')
  }

  async function saveMeeting(meeting, patch = {}) {
    try {
      const updated = { ...meeting, ...patch }
      await api.patch(`meetings/${meeting.id}`, {
        notes: updated.notes || '',
        summary: updated.summary || '',
        decisions: updated.decisions || [],
        actions: updated.actions || [],
        status: updated.status || 'scheduled',
      })
      setMeetingDetail(updated)
      await refresh()
      showToast(updated.status === 'cancelled' ? 'Meeting cancelled.' : 'Meeting saved.')
    } catch (cause) {
      showError(cause.message)
    }
  }

  async function generateMinutes(meeting) {
    setMinutesBusy(true)
    try {
      const result = await request('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: meeting.title, attendees: meeting.attendees, notes: meeting.notes }),
      })
      setMeetingDetail({
        ...meeting,
        summary: result.summary || meeting.summary,
        decisions: [...(meeting.decisions || []), ...(result.decisions || [])],
        actions: [...(meeting.actions || []), ...(result.actions || [])],
      })
      showToast('Minutes drafted. Review and save.')
    } catch (cause) {
      showError(cause.message)
    } finally {
      setMinutesBusy(false)
    }
  }

  async function importHistory(items, source) {
    const unique = new Map()
    items.forEach((item) => {
      const id = [...`${normalize(item.title)}|${item.due}`]
        .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7)
        .toString(36)
      unique.set(id, { id, data: { ...item, imported: Date.now(), source } })
    })
    const records = [...unique.values()]
    for (let index = 0; index < records.length; index += 500) {
      await request('/api/docs?collection=history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection: 'history', items: records.slice(index, index + 500) }),
      })
    }
    if (items[0]?.assignee && !config.credit?.name) {
      const updated = { ...config, credit: { ...config.credit, name: items[0].assignee } }
      await saveConfig(updated)
    }
    await refresh()
    showToast(`Imported ${records.length} task(s).`)
  }

  const realMeetings = useMemo(() => [...meetings].sort((a, b) => a.start - b.start), [meetings])
  const allMeetings = realMeetings

  const reminders = useMemo(() => {
    return [
      ...allMeetings
        .filter((meeting) => new Date(meeting.start).toLocaleDateString('en-CA') === currentDate)
        .map((item) => ({ kind: 'meeting', item, time: item.start })),
      ...allTasks
        .filter((task) => task.due === currentDate)
        .map((item) => ({ kind: 'task', item, time: 0 })),
    ].sort((a, b) => a.time - b.time)
  }, [allMeetings, allTasks, currentDate])
  const noticeCount = reminders.length + allTasks.filter(isLate).length

  if (!auth)
    return (
      <div id="lock">
        <div className="lk">Connecting to TaskFlow…</div>
      </div>
    )

  if (!auth.authed)
    return (
      <PinGate
        auth={auth}
        roleUsers={roleUsers}
        onAuthenticated={completeAuthentication}
      />
    )

  const activeUser = auth.activeUser || { id: 'admin', name: 'Admin', isAdmin: true }
  const canAccessPage = (pageKey) =>
    activeUser.isAdmin ||
    (pageKey === 'notices'
      ? activeUser.permissions?.some((permission) => ['dash', 'notices'].includes(permission))
      : pageKey === 'gulf'
        ? activeUser.permissions?.includes('gulf')
        : !['roles', 'activity'].includes(pageKey) && activeUser.permissions?.includes(pageKey))

  const visiblePages = PAGES.filter(([key]) => !['foodics', 'hr'].includes(key) && canAccessPage(key))
  const selectedProject = projects.find((project) => project.id === filters.project)
  const filteredClickup = visibleClickup
  const pageTitle =
    page === 'gulf'
      ? 'Natheel Gulf'
      : page === 'foodics'
      ? `Foodics Management · ${
          FOODICS_PROJECTS.find((project) => project.id === foodicsProject)?.name || 'Projects'
        } · ${FOODICS_SECTIONS.find((section) => section.id === foodicsSection)?.shortLabel || 'Overview'}`
      : PAGES.find((item) => item[0] === page)?.[2] || 'CEO Dashboard'

  async function updateTask(task, patch) {
    try {
      await api.patch(`tasks/${task.id}`, patch)
      await refresh()
      showToast('Task updated.')
    } catch (cause) {
      showError(cause.message)
    }
  }

  async function removeTask(task) {
    const message = task.hist ? `Remove imported task "${task.title}"?` : `Delete "${task.title}"?`
    if (!window.confirm(message)) return
    try {
      await api.remove(task.hist ? `history/${task.id.replace(/^history:/, '')}` : `tasks/${task.id}`)
      await refresh()
      showToast(task.hist ? 'Imported task removed.' : 'Task deleted.')
    } catch (cause) {
      showError(cause.message)
    }
  }

  async function startMeeting(platform) {
    try {
      const result = await request('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          instant: true,
          start: Date.now(),
          title: `${platform === 'google' ? 'Google Meet' : 'Zoom'} meeting`,
          project: filters.project || 'nathilco',
        }),
      })
      await refresh()
      setMeetingDetail(result.meeting)
      if (result.warning) showError(result.warning)
      else showToast('Meeting record saved.')
    } catch (cause) {
      showError(cause.message)
    }
  }

  async function changePin() {
    const current = window.prompt('Current PIN')
    if (current === null) return
    const next = window.prompt('New PIN (4–8 digits)')
    if (next === null) return
    try {
      await request('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change', current, pin: next }),
      })
      showToast('PIN changed.')
    } catch (cause) {
      showError(cause.message)
    }
  }

  async function removeHistory() {
    if (!window.confirm(`Remove all ${history.length} imported rows? ClickUp tasks are not affected.`)) return
    await request('/api/docs?collection=history', { method: 'DELETE' })
    await refresh()
    showToast('Imported rows removed.')
  }

  async function uploadLogo(file) {
    const logo = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error || new Error('Could not read the selected logo.'))
      reader.readAsDataURL(file)
    })
    await saveConfig({ ...config, logo })
    showToast('Logo uploaded.')
  }

  async function logout() {
    try {
      await request('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      })
      setAuth({ ...auth, authed: false })
    } catch (cause) {
      showError(cause.message)
    }
  }

  function renderPage() {
    if (!canAccessPage(page)) {
      return (
        <section className="card roles-access-denied">
          <span>
            <Icon name="lock" size={20} />
          </span>
          <h1>Access not assigned</h1>
          <p className="mu">Your account doesn’t have permission to open this dashboard section.</p>
        </section>
      )
    }

    if (page === 'dash') {
      return (
        <DashboardPage
          allMeetings={allMeetings}
          canViewMails={canAccessPage('mails')}
          clickup={clickup}
          dashboardSummary={ceoDashboardSummary}
          filters={filters}
          kpiRows={kpiRows}
          notificationsOpen={notificationsOpen}
          projectScope={projectScope}
          projects={projects}
          reminders={reminders}
          removeTask={removeTask}
          scopedTasks={scopedTasks}
          selectedProject={selectedProject}
          setFilters={setFilters}
          setMeetingDetail={setMeetingDetail}
          setMeetingDialog={setMeetingDialog}
          setNotificationsOpen={setNotificationsOpen}
          setPage={setPage}
          startMeeting={startMeeting}
          updateTask={updateTask}
        />
      )
    }

    if (page === 'notices') {
      return (
        <NoticesPage
          canViewHR={canAccessPage('hr')}
          canViewAudit={isAdmin}
          clickupStatus={clickupStatus}
          history={history}
          meetings={allMeetings}
          tasks={allTasks}
        />
      )
    }

    if (page === 'roles') {
      return (
        <RolesPage
          error={roleStore.error}
          onSaveUsers={saveRoleUsers}
          users={roleUsers}
        />
      )
    }

    if (page === 'activity') return <ActivityLogPage />

    if (page === 'gulf') {
      return (
        <NatheelGulfPage
          activeSection={gulfActiveSection}
          assets={gulfAssets}
          contacts={gulfContacts}
          currentUser={auth.activeUser}
          config={config}
          nodes={gulfNodes}
          onLock={logout}
          onError={showError}
          onToast={showToast}
          selectedNode={gulfSelectedNode}
          setActiveSection={setGulfActiveSection}
          setAssets={setGulfAssets}
          onSaveContacts={saveGulfContacts}
          setNodes={setGulfNodes}
          setSelectedNode={setGulfSelectedNode}
        />
      )
    }

    if (page === 'foodics') {
      return (
        <FoodicsManagementPage
          activeProject={foodicsProject}
          activeSection={foodicsSection}
          onSelectProject={(projectId) => {
            setFoodicsProject(projectId)
            setFoodicsSection('overview')
            setFoodicsProjectOpen(projectId)
          }}
          onSelectSection={(projectId, section) => {
            setFoodicsProject(projectId)
            setFoodicsSection(section)
            setFoodicsProjectOpen(projectId)
          }}
        />
      )
    }

    if (page === 'tasks') {
      return (
        <TasksPage
          clickup={clickup}
          filters={filters}
          people={people}
          projects={projects}
          removeTask={removeTask}
          scopedTasks={scopedTasks}
          selectedProject={selectedProject}
          setFilters={setFilters}
          setTaskDialog={setTaskDialog}
          setTaskMode={setTaskMode}
          taskMode={taskMode}
          updateTask={updateTask}
        />
      )
    }

    if (page === 'day') {
      return (
        <MyDayPage
          allTasks={allTasks}
          calendarPerson={calendarPerson}
          clickup={clickup}
          filters={filters}
          people={people}
          projects={projects}
          removeTask={removeTask}
          setCalendarPerson={setCalendarPerson}
          setTaskDialog={setTaskDialog}
          updateTask={updateTask}
        />
      )
    }

    if (page === 'clickup') {
      return (
        <ClickUpPage
          config={clickup}
          filters={filters}
          lastSync={lastSync}
          members={clickup.members || []}
          onSync={syncClickupNow}
          setFilters={setFilters}
          status={clickupStatus}
          tasks={filteredClickup}
        />
      )
    }

    if (page === 'projects') {
      return (
        <ProjectsPage
          config={config}
          newColor={newColor}
          newProject={newProject}
          onError={showError}
          onSave={saveConfig}
          projects={projects}
          setNewColor={setNewColor}
          setNewProject={setNewProject}
          tasks={allTasks}
        />
      )
    }

    if (page === 'team') {
      return (
        <TeamPage
          config={config}
          history={history}
          kpis={kpiRows}
          onChangePin={changePin}
          onError={showError}
          onImport={() => setImportDialog(true)}
          onLogo={uploadLogo}
          onRemoveHistory={removeHistory}
          onSelectEmployee={(name) => {
            setFilters((current) => ({ ...current, assignee: current.assignee === name ? '' : name }))
            setPage('tasks')
          }}
          onSuccess={showToast}
          people={people}
          saveConfig={saveConfig}
          setConfig={updateConfigDraft}
        />
      )
    }

    if (page === 'hr') {
      return <HRWorkspace />
    }

    if (page === 'kpi') {
      return (
        <KPIAnalyticsPage
          config={config}
          ceoNotes={ceoNotes}
          employeeReviews={employeeReviews}
          filters={filters}
          isAdmin={isAdmin}
          members={clickup.members}
          onAddEmployeeReview={addEmployeeReview}
          onAddCeoNote={addCeoNote}
          onDeleteCeoNote={deleteCeoNote}
          onDeleteEmployeeReview={deleteEmployeeReview}
          onRemove={removeTask}
          onSelectEmployee={(name) =>
            setFilters((current) => ({
              ...current,
              assignee: normalize(current.assignee) === normalize(name) ? '' : name,
            }))
          }
          onUpdate={updateTask}
          people={kpiPeople}
          projects={projects}
          rows={kpiRows}
          clickupStatus={clickupStatus}
          lastSync={lastSync}
          setFilters={setFilters}
          tasks={scopedTasks}
        />
      )
    }

    if (page === 'meet' || page === 'zoom') {
      return (
        <MeetingsPage
          integration={integrations}
          meetings={allMeetings.filter((meeting) => meeting.platform === (page === 'meet' ? 'google' : 'zoom'))}
          onOpen={setMeetingDetail}
          onSchedule={() => setMeetingDialog(page === 'meet' ? 'google' : 'zoom')}
          onStart={startMeeting}
          platform={page === 'meet' ? 'google' : 'zoom'}
          projects={projects}
        />
      )
    }

    if (page === 'mails') return <MailsPage />

    return (
      <CalendarPage
        date={calendarDate}
        meetings={allMeetings}
        onOpen={(event) => setCalendarEventDetail(event)}
        onSchedule={() => setMeetingDialog('google')}
        setDate={setCalendarDate}
        tasks={allTasks}
      />
    )
  }

  return (
    <>
      <AppLayout
        auth={auth}
        canAccessPage={canAccessPage}
        clickup={clickup}
        clickupStatus={clickupStatus}
        config={config}
        error={error}
        filters={filters}
        foodicsNavOpen={foodicsNavOpen}
        foodicsProject={foodicsProject}
        foodicsProjectOpen={foodicsProjectOpen}
        foodicsSection={foodicsSection}
        gulfSelectedNode={gulfSelectedNode}
        lastSync={lastSync}
        logout={logout}
        mobileMenuOpen={mobileMenuOpen}
        natheelGulfOpen={natheelGulfOpen}
        notificationsOpen={notificationsOpen}
        noticeCount={noticeCount}
        page={page}
        pageTitle={pageTitle}
        projects={projects}
        reminders={reminders}
        setCalendarEventDetail={setCalendarEventDetail}
        setError={setError}
        setFilters={setFilters}
        setFoodicsNavOpen={setFoodicsNavOpen}
        setFoodicsProject={setFoodicsProject}
        setFoodicsProjectOpen={setFoodicsProjectOpen}
        setFoodicsSection={setFoodicsSection}
        setGulfActiveSection={setGulfActiveSection}
        setGulfSelectedNode={setGulfSelectedNode}
        setMobileMenuOpen={setMobileMenuOpen}
        setNatheelGulfOpen={setNatheelGulfOpen}
        setNotificationsOpen={setNotificationsOpen}
        setPage={setPage}
        syncClickupNow={syncClickupNow}
        toast={toast}
        visiblePages={visiblePages}
      >
        {renderPage()}
      </AppLayout>

      {taskDialog && (
        <TaskForm
          onClose={() => setTaskDialog(false)}
          onSave={(data) => saveTask(data)}
          people={people}
          projects={projects}
        />
      )}
      {meetingDialog && (
        <MeetingForm
          onClose={() => setMeetingDialog('')}
          onSave={createMeeting}
          people={people}
          platform={meetingDialog}
          projects={projects}
        />
      )}
      {importDialog && (
        <ImportForm
          onClose={() => setImportDialog(false)}
          onImport={importHistory}
          people={people}
          projects={projects}
        />
      )}
      {calendarEventDetail && (
        <CalendarEventDetail
          event={calendarEventDetail}
          onClose={() => setCalendarEventDetail(null)}
          onOpenMeeting={(meeting) => {
            setCalendarEventDetail(null)
            setMeetingDetail(meeting)
          }}
          projects={projects}
        />
      )}
      {meetingDetail && (
        <MeetingDetail
          busy={minutesBusy}
          meeting={meetingDetail}
          members={clickup.members}
          onClose={() => setMeetingDetail(null)}
          onCreateTask={async (action) => {
            try {
              await saveTask({
                title: action.text,
                assignee: action.owner || '',
                due: action.due || '',
                project: meetingDetail.project || 'nathilco',
                priority: 'Normal',
                note: `From meeting: ${meetingDetail.title}`,
                status: 'To Do',
              })
              setMeetingDetail(null)
            } catch (cause) {
              showError(cause.message)
            }
          }}
          onSave={saveMeeting}
          onSummarize={generateMinutes}
          projects={projects}
        />
      )}
    </>
  )
}

export default App
