import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon.jsx'
import { Button } from '../ui/Button.jsx'
import { Field } from '../ui/Field.jsx'
import { fmtDay, projectName } from '../../utils/helpers.js'

export function MeetingDetail({ meeting, members = [], projects = [], busy, onClose, onSave, onSummarize, onCreateTask }) {
  const [draft, setDraft] = useState({ ...meeting, decisions: meeting?.decisions || [], actions: meeting?.actions || [] })
  useEffect(() => {
    if (meeting) {
      setDraft({ ...meeting, decisions: meeting.decisions || [], actions: meeting.actions || [] })
    }
  }, [meeting])
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const isGoogle = draft.platform === 'google'

  return (
    <div className="react-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="mdl meeting-detail-modal">
        <header className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge">
              <Icon name={isGoogle ? 'google-meet' : 'zoom'} size={24} />
            </span>
            <div>
              <h2>{draft.title}</h2>
              <span className="mu">
                <Icon name="calendar" size={13} /> {fmtDay(draft.start)} • <Icon name="clock" size={13} />{' '}
                {new Date(draft.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} ({draft.duration} min) •{' '}
                <Icon name="folder" size={13} /> {projectName(projects, draft.project)}
              </span>
            </div>
          </div>
          <button aria-label="Close" className="btn-icon-close" onClick={onClose} type="button">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="meeting-links-row">
          {draft.joinUrl && (
            <a className="btn p btn-join" href={draft.joinUrl} rel="noreferrer" target="_blank">
              <Icon name={isGoogle ? 'google-meet' : 'zoom'} size={16} /> Join {isGoogle ? 'Google Meet' : 'Zoom'}{' '}
              <Icon name="external-link" size={14} />
            </a>
          )}
          {draft.calendarUrl && (
            <a className="btn g btn-cal-event" href={draft.calendarUrl} rel="noreferrer" target="_blank">
              <Icon name="calendar" size={15} /> Calendar event <Icon name="external-link" size={14} />
            </a>
          )}
        </div>

        <div className="modal-section">
          <Field
            label={
              <span>
                <Icon name="file-text" size={14} /> Meeting notes / transcript
              </span>
            }
          >
            <textarea
              className="notes-textarea"
              onChange={(event) => update('notes', event.target.value)}
              placeholder="Paste discussion notes, agenda points, or call transcript here..."
              rows="5"
              value={draft.notes || ''}
            />
          </Field>
          <div className="row sp ai-action-row">
            <Button
              className="btn-summarize"
              disabled={busy || !draft.notes?.trim() || draft.demo}
              onClick={() => onSummarize(draft)}
              primary
              type="button"
            >
              <Icon name="sparkles" size={16} /> {busy ? 'Generating minutes with AI…' : 'Generate summary, decisions & actions'}
            </Button>
            {draft.demo && <span className="mu badge-demo">Sample meeting is read-only</span>}
          </div>
        </div>

        <div className="modal-section">
          <Field
            label={
              <span>
                <Icon name="file-text" size={14} /> Executive Summary
              </span>
            }
          >
            <textarea
              onChange={(event) => update('summary', event.target.value)}
              placeholder="Summary of key discussion topics and outcomes..."
              rows="3"
              value={draft.summary || ''}
            />
          </Field>
        </div>

        <div className="modal-section">
          <div className="section-head-row">
            <h3>
              <Icon name="decision" size={16} /> Decisions ({draft.decisions.length})
            </h3>
            <Button
              disabled={draft.demo}
              onClick={() => update('decisions', [...draft.decisions, { text: '', owner: '' }])}
              type="button"
            >
              <Icon name="plus" size={14} /> Add decision
            </Button>
          </div>
          <div className="items-list">
            {draft.decisions.map((decision, index) => (
              <div className="decision-item-row" key={index}>
                <input
                  className="decision-text-input"
                  onChange={(event) =>
                    update(
                      'decisions',
                      draft.decisions.map((item, row) => (row === index ? { ...item, text: event.target.value } : item))
                    )
                  }
                  placeholder="Decision reached..."
                  value={decision.text}
                />
                <input
                  className="decision-owner-input"
                  list="meeting-members"
                  onChange={(event) =>
                    update(
                      'decisions',
                      draft.decisions.map((item, row) => (row === index ? { ...item, owner: event.target.value } : item))
                    )
                  }
                  placeholder="Owner"
                  value={decision.owner || ''}
                />
                <button
                  aria-label="Remove decision"
                  className="btn-icon-danger"
                  disabled={draft.demo}
                  onClick={() => update('decisions', draft.decisions.filter((_, row) => row !== index))}
                  type="button"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
            {!draft.decisions.length && (
              <p className="mu empty-hint">No decisions recorded yet. Click "Add decision" or use AI generation.</p>
            )}
          </div>
        </div>

        <div className="modal-section">
          <div className="section-head-row">
            <h3>
              <Icon name="check-square" size={16} /> Action Items ({draft.actions.length})
            </h3>
            <Button
              disabled={draft.demo}
              onClick={() => update('actions', [...draft.actions, { text: '', owner: '', due: '' }])}
              type="button"
            >
              <Icon name="plus" size={14} /> Add action
            </Button>
          </div>
          <div className="items-list">
            {draft.actions.map((action, index) => (
              <div className="action-item-row" key={index}>
                <input
                  className="action-text-input"
                  onChange={(event) =>
                    update(
                      'actions',
                      draft.actions.map((item, row) => (row === index ? { ...item, text: event.target.value } : item))
                    )
                  }
                  placeholder="Action item..."
                  value={action.text}
                />
                <input
                  className="action-owner-input"
                  list="meeting-members"
                  onChange={(event) =>
                    update(
                      'actions',
                      draft.actions.map((item, row) => (row === index ? { ...item, owner: event.target.value } : item))
                    )
                  }
                  placeholder="Owner"
                  value={action.owner || ''}
                />
                <input
                  className="action-date-input"
                  onChange={(event) =>
                    update(
                      'actions',
                      draft.actions.map((item, row) => (row === index ? { ...item, due: event.target.value } : item))
                    )
                  }
                  type="date"
                  value={action.due || ''}
                />
                <Button
                  className="btn-create-task"
                  disabled={draft.demo || !action.text?.trim()}
                  onClick={() => onCreateTask(action)}
                  type="button"
                >
                  <Icon name="plus" size={13} /> Create task
                </Button>
                <button
                  aria-label="Remove action"
                  className="btn-icon-danger"
                  disabled={draft.demo}
                  onClick={() => update('actions', draft.actions.filter((_, row) => row !== index))}
                  type="button"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
            {!draft.actions.length && <p className="mu empty-hint">No action items yet.</p>}
          </div>
        </div>

        <datalist id="meeting-members">
          {members.map((member) => (
            <option key={member.name}>{member.name}</option>
          ))}
        </datalist>

        <footer className="modal-actions-footer">
          <Button
            className={draft.status === 'completed' ? 'btn-reopen' : 'btn-achieve'}
            disabled={draft.demo}
            onClick={() => onSave(draft, { status: draft.status === 'completed' ? 'scheduled' : 'completed' })}
            primary={draft.status !== 'completed'}
            type="button"
          >
            <Icon name={draft.status === 'completed' ? 'refresh' : 'check-circle'} size={16} />
            {draft.status === 'completed' ? 'Reopen meeting' : 'Save & mark achieved'}
          </Button>
          <Button
            className="btn-cancel"
            disabled={draft.demo}
            onClick={() => onSave(draft, { status: 'cancelled' })}
            type="button"
          >
            <Icon name="x-circle" size={16} /> Cancel meeting
          </Button>
          <Button className="btn-save" disabled={draft.demo} onClick={() => onSave(draft)} type="button">
            Save minutes
          </Button>
          <Button onClick={onClose} type="button">
            Close
          </Button>
        </footer>
      </div>
    </div>
  )
}

