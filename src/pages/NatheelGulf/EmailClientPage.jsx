import { useRef, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'

export function EmailClientPage({ assets = [], nodes = [], config = {}, onToast }) {
  const [activeTab, setActiveTab] = useState('compose')
  const [contacts, setContacts] = useState([])
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [footer, setFooter] = useState('')
  const [oneEmail, setOneEmail] = useState(true)
  const [selectedDataBank, setSelectedDataBank] = useState([])
  const [deviceFiles, setDeviceFiles] = useState([])
  const [showDataBank, setShowDataBank] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const deviceInput = useRef(null)
  const sender = config.emails?.['Asma Ghidhaoui'] || 'asma.g@natheelco.com'

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

  const dataBankSize = selectedDataBank.reduce((total, assetId) => {
    const asset = assets.find((item) => item.id === assetId)
    if (!asset) return total
    const match = asset.size.match(/^([\d.]+)\s*(KB|MB)$/i)
    if (!match) return total
    return total + Number(match[1]) * (match[2].toUpperCase() === 'MB' ? 1 : 1 / 1024)
  }, 0)

  const deviceSize = deviceFiles.reduce((total, file) => total + file.size / (1024 * 1024), 0)
  const totalAttachmentSize = dataBankSize + deviceSize
  const formatAttachmentSize = (size) => (size < 1 ? `${(size * 1024).toFixed(1)} KB` : `${size.toFixed(1)} MB`)

  const updateDeviceFiles = (fileList) => {
    const nextFiles = [...deviceFiles, ...fileList]
    const nextSize = nextFiles.reduce((total, file) => total + file.size / (1024 * 1024), dataBankSize)
    if (nextSize > 18) {
      onToast('Attachments must be 18 MB or less in total.')
      return
    }
    setDeviceFiles(nextFiles)
  }

  const openDraft = (test = false) => {
    const recipients = test ? sender : parseAddresses(to).join(',')
    if (!recipients) {
      onToast('Add at least one To address before continuing.')
      return
    }
    const body = [message, footer && `\n\n${footer}`].filter(Boolean).join('')
    const params = new URLSearchParams()
    if (cc.trim()) params.set('cc', cc)
    if (bcc.trim()) params.set('bcc', bcc)
    if (subject || test) params.set('subject', `${test ? '[Test] ' : ''}${subject}`)
    if (body) params.set('body', body)
    window.location.href = `mailto:${encodeURIComponent(recipients)}?${params.toString()}`
    onToast('Email draft opened in your mail app. Add the selected attachments there before sending.')
  }

  const addContact = (event) => {
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
    setContacts((current) => [...current, { name: contactName.trim(), email }])
    setContactName('')
    setContactEmail('')
    onToast('Contact saved for this session.')
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
            Write it like a Gmail message, with To, Cc, Bcc, a subject and any attachments. Send one email to everyone, or a separate copy to each person.
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
              <b>{sender}</b>
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
              <div className="gulf-email-compose-heading">
                <div>
                  <h2>New message</h2>
                  <p>Compose and review your email before sending.</p>
                </div>
                <span className="gulf-email-badge">
                  <Icon name="mail" size={14} /> Gmail-style compose
                </span>
              </div>
              <label className="gulf-email-field">
                <span>To</span>
                <textarea onChange={(event) => setTo(event.target.value)} placeholder="type or paste addresses" rows={2} value={to} />
                <small>Separate with commas, semicolons or new lines. You can also write Name &lt;email&gt;. One address or hundreds.</small>
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
              <label className="gulf-email-one-copy">
                <input checked={oneEmail} onChange={(event) => setOneEmail(event.target.checked)} type="checkbox" />
                <span>
                  <b>Send as one email to everyone in To</b> (they all see each other, like a normal Gmail message). Leave this off to send each person their own separate email.
                </span>
              </label>
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
                  placeholder={'Write your message here. Use {{name}} to insert each person’s name (or “there” if we have no name).'}
                  rows={8}
                  value={message}
                />
                <small>Write {'{{name}}'} to insert each person's name (or "there" if we have no name).</small>
              </label>
              <label className="gulf-email-field">
                <span>
                  Footer <small>(optional, added under the message)</small>
                </span>
                <textarea onChange={(event) => setFooter(event.target.value)} placeholder="Your signature or footer" rows={2} value={footer} />
              </label>
              <section className="gulf-email-attachments">
                <div className="gulf-email-attachments-heading">
                  <div>
                    <h3>
                      <Icon name="paperclip" size={16} /> Attachments
                    </h3>
                    <p>Any file type: PDF, video, images, Word, Excel, zip</p>
                  </div>
                  <b>
                    {formatAttachmentSize(totalAttachmentSize)} / 18.0 MB
                  </b>
                </div>
                <div className="gulf-email-attachment-actions">
                  <Button onClick={() => setShowDataBank((current) => !current)}>
                    <Icon name="folder" size={15} /> Add from the Data Bank
                  </Button>
                  <Button onClick={() => deviceInput.current?.click()}>
                    <Icon name="upload" size={15} /> Add from this device
                  </Button>
                  <input
                    aria-label="Add attachments from this device"
                    className="gulf-upload-input"
                    multiple
                    onChange={(event) => {
                      updateDeviceFiles(event.target.files || [])
                      event.target.value = ''
                    }}
                    ref={deviceInput}
                    type="file"
                  />
                </div>
                {showDataBank && (
                  <div className="gulf-email-databank">
                    <b>Select Data Bank files</b>
                    {assets.map((asset) => {
                      const project = nodes.find((node) => node.id === asset.node)?.name || 'Unfiled files'
                      return (
                        <label key={asset.id}>
                          <input
                            checked={selectedDataBank.includes(asset.id)}
                            onChange={(event) => {
                              const next = event.target.checked
                                ? [...selectedDataBank, asset.id]
                                : selectedDataBank.filter((id) => id !== asset.id)
                              const nextSize = next.reduce((sum, id) => {
                                const record = assets.find((item) => item.id === id)
                                const match = record?.size.match(/^([\d.]+)\s*(KB|MB)$/i)
                                return sum + (match ? Number(match[1]) * (match[2].toUpperCase() === 'MB' ? 1 : 1 / 1024) : 0)
                              }, deviceSize)
                              if (nextSize > 18) {
                                onToast('Attachments must be 18 MB or less in total.')
                                return
                              }
                              setSelectedDataBank(next)
                            }}
                            type="checkbox"
                          />
                          <span>
                            <b>{asset.name}</b>
                            <small>
                              {project} · {asset.size}
                            </small>
                          </span>
                        </label>
                      )
                    })}
                    {!assets.length && <p>No Data Bank files are available.</p>}
                  </div>
                )}
                {(selectedDataBank.length > 0 || deviceFiles.length > 0) && (
                  <ul className="gulf-email-attachment-list">
                    {selectedDataBank.map((id) => {
                      const asset = assets.find((item) => item.id === id)
                      return asset ? (
                        <li key={id}>
                          <Icon name="file-text" size={16} />
                          <span>{asset.name}</span>
                          <b>{asset.size}</b>
                          <button
                            aria-label={`Remove ${asset.name}`}
                            onClick={() => setSelectedDataBank((current) => current.filter((item) => item !== id))}
                            type="button"
                          >
                            <Icon name="close" size={14} />
                          </button>
                        </li>
                      ) : null
                    })}
                    {deviceFiles.map((file, index) => (
                      <li key={`${file.name}-${file.lastModified}-${index}`}>
                        <Icon name="file-text" size={16} />
                        <span>{file.name}</span>
                        <b>{formatAttachmentSize(file.size / (1024 * 1024))}</b>
                        <button
                          aria-label={`Remove ${file.name}`}
                          onClick={() => setDeviceFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                          type="button"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="gulf-email-limit">
                  Limit 18.0 MB in total (Gmail allows about 25 MB per email). For larger files such as long videos, share a Drive link in the message instead.
                </p>
              </section>
              <div className="gulf-email-send-actions">
                <Button disabled={!recipientCount} onClick={() => openDraft(true)}>
                  <Icon name="send" size={15} /> Send a test first <span>Send test</span>
                </Button>
                <Button className="p" disabled={!recipientCount} onClick={() => setReviewOpen(true)}>
                  Review and send <Icon name="arrow-right" size={15} />
                </Button>
              </div>
              <p className="gulf-email-preview-note">
                <Icon name="info" size={14} /> Email delivery is not connected in this preview. Review opens one draft in your default mail app; send separate copies and add selected attachments there manually.
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
            <div className="gulf-email-empty gulf-email-history">
              <Icon name="clock" size={25} />
              <h2>History</h2>
              <p>Email drafts opened from this preview are handled by your mail app and aren’t recorded here.</p>
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
              <dt>Attachments</dt>
              <dd>
                {selectedDataBank.length + deviceFiles.length} · {formatAttachmentSize(totalAttachmentSize)}
              </dd>
            </dl>
            <div className="gulf-email-review-message">
              {message || 'No message content.'}
              {footer && <p>{footer}</p>}
            </div>
            <footer>
              <Button onClick={() => setReviewOpen(false)}>Back to compose</Button>
              <Button
                className="p"
                onClick={() => {
                  setReviewOpen(false)
                  openDraft()
                }}
              >
                <Icon name="send" size={15} /> Open email draft
              </Button>
            </footer>
          </section>
        </div>
      )}
    </section>
  )
}

