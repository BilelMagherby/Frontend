import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { PersonSelect } from '../../components/ui/PersonSelect.jsx'
import { TaskTable } from '../../components/shared/TaskTable.jsx'

export function ClickUpPage({ tasks, config, status, lastSync, filters, setFilters, members, onSync }) {
  const groups = [...new Set(tasks.map((task) => `${task.space}\u0000${task.folder}\u0000${task.list}`))]
  return (
    <>
      <header className="top clickup-header">
        <div>
          <h1>ClickUp</h1>
          <div className="mu">
            Your workspace tasks • {status}{lastSync ? ` • synced ${new Date(lastSync).toLocaleTimeString()}` : ''}
          </div>
        </div>
        <div className="row clickup-toolbar">
          <select onChange={(event) => setFilters({ ...filters, space: event.target.value })} value={filters.space}>
            <option value="">All spaces</option>
            {[...new Set((config.spaces || []).map((space) => space.name))].map((space) => (
              <option key={space}>{space}</option>
            ))}
          </select>
          <PersonSelect
            people={members.map((person) => person.name)}
            value={filters.assignee}
            onChange={(value) => setFilters({ ...filters, assignee: value })}
          />
          <input
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            placeholder="Search tasks"
            value={filters.search}
          />
          <label className="chk">
            <input
              checked={filters.closed}
              onChange={(event) => setFilters({ ...filters, closed: event.target.checked })}
              type="checkbox"
            />
            Show closed
          </label>
          <Button onClick={onSync}>
            <Icon name="sync" size={14} /> Sync
          </Button>
        </div>
      </header>
      {!config.configured ? (
        <div className="card">
          <h2>ClickUp is not connected yet</h2>
          <p>ClickUp sync uses the optional serverless integration. Configure `CLICKUP_API_TOKEN` there to enable workspace sync. TaskFlow-managed tasks are still available in Tasks.</p>
        </div>
      ) : (
        groups.map((group) => {
          const [space, folder, list] = group.split('\u0000')
          const groupTasks = tasks.filter((task) => `${task.space}\u0000${task.folder}\u0000${task.list}` === group)
          return (
            <section className="card sp clickup-group" key={group}>
              <h2>
                {[space, folder, list].filter(Boolean).join(' › ')} <span className="mu">{groupTasks.length} tasks</span>
              </h2>
              <TaskTable tasks={groupTasks} projects={[]} members={members} variant="clickup" />
            </section>
          )
        })
      )}
      {config.truncated && <p className="mu">Showing the first 1,000 tasks returned by ClickUp.</p>}
    </>
  )
}

export default ClickUpPage
