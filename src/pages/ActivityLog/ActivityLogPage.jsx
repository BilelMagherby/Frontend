import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { request } from '../../services/api.js'

const actionLabels = {
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',
  'auth.pin.setup': 'Created the admin PIN',
  'auth.pin.change': 'Changed the admin PIN',
  'users.save': 'Updated dashboard users',
  'batch.create': 'Imported records',
  'integration.sync': 'Synchronized ClickUp',
  'file.upload': 'Uploaded a file',
  'file.delete': 'Deleted a file',
  'meeting.create': 'Scheduled a meeting',
  'collection.clear': 'Cleared a collection',
  put: 'Saved a record',
  patch: 'Updated a record',
  delete: 'Deleted a record',
}

export function ActivityLogPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setEvents(await request('/api/audit?limit=200'))
    } catch (cause) {
      setError(cause.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  return (
    <section className="activity-page">
      <header className="top">
        <div>
          <h1>
            <Icon name="database" size={23} /> Activity Log
          </h1>
          <p className="mu">Recent changes recorded by the backend.</p>
        </div>
        <Button disabled={loading} onClick={loadEvents}>
          <Icon name="sync" size={15} /> Refresh
        </Button>
      </header>
      {error && <p className="activity-error" role="alert">{error}</p>}
      {loading && !events.length ? (
        <div className="card activity-empty">Loading saved activity…</div>
      ) : events.length ? (
        <div className="card activity-table-wrap">
          <table className="activity-table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Who</th>
                <th scope="col">Change</th>
                <th scope="col">Section</th>
                <th scope="col">Record</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.createdAt).toLocaleString()}</td>
                  <td>{event.actorName}</td>
                  <td>{actionLabels[event.action] || event.action}</td>
                  <td>{event.collection || 'Account'}</td>
                  <td>{event.documentId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card activity-empty">No changes have been recorded yet.</div>
      )}
      <p className="activity-note">
        <Icon name="info" size={14} /> The log records changes and sign-in activity, not confidential field contents.
      </p>
    </section>
  )
}
