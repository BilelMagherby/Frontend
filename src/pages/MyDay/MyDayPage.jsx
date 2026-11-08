import { Button } from '../../components/ui/Button.jsx'
import { TaskTable } from '../../components/shared/TaskTable.jsx'
import { today, isLate } from '../../utils/helpers.js'

export function MyDayPage({
  allTasks,
  calendarPerson,
  setCalendarPerson,
  people,
  filters,
  projects,
  clickup,
  updateTask,
  removeTask,
  setTaskDialog,
}) {
  const visible = allTasks
    .filter(
      (task) =>
        task.status !== 'Done' &&
        (!calendarPerson || calendarPerson === 'CEO' || (task.assignees || []).includes(calendarPerson))
    )
    .filter(
      (task) =>
        !calendarPerson ||
        calendarPerson === 'CEO' ||
        !filters.assignee ||
        (task.assignees || []).includes(filters.assignee)
    )

  const groups = [
    ['Overdue', visible.filter(isLate)],
    ['Due today', visible.filter((task) => task.due === today())],
    ['In progress', visible.filter((task) => task.status === 'In Progress' && !isLate(task) && task.due !== today())],
    ['Upcoming', visible.filter((task) => task.status === 'To Do' && task.due > today())],
  ]

  return (
    <>
      <header className="top">
        <div>
          <h1>My Day</h1>
          <div className="mu">{visible.length} task(s)</div>
        </div>
        <div className="row">
          <select
            onChange={(event) => {
              setCalendarPerson(event.target.value)
            }}
            value={calendarPerson}
          >
            <option value="">Who are you?</option>
            {people.map((person) => (
              <option key={person}>{person}</option>
            ))}
          </select>
          <Button onClick={() => setTaskDialog(true)} primary>
            + New task
          </Button>
        </div>
      </header>

      {!calendarPerson && <div className="card">Select your name to see your daily task list.</div>}
      {calendarPerson && (
        <div className="card">
          <b>Good day, {calendarPerson}.</b> You have{' '}
          <b className={groups[0][1].length ? 'late' : ''}>{groups[0][1].length} overdue</b> and{' '}
          <b>{groups[1][1].length} due today</b>.
        </div>
      )}

      {groups.map(([label, items]) => (
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
      ))}
    </>
  )
}

export default MyDayPage
