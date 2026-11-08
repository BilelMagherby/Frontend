import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { MeetingRow } from './MeetingRow.jsx'

export function MeetingSummary({ meetings = [], projects = [], onOpen, onCreate, onStart }) {
  const weekStart = new Date()
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  const week = meetings.filter((meeting) => meeting.start >= weekStart.getTime() && meeting.start < weekStart.getTime() + 7 * 86_400_000)
  const upcoming = meetings
    .filter((meeting) => meeting.status !== 'completed' && meeting.status !== 'cancelled' && meeting.start + meeting.duration * 60_000 > Date.now())
    .sort((a, b) => a.start - b.start)
  const decisions = meetings
    .filter((meeting) => meeting.status === 'completed')
    .flatMap((meeting) => (meeting.decisions || []).map((decision) => ({ ...decision, meeting })))
    .slice(-4)

  return (
    <section className="card hub meeting-hub sp">
      <div className="section-head-row">
        <div>
          <div className="section-title-wrap">
            <span className="section-icon-badge">
              <Icon name="video" size={20} />
            </span>
            <h2>Meetings this week</h2>
          </div>
          <div className="mu">
            {week.length} meeting(s) scheduled • {week.filter((m) => m.status === 'completed').length} completed
          </div>
        </div>
        <div className="row meeting-actions">
          <Button className="btn-meet" onClick={() => onStart('google')} type="button">
            <Icon name="google-meet" size={16} /> Start Meet
          </Button>
          <Button className="btn-zoom" onClick={() => onStart('zoom')} type="button">
            <Icon name="zoom" size={16} /> Start Zoom
          </Button>
          <Button onClick={onCreate} primary type="button">
            <Icon name="calendar-plus" size={16} /> Schedule
          </Button>
        </div>
      </div>
      <div className="grid k2 sp">
        <div className="meeting-col">
          <div className="sub-header">
            <Icon name="calendar-clock" size={16} /> <h3>Upcoming schedule</h3>
          </div>
          <div className="meeting-list">
            {upcoming.slice(0, 3).map((meeting) => (
              <MeetingRow key={meeting.id} meeting={meeting} onOpen={onOpen} projects={projects} />
            ))}
            {!upcoming.length && (
              <div className="empty-state">
                <Icon name="calendar" size={24} />
                <p className="mu">No upcoming meetings scheduled.</p>
              </div>
            )}
          </div>
        </div>
        <div className="meeting-col">
          <div className="sub-header">
            <Icon name="decision" size={16} /> <h3>Latest decisions recorded</h3>
          </div>
          <div className="decision-list">
            {decisions.map(({ meeting, text, owner }, index) => (
              <button
                className="decision-card"
                key={`${meeting.id}-${index}`}
                onClick={() => onOpen(meeting)}
                type="button"
              >
                <span className="decision-icon">
                  <Icon name="check-circle" size={16} />
                </span>
                <span className="decision-body">
                  <b>{text}</b>
                  <small>
                    <Icon name="file-text" size={12} /> {meeting.title} • <Icon name="user" size={12} /> {owner || 'No owner'}
                  </small>
                </span>
                <span className="decision-arrow">
                  <Icon name="chevron-right" size={14} />
                </span>
              </button>
            ))}
            {!decisions.length && (
              <div className="empty-state">
                <Icon name="decision" size={24} />
                <p className="mu">Decisions generated from meeting minutes appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

