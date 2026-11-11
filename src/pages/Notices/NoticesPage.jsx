import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { api, request } from '../../services/api.js'

const DAY = 86_400_000
const dateKey = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-CA')
}
const relativeDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString()
}

function createNotices({ tasks, meetings, history, hrRecords, auditEvents, clickupStatus }) {
  const now = Date.now()
  const today = dateKey(now)
  const notices = []
  const addNotice = (notice) => {
    const parsedDate = typeof notice.date === 'number' ? notice.date : new Date(notice.date).getTime()
    notices.push({ ...notice, sortDate: Number.isFinite(parsedDate) && parsedDate > 0 ? parsedDate : now })
  }

  for (const task of tasks) {
    const dueTime = task.due ? new Date(`${task.due}T23:59:59`).getTime() : 0
    const overdue = task.status !== 'Done' && dueTime > 0 && dueTime < now
    const dueToday = task.status !== 'Done' && task.due === today
    const doneTime = Number(task.doneAt) || 0
    const updatedTime = Number(task.updated || task.created) || 0
    if (overdue) {
      addNotice({
        id: `task-overdue-${task.id}`,
        category: 'Tasks',
        severity: 'urgent',
        title: `Overdue: ${task.title}`,
        detail: `${task.assignees?.join(', ') || task.assignee || 'Unassigned'} · ${task.project || 'No project'} · due ${task.due}`,
        date: dueTime,
      })
    } else if (dueToday) {
      addNotice({
        id: `task-due-${task.id}`,
        category: 'Tasks',
        severity: 'attention',
        title: `Due today: ${task.title}`,
        detail: `${task.assignees?.join(', ') || task.assignee || 'Unassigned'} · ${task.project || 'No project'}`,
        date: now,
      })
    }
    if (doneTime && now - doneTime < 7 * DAY) {
      addNotice({
        id: `task-done-${task.id}`,
        category: 'Tasks',
        severity: 'update',
        title: `Task completed: ${task.title}`,
        detail: `${task.assignees?.join(', ') || task.assignee || 'Unassigned'} · ${task.project || 'No project'}`,
        date: doneTime,
      })
    } else if (!overdue && !dueToday && updatedTime && now - updatedTime < 7 * DAY) {
      addNotice({
        id: `task-updated-${task.id}`,
        category: 'Tasks',
        severity: 'update',
        title: `Task updated: ${task.title}`,
        detail: `${task.status || 'Status unknown'} · ${task.assignees?.join(', ') || task.assignee || 'Unassigned'}`,
        date: updatedTime,
      })
    }
    if (!overdue && !dueToday && task.status !== 'Done' && dueTime >= now && dueTime < now + 7 * DAY) {
      addNotice({
        id: `task-upcoming-${task.id}`,
        category: 'Tasks',
        severity: 'upcoming',
        title: `Upcoming task: ${task.title}`,
        detail: `${task.assignees?.join(', ') || task.assignee || 'Unassigned'} · due ${task.due}`,
        date: dueTime,
      })
    }
  }

  for (const meeting of meetings) {
    const start = Number(meeting.start) || new Date(meeting.start).getTime()
    if (!start || start < now - DAY || start > now + 7 * DAY) continue
    addNotice({
      id: `meeting-${meeting.id}`,
      category: 'Meetings',
      severity: start < now + DAY ? 'attention' : 'upcoming',
      title: `${start <= now ? 'Meeting in progress' : 'Upcoming meeting'}: ${meeting.title || meeting.summary || 'Meeting'}`,
      detail: [meeting.platform, meeting.assignees?.join(', ') || meeting.host, meeting.project].filter(Boolean).join(' · ') || 'Scheduled meeting',
      date: start,
    })
  }

  for (const entry of history) {
    const imported = Number(entry.imported) || 0
    if (!imported || now - imported >= 7 * DAY) continue
    addNotice({
      id: `import-${entry.id}`,
      category: 'Tasks',
      severity: 'update',
      title: `Task imported: ${entry.title}`,
      detail: `Imported from ${entry.source || 'external source'}${entry.assignee ? ` · ${entry.assignee}` : ''}`,
      date: imported,
    })
  }

  for (const event of auditEvents) {
    const collection = event.collection || ''
    const sectionNames = {
      config: 'Settings',
      'foodics-settings': 'Foodics',
      gulf: 'Natheel Gulf',
      history: 'Tasks',
      hr: 'HR',
      integrations: 'Integrations',
      kpiNotes: 'KPI',
      kpiReviews: 'KPI',
      meetings: 'Meetings',
      preferences: 'Preferences',
      tasks: 'Tasks',
      users: 'Users & access',
    }
    const section = sectionNames[collection] || collection
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replaceAll('-', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Account'
    const eventAction = event.action || ''
    const category = eventAction.startsWith('auth.') ? 'Accounts'
      : eventAction === 'users.save' ? 'Users & access'
        : eventAction === 'integration.sync' ? 'Integrations'
          : section || 'Activity'
    const action = {
      put: 'saved a record in',
      patch: 'updated a record in',
      delete: 'deleted a record from',
      'meeting.create': 'scheduled a meeting in',
      'integration.sync': 'synchronized',
      'file.upload': 'uploaded a file to',
      'file.delete': 'deleted a file from',
      'users.save': 'updated users in',
      'batch.create': 'imported records into',
      'auth.login': 'signed in to',
      'auth.logout': 'signed out of',
      'auth.pin.change': 'changed the admin PIN for',
      'auth.pin.setup': 'configured the admin PIN for',
    }[eventAction] || 'made a change in'
    const detail = event.documentId
      ? `Record: ${event.documentId}`
      : event.details?.count
        ? `${event.details.count} record(s)`
        : event.details?.name || 'Organization activity'
    addNotice({
      id: `audit-${event.id}`,
      category,
      severity: 'update',
      title: `${event.actorName || 'A user'} ${action} ${section}`,
      detail,
      date: event.createdAt,
    })
  }

  for (const record of hrRecords) {
    const data = record.data || {}
    const company = data.company || 'Natheelco Holding'
    const branch = data.branch ? ` · ${data.branch}` : ''
    const updated = new Date(record.updatedAt || record.createdAt || 0).getTime()
    if (record.module === 'activity') {
      addNotice({
        id: `hr-event-${record.id}`,
        category: 'HR',
        severity: 'update',
        title: `${data.action || 'HR update'}: ${data.label || 'HR record'}`,
        detail: `${data.company || company}${data.branch ? ` · ${data.branch}` : ''}`,
        date: data.at || updated,
      })
      continue
    }
    if (record.module === 'leave' && data.status === 'Pending') {
      addNotice({
        id: `hr-leave-${record.id}`,
        category: 'HR',
        severity: 'attention',
        title: `Leave request awaiting approval: ${data.employee || 'Employee'}`,
        detail: `${data.leaveType || 'Leave'} · ${data.startDate || 'Start date pending'} to ${data.endDate || 'end date pending'} · ${company}${branch}`,
        date: updated,
      })
    }
    if (record.module === 'attendance' && data.date === today && ['Late', 'Absent'].includes(data.status)) {
      addNotice({
        id: `hr-attendance-${record.id}`,
        category: 'HR',
        severity: 'attention',
        title: `${data.status}: ${data.employee || 'Employee'}`,
        detail: `${company}${branch}${data.checkIn ? ` · check-in ${data.checkIn}` : ''}`,
        date: updated,
      })
    }
    if (record.module === 'holidays' && data.startDate >= today) {
      addNotice({
        id: `hr-holiday-${record.id}`,
        category: 'HR',
        severity: 'upcoming',
        title: `Upcoming holiday: ${data.name || 'Holiday'}`,
        detail: `${data.startDate}${data.endDate && data.endDate !== data.startDate ? ` to ${data.endDate}` : ''} · ${company}${branch}`,
        date: data.startDate,
      })
    }
    if (record.module === 'recruitment' && data.nextInterview) {
      const interview = new Date(`${data.nextInterview}T00:00:00`).getTime()
      if (interview >= new Date(`${today}T00:00:00`).getTime() && interview < now + 7 * DAY &&
        !['Hired', 'Not selected'].includes(data.stage)) {
        addNotice({
          id: `hr-interview-${record.id}`,
          category: 'HR',
          severity: 'upcoming',
          title: `Interview: ${data.candidate || data.position || 'Candidate'}`,
          detail: `${data.position || 'Open role'} · ${data.nextInterview} · ${company}${branch}`,
          date: interview,
        })
      }
    }
    if (record.module === 'employees' && data.contractEnd) {
      const end = new Date(`${data.contractEnd}T00:00:00`).getTime()
      if (end >= new Date(`${today}T00:00:00`).getTime() && end < now + 30 * DAY) {
        addNotice({
          id: `hr-contract-${record.id}`,
          category: 'HR',
          severity: 'attention',
          title: `Contract ending soon: ${data.name || 'Employee'}`,
          detail: `${data.jobTitle || 'Employee'} · ${data.contractEnd} · ${company}${branch}`,
          date: end,
        })
      }
    }
  }

  if (clickupStatus && !/live|unavailable in standalone mode/i.test(clickupStatus)) {
    addNotice({
      id: 'clickup-status',
      category: 'Integrations',
      severity: 'attention',
      title: 'ClickUp connection needs attention',
      detail: clickupStatus,
      date: now,
    })
  }
  return notices.sort((a, b) => b.sortDate - a.sortDate)
}

export function NoticesPage({ tasks, meetings, history, clickupStatus, canViewHR, canViewAudit }) {
  const [hrRecords, setHrRecords] = useState([])
  const [hrError, setHrError] = useState('')
  const [auditEvents, setAuditEvents] = useState([])
  const [auditError, setAuditError] = useState('')
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    if (!canViewHR) {
      setHrRecords([])
      setHrError('')
      return undefined
    }
    api.list('hr')
      .then((rows) => {
        if (active) setHrRecords(rows.map((row) => ({ ...row.data, id: row.id }))
          .filter((record) => !record.archivedAt || record.module === 'activity'))
      })
      .catch((error) => {
        if (active) setHrError(`Could not load HR notices: ${error.message}`)
      })
    return () => {
      active = false
    }
  }, [canViewHR])

  useEffect(() => {
    let active = true
    if (!canViewAudit) {
      setAuditEvents([])
      setAuditError('')
      return undefined
    }
    request('/api/audit?limit=500')
      .then((events) => {
        if (active) setAuditEvents(events)
      })
      .catch((error) => {
        if (active) setAuditError(`Could not load organization activity: ${error.message}`)
      })
    return () => {
      active = false
    }
  }, [canViewAudit])

  const notices = useMemo(
    () => createNotices({ tasks, meetings, history, hrRecords, auditEvents, clickupStatus }),
    [tasks, meetings, history, hrRecords, auditEvents, clickupStatus],
  )
  const categories = ['All', ...new Set(notices.map((notice) => notice.category))]
  const visibleNotices = notices.filter((notice) =>
    (category === 'All' || notice.category === category) &&
    (!search || `${notice.title} ${notice.detail}`.toLowerCase().includes(search.trim().toLowerCase())))
  const attentionCount = notices.filter((notice) => ['urgent', 'attention'].includes(notice.severity)).length

  return (
    <section className="notices-page">
      <header className="top notices-header">
        <div>
          <h1><Icon name="bell" size={23} /> CEO Announcements</h1>
          <p className="mu">A central feed of activity, updates, and items needing attention across every section and company.</p>
        </div>
        <div className="notices-summary">
          <strong>{notices.length}</strong> announcements <span>·</span> <b>{attentionCount}</b> need attention
        </div>
      </header>
      {hrError && <p className="hr-storage-error" role="alert">{hrError}</p>}
      {auditError && <p className="hr-storage-error" role="alert">{auditError}</p>}
      <div className="notices-toolbar">
        <label className="hr-record-search"><Icon name="search" size={15} /><input aria-label="Search announcements" onChange={(event) => setSearch(event.target.value)} placeholder="Search announcements" value={search} /></label>
        <div className="notices-categories" aria-label="Announcement categories">
          {categories.map((item) => (
            <button aria-pressed={category === item} className={category === item ? 'on' : ''} key={item} onClick={() => setCategory(item)} type="button">{item}</button>
          ))}
        </div>
      </div>
      {visibleNotices.length ? (
        <div className="notices-list">
          {visibleNotices.map((notice) => (
            <article className={`notice-card notice-${notice.severity}`} key={notice.id}>
              <span className="notice-icon"><Icon name={notice.severity === 'urgent' ? 'alert-triangle' : notice.category === 'Meetings' ? 'calendar-clock' : notice.category === 'HR' ? 'hr' : notice.category === 'Activity' ? 'database' : 'bell'} size={17} /></span>
              <div className="notice-content">
                <div className="notice-card-heading"><span>{notice.category}</span><time dateTime={new Date(notice.sortDate).toISOString()}>{relativeDate(notice.sortDate)}</time></div>
                <h2>{notice.title}</h2>
                <p>{notice.detail}</p>
              </div>
              <span className="notice-severity">{notice.severity === 'urgent' ? 'Urgent' : notice.severity === 'attention' ? 'Attention' : notice.severity === 'upcoming' ? 'Upcoming' : 'Update'}</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="card notices-empty">
          <Icon name="check" size={22} />
          <h2>{notices.length ? 'No matching announcements' : 'You’re all caught up'}</h2>
          <p>{notices.length ? 'Try another category or search.' : 'New activity and important updates from across your organization will appear here.'}</p>
          {(search || category !== 'All') && <Button onClick={() => { setSearch(''); setCategory('All') }}>Clear filters</Button>}
        </div>
      )}
    </section>
  )
}

export default NoticesPage
