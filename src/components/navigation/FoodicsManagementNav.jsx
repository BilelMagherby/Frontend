import { Icon } from '../ui/Icon.jsx'
import { FOODICS_PROJECTS, PROJECT_SECTIONS } from '../../pages/FoodicsManagement/foodicsData.js'

export function FoodicsManagementNav({ activeSection, activeProject, expandedProject, mobile = false, onSelect, onProjectSelect, onSectionSelect, open, onToggle, page }) {
  const active = page === 'foodics'
  return (
    <div className={`foodics-nav${mobile ? ' foodics-nav-mobile' : ''}${active ? ' is-active' : ''}`}>
      <div className="foodics-nav-heading">
        <button aria-current={active && activeSection === 'overview' ? 'page' : undefined} className="foodics-nav-main" onClick={() => onSelect('overview')} type="button">
          <span className="foodics-nav-icon"><Icon name="folder" size={17} /></span>
          <span className="foodics-nav-label">Foodics Management</span>
        </button>
        <button aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} Foodics Management sections`} className="foodics-nav-toggle" onClick={onToggle} type="button">
          <Icon name={open ? 'chevron-left' : 'chevron-right'} size={15} />
        </button>
      </div>
      {open && <div className="foodics-nav-sections">
        <button aria-current={active && activeSection === 'reports' ? 'page' : undefined} className={`foodics-nav-item foodics-nav-reports${active && activeSection === 'reports' ? ' selected' : ''}`} onClick={() => onSelect('reports')} type="button">
          <Icon name="chart" size={14} /><span>Reports library</span>
        </button>
        {FOODICS_PROJECTS.map((project) => (
          <div className="foodics-nav-project-group" key={project.id}>
            <button aria-expanded={expandedProject === project.id} aria-current={active && activeProject === project.id && activeSection !== 'overview' ? 'location' : undefined} className={`foodics-nav-project${active && activeProject === project.id ? ' selected' : ''}`} onClick={() => onProjectSelect(project.id)} type="button">
              <span className="foodics-project-mark" style={{ '--project-color': project.color }}>{project.name.slice(0, 1)}</span>
              <span className="foodics-nav-project-name">{project.name}</span>
              <Icon className="foodics-nav-project-chevron" name={expandedProject === project.id ? 'chevron-down' : 'chevron-right'} size={13} />
            </button>
            {expandedProject === project.id && <div className="foodics-nav-project-sections">
              {PROJECT_SECTIONS.map((section) => (
                <button aria-current={active && activeProject === project.id && activeSection === section.id ? 'page' : undefined} className={`foodics-nav-item${active && activeProject === project.id && activeSection === section.id ? ' selected' : ''}`} key={section.id} onClick={() => onSectionSelect(project.id, section.id)} type="button">
                  <Icon name={section.icon} size={14} /><span>{section.shortLabel}</span>
                </button>
              ))}
            </div>}
          </div>
        ))}
      </div>}
    </div>
  )
}

