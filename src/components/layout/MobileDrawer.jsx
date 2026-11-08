import { Icon } from '../ui/Icon.jsx'
import { NatheelGulfNav } from '../navigation/NatheelGulfNav.jsx'
import { FoodicsManagementNav } from '../navigation/FoodicsManagementNav.jsx'
import { GULF_PROJECT_NODES } from '../../utils/constants.js'

export function MobileDrawer({
  isOpen,
  onClose,
  config,
  visiblePages,
  noticeCount = 0,
  page,
  setPage,
  canAccessPage,
  filters,
  setFilters,
  projects,
  gulfSelectedNode,
  setGulfSelectedNode,
  setGulfActiveSection,
  natheelGulfOpen,
  setNatheelGulfOpen,
  foodicsSection,
  setFoodicsSection,
  foodicsProject,
  setFoodicsProject,
  foodicsProjectOpen,
  setFoodicsProjectOpen,
  foodicsNavOpen,
  setFoodicsNavOpen,
  logout,
}) {
  if (!isOpen) return null

  return (
    <div className="mobile-drawer-backdrop" onClick={onClose}>
      <div className="mobile-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="mobile-drawer-header">
          <div className="mobile-header-brand">
            {config.logo ? <img src={config.logo} alt="" className="mobile-logo-img" /> : <div className="mobile-logo">N</div>}
            <div>
              <b>Natheelco TaskFlow</b>
              <div className="mu">Menu & navigation</div>
            </div>
          </div>
          <button aria-label="Close menu" className="btn-icon-close" onClick={onClose} type="button">
            <Icon name="close" size={20} />
          </button>
        </div>
        <nav className="mobile-drawer-nav">
          {visiblePages.map(([key, icon, label]) => (
            <button
              className={`mobile-drawer-item nav-item nav-${key}${page === key ? ' on' : ''}`}
              key={key}
              onClick={() => {
                setPage(key)
                onClose()
              }}
              type="button"
            >
              <span className="drawer-icon">
                <Icon name={icon} size={20} />
              </span>
              <span className="drawer-label">{label}</span>
              {key === 'notices' && noticeCount > 0 && <span className="sidebar-notice-count">{noticeCount > 99 ? '99+' : noticeCount}</span>}
              {page === key && <span className="drawer-active-dot" />}
            </button>
          ))}
          {canAccessPage('gulf') && (
            <NatheelGulfNav
              filters={filters}
              id="natheel-gulf-mobile-sections"
              mobile
              onSelect={(projectId) => {
                setGulfSelectedNode(GULF_PROJECT_NODES[projectId] || 'natheel-gulf')
                setGulfActiveSection('files')
                setPage('gulf')
                onClose()
              }}
              onSelectRoot={() => {
                setGulfSelectedNode('natheel-gulf')
                setGulfActiveSection('files')
                setPage('gulf')
                setNatheelGulfOpen(true)
                onClose()
              }}
              onToggle={() => setNatheelGulfOpen((open) => !open)}
              open={natheelGulfOpen}
              page={page}
              projects={projects}
              selectedNode={gulfSelectedNode}
            />
          )}
          {canAccessPage('foodics') && (
            <FoodicsManagementNav
              activeSection={foodicsSection}
              activeProject={foodicsProject}
              expandedProject={foodicsProjectOpen}
              mobile
              onSelect={(section) => {
                setFoodicsSection(section)
                if (section === 'overview' || section === 'reports') {
                  setFoodicsProject('')
                  setFoodicsProjectOpen('')
                }
                setPage('foodics')
                onClose()
              }}
              onProjectSelect={(projectId) => {
                setFoodicsProject(projectId)
                setFoodicsSection('overview')
                setFoodicsProjectOpen((current) => (current === projectId ? '' : projectId))
                setPage('foodics')
                onClose()
              }}
              onSectionSelect={(projectId, section) => {
                setFoodicsProject(projectId)
                setFoodicsSection(section)
                setFoodicsProjectOpen(projectId)
                setPage('foodics')
                onClose()
              }}
              onToggle={() => setFoodicsNavOpen((open) => !open)}
              open={foodicsNavOpen}
              page={page}
            />
          )}
          <button
            className="mobile-drawer-item nav-item nav-lock lkb"
            onClick={() => {
              onClose()
              logout()
            }}
            type="button"
          >
            <span className="drawer-icon">
              <Icon name="lock" size={20} />
            </span>
            <span className="drawer-label">Lock Dashboard</span>
          </button>
        </nav>
        {canAccessPage('tasks') && (
          <div className="mobile-drawer-projects">
            <h4>Filter Tasks by Project</h4>
            <div className="mobile-projects-grid">
              {projects.map((project) => (
                <button
                  className={`mobile-project-chip ${filters.project === project.id && page === 'tasks' ? 'on' : ''}`}
                  key={project.id}
                  onClick={() => {
                    setFilters({ ...filters, project: project.id })
                    setPage('tasks')
                    onClose()
                  }}
                  type="button"
                >
                  <span className="dot" style={{ background: project.color }} />
                  <span>{project.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {canAccessPage('dash') && (
          <button
            className="mobile-drawer-item nav-item nav-cash-bank cash-bank-button"
            onClick={() => window.location.assign('/cash-bank/')}
            type="button"
          >
            <span className="drawer-icon">
              <Icon name="wallet" size={20} />
            </span>
            <span className="drawer-label">Cash Bank Dashboard</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default MobileDrawer
