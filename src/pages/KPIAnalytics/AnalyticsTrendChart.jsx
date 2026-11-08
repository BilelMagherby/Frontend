import { Icon } from '../../components/ui/Icon.jsx'

export function AnalyticsTrendChart({ data, completedCount, changeLabel, changeTone }) {
  const width = 640
  const height = 220
  const left = 44
  const right = 624
  const top = 18
  const bottom = 168
  const maxValue = Math.max(2, Math.ceil(Math.max(0, ...data.map((item) => item.count)) * 1.25))
  const points = data.map((item, index) => ({
    ...item,
    x: left + ((right - left) * index) / Math.max(data.length - 1, 1),
    y: bottom - (item.count / maxValue) * (bottom - top),
  }))
  const linePath = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')
  const areaPath = `${linePath} L ${right} ${bottom} L ${left} ${bottom} Z`
  const gridValues = [0, Math.ceil(maxValue / 2), maxValue].filter(
    (value, index, values) => values.indexOf(value) === index
  )

  return (
    <section aria-labelledby="analytics-trend-title" className="analytics-chart-card analytics-trend-card">
      <header className="analytics-chart-heading">
        <div>
          <span className="analytics-eyebrow">
            <Icon name="chart" size={13} /> WORK COMPLETED
          </span>
          <h2 id="analytics-trend-title">Weekly completion trend</h2>
          <p>Tasks completed each day over the last 7 days</p>
        </div>
        <span className={`analytics-trend-change ${changeTone}`}>
          <Icon
            name={changeTone === 'positive' ? 'trending-up' : changeTone === 'negative' ? 'trending-down' : 'minus'}
            size={14}
          />
          {changeLabel}
        </span>
      </header>
      <div className="analytics-trend-total">
        <strong>{completedCount}</strong>
        <span>completed this week</span>
      </div>
      <div className="analytics-chart-plot">
        <svg
          aria-label={`Daily task completions: ${data.map((item) => `${item.label} ${item.count}`).join(', ')}`}
          className="analytics-line-chart"
          preserveAspectRatio="none"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          <defs>
            <linearGradient id="analytics-trend-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#5278f6" stopOpacity=".24" />
              <stop offset="100%" stopColor="#5278f6" stopOpacity=".01" />
            </linearGradient>
            <linearGradient id="analytics-trend-stroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#7c5cf4" />
              <stop offset="100%" stopColor="#3187f6" />
            </linearGradient>
          </defs>
          {gridValues.map((value, index) => {
            const y = bottom - (value / maxValue) * (bottom - top)
            return (
              <g className="analytics-grid-line" key={`${value}-${index}`}>
                <line x1={left} x2={right} y1={y} y2={y} />
                <text x="31" y={y + 4}>
                  {value}
                </text>
              </g>
            )
          })}
          <path className="analytics-chart-area" d={areaPath} />
          <path className="analytics-chart-line" d={linePath} pathLength={1} />
          {points.map((point) => (
            <g className="analytics-chart-point" key={point.label}>
              <circle cx={point.x} cy={point.y} r="5" />
              <title>{`${point.longLabel}: ${point.count} completed`}</title>
            </g>
          ))}
          {points.map((point) => (
            <text className="analytics-axis-label" key={`label-${point.label}`} textAnchor="middle" x={point.x} y="199">
              {point.label}
            </text>
          ))}
        </svg>
      </div>
    </section>
  )
}

export default AnalyticsTrendChart

