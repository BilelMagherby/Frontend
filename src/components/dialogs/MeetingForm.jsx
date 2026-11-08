import { useState } from 'react'
import { Icon } from '../ui/Icon.jsx'
import { Button } from '../ui/Button.jsx'
import { Field } from '../ui/Field.jsx'

export function MeetingForm({ projects = [], people = [], platform, onSave, onClose }) {
  const isGoogle = platform === 'google'
  const initialStart = new Date(Date.now() + 30 * 60_000)
  initialStart.setMinutes(initialStart.getMinutes() < 30 ? 30 : 0, 0, 0)
  if (initialStart.getMinutes() === 0) initialStart.setHours(initialStart.getHours() + 1)
  const [form, setForm] = useState({
    platform,
    title: '',
    project: 'nathilco',
    start: new Date(initialStart.getTime() - initialStart.getTimezoneOffset() * 60_000).toISOString().slice(0, 16),
    duration: 30,
    reminder: 30,
    attendees: [],
    agenda: '',
    instant: false,
  })
  const [attendee, setAttendee] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const addAttendee = () => {
    const email = attendee.trim()
    if (!email || form.attendees.includes(email)) return
    update('attendees', [...form.attendees, email])
    setAttendee('')
  }
  return (
    <div className="react-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form
        className="mdl meeting-form-modal"
        onSubmit={async (event) => {
          event.preventDefault()
          if (busy) return
          setBusy(true)
          setError('')
          try {
            await onSave({ ...form, start: form.instant ? Date.now() : new Date(form.start).getTime() })
          } catch (cause) {
            setError(cause.message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge">
              <Icon name={isGoogle ? 'google-meet' : 'zoom'} size={24} />
            </span>
            <div>
              <h2>
                {form.instant ? 'Start instant' : 'Schedule'} {isGoogle ? 'Google Meet' : 'Zoom'}
              </h2>
              <div className="mu">Set up meeting details, duration, and invitations</div>
            </div>
          </div>
          <button aria-label="Close" className="btn-icon-close" onClick={onClose} type="button">
            <Icon name="close" size={18} />
          </button>
        </div>
        <Field
          label={
            <span>
              <Icon name="video" size={13} /> Meeting title
            </span>
          }
        >
          <input
            autoFocus
            onChange={(event) => update('title', event.target.value)}
            placeholder="e.g. Weekly Operations Sync"
            required
            value={form.title}
          />
        </Field>
        <div className="f2">
          <Field
            label={
              <span>
                <Icon name="folder" size={13} /> Project
              </span>
            }
          >
            <select onChange={(event) => update('project', event.target.value)} value={form.project}>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={
              <span>
                <Icon name="calendar" size={13} /> Start time
              </span>
            }
          >
            <input disabled={form.instant} onChange={(event) => update('start', event.target.value)} type="datetime-local" value={form.start} />
          </Field>
          <Field
            label={
              <span>
                <Icon name="clock" size={13} /> Duration (minutes)
              </span>
            }
          >
            <input min="5" max="600" onChange={(event) => update('duration', +event.target.value)} type="number" value={form.duration} />
          </Field>
          <Field
            label={
              <span>
                <Icon name="bell" size={13} /> Reminder (minutes before)
              </span>
            }
          >
            <input min="0" max="10080" onChange={(event) => update('reminder', +event.target.value)} type="number" value={form.reminder} />
          </Field>
        </div>
        <Field
          label={
            <span>
              <Icon name="file-text" size={13} /> Agenda / Objective
            </span>
          }
        >
          <textarea onChange={(event) => update('agenda', event.target.value)} placeholder="Key topics and goals..." rows="3" value={form.agenda} />
        </Field>
        <Field
          label={
            <span>
              <Icon name="user-plus" size={13} /> Add attendee email
            </span>
          }
        >
          <div className="row input-with-button">
            <input
              onChange={(event) => setAttendee(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addAttendee()
                }
              }}
              placeholder="colleague@example.com"
              type="email"
              value={attendee}
            />
            <Button disabled={!attendee.trim() || form.attendees.includes(attendee.trim())} onClick={addAttendee} type="button">
              <Icon name="plus" size={14} /> Add
            </Button>
          </div>
        </Field>
        <div className="row sp attendees-pills">
          {form.attendees.map((email) => (
            <span className="pill pill-attendee" key={email}>
              <Icon name="user" size={12} /> {email}
              <button
                aria-label={`Remove ${email}`}
                className="inline-remove"
                onClick={() => update('attendees', form.attendees.filter((item) => item !== email))}
                type="button"
              >
                <Icon name="close" size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="row sp">
          <label className="chk">
            <input checked={form.instant} onChange={(event) => update('instant', event.target.checked)} type="checkbox" />
            <Icon name="video-instant" size={14} /> Start instantly right now
          </label>
        </div>
        {error && (
          <p className="error">
            <Icon name="alert-circle" size={14} /> {error}
          </p>
        )}
        <div className="row sp modal-footer-actions">
          <Button disabled={busy} onClick={onClose} type="button">
            Cancel
          </Button>
          <Button disabled={busy} primary type="submit">
            {busy ? (
              'Saving…'
            ) : form.instant ? (
              <>
                <Icon name="video-instant" size={15} /> Start meeting
              </>
            ) : (
              <>
                <Icon name="calendar-plus" size={15} /> Schedule meeting
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

