import { Icon } from '../ui/Icon.jsx'
import { Avatar } from '../ui/Avatar.jsx'
import { STATUSES, PRIORITY_COLORS } from '../../utils/constants.js'
import { isLate, projectName } from '../../utils/helpers.js'

export function TaskTable({ tasks = [], projects = [], members = [], onUpdate, onRemove, variant = '', showClickupLocation = false }) {
  if (!tasks.length) return <p className="mu">No tasks match these filters.</p>
  return (
    <div aria-label="Task list. Scroll horizontally to view all columns" className={`scroll${variant ? ` task-list-${variant}` : ''}`} role="region" tabIndex={0}>
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Assignee</th>
            <th>Due</th>
            <th>Priority</th>
            <th>Project</th>
            {showClickupLocation && <th>ClickUp location</th>}
            <th />
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                {task.url ? (
                  <a className="task-link" href={task.url} rel="noreferrer" target="_blank">
                    {task.title} <Icon name="external-link" size={12} />
                  </a>
                ) : (
                  <b className="task-title-text">{task.title}</b>
                )}
                {task.hist && <span className="pill">Sheet</span>}
              </td>
              <td>
                {task.source === 'clickup' ? (
                  task.rawStatus
                ) : (
                  <select
                    aria-label={`Status for ${task.title}`}
                    disabled={task.demo || task.hist}
                    onChange={(event) =>
                      onUpdate(task, {
                        status: event.target.value,
                        doneAt: event.target.value === 'Done' ? Date.now() : 0,
                      })
                    }
                    value={task.status}
                  >
                    {STATUSES.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                )}
              </td>
              <td>
                {(task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : []).map((name) => (
                  <span key={name}>
                    <Avatar members={members} name={name} />
                    {name}
                  </span>
                ))}
                {!task.assignees?.length && !task.assignee && '—'}
              </td>
              <td className={isLate(task) ? 'late' : ''}>{task.due || '—'}</td>
              <td style={{ color: PRIORITY_COLORS[task.priority] }}>{task.priority || '—'}</td>
              <td>{projectName(projects, task.project)}</td>
              {showClickupLocation && (
                <td>
                  {[task.space, task.folder, task.list].filter(Boolean).join(' / ') || '—'}
                  {task.tags?.length > 0 && <small className="mu">Tags: {task.tags.join(', ')}</small>}
                  {task.description && <small className="mu">{task.description}</small>}
                  {(task.created || task.updated) && (
                    <small className="mu">
                      {task.created ? `Created ${new Date(task.created).toLocaleDateString()}` : ''}
                      {task.created && task.updated ? ' · ' : ''}
                      {task.updated ? `Updated ${new Date(task.updated).toLocaleDateString()}` : ''}
                    </small>
                  )}
                </td>
              )}
              <td>
                {task.demo ? (
                  <span className="pill">Sample</span>
                ) : task.source === 'clickup' ? null : (
                  <button
                    aria-label={`${task.hist ? 'Remove imported task' : 'Delete'} ${task.title}`}
                    className="btn-icon-danger"
                    onClick={() => onRemove(task)}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
