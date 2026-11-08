import { Icon } from '../../components/ui/Icon.jsx'

export function AnalyticsTeamChart({ rows, onSelectEmployee }) {
  const leaders = rows.filter((row) => row.total > 0).slice(0, 5)
  return (
    <section aria-labelledby="analytics-team-title" className="analytics-chart-card analytics-team-card">
      <header className="analytics-chart-heading">
        <div>
          <span className="analytics-eyebrow">
            <Icon name="users" size={13} /> TEAM SCORE
          </span>
          <h2 id="analytics-team-title">Top performers</h2>
          <p>Weighted KPI score across current tasks</p>
        </div>
        <span className="analytics-chart-menu-icon">
          <Icon name="trophy" size={16} />
        </span>
      </header>
      {leaders.length ? (
        <div className="analytics-leader-list">
          {leaders.map((row, index) => {
            const score = Math.max(0, Math.min(100, Math.round(row.score)))
            return (
              <button
                className="analytics-leader"
                key={row.name}
                onClick={() => onSelectEmployee(row.name)}
                type="button"
                title={`Filter analytics for ${row.name}`}
              >
                <span className={`analytics-rank rank-${index + 1}`}>{index + 1}</span>
                <span className="analytics-leader-main">
                  <span className="analytics-leader-name">{row.name}</span>
                  <span className="analytics-score-track">
                    <i style={{ width: `${score}%`, animationDelay: `${index * 90}ms` }} />
                  </span>
                </span>
                <span className="analytics-leader-score">
                  {score}
                  <small>%</small>
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="analytics-chart-empty">
          <Icon name="users" size={21} />
          <span>No scored employee tasks yet</span>
        </div>
      )}
      <div className="analytics-team-footnote">
        <Icon name="info" size={13} /> Select a teammate to filter this report
      </div>
    </section>
  )
}

export default AnalyticsTeamChart

