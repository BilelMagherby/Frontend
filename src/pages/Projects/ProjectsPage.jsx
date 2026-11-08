import { Button } from '../../components/ui/Button.jsx'
import { isLate } from '../../utils/helpers.js'

export function ProjectsPage({ projects, tasks, onSave, config, newProject, setNewProject, newColor, setNewColor, onError }) {
  async function save(updated) {
    try {
      await onSave(updated)
      return true
    } catch (cause) {
      onError(cause.message)
      return false
    }
  }

  return (
    <>
      <header className="top">
        <div>
          <h1>Projects</h1>
          <div className="mu">Natheelco holding and its sub-projects</div>
        </div>
      </header>
      <div className="grid k4 metric-grid">
        {projects.map((project) => {
          const scoped = tasks.filter(
            (task) => task.project === project.id || (!project.parent && projects.find((item) => item.id === task.project)?.parent === project.id)
          )
          const done = scoped.filter((task) => task.status === 'Done').length
          const rename = async () => {
            const name = window.prompt('Project name', project.name)
            if (!name?.trim()) return
            await save({
              ...config,
              projects: config.projects.map((item) => (item.id === project.id ? { ...item, name: name.trim() } : item)),
            })
          }
          const remove = async () => {
            if (!window.confirm('Delete this project? Its tasks will be kept.')) return
            await save({ ...config, projects: config.projects.filter((item) => item.id !== project.id) })
          }
          return (
            <div className="card project-card" key={project.id} style={{ borderLeftColor: project.color }}>
              <div className="project-card-header">
                <span className="dot" style={{ background: project.color }} />
                <h2>{project.name}</h2>
              </div>
              <div className="project-task-count">
                <b>{scoped.length}</b> tasks
              </div>
              <div className="bar">
                <i style={{ width: `${scoped.length ? (done / scoped.length) * 100 : 0}%`, background: project.color }} />
              </div>
              <p className="mu">
                {done} done • {scoped.filter(isLate).length} overdue
              </p>
              <div className="row">
                <Button onClick={rename}>Rename</Button>
                {project.parent && <Button onClick={remove}>Delete</Button>}
              </div>
            </div>
          )
        })}
      </div>
      <section className="card sp">
        <h2>Add a new project</h2>
        <div className="row">
          <input onChange={(event) => setNewProject(event.target.value)} placeholder="Project name" value={newProject} />
          <input onChange={(event) => setNewColor(event.target.value)} type="color" value={newColor} />
          <Button
            disabled={!newProject.trim()}
            onClick={async () => {
              const name = newProject.trim()
              const saved = await save({
                ...config,
                projects: [...config.projects, { id: `p${Date.now()}`, name, color: newColor, parent: 'nathilco' }],
              })
              if (saved) setNewProject('')
            }}
            primary
          >
            Add project
          </Button>
        </div>
      </section>
    </>
  )
}

export default ProjectsPage

