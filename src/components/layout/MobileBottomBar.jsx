import { Icon } from '../ui/Icon.jsx'

export function MobileBottomBar({
  canAccessPage,
  page,
  setPage,
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  return (
    <nav aria-label="Mobile Bottom Navigation" className="mobile-bottom-bar">
      {canAccessPage('dash') && (
        <button
          className={`mobile-tab-btn nav-item nav-dash ${page === 'dash' ? 'on' : ''}`}
          onClick={() => {
            setPage('dash')
            setMobileMenuOpen(false)
          }}
          type="button"
        >
          <Icon name="dashboard" size={20} />
          <span>Dashboard</span>
        </button>
      )}
      {canAccessPage('tasks') && (
        <button
          className={`mobile-tab-btn nav-item nav-tasks ${page === 'tasks' ? 'on' : ''}`}
          onClick={() => {
            setPage('tasks')
            setMobileMenuOpen(false)
          }}
          type="button"
        >
          <Icon name="tasks" size={20} />
          <span>Tasks</span>
        </button>
      )}
      {(canAccessPage('meet') || canAccessPage('zoom')) && (
        <button
          className={`mobile-tab-btn nav-item nav-meet ${page === 'meet' || page === 'zoom' ? 'on' : ''}`}
          onClick={() => {
            setPage(canAccessPage('meet') ? 'meet' : 'zoom')
            setMobileMenuOpen(false)
          }}
          type="button"
        >
          <Icon name="video" size={20} />
          <span>Meetings</span>
        </button>
      )}
      {canAccessPage('cal') && (
        <button
          className={`mobile-tab-btn nav-item nav-cal ${page === 'cal' ? 'on' : ''}`}
          onClick={() => {
            setPage('cal')
            setMobileMenuOpen(false)
          }}
          type="button"
        >
          <Icon name="calendar-clock" size={20} />
          <span>Calendar</span>
        </button>
      )}
      <button
        className={`mobile-tab-btn ${mobileMenuOpen ? 'on' : ''}`}
        onClick={() => setMobileMenuOpen((open) => !open)}
        type="button"
      >
        <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={20} />
        <span>Menu</span>
      </button>
    </nav>
  )
}

export default MobileBottomBar

