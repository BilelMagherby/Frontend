export function ProjectSelect({ projects = [], value, onChange }) {
  return (
    <select onChange={(event) => onChange(event.target.value)} value={value}>
      <option value="">All projects</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  )
}

