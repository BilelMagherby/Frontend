import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { request } from '../../services/api.js'

export function EmailClientPage({ contacts = [], onSaveContacts, onToast }) {
  const [activeTab, setActiveTab] = useState('compose')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [footer, setFooter] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [mailStatus, setMailStatus] = useState({ connected: false, email: '' })
  const [senders, setSenders] = useState({ senders: [], defaultEmail: '' })
  const [mailError, setMailError] = useState('')
  const [sending, setSending] = useState(false)
  const [sentMessages, setSentMessages] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const sender = senders.defaultEmail

  const parseAddresses = (value) =>
    value
      .split(/[;,\n]+/)
      .map((part) => {
        const bracketed = part.match(/<([^<>]+)>/)
        return (bracketed ? bracketed[1] : part).trim()
      })
      .filter(Boolean)

  const recipientCount = new Set(
    [...parseAddresses(to), ...parseAddresses(cc), ...parseAddresses(bcc)].map((email) => email.toLowerCase())
  ).size

  useEffect(() => {
    let active = true
    const loadMailAccount = async () => {
      let status
      try {
        status = await request('/api/mails/status')
      } catch (error) {
        if (active) setMailError(error.message)
        return
      }
      if (!active) return
      setMailStatus(status)
      if (!status.connected) {
        setSenders({ senders: [], defaultEmail: '' })
        return
      }
      try {
        const sendAs = await request('/api/mails/senders')
        if (active) setSenders(sendAs)
      } catch (error) {
        if (active) setMailError(error.message)
      }
    }
    loadMailAccount()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'history' || !mailStatus.connected) return undefined
    let active = true
    setHistoryLoading(true)
    request('/api/mails/messages?label=SENT&maxResults=20')
      .then(({ messages: sent }) => {
        if (active) setSentMessages(sent)
      })
      .catch((error) => {
        if (active) setMailError(error.message)
      })
      .finally(() => {
        if (active) setHistoryLoading(false)
      })
    return () => {
      active = false
    }
  }, [activeTab, mailStatus.connected])

  const connectGmail = async () => {
    setMailError('')
    try {
      const { url } = await request('/api/mails/auth/google')
      window.location.assign(url)
    } catch (error) {
      setMailError(error.message)
    }
  }

  const sendMessage = async (test = false) => {
    const recipients = test ? [mailStatus.email] : parseAddresses(to)
    if (!recipients.filter(Boolean).length) {
      setMailError(test ? 'Connect a Gmail account before sending a test.' : 'Add at least one To address before sending.')
      return
    }
    setMailError('')
    setSending(true)
    try {
      await request('/api/mails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: sender,
          to: recipients,
          cc: test ? [] : parseAddresses(cc),
          bcc: test ? [] : parseAddresses(bcc),
          subject: `${test ? '[Test] ' : ''}${subject}`,
          body: [message, footer && `\n\n${footer}`].filter(Boolean).join(''),
        }),
      })
      if (!test) {
        setTo('')
        setCc('')
        setBcc('')
        setSubject('')
        setMessage('')
        setFooter('')
      }
      setReviewOpen(false)
      setActiveTab('history')
      onToast('Message sent through Gmail.')
    } catch (error) {
      setMailError(error.message)
    } finally {
      setSending(false)
    }
  }

  const addContact = async (event) => {
    event.preventDefault()
    const email = contactEmail.trim()
    if (!contactName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      onToast('Enter a contact name and a valid email address.')
      return
    }
    if (contacts.some((contact) => contact.email.toLowerCase() === email.toLowerCase())) {
      onToast('That contact is already saved.')
      return
    }
    try {
      await onSaveContacts([...contacts, { name: contactName.trim(), email }])
      setContactName('')
      setContactEmail('')
      onToast('Contact saved.')
    } catch (error) {
      onToast(`Could not save contact: ${error.message}`)
    }
  }

  const addContactToRecipients = (contact) => {
    setTo((current) =>
      current.trim() ? `${current.trim()}, ${contact.name} <${contact.email}>` : `${contact.name} <${contact.email}>`
    )
    setActiveTab('compose')
  }

  return (
    <section aria-labelledby="gulf-email-title" className="gulf-email-page">
      <header className="gulf-page-heading">
        <div>
          <span className="gulf-eyebrow">
            <Icon name="mail" size={14} /> NATHEEL GULF
          </span>
          <h1 id="gulf-email-title">Email Client</h1>
          <p>
            Compose messages with your connected Gmail account. Sent messages and history come directly from Gmail.
          </p>
        </div>
      </header>
      <div className="gulf-email-shell">
        <div className="gulf-email-sidebar" role="complementary">
          <div className="gulf-email-sender">
            <span>
              <Icon name="user" size={16} />
            </span>
            <div>
              <small>Sending from</small>
              <b>{mailStatus.connected ? sender || mailStatus.email : 'Gmail not connected'}</b>
            </div>
          </div>
          <nav aria-label="Email client sections" className="gulf-email-tabs">
            <button
              aria-current={activeTab === 'compose' ? 'page' : undefined}
              className={activeTab === 'compose' ? 'active' : ''}
              onClick={() => setActiveTab('compose')}
              type="button"
            >
              <Icon name="edit" size={16} /> Compose
            </button>
            <button
              aria-current={activeTab === 'contacts' ? 'page' : undefined}
              className={activeTab === 'contacts' ? 'active' : ''}
              onClick={() => setActiveTab('contacts')}
              type="button"
            >
              <Icon name="users" size={16} /> Contacts ({contacts.length})
            </button>
            <button
              aria-current={activeTab === 'history' ? 'page' : undefined}
              className={activeTab === 'history' ? 'active' : ''}
              onClick={() => setActiveTab('history')}
              type="button"
            >
              <Icon name="clock" size={16} /> History
            </button>
          </nav>
        </div>
        <div className="gulf-email-content">
          {activeTab === 'compose' && (
            <div className="gulf-email-compose">
              {mailError && <p className="gulf-email-preview-note" role="alert">{mailError}</p>}
              {!mailStatus.connected && (
                <div className="gulf-email-preview-note">
                  <Icon name="info" size={14} /> Connect Gmail to send messages. This account needs Mails permission.
                  <Button onClick={connectGmail}>Connect Gmail</Button>
                </div>
              )}
              <div className="gulf-email-compose-heading">
                <div>
                  <h2>New message</h2>
                  <p>Messages are sent through Gmail and visible in Sent mail.</p>
                </div>
                <span className="gulf-email-badge">
                  <Icon name="mail" size={14} /> Gmail
                </span>
              </div>
              <label className="gulf-email-field">
                <span>To</span>
                <textarea onChange={(event) => setTo(event.target.value)} placeholder="type or paste addresses" rows={2} value={to} />
                <small>Separate addresses with commas, semicolons or new lines. You can also write Name &lt;email&gt;.</small>
              </label>
              <div className="gulf-email-recipient-row">
                <label className="gulf-email-field">
                  <span>
                    Cc <small>(optional)</small>
                  </span>
                  <textarea onChange={(event) => setCc(event.target.value)} placeholder="Add carbon copy recipients" rows={2} value={cc} />
                </label>
                <label className="gulf-email-field">
                  <span>
                    Bcc <small>(optional, hidden from everyone)</small>
                  </span>
                  <textarea onChange={(event) => setBcc(event.target.value)} placeholder="Add blind carbon copy recipients" rows={2} value={bcc} />
                </label>
              </div>
              <div aria-live="polite" className="gulf-email-recipient-count">
                <b>{recipientCount}</b> {recipientCount === 1 ? 'recipient' : 'recipients'}
              </div>
              <label className="gulf-email-field">
                <span>Subject</span>
                <input onChange={(event) => setSubject(event.target.value)} placeholder="Add a subject" value={subject} />
              </label>
              <label className="gulf-email-field">
                <span>Message</span>
                <textarea
                  className="gulf-email-message"
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write your message here."
                  rows={8}
                  value={message}
                />
              </label>
              <label className="gulf-email-field">
                <span>
                  Footer <small>(optional, added under the message)</small>
                </span>
                <textarea onChange={(event) => setFooter(event.target.value)} placeholder="Your signature or footer" rows={2} value={footer} />
              </label>
              <div className="gulf-email-send-actions">
                <Button disabled={!mailStatus.connected || !sender || !message.trim() || sending} onClick={() => sendMessage(true)}>
                  <Icon name="send" size={15} /> Send a test
                </Button>
                <Button className="p" disabled={!mailStatus.connected || !sender || !parseAddresses(to).length || !message.trim() || sending} onClick={() => setReviewOpen(true)}>
                  Review and send <Icon name="arrow-right" size={15} />
                </Button>
              </div>
              <p className="gulf-email-preview-note">
                <Icon name="info" size={14} /> Attachments aren’t supported in this compose view. Use the Mails page to access your connected mailbox.
              </p>
            </div>
          )}
          {activeTab === 'contacts' && (
            <div className="gulf-email-compose">
              <div className="gulf-email-compose-heading">
                <div>
                  <h2>Contacts</h2>
                  <p>Save recipients for quick access when composing a message.</p>
                </div>
                <span className="gulf-email-badge">{contacts.length} saved</span>
              </div>
              <form className="gulf-email-contact-form" onSubmit={addContact}>
                <label className="gulf-email-field">
                  <span>Name</span>
                  <input onChange={(event) => setContactName(event.target.value)} placeholder="Contact name" value={contactName} />
                </label>
                <label className="gulf-email-field">
                  <span>Email</span>
                  <input
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="name@example.com"
                    type="email"
                    value={contactEmail}
                  />
                </label>
                <Button className="p" type="submit">
                  <Icon name="user-plus" size={15} /> Add contact
                </Button>
              </form>
              {contacts.length ? (
                <ul className="gulf-email-contact-list">
                  {contacts.map((contact) => (
                    <li key={contact.email}>
                      <span>
                        <b>{contact.name}</b>
                        <small>{contact.email}</small>
                      </span>
                      <Button onClick={() => addContactToRecipients(contact)}>Add to To</Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="gulf-email-empty">
                  <Icon name="users" size={24} />
                  <b>No saved contacts yet.</b>
                  <span>Add them on the Contacts tab.</span>
                </div>
              )}
            </div>
          )}
          {activeTab === 'history' && (
            <div className="gulf-email-compose gulf-email-history">
              <div className="gulf-email-compose-heading">
                <div>
                  <h2>Sent mail history</h2>
                  <p>Recent sent messages loaded from the connected Gmail account.</p>
                </div>
              </div>
              {!mailStatus.connected ? (
                <div className="gulf-email-empty"><Icon name="mail" size={24} /><b>Connect Gmail to view sent messages.</b></div>
              ) : historyLoading ? (
                <div className="gulf-email-empty">Loading sent messages…</div>
              ) : sentMessages.length ? (
                <ul className="gulf-email-contact-list">
                  {sentMessages.map((sentMessage) => (
                    <li key={sentMessage.id}>
                      <span>
                        <b>{sentMessage.subject || '(no subject)'}</b>
                        <small>{sentMessage.to || sentMessage.from || 'Sent message'}</small>
                      </span>
                      <small>{sentMessage.date ? new Date(sentMessage.date).toLocaleString() : ''}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="gulf-email-empty"><Icon name="clock" size={24} /><b>No sent messages were found.</b></div>
              )}
            </div>
          )}
        </div>
      </div>
      {reviewOpen && (
        <div
          className="react-modal-backdrop"
          onMouseDown={(event) => event.target === event.currentTarget && setReviewOpen(false)}
        >
          <section aria-labelledby="gulf-email-review-title" aria-modal="true" className="mdl gulf-email-review" role="dialog">
            <header>
              <div>
                <span className="gulf-eyebrow">MESSAGE REVIEW</span>
                <h2 id="gulf-email-review-title">Review and send</h2>
              </div>
              <button aria-label="Close review" className="btn-icon-close" onClick={() => setReviewOpen(false)} type="button">
                <Icon name="close" size={17} />
              </button>
            </header>
            <dl>
              <dt>From</dt>
              <dd>{sender}</dd>
              <dt>To</dt>
              <dd>{to || '—'}</dd>
              {cc && (
                <>
                  <dt>Cc</dt>
                  <dd>{cc}</dd>
                </>
              )}
              {bcc && (
                <>
                  <dt>Bcc</dt>
                  <dd>{bcc}</dd>
                </>
              )}
              <dt>Subject</dt>
              <dd>{subject || '(no subject)'}</dd>
              <dt>Recipients</dt>
              <dd>{recipientCount}</dd>
            </dl>
            <div className="gulf-email-review-message">
              {message || 'No message content.'}
              {footer && <p>{footer}</p>}
            </div>
            <footer>
              <Button onClick={() => setReviewOpen(false)}>Back to compose</Button>
              <Button
                className="p"
                disabled={sending}
                onClick={() => sendMessage()}
              >
                <Icon name="send" size={15} /> {sending ? 'Sending…' : 'Send email'}
              </Button>
            </footer>
          </section>
        </div>
      )}
    </section>
  )
}
