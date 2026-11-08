import { Avatar } from '../ui/Avatar.jsx'
import { STATUSES } from '../../utils/constants.js'
import { isLate, projectName } from '../../utils/helpers.js'

export function TaskCard({ task, projects = [], members = [], onUpdate, onRemove }) {
  return (
    <article className="t">
      <b>{task.title}</b>
      <div className="mu">
        {projectName(projects, task.project)} • {task.priority} {isLate(task) && <span className="late">• overdue</span>}
      </div>
      <div className="row">
        {task.assignees?.map((name) => (
          <span key={name}>
            <Avatar members={members} name={name} />
            {name}
          </span>
        ))}
      </div>
      {!task.demo && task.source !== 'clickup' && (
        <>
          {!task.hist && (
            <select
              aria-label={`Status for ${task.title}`}
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
          <button className="btn g" onClick={() => onRemove(task)}>
            {task.hist ? 'Remove imported' : 'Delete'}
          </button>
        </>
      )}
    </article>
  )
}

