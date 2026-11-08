import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { api } from '../../services/api.js'

export function HRPage() {
  const modules = [
    {
      id: 'attendance',
      title: 'Attendance & time',
      description: 'Working hours, check-ins, absences, and attendance summaries.',
      icon: 'calendar-clock',
      tone: 'blue',
      fields: [
        { key: 'employee', label: 'Employee', required: true },
        { key: 'date', label: 'Date', type: 'date', required: true },
        { key: 'checkIn', label: 'Check-in', type: 'time' },
        { key: 'checkOut', label: 'Check-out', type: 'time' },
        { key: 'status', label: 'Status', type: 'select', options: ['Present', 'Late', 'Absent', 'Remote'], required: true },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
    },
    {
      id: 'leave',
      title: 'Leave management',
      description: 'Leave balances, requests, approvals, and absence calendar.',
      icon: 'calendar',
      tone: 'violet',
      fields: [
        { key: 'employee', label: 'Employee', required: true },
        { key: 'leaveType', label: 'Leave type', type: 'select', options: ['Annual leave', 'Sick leave', 'Unpaid leave', 'Other'], required: true },
        { key: 'startDate', label: 'Start date', type: 'date', required: true },
        { key: 'endDate', label: 'End date', type: 'date', required: true },
        { key: 'status', label: 'Request status', type: 'select', options: ['Pending', 'Approved', 'Declined'], required: true },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
    },
    {
      id: 'payroll',
      title: 'Payroll & compensation',
      description: 'Payroll periods, compensation records, and benefits administration.',
      icon: 'wallet',
      tone: 'green',
      fields: [
        { key: 'period', label: 'Pay period', required: true },
        { key: 'payDate', label: 'Pay date', type: 'date' },
        { key: 'status', label: 'Payroll status', type: 'select', options: ['Draft', 'In review', 'Ready', 'Paid'], required: true },
        { key: 'benefits', label: 'Benefits / compensation notes', type: 'textarea' },
      ],
    },
    {
      id: 'recruitment',
      title: 'Recruitment',
      description: 'Open positions, candidate stages, interviews, and hiring decisions.',
      icon: 'user-plus',
      tone: 'amber',
      fields: [
        { key: 'position', label: 'Position', required: true },
        { key: 'department', label: 'Department' },
        { key: 'candidate', label: 'Candidate' },
        { key: 'stage', label: 'Hiring stage', type: 'select', options: ['New', 'Screening', 'Interview', 'Offer', 'Hired', 'Not selected'], required: true },
        { key: 'nextInterview', label: 'Next interview', type: 'date' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
    },
    {
      id: 'onboarding',
      title: 'Onboarding',
      description: 'New-hire checklists, required documents, and onboarding progress.',
      icon: 'check-square',
      tone: 'teal',
      fields: [
        { key: 'employee', label: 'New employee', required: true },
        { key: 'startDate', label: 'Start date', type: 'date', required: true },
        { key: 'manager', label: 'Manager' },
        { key: 'status', label: 'Onboarding status', type: 'select', options: ['Not started', 'In progress', 'Complete'], required: true },
        { key: 'checklist', label: 'Checklist / notes', type: 'textarea' },
      ],
    },
    {
      id: 'learning',
      title: 'Learning & development',
      description: 'Training plans, course completion, and development records.',
      icon: 'book-open',
      tone: 'indigo',
      fields: [
        { key: 'course', label: 'Course / training', required: true },
        { key: 'employee', label: 'Employee', required: true },
        { key: 'provider', label: 'Provider' },
        { key: 'dueDate', label: 'Due date', type: 'date' },
        { key: 'status', label: 'Training status', type: 'select', options: ['Planned', 'In progress', 'Completed'], required: true },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ],
    },
    {
      id: 'policies',
      title: 'Policies & compliance',
      description: 'HR policies, acknowledgements, and compliance documentation.',
      icon: 'file-check',
      tone: 'rose',
      fields: [
        { key: 'policy', label: 'Policy / document', required: true },
        { key: 'category', label: 'Category' },
        { key: 'reviewDate', label: 'Review date', type: 'date' },
        { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Active', 'Review due', 'Archived'], required: true },
        { key: 'notes', label: 'Notes / acknowledgement details', type: 'textarea' },
      ],
    },
  ]

  const [records, setRecords] = useState([])
  const [storageReady, setStorageReady] = useState(false)
  const [storageError, setStorageError] = useState('')
  const [activeModuleId, setActiveModuleId] = useState('')
  const [editingRecord, setEditingRecord] = useState(null)
  const [formData, setFormData] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    async function loadRecords() {
      try {
        let rows = await api.list('hr')
        const saved = localStorage.getItem('taskflow_hr_records')
        const legacyRecords = saved ? JSON.parse(saved) : []
        if (
          !Array.isArray(legacyRecords) ||
          legacyRecords.some(
            (record) =>
              !record ||
              typeof record.id !== 'string' ||
              !modules.some((module) => module.id === record.module) ||
              !record.data ||
              typeof record.data !== 'object' ||
              Array.isArray(record.data) ||
              Object.values(record.data).some((value) => typeof value !== 'string')
          )
        ) {
          throw new Error('Stored HR data has an invalid format.')
        }
        const existingIds = new Set(rows.map((row) => row.id))
        const missingRecords = legacyRecords.filter((record) => !existingIds.has(record.id))
        await Promise.all(missingRecords.map((record) => api.put(`hr/${record.id}`, record)))
        rows = [
          ...rows,
          ...missingRecords.map((record) => ({ id: record.id, data: record })),
        ]
        if (saved) localStorage.removeItem('taskflow_hr_records')
        if (active) setRecords(rows.map((row) => ({ ...row.data, id: row.id })))
      } catch (error) {
        if (active) setStorageError(`Could not load HR records from the backend: ${error.message}`)
      } finally {
        if (active) setStorageReady(true)
      }
    }
    loadRecords()
    return () => {
      active = false
    }
  }, [])

  const saveRecords = async (nextRecords) => {
    try {
      const nextById = new Map(nextRecords.map((record) => [record.id, record]))
      const currentById = new Map(records.map((record) => [record.id, record]))
      const updates = nextRecords
        .filter((record) => JSON.stringify(currentById.get(record.id)) !== JSON.stringify(record))
        .map((record) => api.put(`hr/${record.id}`, record))
      const deletions = records
        .filter((record) => !nextById.has(record.id))
        .map((record) => api.remove(`hr/${record.id}`))
      await Promise.all([...updates, ...deletions])
      setRecords(nextRecords)
      setStorageError('')
      setEditingRecord(null)
      setFormData({})
      setShowForm(false)
    } catch (error) {
      setStorageError(`Could not save HR records to the backend: ${error.message}`)
    }
  }

  const activeModule = modules.find((module) => module.id === activeModuleId)
  const moduleRecords = records.filter((record) => record.module === activeModuleId)
  const visibleRecords = moduleRecords.filter((record) =>
    JSON.stringify(record.data).toLowerCase().includes(search.trim().toLowerCase())
  )

  const startCreate = () => {
    setEditingRecord(null)
    setFormData({})
    setShowForm(true)
  }

  const startEdit = (record) => {
    setEditingRecord(record)
    setFormData(record.data)
    setShowForm(true)
  }

  const submitRecord = (event) => {
    event.preventDefault()
    if (!activeModule) return
    const now = new Date().toISOString()
    const record = {
      id: editingRecord?.id || `hr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      module: activeModuleId,
      data: formData,
      createdAt: editingRecord?.createdAt || now,
      updatedAt: now,
    }
    saveRecords(
      editingRecord ? records.map((item) => (item.id === editingRecord.id ? record : item)) : [record, ...records]
    )
  }

  const deleteRecord = (record) => {
    const label = Object.values(record.data).find(Boolean) || activeModule?.title || 'this record'
    if (window.confirm(`Delete "${label}"? This cannot be undone.`)) {
      saveRecords(records.filter((item) => item.id !== record.id))
    }
  }

  const recordTitle = (module, record) =>
    record.data[
      module.fields.find((field) => field.key !== 'notes' && field.key !== 'benefits' && field.key !== 'checklist')
        ?.key
    ] || 'Untitled record'

  return (
    <section aria-labelledby="hr-page-title" className="hr-page">
      <header className="hr-page-heading">
        <div>
          <span className="gulf-eyebrow">
            <Icon name="hr" size={15} /> HUMAN RESOURCES
          </span>
          <h1 id="hr-page-title">{activeModule ? activeModule.title : 'HR Management'}</h1>
          <p>{activeModule ? activeModule.description : 'Create and manage HR records across your organization.'}</p>
        </div>
        {activeModule ? (
          <Button
            onClick={() => {
              setActiveModuleId('')
              setSearch('')
              setEditingRecord(null)
              setShowForm(false)
            }}
          >
            <Icon name="chevron-left" size={15} /> All HR modules
          </Button>
        ) : (
          <span className="hr-system-status">
            <i /> HR records stored in the backend
          </span>
        )}
      </header>

      {storageError && (
        <p className="hr-storage-error" role="alert">
          {storageError}
        </p>
      )}
      {!activeModule && (
        <>
          <div className="hr-setup-notice" role="status">
            <span className="hr-notice-icon">
              <Icon name="info" size={17} />
            </span>
            <div>
              <b>HR workspace</b>
              <p>
                Create and update shared records in each module below. Configure approved persistent storage, backups,
                and access controls before entering sensitive payroll or personal information.
              </p>
            </div>
          </div>
          <div className="hr-module-heading">
            <div>
              <h2>HR operations</h2>
              <p>Select a module to add or manage its records</p>
            </div>
            <span>{modules.length} modules</span>
          </div>
          <div className="hr-module-grid">
            {modules.map((module) => {
              const count = records.filter((record) => record.module === module.id).length
              return (
                <button
                  className="hr-module-card"
                  key={module.id}
                  onClick={() => setActiveModuleId(module.id)}
                  type="button"
                >
                  <span className="hr-module-card-top">
                    <span className={`hr-module-icon ${module.tone}`}>
                      <Icon name={module.icon} size={19} />
                    </span>
                    <span className={`hr-module-status${count ? ' configured' : ''}`}>
                      {count ? `${count} record${count === 1 ? '' : 's'}` : 'No records'}
                    </span>
                  </span>
                  <span className="hr-module-card-title">{module.title}</span>
                  <span className="hr-module-card-description">{module.description}</span>
                  <span className="hr-module-card-footer">
                    <span>
                      <i /> {count ? 'Manage records' : 'Create first record'}
                    </span>
                    <Icon name="chevron-right" size={15} />
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {activeModule && (
        <section aria-label={`${activeModule.title} records`} className="hr-records-panel">
          <div className="hr-records-toolbar">
            <div>
              <span className={`hr-module-icon ${activeModule.tone}`}>
                <Icon name={activeModule.icon} size={19} />
              </span>
              <div>
                <h2>{activeModule.title}</h2>
                <p>
                  {moduleRecords.length} record{moduleRecords.length === 1 ? '' : 's'} saved in the backend
                </p>
              </div>
            </div>
            <div>
              <label className="hr-record-search">
                <Icon name="search" size={15} />
                <input
                  aria-label={`Search ${activeModule.title}`}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search records"
                  value={search}
                />
              </label>
              <Button className="p" disabled={!storageReady} onClick={startCreate}>
                <Icon name="plus" size={15} /> Add record
              </Button>
            </div>
          </div>

          {showForm && (
            <form className="hr-record-form" onSubmit={submitRecord}>
              <div className="hr-record-form-heading">
                <div>
                  <h3>{editingRecord ? 'Edit record' : 'Create record'}</h3>
                  <p>Complete the fields below and save your changes.</p>
                </div>
                <button
                  aria-label="Close record form"
                  className="btn-icon-close"
                  onClick={() => {
                    setEditingRecord(null)
                    setFormData({})
                    setShowForm(false)
                  }}
                  type="button"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
              <div className="hr-record-fields">
                {activeModule.fields.map((field) => (
                  <label className={`hr-record-field${field.type === 'textarea' ? ' wide' : ''}`} key={field.key}>
                    <span>
                      {field.label}
                      {field.required && <i>Required</i>}
                    </span>
                    {field.type === 'select' ? (
                      <select
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, [field.key]: event.target.value }))
                        }
                        required={field.required}
                        value={formData[field.key] || ''}
                      >
                        <option value="">Select…</option>
                        {field.options.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, [field.key]: event.target.value }))
                        }
                        rows={3}
                        value={formData[field.key] || ''}
                      />
                    ) : (
                      <input
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, [field.key]: event.target.value }))
                        }
                        required={field.required}
                        type={field.type || 'text'}
                        value={formData[field.key] || ''}
                      />
                    )}
                  </label>
                ))}
              </div>
              <div className="hr-record-form-actions">
                <Button
                  onClick={() => {
                    setEditingRecord(null)
                    setFormData({})
                    setShowForm(false)
                  }}
                  type="button"
                >
                  Cancel
                </Button>
                <Button className="p" disabled={!storageReady} type="submit">
                  <Icon name="check" size={15} /> Save record
                </Button>
              </div>
            </form>
          )}

          {visibleRecords.length ? (
            <div className="hr-record-list">
              {visibleRecords.map((record) => (
                <article className="hr-record-card" key={record.id}>
                  <div className="hr-record-card-heading">
                    <div>
                      <span className={`hr-module-icon ${activeModule.tone}`}>
                        <Icon name={activeModule.icon} size={17} />
                      </span>
                      <div>
                        <h3>{recordTitle(activeModule, record)}</h3>
                        <small>Updated {new Date(record.updatedAt || record.createdAt).toLocaleString()}</small>
                      </div>
                    </div>
                    <div>
                      <Button onClick={() => startEdit(record)}>
                        <Icon name="edit" size={14} /> Edit
                      </Button>
                      <Button className="hr-delete-button" onClick={() => deleteRecord(record)}>
                        <Icon name="trash" size={14} /> Delete
                      </Button>
                    </div>
                  </div>
                  <dl>
                    {activeModule.fields
                      .filter((field) => record.data[field.key])
                      .map((field) => (
                        <div key={field.key}>
                          <dt>{field.label}</dt>
                          <dd>{record.data[field.key]}</dd>
                        </div>
                      ))}
                  </dl>
                </article>
              ))}
            </div>
          ) : !showForm ? (
            <div className="hr-record-empty">
              <span className={`hr-module-icon ${activeModule.tone}`}>
                <Icon name={activeModule.icon} size={21} />
              </span>
              <h3>{search ? 'No matching records' : `No ${activeModule.title.toLowerCase()} records yet`}</h3>
              <p>{search ? 'Try another search.' : `Create a ${activeModule.title.toLowerCase()} record to get started.`}</p>
              {!search && (
                <Button className="p" disabled={!storageReady} onClick={startCreate}>
                  <Icon name="plus" size={15} /> Create first record
                </Button>
              )}
            </div>
          ) : null}
          <p className="hr-record-storage-note">
            <Icon name="info" size={14} /> Records are shared through the backend. The backend data files are not
            encrypted at rest; follow company policies for sensitive payroll or personal data.
          </p>
        </section>
      )}
    </section>
  )
}

export default HRPage
