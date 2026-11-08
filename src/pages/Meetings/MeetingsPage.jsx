import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Metric } from '../../components/ui/Metric.jsx'
import { MeetingRow } from './MeetingRow.jsx'
import { projectName } from '../../utils/helpers.js'

export function MeetingsPage({ platform, meetings = [], integration = {}, projects = [], onOpen, onSchedule, onStart }) {
  const isGoogle = platform === 'google'
  const label = isGoogle ? 'Google Meet' : 'Zoom'
  const exampleSummaries = isGoogle
    ? [
        {
          title: 'Weekly leadership sync',
          focus: 'Operations & priorities',
          summary:
            'The team reviewed this week’s operational priorities, confirmed owners for open decisions, and agreed to raise supplier delays earlier in the weekly review.',
          decisions: [
            'Keep the weekly review focused on blockers and decisions.',
            'Escalate supplier delays as soon as a delivery date is at risk.',
          ],
          actions: [
            'Share the updated priority list before the next sync.',
            'Bring the revised supplier timeline to the next review.',
          ],
        },
        {
          title: 'Project launch readiness',
          focus: 'Project planning',
          summary:
            'The launch checklist was reviewed across marketing, operations, and customer support. The group agreed to validate dependencies before confirming the public launch date.',
          decisions: ['Confirm cross-team dependencies before announcing the launch date.'],
          actions: [
            'Collect final readiness updates from each team.',
            'Review open launch risks with project owners.',
          ],
        },
        {
          title: 'Monthly performance review',
          focus: 'KPI review',
          summary:
            'Participants reviewed progress against monthly targets, discussed the largest changes since the previous review, and identified where follow-up analysis is needed.',
          decisions: ['Use the same KPI definitions in the next monthly report.'],
          actions: [
            'Circulate the updated KPI breakdown.',
            'Add context for metrics that changed significantly.',
          ],
        },
        {
          title: 'Customer experience review',
          focus: 'Service improvement',
          summary:
            'The team discussed recurring customer feedback themes and prioritised improvements that can be tracked during the next service review.',
          decisions: ['Prioritise the top recurring feedback themes for follow-up.'],
          actions: ['Group feedback by theme.', 'Bring proposed service improvements to the next meeting.'],
        },
      ]
    : [
        {
          title: 'Investor update call',
          focus: 'Business update',
          summary:
            'The team aligned on the key business updates to share, reviewed the current risks, and agreed to circulate supporting figures before the next investor discussion.',
          decisions: ['Use one approved set of figures across the investor materials.'],
          actions: ['Validate the latest reporting figures.', 'Share the revised update with meeting participants.'],
        },
        {
          title: 'Quarterly planning workshop',
          focus: 'Strategic planning',
          summary:
            'Participants reviewed proposed quarterly initiatives, discussed team capacity, and identified dependencies that should be resolved before commitments are finalised.',
          decisions: ['Sequence initiatives according to confirmed team capacity.'],
          actions: ['Map dependencies between proposed initiatives.', 'Return with a capacity-aligned draft plan.'],
        },
        {
          title: 'Operations improvement review',
          focus: 'Operational follow-up',
          summary:
            'The group examined process bottlenecks, prioritised the areas with the clearest operational impact, and agreed to review progress using a consistent set of measures.',
          decisions: ['Track the selected improvement measures consistently.'],
          actions: ['Document baseline measures.', 'Assign owners for the priority process improvements.'],
        },
        {
          title: 'Project stakeholder briefing',
          focus: 'Project alignment',
          summary:
            'Stakeholders reviewed current project progress, clarified outstanding questions, and agreed on a concise update cadence for upcoming milestones.',
          decisions: ['Use a single shared milestone update for stakeholders.'],
          actions: ['Confirm milestone owners and dates.', 'Share the next status update before the following checkpoint.'],
        },
      ]
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
                : `Quick-start mode • launch instant ${label} or schedule with reminders.`}
            </div>
          </div>
        </div>
        <div className="row">
          <Button className="btn-instant" onClick={() => onStart(platform)} primary type="button">
            <Icon name="video-instant" size={16} /> Start instant meeting
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
              <p className="meeting-summary-description">Review saved minutes or browse examples of clear meeting summaries.</p>
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
              <p>The example cards below are for guidance only and are not meeting records.</p>
            </div>
            {editableMeeting && (
              <Button onClick={() => onOpen(editableMeeting)}>
                <Icon name="edit" size={14} /> Add a summary
              </Button>
            )}
          </div>
        )}
        <div className="meeting-summary-examples-heading">
          <div>
            <h3>Example summaries</h3>
            <p>Illustrative content · not saved meeting data</p>
          </div>
          <span>{exampleSummaries.length} examples</span>
        </div>
        <div aria-label="Illustrative meeting summary examples" className="meeting-summary-list">
          {exampleSummaries.map((example) => (
            <article className="meeting-summary-item meeting-summary-example" key={example.title}>
              <div className="meeting-summary-item-heading">
                <span className="meeting-summary-item-title">{example.title}</span>
                <span className="meeting-summary-example-badge">Example</span>
              </div>
              <span className="meeting-summary-example-focus">
                <Icon name="folder" size={13} /> {example.focus}
              </span>
              <p className="meeting-summary-text">{example.summary}</p>
              <div className="meeting-summary-example-details">
                <div>
                  <b>
                    <Icon name="decision" size={13} /> Decisions
                  </b>
                  <ul>
                    {example.decisions.map((decision) => (
                      <li key={decision}>{decision}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <b>
                    <Icon name="check-square" size={13} /> Action items
                  </b>
                  <ul>
                    {example.actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
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

