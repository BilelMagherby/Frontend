import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { formatDate, formatBytes, dueStatus } from '../../utils/helpers.js'
import { api } from '../../services/api.js'
import {
  FOODICS_SECTIONS,
  FOODICS_PROJECTS,
  PROJECT_SECTIONS,
  OVERVIEW_SECTION,
  REPORT_TYPES,
  PROCEDURES,
} from './foodicsData.js'
import { FoodicsEntryDialog } from './FoodicsEntryDialog.jsx'
import '../../foodics.css'

export function FoodicsManagementPage({ activeSection, activeProject, onSelectProject, onSelectSection }) {
  const [records, setRecords] = useState([])
  const [workflow, setWorkflow] = useState({})
  const [loading, setLoading] = useState(true)
  const [storageError, setStorageError] = useState('')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const section =
    activeSection === 'overview'
      ? OVERVIEW_SECTION
      : FOODICS_SECTIONS.find((item) => item.id === activeSection) || OVERVIEW_SECTION
  const project = FOODICS_PROJECTS.find((item) => item.id === activeProject)
  const searchInput = useRef(null)

  useEffect(() => setSearch(''), [activeProject, section.id])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [remoteRows, ...workflowRows] = await Promise.all([
          api.list('foodics'),
          ...FOODICS_PROJECTS.map((item) => api.get(`foodics-settings/${item.id}`)),
        ])
        const records = remoteRows
          .map((row) => ({ ...row.data, id: row.id }))
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        const workflow = Object.fromEntries(
          FOODICS_PROJECTS.map((item, index) => [item.id, workflowRows[index]?.data?.value || {}])
        )
        if (mounted) {
          setRecords(records)
          setWorkflow(workflow)
        }
      } catch (cause) {
        if (mounted) setStorageError(cause.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const poll = window.setInterval(() => {
      if (!document.hidden) load()
    }, 15000)
    return () => {
      mounted = false
      window.clearInterval(poll)
    }
  }, [])

  const sectionRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          record.section === section.id && (section.id === 'reports' || record.projectId === activeProject)
      ),
    [activeProject, records, section.id]
  )
  const filteredRecords = useMemo(
    () =>
      sectionRecords.filter(
        (record) =>
          !search ||
          [
            record.title,
            record.category,
            record.reference,
            record.counterparty,
            record.notes,
            record.fileName,
            record.classification,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase())
      ),
    [sectionRecords, search]
  )

  async function saveRecord(record, file) {
    const scopedRecord = { ...(section.id === 'reports' ? record : { ...record, projectId: activeProject }) }
    if (
      section.id === 'accounts' &&
      records.some((item) => item.section === 'accounts' && item.projectId === activeProject &&
        String(item.reference || '').trim().toLowerCase() === scopedRecord.reference.trim().toLowerCase())
    ) {
      throw new Error('An account with this code already exists in this project.')
    }
    let uploadedFileId = ''
    if (file) {
      const uploaded = await api.uploadFile(file, 'foodics')
      scopedRecord.fileId = uploaded.id
      uploadedFileId = uploaded.id
    }
    try {
      await api.put(`foodics/${scopedRecord.id}`, scopedRecord)
    } catch (error) {
      if (uploadedFileId) {
        try {
          await api.deleteFile(uploadedFileId)
        } catch (cleanupError) {
          throw new Error(`${error.message} The uploaded file could not be cleaned up: ${cleanupError.message}`)
        }
      }
      throw error
    }
    setRecords((current) => [scopedRecord, ...current])
    setNotice('Record saved to the shared Foodics library.')
    window.setTimeout(() => setNotice(''), 4000)
  }

  async function removeRecord(record) {
    if (!window.confirm(`Permanently remove “${record.title}”${record.fileName ? ' and its saved file' : ''}?`)) return
    try {
      await api.remove(`foodics/${record.id}`)
      if (record.fileId) await api.deleteFile(record.fileId)
      setRecords((current) => current.filter((item) => item.id !== record.id))
      setNotice('Record removed.')
    } catch (cause) {
      setStorageError(cause.message)
    }
  }

  async function downloadFile(record) {
    if (!record.fileId) return
    try {
      const url = URL.createObjectURL(await api.downloadFile(record.fileId))
      const link = document.createElement('a')
      link.href = url
      link.download = record.fileName || 'foodics-document'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (cause) {
      setStorageError(cause.message)
    }
  }

  async function toggleChecklist(stepId) {
    const next = { ...workflow, [stepId]: !workflow[stepId] }
    try {
      await api.put(`foodics-settings/${activeProject}`, { value: next })
      setWorkflow((current) => ({ ...current, [activeProject]: next }))
    } catch (cause) {
      setStorageError(cause.message)
    }
  }

  async function updateVatRecord(record) {
    const next = { ...record, completed: !record.completed }
    try {
      await api.put(`foodics/${record.id}`, next)
      setRecords((current) => current.map((item) => (item.id === record.id ? next : item)))
    } catch (cause) {
      setStorageError(cause.message)
    }
  }

  const currentWorkflow = workflow[activeProject] || {}
  const completedSteps = PROCEDURES.flatMap((procedure) =>
    procedure.steps.map((_, index) => `${procedure.id}-${index}`)
  ).filter((id) => currentWorkflow[id]).length
  const totalSteps = PROCEDURES.reduce((sum, procedure) => sum + procedure.steps.length, 0)

  function renderFileCell(record) {
    return record.fileId ? (
      <button className="foodics-file-link" onClick={() => downloadFile(record)} type="button">
        <Icon name="download" size={14} /> {record.fileName} <small>{formatBytes(record.fileSize)}</small>
      </button>
    ) : (
      <span className="foodics-muted">No attachment</span>
    )
  }

  function renderRecordTable() {
    if (!filteredRecords.length) {
      return (
        <div className="foodics-empty">
          <span className="foodics-empty-icon">
            <Icon name={section.icon} size={22} />
          </span>
          <h3>{search ? 'No matching records' : `No ${section.shortLabel.toLowerCase()} filed yet`}</h3>
          <p>{search ? 'Try another search term or clear your filter.' : 'Add a record and attach its source file to build a traceable library.'}</p>
          {!search && (
            <button className="foodics-button primary" onClick={() => setDialogOpen(true)} type="button">
              <Icon name="plus" size={15} /> Add first record
            </button>
          )}
        </div>
      )
    }

    if (section.id === 'vat')
      return (
        <div className="foodics-table-scroll">
          <table className="foodics-table">
            <thead>
              <tr>
                <th>Reminder</th>
                <th>Due date</th>
                <th>Cadence</th>
                <th>Notes</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const due = dueStatus(record.dueDate)
                return (
                  <tr key={record.id}>
                    <td>
                      <strong>{record.title}</strong>
                    </td>
                    <td>{formatDate(record.dueDate)}</td>
                    <td>{record.frequency}</td>
                    <td className="foodics-notes-cell">{record.notes || '—'}</td>
                    <td>
                      <span className={`foodics-status ${record.completed ? 'complete' : due.className}`}>
                        {record.completed ? 'Complete' : due.label}
                      </span>
                    </td>
                    <td>
                      <div className="foodics-row-actions">
                        <button
                          aria-label={`${record.completed ? 'Reopen' : 'Mark complete'} ${record.title}`}
                          className="foodics-small-button"
                          onClick={() => updateVatRecord(record)}
                          type="button"
                        >
                          {record.completed ? 'Reopen' : 'Complete'}
                        </button>
                        <button
                          aria-label={`Delete ${record.title}`}
                          className="foodics-icon-button danger"
                          onClick={() => removeRecord(record)}
                          type="button"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )

    if (section.id === 'purchases' || section.id === 'sales')
      return (
        <div className="foodics-table-scroll">
          <table className="foodics-table">
            <thead>
              <tr>
                <th>Bill</th>
                <th>{section.id === 'purchases' ? 'Supplier' : 'Customer / channel'}</th>
                <th>Reference</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Supporting file</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td>
                    <strong>{record.title}</strong>
                  </td>
                  <td>{record.counterparty || '—'}</td>
                  <td>{record.reference}</td>
                  <td>{formatDate(record.date)}</td>
                  <td>
                    {record.amount === ''
                      ? '—'
                      : `${Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${record.currency || 'SAR'}`}
                  </td>
                  <td>
                    <span className={`foodics-status ${record.status === 'Paid' ? 'complete' : 'scheduled'}`}>
                      {record.status || 'Received'}
                    </span>
                  </td>
                  <td>{renderFileCell(record)}</td>
                  <td>
                    <button
                      aria-label={`Delete ${record.title}`}
                      className="foodics-icon-button danger"
                      onClick={() => removeRecord(record)}
                      type="button"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    if (section.id === 'documents')
      return (
        <div className="foodics-table-scroll">
          <table className="foodics-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Category</th>
                <th>Classification</th>
                <th>Review date</th>
                <th>File</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td>
                    <strong>{record.title}</strong>
                    <small className="foodics-sub-cell">{record.notes || '—'}</small>
                  </td>
                  <td>{record.category}</td>
                  <td>
                    <span className={`foodics-classification ${record.classification.toLowerCase()}`}>
                      {record.classification}
                    </span>
                  </td>
                  <td>{formatDate(record.date)}</td>
                  <td>{renderFileCell(record)}</td>
                  <td>
                    <button
                      aria-label={`Delete ${record.title}`}
                      className="foodics-icon-button danger"
                      onClick={() => removeRecord(record)}
                      type="button"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    return (
      <div className="foodics-table-scroll">
        <table className="foodics-table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Classification</th>
              <th>Period</th>
              <th>Notes</th>
              <th>File</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <tr key={record.id}>
                <td>
                  <strong>{record.title}</strong>
                </td>
                <td>{record.category}</td>
                <td>{record.date || '—'}</td>
                <td className="foodics-notes-cell">{record.notes || '—'}</td>
                <td>{renderFileCell(record)}</td>
                <td>
                  <button
                    aria-label={`Delete ${record.title}`}
                    className="foodics-icon-button danger"
                    onClick={() => removeRecord(record)}
                    type="button"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section aria-labelledby="foodics-page-title" className="foodics-page">
      <header className="foodics-page-header">
        <div className="foodics-page-heading">
          <span className="foodics-kicker">
            <Icon name="folder" size={14} /> {project ? `${project.name.toUpperCase()} WORKSPACE` : 'FOODICS MANAGEMENT'}
          </span>
          <h1 id="foodics-page-title">
            {section.id === 'overview' && project ? `${project.name} workspace` : section.label}
          </h1>
          <p>
            {section.id === 'overview' && project
              ? `Manage ${project.name} bills, VAT reminders, procedures, accounts, and documents in one place.`
              : section.description}
          </p>
        </div>
        {section.id === 'overview' && project && (
          <button className="foodics-button secondary" onClick={() => onSelectProject('')} type="button">
            <Icon name="chevron-left" size={15} /> All projects
          </button>
        )}
        {section.id !== 'overview' && section.id !== 'procedures' && (
          <button className="foodics-button primary" onClick={() => setDialogOpen(true)} type="button">
            <Icon name="plus" size={16} /> {section.id === 'vat' ? 'Add reminder' : section.id === 'accounts' ? 'Add account' : 'Add record'}
          </button>
        )}
      </header>

      <div className="foodics-storage-note" role="note">
        <Icon name="info" size={16} />
        <span>
          <strong>Shared backend storage.</strong> Records and attachments are stored by the TaskFlow backend. Protect the server and its backup location according to your company’s data policies.
        </span>
      </div>
      {storageError && (
        <div className="foodics-error" role="alert">
          <Icon name="alert-triangle" size={16} />
          <span>{storageError}</span>
          <button aria-label="Dismiss error" onClick={() => setStorageError('')} type="button">
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
      {notice && (
        <div className="foodics-success" role="status">
          <Icon name="check-circle" size={15} />
          {notice}
        </div>
      )}

      {section.id === 'overview' ? (
        <div className="foodics-workspace-grid">
          {project
            ? PROJECT_SECTIONS.map((item) => {
                const count = records.filter(
                  (record) => record.projectId === project.id && record.section === item.id
                ).length
                const countLabel =
                  item.id === 'procedures'
                    ? `${PROCEDURES.length} checklists`
                    : `${count} ${count === 1 ? 'record' : 'records'}`
                return (
                  <button
                    className="foodics-workspace-card"
                    key={item.id}
                    onClick={() => onSelectSection(project.id, item.id)}
                    type="button"
                  >
                    <span className="foodics-workspace-icon">
                      <Icon name={item.icon} size={19} />
                    </span>
                    <span className="foodics-workspace-card-title">{item.label}</span>
                    <span className="foodics-workspace-card-description">{item.description}</span>
                    <span className="foodics-workspace-card-footer">
                      {countLabel} <Icon name="chevron-right" size={14} />
                    </span>
                  </button>
                )
              })
            : FOODICS_PROJECTS.map((item) => {
                const count = records.filter((record) => record.projectId === item.id).length
                return (
                  <button
                    className="foodics-project-card"
                    key={item.id}
                    onClick={() => onSelectProject(item.id)}
                    style={{ '--project-color': item.color }}
                    type="button"
                  >
                    <span className="foodics-project-card-icon">{item.name.slice(0, 1)}</span>
                    <span className="foodics-project-card-content">
                      <strong>{item.name}</strong>
                      <small>Foodics project workspace</small>
                    </span>
                    <span className="foodics-project-card-count">
                      {count} {count === 1 ? 'record' : 'records'}
                    </span>
                    <Icon className="foodics-project-card-arrow" name="chevron-right" size={16} />
                  </button>
                )
              })}
        </div>
      ) : section.id === 'accounts' ? (
        <div className="foodics-panel">
          <div className="foodics-panel-header">
            <div>
              <h2>Foodics-to-ledger mappings</h2>
              <p>Only account codes and mappings entered by your team are shown.</p>
            </div>
            <label className="foodics-search">
              <Icon name="search" size={15} />
              <input
                aria-label="Search chart of accounts"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search accounts"
                ref={searchInput}
                value={search}
              />
              {search && (
                <button aria-label="Clear search" onClick={() => setSearch('')} type="button">
                  <Icon name="close" size={13} />
                </button>
              )}
            </label>
          </div>
          <div className="foodics-table-scroll">
            <table className="foodics-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Mapping note</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="foodics-account-code">{record.reference}</td>
                    <td><strong>{record.title}</strong></td>
                    <td>{record.category}</td>
                    <td>{record.notes}</td>
                    <td><button className="font-semibold text-rose-600 hover:underline" onClick={() => removeRecord(record)} type="button">Remove</button></td>
                  </tr>
                ))}
                {!filteredRecords.length && (
                  <tr><td className="py-8 text-center text-slate-400" colSpan="5">No account mappings have been added.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : section.id === 'procedures' ? (
        <>
          <div className="foodics-procedure-summary">
            <div>
              <span className="foodics-kicker">SHIFT CONTROL</span>
              <h2>Repeatable checks. Clear evidence.</h2>
              <p>Mark steps as you complete them. Progress is saved to the shared backend.</p>
            </div>
            <div className="foodics-progress">
              <strong>
                {completedSteps}
                <span> / {totalSteps}</span>
              </strong>
              <small>checks completed</small>
              <div className="foodics-progress-track">
                <i style={{ width: `${totalSteps ? (completedSteps / totalSteps) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
          <div className="foodics-procedure-grid">
            {PROCEDURES.map((procedure, procedureIndex) => {
              const done = procedure.steps.filter((_, index) => currentWorkflow[`${procedure.id}-${index}`]).length
              return (
                <article className="foodics-procedure-card" key={procedure.id}>
                  <header>
                    <span className="foodics-procedure-number">{String(procedureIndex + 1).padStart(2, '0')}</span>
                    <span className="foodics-cadence">{procedure.cadence}</span>
                  </header>
                  <h3>{procedure.title}</h3>
                  <p>{procedure.description}</p>
                  <div className="foodics-procedure-count">
                    {done} of {procedure.steps.length} complete
                  </div>
                  <ol>
                    {procedure.steps.map((step, index) => {
                      const id = `${procedure.id}-${index}`
                      return (
                        <li key={id}>
                          <label className={currentWorkflow[id] ? 'is-checked' : ''}>
                            <input
                              checked={Boolean(currentWorkflow[id])}
                              onChange={() => toggleChecklist(id)}
                              type="checkbox"
                            />
                            <span>{step}</span>
                          </label>
                        </li>
                      )
                    })}
                  </ol>
                </article>
              )
            })}
          </div>
          <div className="foodics-procedure-footnote">
            <Icon name="info" size={15} /> Verify exact Foodics controls and approval limits against your current outlet configuration and company policy.
          </div>
        </>
      ) : (
        <>
          {section.id === 'vat' && (
            <div className="foodics-vat-guidance">
              <span>
                <Icon name="calendar-clock" size={18} />
              </span>
              <div>
                <strong>Use your registered filing calendar</strong>
                <p>Set a separate reminder for each return, payment, or supporting-data milestone. Filing frequency and due dates depend on your tax profile; confirm them with your tax adviser. Reminders appear here while the app is open.</p>
              </div>
            </div>
          )}
          {section.id === 'reports' && (
            <div className="foodics-category-strip">
              <strong>Suggested report classes</strong>
              {REPORT_TYPES.slice(0, 7).map((type) => (
                <span key={type}>{type}</span>
              ))}
            </div>
          )}
          {section.id === 'documents' && (
            <div className="foodics-document-guidance">
              <span>
                <Icon name="lock" size={17} />
              </span>
              <div>
                <strong>Classification is an organizational label, not an access-control boundary.</strong>
                <p>Use an approved encrypted company repository for confidential originals. This workspace does not enforce per-document permissions.</p>
              </div>
            </div>
          )}
          <div className="foodics-summary-grid">
            <div className="foodics-summary-card">
              <span>{section.id === 'vat' ? 'Active reminders' : 'Filed records'}</span>
              <strong>{sectionRecords.filter((record) => !record.completed).length}</strong>
              <small>{section.id === 'vat' ? 'Open items in this library' : `${sectionRecords.filter((record) => record.fileId).length} with a saved file`}</small>
            </div>
            <div className="foodics-summary-card">
              <span>Searchable entries</span>
              <strong>{sectionRecords.length}</strong>
              <small>Stored in the shared backend</small>
            </div>
            <div className="foodics-summary-card">
              <span>Current view</span>
              <strong className="foodics-summary-label">{section.shortLabel}</strong>
              <small>Kept separate from other libraries</small>
            </div>
          </div>
          <div className="foodics-panel">
            <div className="foodics-panel-header">
              <div>
                <h2>{section.id === 'vat' ? 'Reminder register' : section.id === 'reports' ? 'Report register' : section.id === 'documents' ? 'Document register' : `${section.shortLabel} register`}</h2>
                <p>{section.id === 'vat' ? 'Track preparation, review, and filing milestones.' : 'Each entry stays in this section and can be found by its title, reference, category, or file name.'}</p>
              </div>
              <label className="foodics-search">
                <Icon name="search" size={15} />
                <input
                  aria-label={`Search ${section.shortLabel}`}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${section.shortLabel.toLowerCase()}`}
                  ref={searchInput}
                  value={search}
                />
                {search && (
                  <button aria-label="Clear search" onClick={() => setSearch('')} type="button">
                    <Icon name="close" size={13} />
                  </button>
                )}
              </label>
            </div>
            {loading ? (
              <div className="foodics-loading">
                <span className="foodics-spinner" /> Loading your Foodics library…
              </div>
            ) : (
              renderRecordTable()
            )}
            <div className="foodics-panel-footer">
              <Icon name="database" size={13} /> {filteredRecords.length} {filteredRecords.length === 1 ? 'entry' : 'entries'} shown · Backend storage
            </div>
          </div>
        </>
      )}

      {dialogOpen && (
        <FoodicsEntryDialog
          key={`${activeProject || 'all'}-${section.id}`}
          onClose={() => setDialogOpen(false)}
          onSave={saveRecord}
          section={section}
        />
      )}
    </section>
  )
}
