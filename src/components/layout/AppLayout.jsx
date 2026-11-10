import { Icon } from '../ui/Icon.jsx'
import { fmtDay } from '../../utils/helpers.js'
import { MobileHeader } from './MobileHeader.jsx'
import { MobileDrawer } from './MobileDrawer.jsx'
import { DesktopSidebar } from './DesktopSidebar.jsx'
import { MobileBottomBar } from './MobileBottomBar.jsx'

export function AppLayout({
  config,
  pageTitle,
  reminders,
  notificationsOpen,
  setNotificationsOpen,
  mobileMenuOpen,
  setMobileMenuOpen,
  visiblePages,
  noticeCount,
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
  auth,
  error,
  setError,
  toast,
  setCalendarEventDetail,
  children,
}) {
  return (
    <>
      <MobileHeader
        config={config}
        mobileMenuOpen={mobileMenuOpen}
        pageTitle={pageTitle}
        reminders={reminders}
        setMobileMenuOpen={setMobileMenuOpen}
        setNotificationsOpen={setNotificationsOpen}
      />

      <MobileDrawer
        canAccessPage={canAccessPage}
        config={config}
        filters={filters}
        foodicsNavOpen={foodicsNavOpen}
        foodicsProject={foodicsProject}
        foodicsProjectOpen={foodicsProjectOpen}
        foodicsSection={foodicsSection}
        gulfSelectedNode={gulfSelectedNode}
        isOpen={mobileMenuOpen}
        logout={logout}
        natheelGulfOpen={natheelGulfOpen}
        onClose={() => setMobileMenuOpen(false)}
        page={page}
        projects={projects}
        setFilters={setFilters}
        setFoodicsNavOpen={setFoodicsNavOpen}
        setFoodicsProject={setFoodicsProject}
        setFoodicsProjectOpen={setFoodicsProjectOpen}
        setFoodicsSection={setFoodicsSection}
        setGulfActiveSection={setGulfActiveSection}
        setGulfSelectedNode={setGulfSelectedNode}
        setNatheelGulfOpen={setNatheelGulfOpen}
        setPage={setPage}
        visiblePages={visiblePages}
        noticeCount={noticeCount}
      />

      <div className="app">
        <DesktopSidebar
          canAccessPage={canAccessPage}
          clickup={clickup}
          clickupStatus={clickupStatus}
          config={config}
          filters={filters}
          foodicsNavOpen={foodicsNavOpen}
          foodicsProject={foodicsProject}
          foodicsProjectOpen={foodicsProjectOpen}
          foodicsSection={foodicsSection}
          gulfSelectedNode={gulfSelectedNode}
          lastSync={lastSync}
          logout={logout}
          natheelGulfOpen={natheelGulfOpen}
          page={page}
          projects={projects}
          setFilters={setFilters}
          setFoodicsNavOpen={setFoodicsNavOpen}
          setFoodicsProject={setFoodicsProject}
          setFoodicsProjectOpen={setFoodicsProjectOpen}
          setFoodicsSection={setFoodicsSection}
          setGulfActiveSection={setGulfActiveSection}
          setGulfSelectedNode={setGulfSelectedNode}
          setNatheelGulfOpen={setNatheelGulfOpen}
          setPage={setPage}
          syncClickupNow={syncClickupNow}
          visiblePages={visiblePages}
          noticeCount={noticeCount}
        />

        <main>
          {error && (
            <div className="toast err react-toast" role="alert">
              <Icon name="alert-triangle" size={16} /> {error}
              <button aria-label="Close" onClick={() => setError('')} type="button">
                <Icon name="close" size={14} />
              </button>
            </div>
          )}
          {toast && (
            <div className="toast react-toast" role="status">
              <Icon name="check-circle" size={16} /> {toast}
            </div>
          )}
          {notificationsOpen && (
            <div className="card notifications">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b>
                  <Icon name="bell" size={15} /> Today's calendar
                </b>
                <button className="btn g" onClick={() => setNotificationsOpen(false)}>
                  Close
                </button>
              </div>
              <p className="mu" style={{ margin: '4px 0 8px', fontSize: 12 }}>
                {fmtDay(Date.now(), { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              {reminders.length ? (
                reminders.map(({ kind, item }) => (
                  <button
                    className="notification-item"
                    key={`${kind}-${item.id}`}
                    onClick={() => {
                      setCalendarEventDetail({ kind, item })
                      setNotificationsOpen(false)
                    }}
                  >
                    <span className="notif-dot" />
                    <span className="notification-copy">
                      <b>{item.title}</b>
                      <span className="mu">
                        {kind === 'meeting'
                          ? `${fmtDay(item.start)} · ${new Date(item.start).toLocaleTimeString(undefined, {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}`
                          : 'Task due today'}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <p className="mu empty-hint">No calendar events scheduled for today.</p>
              )}
            </div>
          )}
          {children}
        </main>
      </div>

      <MobileBottomBar
        canAccessPage={canAccessPage}
        mobileMenuOpen={mobileMenuOpen}
        page={page}
        setMobileMenuOpen={setMobileMenuOpen}
        setPage={setPage}
      />
    </>
  )
}

export default AppLayout
