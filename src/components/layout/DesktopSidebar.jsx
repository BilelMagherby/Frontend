import { Icon } from '../ui/Icon.jsx'
import { NatheelGulfNav } from '../navigation/NatheelGulfNav.jsx'
import { FoodicsManagementNav } from '../navigation/FoodicsManagementNav.jsx'
import { GULF_PROJECT_NODES } from '../../utils/constants.js'

export function DesktopSidebar({
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
  clickup,
  clickupStatus,
  lastSync,
  syncClickupNow,
}) {
  return (
    <aside>
      <div className="brand">
        {config.logo ? <img src={config.logo} alt="" /> : <div className="logo">N</div>}
        <span>
          Natheelco
          <br />
          <span className="mu">TaskFlow</span>
        </span>
      </div>
      <nav aria-label="Main navigation" className="primary-nav">
        {visiblePages.map(([key, icon, label]) => (
          <button
            className={`nav-item nav-${key}${page === key ? ' on' : ''}`}
            key={key}
            onClick={() => setPage(key)}
            type="button"
          >
            <span className="nav-icon">
              <Icon name={icon} size={16} />
            </span>
            <span className="nav-label">{label}</span>
            {key === 'notices' && noticeCount > 0 && <span className="sidebar-notice-count">{noticeCount > 99 ? '99+' : noticeCount}</span>}
          </button>
        ))}
        {canAccessPage('gulf') && (
          <NatheelGulfNav
            filters={filters}
            id="natheel-gulf-desktop-sections"
            onSelect={(projectId) => {
              setGulfSelectedNode(GULF_PROJECT_NODES[projectId] || 'natheel-gulf')
              setGulfActiveSection('files')
              setPage('gulf')
            }}
            onSelectRoot={() => {
              setGulfSelectedNode('natheel-gulf')
              setGulfActiveSection('files')
              setPage('gulf')
              setNatheelGulfOpen(true)
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
            onSelect={(section) => {
              setFoodicsSection(section)
              if (section === 'overview' || section === 'reports') {
                setFoodicsProject('')
                setFoodicsProjectOpen('')
              }
              setPage('foodics')
            }}
            onProjectSelect={(projectId) => {
              setFoodicsProject(projectId)
              setFoodicsSection('overview')
              setFoodicsProjectOpen((current) => (current === projectId ? '' : projectId))
              setPage('foodics')
            }}
            onSectionSelect={(projectId, section) => {
              setFoodicsProject(projectId)
              setFoodicsSection(section)
              setFoodicsProjectOpen(projectId)
              setPage('foodics')
            }}
            onToggle={() => setFoodicsNavOpen((open) => !open)}
            open={foodicsNavOpen}
            page={page}
          />
        )}
        <button className="nav-item nav-lock lkb" onClick={logout} type="button">
          <span className="nav-icon">
            <Icon name="lock" size={16} />
          </span>
          <span className="nav-label">Lock</span>
        </button>
      </nav>
      <div className="sidebar-extra">
        {canAccessPage('clickup') && (
          <>
            <div className="sidebar-section-head">
              <h4>ClickUp</h4>
              <button className="sidebar-sync-btn" onClick={syncClickupNow} title="Sync ClickUp now" type="button">
                <Icon name="sync" size={11} /> Sync
              </button>
            </div>
            <div className="sidebar-meta">
              {clickupStatus}
              {lastSync ? <> • {Math.max(1, Math.round((Date.now() - lastSync) / 60_000))}m ago</> : null}
            </div>
            {(clickup.workspaces || []).map((workspace) => (
              <a
                className="ws"
                href={workspace.url}
                key={workspace.id}
                rel="noreferrer"
                target="_blank"
                title={'Open ' + workspace.name + ' in ClickUp'}
              >
                <Icon name="external-link" size={11} /> {workspace.name}
              </a>
            ))}
          </>
        )}
        {canAccessPage('tasks') && (
          <>
            <h4>Projects</h4>
            <div className="sidebar-projects-list">
              {projects.map((project) => (
                <button
                  className={filters.project === project.id && page === 'tasks' ? 'on project-btn' : 'project-btn'}
                  key={project.id}
                  onClick={() => {
                    setFilters({ ...filters, project: project.id })
                    setPage('tasks')
                  }}
                  type="button"
                >
                  <span className="dot" style={{ background: project.color }} />
                  <span className="project-btn-label">{project.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {canAccessPage('dash') && (
        <button
          className="nav-item nav-cash-bank cash-bank-button"
          onClick={() => window.location.assign('/cash-bank/')}
          type="button"
        >
          <span className="nav-icon">
            <Icon name="wallet" size={16} />
          </span>
          <span className="nav-label">Cash Bank Dashboard</span>
        </button>
      )}
    </aside>
  )
}

export default DesktopSidebar
