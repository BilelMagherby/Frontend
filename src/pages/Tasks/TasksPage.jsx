import { Button } from '../../components/ui/Button.jsx'
import { ProjectSelect } from '../../components/ui/ProjectSelect.jsx'
import { PersonSelect } from '../../components/ui/PersonSelect.jsx'
import { TaskTable } from '../../components/shared/TaskTable.jsx'
import { TaskCard } from '../../components/shared/TaskCard.jsx'
import { STATUSES } from '../../utils/constants.js'

export function TasksPage({
  scopedTasks,
  selectedProject,
  projects,
  filters,
  setFilters,
  people,
  taskMode,
  setTaskMode,
  setTaskDialog,
  clickup,
  updateTask,
  removeTask,
}) {
  const visible = scopedTasks
  const groups = STATUSES.map((status) => [status, visible.filter((task) => task.status === status)])

  return (
    <>
      <header className="top">
        <div>
          <h1>{selectedProject?.name || 'All tasks'}</h1>
          <div className="mu">{visible.length} task(s)</div>
        </div>
        <div className="row">
          <ProjectSelect
            projects={projects}
            value={filters.project}
            onChange={(value) => setFilters({ ...filters, project: value })}
          />
          <PersonSelect
            people={people}
            value={filters.assignee}
            onChange={(value) => setFilters({ ...filters, assignee: value })}
          />
          <Button onClick={() => setTaskMode(taskMode === 'list' ? 'board' : 'list')}>
            {taskMode === 'list' ? 'Board view' : 'List view'}
          </Button>
          <Button onClick={() => setTaskDialog(true)} primary>
            + New task
          </Button>
        </div>
      </header>

      {taskMode === 'board' ? (
        <div className="board">
          {groups.map(([label, items]) => (
            <section className="col" key={label}>
              <h3>
                {label} <span className="mu">{items.length}</span>
              </h3>
              {items.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  projects={projects}
                  members={clickup.members}
                  onUpdate={updateTask}
                  onRemove={removeTask}
                />
              ))}
            </section>
          ))}
        </div>
      ) : (
        groups.map(([label, items]) => (
          <section className="card sp" key={label}>
            <h2>
              {label} <span className="mu">{items.length}</span>
            </h2>
            <TaskTable
              tasks={items}
              projects={projects}
              members={clickup.members}
              onUpdate={updateTask}
              onRemove={removeTask}
            />
          </section>
        ))
      )}
    </>
  )
}

export default TasksPage

