import { Icon } from '../ui/Icon.jsx'
import { NATHEEL_GULF_SECTIONS, GULF_PROJECT_NODES } from '../../utils/constants.js'

export function NatheelGulfNav({ id, open, onToggle, projects = [], filters, page, selectedNode, onSelectRoot, onSelect, mobile = false }) {
  return (
    <div className={`natheel-gulf-nav${mobile ? ' mobile-natheel-gulf-nav' : ''}`}>
      <div className={`natheel-gulf-trigger${page === 'gulf' ? ' on' : ''}`}>
        <button aria-current={page === 'gulf' ? 'page' : undefined} className="natheel-gulf-main" onClick={onSelectRoot} type="button">
          <span className="natheel-gulf-icon"><Icon name="database" size={18} /></span>
          <span className="natheel-gulf-label">Natheel Gulf Data Bank</span>
        </button>
        <button aria-controls={id} aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} Natheel Gulf sections`} className="natheel-gulf-toggle" onClick={onToggle} type="button">
          <Icon className={`natheel-gulf-chevron${open ? ' expanded' : ''}`} name="chevron-right" size={14} />
        </button>
      </div>
      {open && (
        <div aria-label="Natheel Gulf projects" className="natheel-gulf-sections" id={id}>
          <span className="natheel-gulf-sections-label">Projects</span>
          {NATHEEL_GULF_SECTIONS.map(([projectId, label]) => {
            const project = projects.find((item) => item.id === projectId)
            const selected = GULF_PROJECT_NODES[projectId] === selectedNode
            return (
              <button
                aria-current={selected ? 'location' : undefined}
                className={`natheel-gulf-section${selected ? ' on' : ''}`}
                disabled={!project}
                key={projectId}
                onClick={() => onSelect(project.id)}
                title={project ? `Show tasks for ${label}` : `${label} is not configured in Projects`}
                type="button"
              >
                <span className="natheel-gulf-project-icon" style={{ '--project-color': project?.color || '#64748b' }}><Icon name="folder" size={13} /></span>
                <span className="natheel-gulf-project-name">{label}</span>
                <Icon className="natheel-gulf-project-chevron" name="chevron-right" size={13} />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
