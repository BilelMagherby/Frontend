import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { today, isLate } from '../../utils/helpers.js'

export function CalendarPage({ date, setDate, meetings = [], tasks = [], onOpen, onSchedule }) {
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const year = date.getFullYear()
  const month = date.getMonth()
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  const days = Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
  const iso = (day) => day.toLocaleDateString('en-CA')
  const selectDay = (day) => {
    setSelectedDay(day)
    if (day.getFullYear() !== year || day.getMonth() !== month) setDate(new Date(day.getFullYear(), day.getMonth(), 1))
  }
  useEffect(() => {
    if (selectedDay.getFullYear() !== year || selectedDay.getMonth() !== month) setSelectedDay(new Date(year, month, 1))
  }, [year, month, selectedDay])
  const selectedKey = iso(selectedDay)
  const selectedMeetings = meetings.filter((meeting) => iso(new Date(meeting.start)) === selectedKey)
  const selectedTasks = tasks.filter((task) => task.due === selectedKey)

  return (
    <>
      <header className="top calendar-top">
        <div>
          <h1>Calendar</h1>
          <div className="mu">Meetings and task due dates</div>
        </div>
        <Button className="calendar-schedule" onClick={onSchedule} primary>
          + Schedule meeting
        </Button>
      </header>
      <section className="calendar-shell">
        <div className="calendar-toolbar">
          <div className="calendar-month">
            <button
              aria-label="Previous month"
              className="calendar-arrow"
              onClick={() => setDate(new Date(year, month - 1, 1))}
              type="button"
            >
              <Icon name="chevron-left" size={18} />
            </button>
            <h2>{date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
            <button
              aria-label="Next month"
              className="calendar-arrow"
              onClick={() => setDate(new Date(year, month + 1, 1))}
              type="button"
            >
              <Icon name="chevron-right" size={18} />
            </button>
          </div>
          <Button
            onClick={() => {
              const current = new Date()
              setDate(current)
              setSelectedDay(current)
            }}
          >
            Today
          </Button>
        </div>
        <div className="calg">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div className="h" key={day}>
              {day}
            </div>
          ))}
          {days.map((day) => {
            const dateKey = iso(day)
            const dayTasks = tasks.filter((task) => task.due === dateKey)
            const dayMeetings = meetings.filter((meeting) => iso(new Date(meeting.start)) === dateKey)
            const selected = dateKey === selectedKey
            return (
              <div
                aria-label={`${dateKey}${dayMeetings.length + dayTasks.length ? `, ${dayMeetings.length + dayTasks.length} events` : ''}`}
                className={`cd${day.getMonth() === month ? '' : ' o'}${dateKey === today() ? ' td' : ''}${selected ? ' sel' : ''}`}
                key={dateKey}
              >
                <button aria-label={`Select ${dateKey}`} aria-pressed={selected} className="n" onClick={() => selectDay(day)}>
                  {day.getDate()}
                </button>
                {dayMeetings.slice(0, 2).map((meeting) => (
                  <button className="ch calendar-chip" key={meeting.id} onClick={() => onOpen({ kind: 'meeting', item: meeting })}>
                    {meeting.title}
                  </button>
                ))}
                {dayTasks.slice(0, 2).map((task) => (
                  <button
                    className={`ch tk${isLate(task) ? ' l' : ''} calendar-chip`}
                    key={task.id}
                    onClick={() => onOpen({ kind: 'task', item: task })}
                  >
                    {task.title}
                  </button>
                ))}
                {dayMeetings.length + dayTasks.length > 4 && (
                  <button className="calendar-more" onClick={() => selectDay(day)}>
                    +{dayMeetings.length + dayTasks.length - 4} more
                  </button>
                )}
                <span aria-hidden="true" className="cal-dots">
                  {[...dayMeetings.map(() => 'meeting'), ...dayTasks.map((task) => (isLate(task) ? 'late' : 'task'))]
                    .slice(0, 4)
                    .map((kind, index) => (
                      <i className={kind} key={index} />
                    ))}
                </span>
              </div>
            )
          })}
        </div>
        <section aria-live="polite" className="calendar-agenda">
          <div className="calendar-agenda-head">
            <div>
              <span className="eyebrow">YOUR SCHEDULE</span>
              <h2>
                {selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </h2>
            </div>
            <span className="pill">{selectedMeetings.length + selectedTasks.length} events</span>
          </div>
          {[
            ...selectedMeetings.map((item) => ({ kind: 'meeting', item, time: item.start })),
            ...selectedTasks.map((item) => ({ kind: 'task', item, time: 0 })),
          ]
            .sort((a, b) => a.time - b.time)
            .map(({ kind, item }) => {
              const isMeeting = kind === 'meeting'
              return (
                <button className="calendar-agenda-event" key={`${kind}-${item.id}`} onClick={() => onOpen({ kind, item })}>
                  <span className={`agenda-icon${isMeeting ? ' meeting' : ' task'}`}>
                    <Icon
                      name={isMeeting ? (item.platform === 'google' ? 'google-meet' : 'zoom') : 'check-square'}
                      size={18}
                    />
                  </span>
                  <span className="agenda-copy">
                    <b>{item.title}</b>
                    <span>
                      {isMeeting
                        ? `${new Date(item.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · ${item.platform === 'google' ? 'Google Meet' : 'Zoom'}`
                        : `${item.status || 'To Do'} · ${item.assignee || item.assignees?.join(', ') || 'Unassigned'}`}
                    </span>
                  </span>
                  <span className="agenda-chevron">
                    <Icon name="chevron-right" size={16} />
                  </span>
                </button>
              )
            })}
          {!selectedMeetings.length && !selectedTasks.length && (
            <div className="calendar-empty">
              <Icon name="calendar" size={32} />
              <b>Nothing planned for this day</b>
              <span>Pick another day or schedule a meeting.</span>
            </div>
          )}
        </section>
      </section>
    </>
  )
}

