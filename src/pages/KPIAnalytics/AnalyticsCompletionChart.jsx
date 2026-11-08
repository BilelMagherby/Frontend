import { Icon } from '../../components/ui/Icon.jsx'

export function AnalyticsCompletionChart({ completed, open, rate, overdue, atRisk }) {
  const radius = 43
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(100, Math.max(0, rate))
  return (
    <section aria-labelledby="analytics-completion-title" className="analytics-chart-card analytics-completion-card">
      <header className="analytics-chart-heading">
        <div>
          <span className="analytics-eyebrow">
            <Icon name="target" size={13} /> OVERALL DELIVERY
          </span>
          <h2 id="analytics-completion-title">Completion rate</h2>
          <p>Progress across all managed tasks</p>
        </div>
        <span className="analytics-chart-menu-icon">
          <Icon name="more-horizontal" size={17} />
        </span>
      </header>
      <div className="analytics-donut-wrap">
        <svg
          aria-label={`${progress}% completion rate: ${completed} complete, ${open} open`}
          className="analytics-donut-chart"
          role="img"
          viewBox="0 0 120 120"
        >
          <defs>
            <linearGradient id="analytics-donut-gradient" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#8062f6" />
              <stop offset="100%" stopColor="#2998f4" />
            </linearGradient>
          </defs>
          <circle className="analytics-donut-track" cx="60" cy="60" r={radius} />
          <circle
            className="analytics-donut-progress"
            cx="60"
            cy="60"
            r={radius}
            strokeDasharray={`${(circumference * progress) / 100} ${circumference}`}
          />
        </svg>
        <div className="analytics-donut-center">
          <strong>{progress}%</strong>
          <span>complete</span>
        </div>
      </div>
      <div className="analytics-donut-legend">
        <span>
          <i className="complete-dot" />
          <span>Completed</span>
          <b>{completed}</b>
        </span>
        <span>
          <i className="open-dot" />
          <span>Open</span>
          <b>{open}</b>
        </span>
      </div>
      <div className="analytics-health-row">
        <div>
          <span>Overdue</span>
          <b className={overdue ? 'health-alert' : ''}>{overdue}</b>
        </div>
        <div>
          <span>At risk</span>
          <b className={atRisk ? 'health-warn' : ''}>{atRisk}</b>
        </div>
      </div>
    </section>
  )
}

export default AnalyticsCompletionChart

