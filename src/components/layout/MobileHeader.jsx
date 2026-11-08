import { Icon } from '../ui/Icon.jsx'
import { NotificationButton } from '../ui/NotificationButton.jsx'

export function MobileHeader({
  config,
  pageTitle,
  reminders,
  setNotificationsOpen,
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  return (
    <header className="mobile-header">
      <div className="mobile-header-brand">
        {config.logo ? <img src={config.logo} alt="" className="mobile-logo-img" /> : <div className="mobile-logo">N</div>}
        <div className="mobile-header-titles">
          <span className="mobile-title">Natheelco</span>
          <span className="mobile-subtitle">{pageTitle}</span>
        </div>
      </div>
      <div className="mobile-header-actions">
        <NotificationButton count={reminders.length} onClick={() => setNotificationsOpen((current) => !current)} />
        <button
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="btn g mobile-menu-btn"
          onClick={() => setMobileMenuOpen((open) => !open)}
          type="button"
        >
          <Icon name={mobileMenuOpen ? 'close' : 'menu'} size={20} />
        </button>
      </div>
    </header>
  )
}

export default MobileHeader

