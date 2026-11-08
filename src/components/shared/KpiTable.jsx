import { Icon } from '../ui/Icon.jsx'
import { Avatar } from '../ui/Avatar.jsx'
import { normalize } from '../../utils/helpers.js'

export function KpiTable({ rows = [], members = [], onSelect, selectedName = '', reviewScores }) {
  return (
    <div aria-label="Employee KPI scorecard. Scroll horizontally to view all columns" className="scroll" role="region" tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th>Employee</th>
            <th>Managed</th>
            <th>Done</th>
            <th>Open</th>
            <th>Overdue</th>
            <th>On-time</th>
            <th>Score</th>
            {reviewScores && <th>CEO review</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              aria-current={selectedName && normalize(selectedName) === normalize(row.name) ? 'true' : undefined}
              className={`${onSelect ? 'ck' : ''}${selectedName && normalize(selectedName) === normalize(row.name) ? ' selected' : ''}`}
              key={row.name}
              onClick={onSelect ? () => onSelect(row.name) : undefined}
              onKeyDown={
                onSelect
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelect(row.name)
                      }
                    }
                  : undefined
              }
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
            >
              <td>
                <Avatar members={members} name={row.name} /> <b>{row.name}</b>
                {index === 0 && row.total > 0 ? (
                  <span className="winner-badge" title="Top performer">
                    <Icon color="#f59e0b" name="crown" size={14} /> Top
                  </span>
                ) : (
                  ''
                )}
              </td>
              <td>{row.total}</td>
              <td>{row.done}</td>
              <td>{row.open}</td>
              <td className={row.overdue ? 'late' : ''}>{row.overdue}</td>
              <td>{row.done ? `${Math.round((row.onTime / row.done) * 100)}%` : '—'}</td>
              <td>
                <div className="row">
                  <div className="bar">
                    <i style={{ width: `${row.score}%` }} />
                  </div>
                  <b>{Math.round(row.score)}</b>
                </div>
              </td>
              {reviewScores && (
                <td>
                  {reviewScores[normalize(row.name)]
                    ? (
                        <>
                          <b title={Object.entries(reviewScores[normalize(row.name)].categories)
                            .map(([category, score]) => `${category}: ${score.toFixed(1)}/10`)
                            .join(' · ')}>
                            {reviewScores[normalize(row.name)].score.toFixed(1)} / 10
                          </b>
                          <small className="mu">
                            {reviewScores[normalize(row.name)].count} CEO rating
                            {reviewScores[normalize(row.name)].count === 1 ? '' : 's'} averaged
                          </small>
                        </>
                      )
                    : '— / 10'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
