import { useState } from 'react'
import { Icon } from '../ui/Icon.jsx'
import { Button } from '../ui/Button.jsx'
import { Field } from '../ui/Field.jsx'
import { PRIORITIES } from '../../utils/constants.js'
import { today } from '../../utils/helpers.js'

export function TaskForm({ projects = [], people = [], initial = {}, onSave, onClose }) {
  const [task, setTask] = useState({
    title: initial.title || '',
    project: initial.project || 'hajiss',
    assignee: initial.assignee || '',
    due: initial.due || today(),
    priority: initial.priority || 'Normal',
    note: initial.note || '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="react-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form
        className="mdl"
        onSubmit={async (event) => {
          event.preventDefault()
          if (busy) return
          if (!task.title.trim()) return setError('Enter a task title.')
          setBusy(true)
          setError('')
          try {
            await onSave(task)
          } catch (cause) {
            setError(cause.message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge">
              <Icon name="tasks" size={20} />
            </span>
            <h2>{initial.title ? 'Edit task' : 'New task'}</h2>
          </div>
          <button aria-label="Close" className="btn-icon-close" onClick={onClose} type="button">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="f2">
          <Field label="Task title">
            <input autoFocus onChange={(event) => setTask({ ...task, title: event.target.value })} value={task.title} />
          </Field>
          <Field label="Project">
            <select onChange={(event) => setTask({ ...task, project: event.target.value })} value={task.project}>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Assignee">
            <select onChange={(event) => setTask({ ...task, assignee: event.target.value })} value={task.assignee}>
              <option value="">Unassigned</option>
              {people
                .filter((person) => person !== 'CEO')
                .map((person) => (
                  <option key={person}>{person}</option>
                ))}
            </select>
          </Field>
          <Field label="Due date">
            <input onChange={(event) => setTask({ ...task, due: event.target.value })} type="date" value={task.due} />
          </Field>
          <Field label="Priority">
            <select onChange={(event) => setTask({ ...task, priority: event.target.value })} value={task.priority}>
              {PRIORITIES.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <input onChange={(event) => setTask({ ...task, note: event.target.value })} value={task.note} />
          </Field>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="row sp" style={{ justifyContent: 'flex-end' }}>
          <Button disabled={busy} onClick={onClose} type="button">
            Cancel
          </Button>
          <Button disabled={busy} primary type="submit">
            {busy ? 'Saving…' : 'Save task'}
          </Button>
        </div>
      </form>
    </div>
  )
}

