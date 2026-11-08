import { Icon } from './Icon.jsx'
import { projectName } from '../../utils/helpers.js'

export function FilterChips({ filters, setFilters, projects }) {
  const active = [
    filters.project && ['project', `Project: ${projectName(projects, filters.project)}`],
    filters.assignee && ['assignee', `Assigned: ${filters.assignee}`],
    filters.status && ['status', `Status: ${filters.status}`],
    filters.search && ['search', `“${filters.search}”`],
  ].filter(Boolean)
  if (!active.length) return null
  return (
    <div className="filter-chips">
      {active.map(([key, label]) => (
        <span className="filter-chip" key={key}>
          <span>{label}</span>
          <button aria-label={`Remove filter: ${label}`} onClick={() => setFilters({ ...filters, [key]: '' })} type="button">
            <Icon name="close" size={12} />
          </button>
        </span>
      ))}
      <button className="filter-clear-all" onClick={() => setFilters({ project: '', assignee: '', status: '', search: '', space: '', closed: filters.closed })} type="button">
        Clear all
      </button>
    </div>
  )
}

