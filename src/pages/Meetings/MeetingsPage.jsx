import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Metric } from '../../components/ui/Metric.jsx'
import { MeetingRow } from './MeetingRow.jsx'
import { projectName } from '../../utils/helpers.js'

export function MeetingsPage({ platform, meetings = [], integration = {}, projects = [], onOpen, onSchedule, onStart }) {
  const isGoogle = platform === 'google'
  const label = isGoogle ? 'Google Meet' : 'Zoom'
  const upcomingMeetings = meetings.filter((meeting) => meeting.start + meeting.duration * 60_000 >= Date.now())
  const pastMeetings = meetings.filter((meeting) => meeting.start + meeting.duration * 60_000 < Date.now())
  const totalDecisions = meetings.reduce((sum, meeting) => sum + (meeting.decisions?.length || 0), 0)
  const awaitingMinutes = meetings.filter((meeting) => meeting.status === 'completed' && !meeting.summary).length
  const editableMeeting = meetings.find((meeting) => !meeting.demo)
  const summarizedMeetings = meetings
    .filter((meeting) => meeting.summary?.trim())
    .sort((first, second) => second.start - first.start)

  return (
    <>
      <header className="top">
        <div className="title-with-badge">
          <span className="platform-header-icon">
            <Icon name={isGoogle ? 'google-meet' : 'zoom'} size={28} />
          </span>
          <div>
            <h1>{label}</h1>
            <div className="mu">
              {integration[platform]
                ? 'Connected • meetings automatically sync with calendar invitations and links.'
                : `${label} is not connected. Meeting details are saved here, but live meeting links are unavailable.`}
            </div>
          </div>
        </div>
        <div className="row">
          <Button className="btn-instant" onClick={() => onStart(platform)} primary type="button">
            <Icon name="video-instant" size={16} /> {integration[platform] ? 'Start instant meeting' : 'Create meeting record'}
          </Button>
          <Button onClick={onSchedule} type="button">
            <Icon name="calendar-plus" size={16} /> Schedule {label}
          </Button>
        </div>
      </header>

      <div className="grid k4 metric-grid">
        <Metric
          icon="video"
          label={`${label} meetings`}
          value={meetings.length}
          detail="Scheduled and past"
          variant="neutral"
        />
        <Metric
          icon="calendar-clock"
          label="Upcoming"
          value={upcomingMeetings.length}
          detail="Scheduled ahead"
          variant="accent"
        />
        <Metric
          icon="decision"
          label="Decisions recorded"
          value={totalDecisions}
          detail={`${totalDecisions} in minutes`}
          variant="success"
        />
        <Metric
          icon="file-text"
          label="Awaiting minutes"
          value={awaitingMinutes}
          detail={awaitingMinutes ? 'Needs summary' : 'All minutes logged'}
          variant={awaitingMinutes ? 'danger' : 'success'}
        />
      </div>

      <section aria-labelledby="meeting-summaries-title" className={`card sp meeting-summaries-card ${isGoogle ? 'google' : 'zoom'}`}>
        <div className="section-head-row">
          <div className="row">
            <span className="meeting-summary-icon">
              <Icon name="file-text" size={17} />
            </span>
            <div>
              <h2 id="meeting-summaries-title">{label} meeting summaries</h2>
              <p className="meeting-summary-description">Review summaries saved from your meetings.</p>
            </div>
          </div>
          <span className="pill">{summarizedMeetings.length} saved</span>
        </div>
        {summarizedMeetings.length > 0 ? (
          <div aria-label="Saved meeting summaries" className="meeting-summary-list">
            {summarizedMeetings.map((meeting) => (
              <button className="meeting-summary-item" key={meeting.id} onClick={() => onOpen(meeting)} type="button">
                <span className="meeting-summary-item-heading">
                  <span className="meeting-summary-item-title">{meeting.title}</span>
                  <span className="meeting-summary-item-date">
                    {new Date(meeting.start).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </span>
                <span className="meeting-summary-text">{meeting.summary}</span>
                <span className="meeting-summary-meta">
                  <span>
                    <Icon name="folder" size={13} /> {projectName(projects, meeting.project)}
                  </span>
                  {!!meeting.decisions?.length && (
                    <span>
                      <Icon name="decision" size={13} /> {meeting.decisions.length} decision
                      {meeting.decisions.length === 1 ? '' : 's'}
                    </span>
                  )}
                  {!!meeting.actions?.length && (
                    <span>
                      <Icon name="check-square" size={13} /> {meeting.actions.length} action
                      {meeting.actions.length === 1 ? '' : 's'}
                    </span>
                  )}
                  <span className="meeting-summary-open">
                    Open minutes <Icon name="arrow-right" size={13} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="meeting-summary-empty">
            <span className="meeting-summary-empty-icon">
              <Icon name="file-text" size={20} />
            </span>
            <div>
              <b>No saved summaries yet</b>
              <p>Summaries saved from your meetings will appear here.</p>
            </div>
            {editableMeeting && (
              <Button onClick={() => onOpen(editableMeeting)}>
                <Icon name="edit" size={14} /> Add a summary
              </Button>
            )}
          </div>
        )}
      </section>

      <section className="card sp">
        <div className="section-head-row">
          <div className="row">
            <Icon name="calendar-clock" size={18} />
            <h2>Upcoming {label} meetings</h2>
          </div>
          <span className="pill pill-info">{upcomingMeetings.length} upcoming</span>
        </div>
        <div className="meeting-list">
          {upcomingMeetings.map((meeting) => (
            <MeetingRow key={meeting.id} meeting={meeting} onOpen={onOpen} projects={projects} />
          ))}
          {!upcomingMeetings.length && (
            <div className="empty-state">
              <Icon name="calendar" size={28} />
              <p className="mu">No upcoming meetings scheduled. Click "Start instant meeting" or "Schedule" above.</p>
            </div>
          )}
        </div>
      </section>

      <section className="card sp">
        <div className="section-head-row">
          <div className="row">
            <Icon name="file-text" size={18} />
            <h2>Past meetings & minutes</h2>
          </div>
          <span className="pill">{pastMeetings.length} archived</span>
        </div>
        <div className="meeting-list">
          {pastMeetings.map((meeting) => (
            <MeetingRow key={meeting.id} meeting={meeting} onOpen={onOpen} projects={projects} />
          ))}
          {!pastMeetings.length && (
            <div className="empty-state">
              <Icon name="file-text" size={28} />
              <p className="mu">Past meeting transcripts and executive summaries will appear here.</p>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
