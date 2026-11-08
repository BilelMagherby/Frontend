import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Metric } from '../../components/ui/Metric.jsx'
import { ProjectSelect } from '../../components/ui/ProjectSelect.jsx'
import { NotificationButton } from '../../components/ui/NotificationButton.jsx'
import { FilterChips } from '../../components/ui/FilterChips.jsx'
import { TaskTable } from '../../components/shared/TaskTable.jsx'
import { KpiTable } from '../../components/shared/KpiTable.jsx'
import { MeetingSummary } from '../Meetings/MeetingSummary.jsx'
import { STATUSES, STATUS_COLORS } from '../../utils/constants.js'
import { isLate, endOf } from '../../utils/helpers.js'
import { request } from '../../services/api.js'
import '../../mails.css'

export function DashboardPage({
  scopedTasks,
  projects,
  filters,
  setFilters,
  reminders,
  notificationsOpen,
  setNotificationsOpen,
  selectedProject,
  projectScope,
  dashboardSummary,
  kpiRows,
  allMeetings,
  clickup,
  updateTask,
  removeTask,
  setPage,
  setMeetingDetail,
  setMeetingDialog,
  startMeeting,
  canViewMails,
}) {
  const [mailSummary, setMailSummary] = useState(null)

  useEffect(() => {
    if (!canViewMails) {
      setMailSummary(null)
      return undefined
    }
    let active = true
    request('/api/mails/summary')
      .then((summary) => {
        if (active) setMailSummary(summary)
      })
      .catch(() => {
        if (active) setMailSummary({ connected: false, messages: [], unreadCount: 0 })
      })
    return () => {
      active = false
    }
  }, [canViewMails])

  const completed = scopedTasks.filter((task) => task.status === 'Done')
  const overdue = dashboardSummary
    ? dashboardSummary.overdueTasks
    : scopedTasks.filter(isLate)
  const completedCount = dashboardSummary?.totals.completed ?? completed.length
  const onTimeCount =
    dashboardSummary?.totals.onTime ?? completed.filter((task) => !task.due || task.doneAt <= endOf(task.due)).length
  const taskCount = dashboardSummary?.totals.tasks ?? scopedTasks.length
  const overdueCount = dashboardSummary?.totals.overdue ?? overdue.length

  const dashboardProjects = projects.filter((project) => projectScope(project.id).length > 0)
  const liveWorkerNames = new Set([
    ...(clickup.members || []).map((member) => member.name),
    ...scopedTasks.flatMap((task) => task.assignees || [task.assignee]).filter(Boolean),
  ])
  const visibleKpiRows =
    dashboardSummary?.employeeKpis ||
    kpiRows.filter((row) => liveWorkerNames.has(row.name) && (!filters.project || row.total > 0))
  const dashboardMeetings = filters.project
    ? allMeetings.filter((meeting) => projectScope(filters.project, [meeting]).length > 0)
    : allMeetings

  return (
    <>
      <header className="top dashboard-top">
        <div>
          <h1>CEO Dashboard</h1>
          <div className="mu">
            {selectedProject ? `Live view for ${selectedProject.name}` : 'Live view of every project and employee'} •{' '}
            {new Date().toDateString()}
          </div>
        </div>
        <div className="row">
          <ProjectSelect
            value={filters.project}
            projects={dashboardProjects}
            onChange={(value) => setFilters((current) => ({ ...current, project: value }))}
          />
          <NotificationButton
            count={reminders.length}
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          />
        </div>
      </header>
      <FilterChips filters={filters} setFilters={setFilters} projects={dashboardProjects} />
      {mailSummary?.connected && (
        <section className="card sp dashboard-mail-summary">
          <div className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h2><Icon name="mail" size={17} /> Gmail inbox</h2>
              <p className="mu">{mailSummary.unreadCount} unread · {mailSummary.email}</p>
            </div>
            <Button onClick={() => setPage('mails')}>
              Open Mails <Icon name="arrow-right" size={14} />
            </Button>
          </div>
          {mailSummary.messages.length ? (
            <div className="dashboard-mail-list">
              {mailSummary.messages.map((message) => (
                <button className={`dashboard-mail-row ${message.unread ? 'unread' : ''}`} key={message.id} onClick={() => setPage('mails')} type="button">
                  <span className="dashboard-mail-copy">
                    <b>{message.from}</b>
                    <strong>{message.subject}</strong>
                    <span>{message.snippet}</span>
                  </span>
                  <time>{new Date(message.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>
                </button>
              ))}
            </div>
          ) : (
            <p className="mu dashboard-mail-empty">No recent messages in your Gmail inbox.</p>
          )}
        </section>
      )}
      {overdueCount > 0 && (
        <button
          className="alert"
          onClick={() => setFilters({ ...filters, status: filters.status === 'Overdue' ? '' : 'Overdue' })}
        >
          <span className="alert-icon">
            <Icon name="alert-triangle" size={18} />
          </span>
          <span className="alert-text">
            <b>{overdueCount} overdue task(s)</b> — {overdue.slice(0, 4).map((task) => task.title).join(' | ')}
          </span>
        </button>
      )}
      <div className="grid k4 dashboard-kpis">
        <Metric label="Tasks managed" value={taskCount} detail={`${dashboardSummary?.totals.open ?? taskCount - completedCount} open`} />
        <Metric
          label="Completed"
          value={completedCount}
          detail={`${taskCount ? Math.round((completedCount / taskCount) * 100) : 0}% of tasks`}
        />
        <Metric
          label="On-time rate"
          value={`${completedCount ? Math.round((onTimeCount / completedCount) * 100) : 0}%`}
          detail={`${onTimeCount} of ${completedCount} done`}
        />
        <Metric label="Overdue" value={overdueCount} detail={overdueCount ? 'Needs attention' : 'All on track'} />
        <Metric
          label="Team KPI score"
          value={dashboardSummary?.totals.teamKpiScore ?? Math.round(visibleKpiRows.reduce((sum, row) => sum + row.score, 0) / (visibleKpiRows.length || 1))}
          detail={`${visibleKpiRows.length} employee(s)`}
        />
      </div>
      <section className="card sp">
        <h2>Status breakdown</h2>
        {STATUSES.map((status) => {
          const count = dashboardSummary?.statusCounts?.[status] ?? scopedTasks.filter((task) => task.status === status).length
          return (
            <button
              className="status-line"
              key={status}
              onClick={() => setFilters({ ...filters, status: filters.status === status ? '' : status })}
            >
              <span className="dot" style={{ background: STATUS_COLORS[status] }} />
              {status}
              <b>{count}</b>
              <div className="bar">
                <i
                  style={{
                    width: `${scopedTasks.length ? (count / scopedTasks.length) * 100 : 0}%`,
                    background: STATUS_COLORS[status],
                  }}
                />
              </div>
            </button>
          )
        })}
      </section>
      <div className="card sp">
        <h2>Employee KPI scorecard</h2>
        {visibleKpiRows.length ? (
          <KpiTable
            rows={visibleKpiRows}
            members={clickup.members}
            onSelect={(name) =>
              setFilters((current) => ({ ...current, assignee: current.assignee === name ? '' : name }))
            }
          />
        ) : (
          <p className="mu">No employee task data for {selectedProject?.name || 'this project'} yet.</p>
        )}
      </div>
      <div className="card sp">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Recently updated tasks</h2>
          <Button onClick={() => setPage('tasks')}>
            <Icon name="arrow-right" size={14} /> Open Tasks
          </Button>
        </div>
        <TaskTable
          tasks={dashboardSummary?.recentTasks || [...scopedTasks]
            .sort((a, b) => (b.updated || b.doneAt || 0) - (a.updated || a.doneAt || 0))
            .slice(0, 10)}
          projects={projects}
          members={clickup.members}
          onUpdate={updateTask}
          onRemove={removeTask}
        />
      </div>
      <MeetingSummary
        meetings={dashboardMeetings}
        projects={projects}
        onOpen={setMeetingDetail}
        onCreate={() => setMeetingDialog('google')}
        onStart={startMeeting}
      />
    </>
  )
}

export default DashboardPage
