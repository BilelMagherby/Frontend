import { Icon } from '../ui/Icon.jsx'
import { Button } from '../ui/Button.jsx'
import { PRIORITY_COLORS } from '../../utils/constants.js'
import { projectName } from '../../utils/helpers.js'

export function CalendarEventDetail({ event, projects = [], onClose, onOpenMeeting }) {
  const { kind, item } = event
  const meeting = kind === 'meeting'
  const isGoogle = meeting && item.platform === 'google'
  const eventDate = meeting ? new Date(item.start) : new Date(`${item.due}T12:00:00`)
  const dateLabel = eventDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const timeLabel = meeting
    ? eventDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : null
  const endLabel =
    meeting && item.duration
      ? new Date(item.start + item.duration * 60_000).toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        })
      : null

  return (
    <div
      className="react-modal-backdrop"
      onMouseDown={(mouseEvent) => mouseEvent.target === mouseEvent.currentTarget && onClose()}
    >
      <section aria-labelledby="calendar-event-title" aria-modal="true" className="mdl event-modal" role="dialog">
        <header className="event-modal-head">
          <div className={`event-modal-icon ${meeting ? (isGoogle ? 'icon-meet' : 'icon-zoom') : 'icon-task'}`}>
            <Icon name={meeting ? (isGoogle ? 'google-meet' : 'zoom') : 'check-square'} size={24} />
          </div>
          <button aria-label="Close event details" className="btn-icon-close" onClick={onClose} type="button">
            <Icon name="close" size={18} />
          </button>
        </header>
        <span className={`pill event-kind ${meeting ? 'meeting' : 'task'}`}>
          <Icon name={meeting ? (isGoogle ? 'google-meet' : 'zoom') : 'check'} size={12} />
          {meeting ? `${isGoogle ? 'Google Meet' : 'Zoom'} meeting` : 'Task due'}
        </span>
        <h2 id="calendar-event-title">{item.title}</h2>
        <div className="event-facts">
          <div className="event-fact">
            <span className="fact-icon">
              <Icon name="calendar" size={18} />
            </span>
            <div>
              <b>{dateLabel}</b>
              {timeLabel && (
                <span>
                  <Icon name="clock" size={12} /> {timeLabel}
                  {endLabel ? ` – ${endLabel}` : ''}
                </span>
              )}
            </div>
          </div>
          <div className="event-fact">
            <span className="fact-icon">
              <Icon name="folder" size={18} />
            </span>
            <div>
              <b>Project</b>
              <span>{projectName(projects, item.project)}</span>
            </div>
          </div>
          {meeting ? (
            <div className="event-fact">
              <span className="fact-icon">
                <Icon name="clock" size={18} />
              </span>
              <div>
                <b>Status & Duration</b>
                <span>
                  {item.status || 'scheduled'}
                  {item.duration ? ` · ${item.duration} min` : ''}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="event-fact">
                <span className="fact-icon">
                  <Icon name="check-circle" size={18} />
                </span>
                <div>
                  <b>Status</b>
                  <span>{item.status || 'To Do'}</span>
                </div>
              </div>
              <div className="event-fact">
                <span className="fact-icon">
                  <Icon name="user" size={18} />
                </span>
                <div>
                  <b>Assigned to</b>
                  <span>{(item.assignees || [item.assignee]).filter(Boolean).join(', ') || 'Unassigned'}</span>
                </div>
              </div>
              {item.priority && (
                <div className="event-fact">
                  <span className="fact-icon">
                    <Icon color={PRIORITY_COLORS[item.priority]} name="flag" size={18} />
                  </span>
                  <div>
                    <b>Priority</b>
                    <span style={{ color: PRIORITY_COLORS[item.priority], fontWeight: 600 }}>{item.priority}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {meeting && item.attendees?.length > 0 && (
          <div className="event-extra">
            <b>
              <Icon name="users" size={14} /> Attendees
            </b>
            <p>
              {item.attendees
                .map((attendee) => (typeof attendee === 'string' ? attendee : attendee.name || attendee.email))
                .join(', ')}
            </p>
          </div>
        )}
        {(item.summary || item.note) && (
          <div className="event-extra">
            <b>
              <Icon name="file-text" size={14} /> {meeting ? 'Meeting summary' : 'Notes'}
            </b>
            <p>{item.summary || item.note}</p>
          </div>
        )}
        <footer className="event-modal-actions">
          {meeting && item.joinUrl && (
            <a className="btn p" href={item.joinUrl} rel="noreferrer" target="_blank">
              <Icon name="video" size={15} /> Join meeting <Icon name="external-link" size={13} />
            </a>
          )}
          {meeting && (
            <Button onClick={() => onOpenMeeting(item)}>
              <Icon name="file-text" size={15} /> Open meeting notes
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </footer>
      </section>
    </div>
  )
}

