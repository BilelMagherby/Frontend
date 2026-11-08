import { Icon } from '../../components/ui/Icon.jsx'
import { projectName } from '../../utils/helpers.js'

export function MeetingRow({ meeting, projects = [], onOpen }) {
  const isGoogle = meeting.platform === 'google'
  const isCompleted = meeting.status === 'completed'
  const isCancelled = meeting.status === 'cancelled'
  const statusType = isCompleted ? 'ok' : isCancelled ? 'bad' : 'info'

  return (
    <button className="mr" onClick={() => onOpen(meeting)} type="button">
      <span className="mdt">
        <b>{new Date(meeting.start).getDate()}</b>
        <span>{new Date(meeting.start).toLocaleDateString([], { month: 'short' })}</span>
      </span>
      <span className="platform-tag" title={isGoogle ? 'Google Meet' : 'Zoom'}>
        <Icon name={isGoogle ? 'google-meet' : 'zoom'} size={18} />
      </span>
      <span className="meeting-row-content">
        <b>{meeting.title}</b>
        <span className="mu">
          <Icon name="clock" size={12} /> {new Date(meeting.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          {meeting.duration ? ` (${meeting.duration}m)` : ''} • {projectName(projects, meeting.project)}
        </span>
      </span>
      <span className={`pill pill-${statusType}`}>
        {isCompleted ? <Icon name="check" size={12} /> : isCancelled ? <Icon name="close" size={12} /> : <Icon name="clock" size={12} />}
        {meeting.status || 'scheduled'}
      </span>
    </button>
  )
}

