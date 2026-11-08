import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Metric } from '../../components/ui/Metric.jsx'
import { ProjectSelect } from '../../components/ui/ProjectSelect.jsx'
import { PersonSelect } from '../../components/ui/PersonSelect.jsx'
import { TaskTable } from '../../components/shared/TaskTable.jsx'
import { KpiTable } from '../../components/shared/KpiTable.jsx'
import { AnalyticsTrendChart } from './AnalyticsTrendChart.jsx'
import { AnalyticsCompletionChart } from './AnalyticsCompletionChart.jsx'
import { AnalyticsTeamChart } from './AnalyticsTeamChart.jsx'
import { PRIORITIES, PRIORITY_COLORS } from '../../utils/constants.js'
import { today, endOf, isLate, normalize } from '../../utils/helpers.js'

const REVIEW_CATEGORIES = [
  ['communication', 'Communication'],
  ['targets', 'Performance & targets'],
  ['delivery', 'Task delivery'],
  ['teamwork', 'Teamwork'],
  ['development', 'Development'],
]

const CEO_NOTE_TOPICS = [
  ['systemSetup', 'Set up the system'],
  ['systemTiming', 'System timing'],
  ['hajissPreparation', 'Hajiss preparation'],
  ['fixedAssetsDomains', 'Buy fixed assets and domain names'],
  ['hajissLaunch', 'Launch Hajiss Coffee in December'],
]

const isValidCeoScore = (value) => {
  const score = Number(value)
  return value !== '' && Number.isInteger(score) && score >= 0 && score <= 10
}

export function KPIAnalyticsPage({
  tasks,
  rows,
  projects,
  filters,
  setFilters,
  people,
  members,
  config,
  onUpdate,
  onRemove,
  onSelectEmployee,
  clickupStatus,
  lastSync,
  isAdmin,
  ceoNotes = [],
  employeeReviews = [],
  onAddEmployeeReview,
  onDeleteEmployeeReview,
  onAddCeoNote,
  onDeleteCeoNote,
}) {
  const [reviewDraft, setReviewDraft] = useState({
    employee: '',
    date: today(),
    scores: Object.fromEntries(REVIEW_CATEGORIES.map(([key]) => [key, ''])),
  })
  const [savingReview, setSavingReview] = useState(false)
  const [ceoNoteDraft, setCeoNoteDraft] = useState({
    scores: Object.fromEntries(CEO_NOTE_TOPICS.map(([key]) => [key, ''])),
  })
  const [savingCeoNote, setSavingCeoNote] = useState(false)
  useEffect(() => {
    setReviewDraft((current) => ({ ...current, employee: filters.assignee }))
  }, [filters.assignee])
  const complete = tasks.filter((task) => task.status === 'Done')
  const onTime = complete.filter((task) => !task.due || task.doneAt <= endOf(task.due))
  const overdue = tasks.filter(isLate)
  const atRisk = tasks.filter(
    (task) => task.status !== 'Done' && task.due && endOf(task.due) <= Date.now() + 2 * 86_400_000
  )
  const recent = complete.filter((task) => task.doneAt > Date.now() - 7 * 86_400_000)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const trendDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayStart)
    date.setDate(date.getDate() - (6 - index))
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)
    return {
      date,
      count: complete.filter((task) => task.doneAt >= date.getTime() && task.doneAt < nextDate.getTime()).length,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      longLabel: date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
    }
  })
  const weekStart = new Date(trendDates[0].date)
  const previousWeekStart = new Date(weekStart)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)
  const previousWeekCount = complete.filter(
    (task) => task.doneAt >= previousWeekStart.getTime() && task.doneAt < weekStart.getTime()
  ).length
  const recentComplete = trendDates.reduce((sum, day) => sum + day.count, 0)
  const weeklyChange = previousWeekCount
    ? Math.round(((recentComplete - previousWeekCount) / previousWeekCount) * 100)
    : recentComplete
    ? 100
    : 0
  const weeklyChangeLabel = previousWeekCount
    ? `${weeklyChange > 0 ? '+' : ''}${weeklyChange}% vs last week`
    : recentComplete
    ? 'New activity this week'
    : 'No activity this week'
  const weeklyChangeTone = weeklyChange > 0 ? 'positive' : weeklyChange < 0 ? 'negative' : 'neutral'
  const completionRate = tasks.length ? Math.round((complete.length / tasks.length) * 100) : 0
  const visibleRows = rows.filter(
    (row) => !filters.assignee || normalize(row.name) === normalize(filters.assignee)
  )
  const sections = new Map()
  tasks
    .filter((task) => task.source === 'clickup')
    .forEach((task) => {
      const name = [task.space, task.folder, task.list].filter(Boolean).join(' / ') || 'Unsorted'
      const section = sections.get(name) || { name, total: 0, done: 0, overdue: 0 }
      section.total += 1
      if (task.status === 'Done') section.done += 1
      if (isLate(task)) section.overdue += 1
      sections.set(name, section)
    })
  const sectionRows = [...sections.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
  const sortedEmployeeReviews = [...employeeReviews]
    .filter((entry) => !filters.assignee || normalize(entry.data.employee) === normalize(filters.assignee))
    .sort((a, b) => String(b.data.createdAt || b.data.date).localeCompare(String(a.data.createdAt || a.data.date)))
  const employeeReviewTotals = employeeReviews.reduce((averages, entry) => {
    if (!entry.data.employee || !entry.data.scores) return averages
    const scores = REVIEW_CATEGORIES.map(([category]) => Number(entry.data.scores[category]))
    if (!scores.every((score) => Number.isInteger(score) && score >= 0 && score <= 10)) return averages
    const key = normalize(entry.data.employee)
    const current = averages.get(key) || {
      count: 0,
      totals: Object.fromEntries(REVIEW_CATEGORIES.map(([category]) => [category, 0])),
    }
    current.count += 1
    REVIEW_CATEGORIES.forEach(([category]) => {
      current.totals[category] += Number(entry.data.scores[category])
    })
    averages.set(key, current)
    return averages
  }, new Map())
  const employeeReviewAverages = Object.fromEntries(
    [...employeeReviewTotals].map(([key, result]) => {
      const categories = Object.fromEntries(
        REVIEW_CATEGORIES.map(([category]) => [category, result.totals[category] / result.count])
      )
      return [
        key,
        {
          categories,
          count: result.count,
          score: Object.values(categories).reduce((sum, score) => sum + score, 0) / REVIEW_CATEGORIES.length,
        },
      ]
    })
  )
  const sortedCeoAssessments = [...ceoNotes]
    .filter((entry) =>
      CEO_NOTE_TOPICS.every(([key]) => {
        const score = entry.data.scores?.[key]
        return Number.isInteger(score) && score >= 0 && score <= 10
      })
    )
    .sort((a, b) => String(b.data.createdAt || b.data.date).localeCompare(String(a.data.createdAt || a.data.date)))
  const latestCeoAssessment = sortedCeoAssessments[0]
  const latestCeoScore = latestCeoAssessment
    ? CEO_NOTE_TOPICS.reduce((total, [key]) => total + latestCeoAssessment.data.scores[key], 0) /
      CEO_NOTE_TOPICS.length
    : null
  const hasValidCeoDraft = CEO_NOTE_TOPICS.every(([key]) => isValidCeoScore(ceoNoteDraft.scores[key]))
  const submitReview = async (event) => {
    event.preventDefault()
    if (
      !reviewDraft.employee ||
      REVIEW_CATEGORIES.some(
        ([category]) =>
          reviewDraft.scores[category] === '' ||
          !Number.isInteger(Number(reviewDraft.scores[category])) ||
          Number(reviewDraft.scores[category]) < 0 ||
          Number(reviewDraft.scores[category]) > 10
      )
    ) {
      return
    }
    setSavingReview(true)
    try {
      const saved = await onAddEmployeeReview({
        employee: reviewDraft.employee,
        date: reviewDraft.date,
        scores: Object.fromEntries(
          REVIEW_CATEGORIES.map(([category]) => [category, Number(reviewDraft.scores[category])])
        ),
      })
      if (saved) {
        setReviewDraft((current) => ({
          ...current,
          date: today(),
          scores: Object.fromEntries(REVIEW_CATEGORIES.map(([key]) => [key, ''])),
        }))
      }
    } finally {
      setSavingReview(false)
    }
  }
  const submitCeoNote = async (event) => {
    event.preventDefault()
    if (!hasValidCeoDraft) return
    setSavingCeoNote(true)
    try {
      const saved = await onAddCeoNote({
        date: today(),
        scores: Object.fromEntries(CEO_NOTE_TOPICS.map(([key]) => [key, Number(ceoNoteDraft.scores[key])])),
      })
      if (saved) {
        setCeoNoteDraft({
          scores: Object.fromEntries(CEO_NOTE_TOPICS.map(([key]) => [key, ''])),
        })
      }
    } finally {
      setSavingCeoNote(false)
    }
  }

  return (
    <>
      <header className="top">
        <div>
          <h1>KPI Analytics</h1>
          <div className="mu">
            {tasks.length} tasks in this view · {clickupStatus || 'ClickUp not synced'}
            {lastSync
              ? ` · Synced ${new Date(lastSync).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
              : ''}
          </div>
        </div>
        <div className="row">
          <ProjectSelect
            projects={projects}
            value={filters.project}
            onChange={(value) => setFilters((current) => ({ ...current, project: value }))}
          />
          <PersonSelect
            people={people}
            value={filters.assignee}
            onChange={(value) => setFilters((current) => ({ ...current, assignee: value }))}
          />
        </div>
      </header>
      <section aria-label="Performance charts" className="analytics-visual-grid">
        <AnalyticsTrendChart
          changeLabel={weeklyChangeLabel}
          changeTone={weeklyChangeTone}
          completedCount={recentComplete}
          data={trendDates}
        />
        <AnalyticsCompletionChart
          atRisk={atRisk.length}
          completed={complete.length}
          open={tasks.length - complete.length}
          overdue={overdue.length}
          rate={completionRate}
        />
        <AnalyticsTeamChart onSelectEmployee={onSelectEmployee} rows={visibleRows} />
      </section>
      <div className={`grid ${isAdmin ? 'k5' : 'k4'} metric-grid`}>
        <Metric
          label="Completion rate"
          value={`${completionRate}%`}
          detail={`${complete.length} of ${tasks.length}`}
          icon="percent"
          variant="success"
        />
        <Metric
          label="On-time delivery"
          value={`${complete.length ? Math.round((onTime.length / complete.length) * 100) : 0}%`}
          detail={`${onTime.length} completed on time`}
          icon="clock"
          variant="success"
        />
        <Metric
          label="Overdue"
          value={overdue.length}
          detail={`${tasks.length - complete.length} open`}
          icon="alert-triangle"
          variant={overdue.length > 0 ? 'danger' : 'success'}
        />
        <Metric
          label="Completed • 7 days"
          value={recent.length}
          detail={`${atRisk.length} at risk (due ≤ 2d)`}
          icon="check-circle"
          variant="neutral"
        />
        {isAdmin && (
          <Metric
            label="CEO self-rating"
            value={latestCeoScore === null ? '—' : `${latestCeoScore.toFixed(1)}/10`}
            detail={latestCeoAssessment ? `Latest assessment · ${latestCeoAssessment.data.date}` : 'Rate all five topics below'}
            icon="target"
            variant="neutral"
          />
        )}
      </div>
      <div className="grid k2 sp">
        <section className="card">
          <h2>Tasks by ClickUp section</h2>
          {sectionRows.length ? (
            sectionRows.map((section) => (
              <div className="project-progress" key={section.name}>
                <span>
                  {section.name}
                  <small className="mu">
                    {section.done} completed · {section.total - section.done} open · {section.overdue} overdue
                  </small>
                </span>
                <b>{section.total}</b>
                <div className="bar">
                  <i
                    style={{
                      width: `${(section.done / section.total) * 100}%`,
                      background: 'var(--ok)',
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="mu">No ClickUp section tasks match the current filters.</p>
          )}
        </section>
        <section className="card">
          <h2>Tasks by project</h2>
          {projects.map((project) => {
            const count = tasks.filter((task) => task.project === project.id).length
            return count ? (
              <div className="project-progress" key={project.id}>
                <span>{project.name}</span>
                <b>{count}</b>
                <div className="bar">
                  <i style={{ width: `${tasks.length ? (count / tasks.length) * 100 : 0}%`, background: project.color }} />
                </div>
              </div>
            ) : null
          })}
        </section>
        <section className="card">
          <h2>Open tasks by priority</h2>
          {PRIORITIES.slice()
            .reverse()
            .map((priority) => (
              <div className="status-line" key={priority}>
                <span className="dot" style={{ background: PRIORITY_COLORS[priority] }} />
                {priority}
                <b>{tasks.filter((task) => task.priority === priority && task.status !== 'Done').length}</b>
              </div>
            ))}
        </section>
      </div>
      <section className="card sp">
        <h2>Tasks at risk</h2>
        <TaskTable tasks={atRisk} projects={projects} members={members} onUpdate={onUpdate} onRemove={onRemove} />
      </section>
      <section className="card sp">
        <h2>Employee scorecard</h2>
        <KpiTable
          reviewScores={employeeReviewAverages}
          rows={visibleRows}
          members={members}
          onSelect={onSelectEmployee}
          selectedName={filters.assignee}
        />
      </section>
      {filters.assignee && (
        <section aria-label={`Tasks assigned to ${filters.assignee}`} className="card sp">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>Tasks for {filters.assignee}</h2>
            <span className="pill">{tasks.length} tasks</span>
          </div>
          <TaskTable
            members={members}
            onRemove={onRemove}
            onUpdate={onUpdate}
            projects={projects}
            showClickupLocation
            tasks={tasks}
          />
        </section>
      )}
      {isAdmin && (
        <section aria-labelledby="ceo-notes-title" className="card sp kpi-notes-panel">
          <div className="kpi-notes-heading">
            <div>
              <span className="analytics-eyebrow">
                <Icon name="lock" size={14} /> PRIVATE CEO SELF-ASSESSMENT
              </span>
              <h2 id="ceo-notes-title">CEO KPI rating</h2>
              <p>Rate each topic from 0 to 10. The average is added to your CEO KPI in Analytics.</p>
            </div>
            <span className="kpi-notes-count">{sortedCeoAssessments.length} assessments</span>
          </div>
          <form aria-label="CEO topic ratings" className="kpi-note-form" onSubmit={submitCeoNote}>
            {CEO_NOTE_TOPICS.map(([key, topic]) => (
              <label className="kpi-rating-field" key={key}>
                <span>{topic}</span>
                <div>
                  <input
                    aria-label={`${topic} rating out of 10`}
                    max={10}
                    min={0}
                    onChange={(event) =>
                      setCeoNoteDraft((current) => ({
                        ...current,
                        scores: { ...current.scores, [key]: event.target.value },
                      }))
                    }
                    required
                    step={1}
                    type="number"
                    value={ceoNoteDraft.scores[key]}
                  />
                  <b>/ 10</b>
                </div>
              </label>
            ))}
            <div className="kpi-rating-total">
              <span>CEO KPI score</span>
              <strong>
                {hasValidCeoDraft
                  ? `${(
                      CEO_NOTE_TOPICS.reduce((sum, [key]) => sum + Number(ceoNoteDraft.scores[key]), 0) /
                      CEO_NOTE_TOPICS.length
                    ).toFixed(1)} / 10`
                  : '— / 10'}
              </strong>
              <small>Average of the five topic ratings</small>
            </div>
            <div className="kpi-note-form-actions">
              <Button
                className="p"
                disabled={
                  savingCeoNote || !hasValidCeoDraft
                }
                type="submit"
              >
                <Icon name="plus" size={15} />
                {savingCeoNote ? 'Saving…' : 'Save CEO ratings'}
              </Button>
            </div>
          </form>
          {sortedCeoAssessments.length ? (
            <div className="kpi-note-list">
              {sortedCeoAssessments.map((entry) => {
                const average = CEO_NOTE_TOPICS.reduce(
                  (total, [key]) => total + entry.data.scores[key],
                  0
                ) / CEO_NOTE_TOPICS.length
                return (
                  <article className="kpi-note-card" key={entry.id}>
                    <div className="kpi-note-card-heading">
                      <span className="kpi-note-category">CEO KPI · {average.toFixed(1)} / 10</span>
                      <time dateTime={entry.data.createdAt}>
                        {entry.data.date || (entry.data.createdAt ? new Date(entry.data.createdAt).toLocaleDateString() : '')}
                      </time>
                    </div>
                    <div className="kpi-rating-history">
                      {CEO_NOTE_TOPICS.map(([key, topic]) => (
                        <span key={key}>
                          {topic}<b>{entry.data.scores[key]} / 10</b>
                        </span>
                      ))}
                    </div>
                    <footer>
                      <span>Private to the CEO account</span>
                      <button
                        aria-label={`Delete CEO KPI assessment dated ${entry.data.date || ''}`}
                        className="btn-icon"
                        onClick={() => {
                          if (window.confirm('Delete this CEO KPI assessment?')) onDeleteCeoNote(entry)
                        }}
                        type="button"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </footer>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="kpi-notes-empty">
              <Icon name="target" size={20} />
              <span>No CEO self-assessments yet.</span>
            </div>
          )}
        </section>
      )}
      {isAdmin && (
        <section aria-labelledby="employee-review-title" className="card sp kpi-notes-panel">
          <div className="kpi-notes-heading">
            <div>
              <span className="analytics-eyebrow">
                <Icon name="target" size={14} /> CEO EMPLOYEE ASSESSMENT
              </span>
              <h2 id="employee-review-title">Employee ratings</h2>
              <p>Rate each area from 0 to 10. The employee review score is calculated as the average.</p>
            </div>
            <span className="kpi-notes-count">{sortedEmployeeReviews.length} assessments</span>
          </div>
          <form className="kpi-note-form" onSubmit={submitReview}>
            <label>
              <span>Employee</span>
              <select
                onChange={(event) => {
                  const employee = event.target.value
                  setReviewDraft((current) => ({ ...current, employee }))
                  setFilters((current) => ({ ...current, assignee: employee }))
                }}
                required
                value={reviewDraft.employee}
              >
                <option value="">Choose an employee</option>
                {people.map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Date</span>
              <input
                onChange={(event) => setReviewDraft((current) => ({ ...current, date: event.target.value }))}
                required
                type="date"
                value={reviewDraft.date}
              />
            </label>
            {REVIEW_CATEGORIES.map(([key, label]) => (
              <label className="kpi-rating-field" key={key}>
                <span>{label}</span>
                <div>
                  <input
                    aria-label={`${label} rating out of 10`}
                    max={10}
                    min={0}
                    onChange={(event) =>
                      setReviewDraft((current) => ({
                        ...current,
                        scores: { ...current.scores, [key]: event.target.value },
                      }))
                    }
                    required
                    step={1}
                    type="number"
                    value={reviewDraft.scores[key]}
                  />
                  <b>/ 10</b>
                </div>
              </label>
            ))}
            <div className="kpi-rating-total">
              <span>Calculated review score</span>
              <strong>
                {REVIEW_CATEGORIES.every(([key]) => reviewDraft.scores[key] !== '')
                  ? `${(
                      REVIEW_CATEGORIES.reduce((sum, [key]) => sum + Number(reviewDraft.scores[key]), 0) /
                      REVIEW_CATEGORIES.length
                    ).toFixed(1)} / 10`
                  : '— / 10'}
              </strong>
              <small>Average of the five category ratings</small>
            </div>
            <div className="kpi-note-form-actions">
              <Button
                className="p"
                disabled={
                  savingReview ||
                  !reviewDraft.employee ||
                  REVIEW_CATEGORIES.some(([key]) => reviewDraft.scores[key] === '')
                }
                type="submit"
              >
                <Icon name="plus" size={15} />
                {savingReview ? 'Saving…' : 'Save employee ratings'}
              </Button>
            </div>
          </form>
          {sortedEmployeeReviews.length ? (
            <div className="kpi-note-list">
              {sortedEmployeeReviews.map((entry) => {
                const scores = REVIEW_CATEGORIES.map(([key]) => Number(entry.data.scores?.[key]))
                const valid = scores.every((score) => Number.isInteger(score) && score >= 0 && score <= 10)
                const overall = valid ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null
                return (
                <article className="kpi-note-card" key={entry.id}>
                  <div className="kpi-note-card-heading">
                    <span className="kpi-note-category">{entry.data.employee}</span>
                    <time dateTime={entry.data.date}>{new Date(`${entry.data.date}T12:00:00`).toLocaleDateString()}</time>
                  </div>
                  <h3>Employee review score</h3>
                  <div className="kpi-rating-history">
                    {REVIEW_CATEGORIES.map(([key, label]) => (
                      <span key={key}>
                        {label}<b>{entry.data.scores?.[key] ?? '—'} / 10</b>
                      </span>
                    ))}
                    <span className="overall">
                      Overall average<b>{overall === null ? '— / 10' : `${overall.toFixed(1)} / 10`}</b>
                    </span>
                  </div>
                  <footer>
                    <span>Rated by {entry.data.author || 'CEO'}</span>
                    <button
                      aria-label={`Delete ratings for ${entry.data.employee} dated ${entry.data.date}`}
                      className="btn-icon-danger"
                      onClick={() => {
                        if (window.confirm(`Delete this rating for ${entry.data.employee}?`)) {
                          onDeleteEmployeeReview(entry)
                        }
                      }}
                      type="button"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </footer>
                </article>
                )
              })}
            </div>
          ) : (
            <div className="kpi-notes-empty">
              <Icon name="target" size={20} />
              <span>{filters.assignee ? `No ratings for ${filters.assignee} yet.` : 'No employee ratings yet.'}</span>
            </div>
          )}
          <p className="kpi-notes-privacy">
            <Icon name="lock" size={13} /> Ratings are stored in the backend and visible only to the CEO account.
          </p>
        </section>
      )}
    </>
  )
}

export default KPIAnalyticsPage
