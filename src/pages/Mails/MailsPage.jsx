import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { api, request } from '../../services/api.js'
import '../../mails.css'

const SYSTEM_FOLDERS = [
  ['INBOX', 'Inbox', 'inbox'],
  ['STARRED', 'Starred', 'star'],
  ['SENT', 'Sent', 'send'],
  ['DRAFT', 'Drafts', 'edit'],
  ['SPAM', 'Spam', 'alert-triangle'],
  ['TRASH', 'Trash', 'trash'],
]

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function senderName(from) {
  const match = String(from || '').match(/^"?([^"<]+)"?\s*<[^>]+>$/)
  return (match?.[1] || from || 'Unknown sender').trim()
}

function queryString(params) {
  return new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString()
}

export function MailsPage() {
  const [status, setStatus] = useState({ connected: false, email: '', lastSyncAt: '' })
  const [labels, setLabels] = useState([])
  const [activeLabel, setActiveLabel] = useState('INBOX')
  const [messages, setMessages] = useState([])
  const [selected, setSelected] = useState(null)
  const [thread, setThread] = useState([])
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [pageTokens, setPageTokens] = useState([''])
  const [pageIndex, setPageIndex] = useState(0)
  const [nextPageToken, setNextPageToken] = useState('')
  const [resultSize, setResultSize] = useState(0)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [draft, setDraft] = useState({ from: '', to: '', cc: '', bcc: '', subject: '', body: '' })
  const [senders, setSenders] = useState({ senders: [], defaultEmail: '', requestedEmail: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadStatus = useCallback(async () => {
    setError('')
    try {
      const currentStatus = await request('/api/mails/status')
      setStatus(currentStatus)
      if (currentStatus.connected) {
        const [currentSenders, currentLabels] = await Promise.all([
          request('/api/mails/senders'),
          request('/api/mails/labels'),
        ])
        setSenders(currentSenders)
        setLabels(currentLabels)
      } else {
        setSenders({ senders: [], defaultEmail: '', requestedEmail: '' })
        setLabels([])
      }
    } catch (cause) {
      setStatus({ connected: false, email: '', lastSyncAt: '' })
      setSenders({ senders: [], defaultEmail: '', requestedEmail: '' })
      setLabels([])
      setError(cause.message)
    }
    return
  }, [])

  const loadMessages = useCallback(async (token = '') => {
    setLoading(true)
    setError('')
    try {
      const params = queryString({ label: activeLabel, q: query, pageToken: token })
      const result = await request(`/api/mails/messages?${params}`)
      setMessages(result.messages)
      setNextPageToken(result.nextPageToken || '')
      setResultSize(result.resultSizeEstimate || 0)
    } catch (cause) {
      setError(cause.message)
    } finally {
      setLoading(false)
    }
  }, [activeLabel, query])

  useEffect(() => {
    const callbackResult = new URLSearchParams(window.location.search).get('gmail')
    if (callbackResult) {
      setNotice(callbackResult === 'connected' ? 'Gmail connected successfully.' : 'Gmail connection was not completed.')
      const url = new URL(window.location.href)
      url.searchParams.delete('gmail')
      window.history.replaceState({}, '', url)
    }
    loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (status.connected) loadMessages(pageTokens[pageIndex] || '')
  }, [status.connected, activeLabel, query, pageTokens, pageIndex, loadMessages])

  const sync = useCallback(async (showNotice = false) => {
    if (!status.connected) return
    setSyncing(true)
    try {
      const result = await request('/api/mails/sync', { method: 'POST' })
      setStatus((current) => ({ ...current, lastSyncAt: result.lastSyncAt }))
      await loadMessages(pageTokens[pageIndex] || '')
      if (showNotice) setNotice(result.changes ? `Gmail synchronized · ${result.changes} recent changes.` : 'Gmail is up to date.')
    } catch (cause) {
      setError(cause.message)
    } finally {
      setSyncing(false)
    }
  }, [loadMessages, pageTokens, pageIndex, status.connected])

  useEffect(() => {
    if (!status.connected) return undefined
    const timer = window.setInterval(() => sync(false), 60_000)
    return () => window.clearInterval(timer)
  }, [status.connected, sync])

  useEffect(() => {
    if (!selected?.threadId) return undefined
    let active = true
    setThread([])
    request(`/api/mails/threads/${encodeURIComponent(selected.threadId)}`)
      .then(({ messages: threadMessages }) => {
        if (active) setThread(threadMessages)
      })
      .catch((cause) => {
        if (active) setError(cause.message)
      })
    if (selected.unread) {
      request(`/api/mails/messages/${encodeURIComponent(selected.id)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read' }),
      }).then(() => {
        if (active) {
          setMessages((items) => items.map((item) => item.id === selected.id ? { ...item, unread: false } : item))
          setSelected((item) => item?.id === selected.id ? { ...item, unread: false } : item)
        }
      }).catch((cause) => {
        if (active) setError(cause.message)
      })
    }
    return () => {
      active = false
    }
  }, [selected?.id, selected?.threadId])

  async function disconnect() {
    setError('')
    try {
      await request('/api/mails/disconnect', { method: 'POST' })
      setStatus({ connected: false, email: '', lastSyncAt: '' })
      setSenders({ senders: [], defaultEmail: '', requestedEmail: '' })
      setLabels([])
      setMessages([])
      setSelected(null)
      setThread([])
      setNotice('Gmail disconnected.')
    } catch (cause) {
      setError(cause.message)
    }
  }

  async function connect() {
    setError('')
    try {
      const { url } = await request('/api/mails/auth/google')
      window.location.assign(url)
    } catch (cause) {
      setError(cause.message)
    }
  }

  async function runAction(message, action) {
    if (action === 'delete' && !window.confirm('Permanently delete this email? This cannot be undone.')) return
    setError('')
    try {
      await request(`/api/mails/messages/${encodeURIComponent(message.id)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const removeFromCurrentFolder =
        (action === 'trash' && activeLabel !== 'TRASH') ||
        action === 'delete' ||
        (action === 'spam' && activeLabel !== 'SPAM') ||
        (action === 'untrash' && activeLabel === 'TRASH') ||
        (action === 'notSpam' && activeLabel === 'SPAM') ||
        (action === 'archive' && activeLabel === 'INBOX') ||
        (action === 'unstar' && activeLabel === 'STARRED')
      if (removeFromCurrentFolder) {
        setMessages((items) => items.filter((item) => item.id !== message.id))
        if (selected?.id === message.id) {
          setSelected(null)
          setThread([])
        }
      } else {
        const labelIds = new Set(message.labelIds)
        if (action === 'read') labelIds.delete('UNREAD')
        if (action === 'unread') labelIds.add('UNREAD')
        if (action === 'star') labelIds.add('STARRED')
        if (action === 'unstar') labelIds.delete('STARRED')
        if (action === 'archive') labelIds.delete('INBOX')
        if (action === 'spam') {
          labelIds.add('SPAM')
          labelIds.delete('INBOX')
        }
        if (action === 'trash') {
          labelIds.add('TRASH')
          labelIds.delete('INBOX')
        }
        if (action === 'notSpam') {
          labelIds.delete('SPAM')
          labelIds.add('INBOX')
        }
        if (action === 'inbox' || action === 'untrash') labelIds.add('INBOX')
        if (action === 'untrash') labelIds.delete('TRASH')
        const updated = { ...message, labelIds: [...labelIds], unread: labelIds.has('UNREAD') }
        setMessages((items) => items.map((item) => item.id === message.id ? updated : item))
        setSelected((item) => item?.id === message.id ? updated : item)
      }
    } catch (cause) {
      setError(cause.message)
    }
  }

  async function downloadAttachment(message, attachment) {
    setError('')
    try {
      const blobUrl = URL.createObjectURL(
        await api.downloadMailAttachment(message.id, attachment.id, attachment.filename)
      )
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = attachment.filename
      link.click()
      URL.revokeObjectURL(blobUrl)
    } catch (cause) {
      setError(cause.message)
    }
  }

  async function sendMessage(event) {
    event.preventDefault()
    setError('')
    try {
      await request('/api/mails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      setComposeOpen(false)
      setDraft({ to: '', cc: '', bcc: '', subject: '', body: '' })
      setNotice('Message sent.')
      if (activeLabel === 'SENT') await loadMessages(pageTokens[pageIndex] || '')
    } catch (cause) {
      setError(cause.message)
    }
  }

  function replyTo(message) {
    setDraft({
      to: message.from.match(/<([^>]+)>/)?.[1] || message.from,
      from: senders.defaultEmail,
      cc: '',
      bcc: '',
      subject: message.subject.startsWith('Re:') ? message.subject : `Re: ${message.subject}`,
      body: `\n\nOn ${message.date}, ${message.from} wrote:\n> ${message.body.split('\n').join('\n> ')}`,
      threadId: message.threadId,
      inReplyTo: message.messageId,
      references: [message.references, message.messageId].filter(Boolean).join(' '),
    })
    setComposeOpen(true)
  }

  const folderName = SYSTEM_FOLDERS.find(([id]) => id === activeLabel)?.[1] || labels.find((label) => label.id === activeLabel)?.name || 'Inbox'
  const newDraft = () => ({ from: senders.defaultEmail, to: '', cc: '', bcc: '', subject: '', body: '' })

  return (
    <section className="mails-page">
      <header className="mails-header">
        <div>
          <div className="mails-eyebrow">WORKSPACE</div>
          <h1>Mails</h1>
          <p>Manage your Gmail messages securely in TaskFlow.</p>
        </div>
        {status.connected && (
          <div className="mails-header-actions">
            <span className="mails-account"><span className="mails-online-dot" />{status.email}</span>
            <button className="mails-button mails-button-secondary" disabled={syncing} onClick={() => sync(true)} type="button">
              <Icon name="refresh" size={16} /> {syncing ? 'Syncing…' : 'Sync'}
            </button>
            <button className="mails-button mails-button-secondary" onClick={disconnect} type="button">Disconnect</button>
          </div>
        )}
      </header>

      {error && <div className="mails-alert mails-alert-error" role="alert">{error}<button onClick={() => setError('')} type="button" aria-label="Dismiss error">×</button></div>}
      {notice && <div className="mails-alert" role="status">{notice}<button onClick={() => setNotice('')} type="button" aria-label="Dismiss message">×</button></div>}

      {!status.connected ? (
        <div className="mails-connect-card">
          <span className="mails-connect-icon"><Icon name="mail" size={26} /></span>
          <div>
            <h2>Connect your Gmail account</h2>
            <p>Messages, sending, and synchronization use the connected account through the backend.</p>
            <button className="mails-button mails-button-primary" onClick={connect} type="button">
              <Icon name="mail" size={16} /> Connect with Google
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mails-toolbar">
            <form
              className="mails-search"
              onSubmit={(event) => {
                event.preventDefault()
                setPageTokens([''])
                setPageIndex(0)
                setSelected(null)
                setThread([])
                setQuery(search.trim())
              }}
            >
              <Icon name="search" size={17} />
              <input aria-label="Search Gmail" onChange={(event) => setSearch(event.target.value)} placeholder="Search mail" value={search} />
              {search && <button aria-label="Clear search" onClick={() => { setSearch(''); setQuery(''); setPageTokens(['']); setPageIndex(0); setSelected(null); setThread([]) }} type="button">×</button>}
              <button type="submit">Search</button>
            </form>
            <button className="mails-button mails-button-primary" onClick={() => { setDraft(newDraft()); setComposeOpen(true) }} type="button">
              <Icon name="plus" size={16} /> Compose
            </button>
          </div>

          <div className="mails-layout">
            <nav aria-label="Gmail folders" className="mails-folders">
              {SYSTEM_FOLDERS.map(([id, name, icon]) => (
                <button className={activeLabel === id ? 'active' : ''} key={id} onClick={() => {
                  setActiveLabel(id)
                  setPageTokens([''])
                  setPageIndex(0)
                  setSelected(null)
                  setThread([])
                }} type="button">
                  <Icon name={icon} size={17} /> <span>{name}</span>
                </button>
              ))}
              {labels.length > 0 && <div className="mails-folder-heading">LABELS</div>}
              {labels.map((label) => (
                <button className={activeLabel === label.id ? 'active' : ''} key={label.id} onClick={() => {
                  setActiveLabel(label.id)
                  setPageTokens([''])
                  setPageIndex(0)
                  setSelected(null)
                  setThread([])
                }} type="button">
                  <Icon name="tag" size={16} /> <span>{label.name}</span>
                </button>
              ))}
            </nav>

            <div className="mails-list-panel">
              <div className="mails-list-heading">
                <div><h2>{folderName}</h2><span>{resultSize ? `${resultSize.toLocaleString()} messages` : 'No messages'}</span></div>
                <button aria-label="Refresh messages" disabled={loading} onClick={() => loadMessages(pageTokens[pageIndex] || '')} type="button"><Icon name="refresh" size={16} /></button>
              </div>
              {loading ? <div className="mails-empty">Loading messages…</div> : messages.length === 0 ? (
                <div className="mails-empty"><Icon name="mail" size={26} /><b>No messages here</b><span>Messages from your Gmail account will appear here.</span></div>
              ) : (
                <div className="mails-message-list">
                  {messages.map((message) => (
                    <article className={`mails-message-row ${selected?.id === message.id ? 'selected' : ''} ${message.unread ? 'unread' : ''}`} key={message.id}>
                      <button className="mails-message-open" onClick={() => setSelected(message)} type="button">
                        <span className="mails-message-top"><b>{senderName(message.from)}</b><time>{formatDate(message.date)}</time></span>
                        <strong>{message.subject}</strong>
                        <span className="mails-message-snippet">{message.snippet || 'No preview available.'}</span>
                        {message.attachments.length > 0 && <span className="mails-attachment-count"><Icon name="paperclip" size={13} /> {message.attachments.length}</span>}
                      </button>
                      <button className={`mails-star ${message.labelIds.includes('STARRED') ? 'on' : ''}`} aria-label={message.labelIds.includes('STARRED') ? 'Unstar message' : 'Star message'} onClick={() => runAction(message, message.labelIds.includes('STARRED') ? 'unstar' : 'star')} type="button">
                        <Icon name="star" size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              )}
              <footer className="mails-pagination">
                <span>{messages.length ? `Showing ${messages.length} of ${resultSize.toLocaleString()}` : ''}</span>
                <button disabled={pageIndex === 0 || loading} onClick={() => setPageIndex((index) => Math.max(0, index - 1))} type="button">Previous</button>
                <button disabled={!nextPageToken || loading} onClick={() => {
                  setPageTokens((tokens) => [...tokens.slice(0, pageIndex + 1), nextPageToken])
                  setPageIndex((index) => index + 1)
                }} type="button">Next</button>
              </footer>
            </div>

            <section aria-label="Message content" className="mails-reader">
              {!selected ? (
                <div className="mails-reader-empty"><Icon name="mail" size={30} /><b>Select a message</b><span>Choose an email to read the conversation.</span></div>
              ) : (
                <>
                  <div className="mails-reader-toolbar">
                    <button onClick={() => runAction(selected, selected.unread ? 'read' : 'unread')} type="button">{selected.unread ? 'Mark read' : 'Mark unread'}</button>
                    {activeLabel === 'TRASH'
                      ? <button onClick={() => runAction(selected, 'untrash')} type="button">Restore</button>
                      : <button onClick={() => runAction(selected, 'archive')} type="button">Archive</button>}
                    {activeLabel === 'SPAM'
                      ? <button onClick={() => runAction(selected, 'notSpam')} type="button">Not spam</button>
                      : <button onClick={() => runAction(selected, 'spam')} type="button">Report spam</button>}
                    {activeLabel === 'TRASH'
                      ? <button onClick={() => runAction(selected, 'delete')} type="button">Delete permanently</button>
                      : <button onClick={() => runAction(selected, 'trash')} type="button">Move to trash</button>}
                  </div>
                  <h2 className="mails-reader-subject">{selected.subject}</h2>
                  {thread.length === 0 ? <div className="mails-empty">Loading conversation…</div> : thread.map((message) => (
                    <article className="mails-thread-message" key={message.id}>
                      <div className="mails-thread-header">
                        <span className="mails-avatar">{senderName(message.from).slice(0, 1).toUpperCase()}</span>
                        <div><b>{senderName(message.from)}</b><span>{message.from}</span></div>
                        <time>{formatDate(message.date)}</time>
                      </div>
                      <div className="mails-thread-body">{message.body}</div>
                      {message.attachments.length > 0 && (
                        <div className="mails-attachments">
                          <b>{message.attachments.length} attachment{message.attachments.length === 1 ? '' : 's'}</b>
                          {message.attachments.map((attachment) => (
                            <button key={attachment.id} onClick={() => downloadAttachment(message, attachment)} type="button">
                              <Icon name="paperclip" size={14} /> {attachment.filename}
                              <span>{attachment.size ? `${Math.max(1, Math.round(attachment.size / 1024))} KB` : ''}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                  {thread.length > 0 && <button className="mails-button mails-button-secondary mails-reply" onClick={() => replyTo(thread[thread.length - 1])} type="button">Reply</button>}
                </>
              )}
            </section>
          </div>
          {status.lastSyncAt && <div className="mails-sync-time">Last checked {formatDate(status.lastSyncAt)}</div>}
        </>
      )}

      {composeOpen && (
        <div className="mails-compose-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setComposeOpen(false) }}>
          <form aria-label="Compose email" className="mails-compose" onSubmit={sendMessage}>
            <header><b>{draft.threadId ? 'Reply' : 'New message'}</b><button aria-label="Close compose" onClick={() => setComposeOpen(false)} type="button">×</button></header>
            <label>From
              {senders.senders.length ? (
                <select
                  onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))}
                  value={draft.from || senders.defaultEmail}
                >
                  {senders.senders.map((sender) => <option key={sender.email} value={sender.email}>{sender.name} &lt;{sender.email}&gt;</option>)}
                </select>
              ) : (
                <span className="mails-compose-sender-error">
                  Add and verify {senders.requestedEmail || 'your Gmail address'} in Gmail Settings → Accounts → Send mail as.
                </span>
              )}
            </label>
            <label>To<input autoFocus onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} placeholder="name@example.com" required value={draft.to} /></label>
            <label>Cc<input onChange={(event) => setDraft((current) => ({ ...current, cc: event.target.value }))} value={draft.cc} /></label>
            <label>Bcc<input onChange={(event) => setDraft((current) => ({ ...current, bcc: event.target.value }))} value={draft.bcc} /></label>
            <label>Subject<input onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} value={draft.subject} /></label>
            <textarea aria-label="Message body" onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} placeholder="Write your message…" required value={draft.body} />
            <footer><span>Sent using your verified Gmail address</span><button className="mails-button mails-button-primary" disabled={!senders.senders.length} type="submit"><Icon name="send" size={15} /> Send</button></footer>
          </form>
        </div>
      )}
    </section>
  )
}
