import { Icon } from './Icon.jsx'

export function Metric({ label, value, detail, icon, variant }) {
  const variantClass = variant
    ? ` kpi-${variant}`
    : typeof detail === 'string' && /attention|overdue|late|risk/i.test(detail)
      ? ' kpi-danger'
      : typeof detail === 'string' && /track|on time|done|complete|ahead/i.test(detail)
        ? ' kpi-success'
        : ' kpi-neutral'

  return (
    <div className={`kpi-card${variantClass}`}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon-wrap" aria-hidden="true">
          {icon ? <Icon name={icon} size={15} /> : <Icon name="check-circle" size={15} />}
        </span>
      </div>
      <div className="kpi-value">{value}</div>
      {detail && (
        <div className="kpi-footer">
          <span className="kpi-detail">{detail}</span>
        </div>
      )}
    </div>
  )
}

