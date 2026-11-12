import { useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { api } from '../../services/api.js'
import { hrApi } from '../../services/hrApi.js'

const DOCUMENT_CATEGORIES = [
  'Passport',
  'National ID / Iqama',
  'Employment Contract',
  'Certificates & Qualifications',
  'Bank Documents',
  'Other HR Documents',
]

export function EmployeeProfileModal({
  isOpen,
  onClose,
  employee,
  onEdit,
  onDelete,
  onEmployeeUpdated,
}) {
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'general' | 'personal' | 'job' | 'salary' | 'bank' | 'documents'
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(DOCUMENT_CATEGORIES[0])
  const [docFile, setDocFile] = useState(null)
  const [docError, setDocError] = useState('')
  const [docSuccess, setDocSuccess] = useState('')
  const [deleteConfirmDocId, setDeleteConfirmDocId] = useState(null)

  if (!isOpen || !employee) return null

  const d = employee.data || employee
  const documents = Array.isArray(d.documents) ? d.documents : []

  // Download Employee Information (Structured Card / JSON / Text export)
  const downloadEmployeeInformation = () => {
    const dataToExport = {
      Identification: {
        'Full Name': d.name,
        'First Name': d.firstName,
        'Last Name': d.lastName,
        'Serial Number': d.serialNumber || d.employeeId,
        'Date of Birth': d.dob,
        'Email Address': d.email,
        'Phone Number': d.phone,
      },
      Personal: {
        'Employee Type': d.foreignOrLocal,
        Nationality: d.nationality,
        'ID / Iqama Number': d.iqamaNumber,
        'Passport Number': d.passportNumber,
        Address: d.address,
      },
      Employment: {
        Company: d.company,
        Branch: d.branch,
        Department: d.department,
        Position: d.position || d.jobTitle,
        Status: d.status,
        'Contract Type': d.contractType,
        'Start Date': d.startDate || d.contractStart,
        'End Date': d.endDate || d.contractEnd,
        'Working Days': Array.isArray(d.workingDays) ? d.workingDays.join(', ') : d.workingDays,
        'Holiday Entitlement': `${d.annualHolidayEntitlement ?? d.holidayDays ?? 30} days`,
        'Holiday Balance': `${d.openingHolidayBalance ?? 0} days`,
      },
      Compensation: {
        'Monthly Salary': `${Number(d.monthlySalary || d.basicSalary || 0).toLocaleString()} SAR`,
        'Annual Salary': `${Number(d.annualSalary || 0).toLocaleString()} SAR`,
        'Overtime Rate': `${Number(d.overtimeRate || 0)} SAR/hr`,
      },
      Banking: {
        'Bank Name': d.bankName,
        'Account Number': d.accountNumber,
        IBAN: d.iban,
        'Route Swift': d.routeSwift,
        'Bank Country': d.bankCountry,
      },
      'Generated At': new Date().toISOString(),
    }

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToExport, null, 2))}`
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', jsonString)
    downloadAnchor.setAttribute('download', `${d.serialNumber || 'employee'}_${(d.name || 'profile').replace(/\s+/g, '_')}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  // Upload document
  const handleUploadDocument = async (e) => {
    e.preventDefault()
    if (!docFile) {
      setDocError('Please choose a file to upload.')
      return
    }
    setDocError('')
    setDocSuccess('')
    setUploadingDoc(true)

    try {
      const docItem = await hrApi.uploadEmployeeDocument(employee.id, docFile, selectedCategory)
      setDocSuccess(`Successfully uploaded ${docFile.name}`)
      setDocFile(null)
      // Reset file input
      const input = document.getElementById('hr-profile-doc-file-input')
      if (input) input.value = ''

      if (onEmployeeUpdated) {
        const updated = {
          ...employee,
          data: {
            ...d,
            documents: [...documents, docItem],
          },
        }
        onEmployeeUpdated(updated)
      }
    } catch (err) {
      setDocError(err.message || 'Failed to upload document.')
    } finally {
      setUploadingDoc(false)
    }
  }

  // Delete document
  const handleDeleteDocument = async (doc) => {
    try {
      await hrApi.deleteEmployeeDocument(employee.id, doc.id, doc.fileId)
      if (onEmployeeUpdated) {
        const updated = {
          ...employee,
          data: {
            ...d,
            documents: documents.filter((item) => item.id !== doc.id),
          },
        }
        onEmployeeUpdated(updated)
      }
      setDeleteConfirmDocId(null)
    } catch (err) {
      setDocError(err.message || 'Failed to delete document.')
    }
  }

  // Download document
  const handleDownloadDoc = async (doc) => {
    try {
      const blob = await api.downloadFile(doc.fileId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.name || 'document'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      window.open(api.fileUrl(doc.fileId), '_blank')
    }
  }

  return (
    <div className="hr-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="hr-modal-card hr-profile-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header Hero */}
        <div className="hr-profile-hero">
          <div className="hr-profile-avatar-wrap">
            <div className="hr-profile-avatar">
              {(d.name || 'E').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <div className="hr-profile-title-row">
                <h2>{d.name || 'Employee Profile'}</h2>
                <span className={`hr-status-pill ${d.status || 'Active'}`}>{d.status || 'Active'}</span>
                <span className="hr-serial-pill">{d.serialNumber || d.employeeId}</span>
              </div>
              <p className="hr-profile-subtitle">
                <strong>{d.position || d.jobTitle || 'Unassigned Position'}</strong>
                {d.department && ` · ${d.department}`}
                {d.company && ` · ${d.company}`}
                {d.branch && ` (${d.branch})`}
              </p>
              <div className="hr-profile-chips">
                {d.email && <span><Icon name="mail" size={13} /> {d.email}</span>}
                {d.phone && <span><Icon name="phone" size={13} /> {d.phone}</span>}
                {d.nationality && <span><Icon name="globe" size={13} /> {d.nationality} ({d.foreignOrLocal || 'Local'})</span>}
              </div>
            </div>
          </div>

          <div className="hr-profile-hero-actions">
            <button className="hr-profile-btn" onClick={downloadEmployeeInformation} type="button" title="Download summary report">
              <Icon name="download" size={14} /> Download Info
            </button>
            <button className="hr-profile-btn" onClick={() => { onClose(); onEdit(employee) }} type="button">
              <Icon name="edit" size={14} /> Edit
            </button>
            <button className="hr-profile-btn danger" onClick={() => onDelete(employee)} type="button">
              <Icon name="trash" size={14} /> Delete
            </button>
            <button className="btn-icon-close" onClick={onClose} type="button" aria-label="Close">
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="hr-profile-tabs">
          <button
            type="button"
            className={`hr-tab-link ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Icon name="dashboard" size={15} /> Overview
          </button>
          <button
            type="button"
            className={`hr-tab-link ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Icon name="users" size={15} /> General Information
          </button>
          <button
            type="button"
            className={`hr-tab-link ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            <Icon name="user" size={15} /> Personal Information
          </button>
          <button
            type="button"
            className={`hr-tab-link ${activeTab === 'job' ? 'active' : ''}`}
            onClick={() => setActiveTab('job')}
          >
            <Icon name="briefcase" size={15} /> Job Information
          </button>
          <button
            type="button"
            className={`hr-tab-link ${activeTab === 'salary' ? 'active' : ''}`}
            onClick={() => setActiveTab('salary')}
          >
            <Icon name="wallet" size={15} /> Salary &amp; Shifts
          </button>
          <button
            type="button"
            className={`hr-tab-link ${activeTab === 'bank' ? 'active' : ''}`}
            onClick={() => setActiveTab('bank')}
          >
            <Icon name="credit-card" size={15} /> Bank Information
          </button>
          <button
            type="button"
            className={`hr-tab-link ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <Icon name="file-text" size={15} /> Documents ({documents.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="hr-profile-body">
          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="hr-profile-overview-tab">
              <div className="hr-kpi-cards-grid">
                <div className="hr-kpi-card">
                  <span className="hr-kpi-icon blue"><Icon name="wallet" size={20} /></span>
                  <div>
                    <small>Monthly Salary</small>
                    <strong>{d.monthlySalary ? `${Number(d.monthlySalary).toLocaleString()} SAR` : 'Not Set'}</strong>
                    <span>Annual: {d.annualSalary ? `${Number(d.annualSalary).toLocaleString()} SAR` : '—'}</span>
                  </div>
                </div>

                <div className="hr-kpi-card">
                  <span className="hr-kpi-icon teal"><Icon name="calendar" size={20} /></span>
                  <div>
                    <small>Annual Leave Entitlement</small>
                    <strong>{d.annualHolidayEntitlement ?? d.holidayDays ?? 30} Days</strong>
                    <span>Opening Balance: {d.openingHolidayBalance ?? 0} Days</span>
                  </div>
                </div>

                <div className="hr-kpi-card">
                  <span className="hr-kpi-icon amber"><Icon name="clock" size={20} /></span>
                  <div>
                    <small>Working Days</small>
                    <strong>{Array.isArray(d.workingDays) ? `${d.workingDays.length} Days/wk` : '5 Days/wk'}</strong>
                    <span>{Array.isArray(d.workingDays) ? d.workingDays.map((d) => d.slice(0, 3)).join(', ') : 'Sun - Thu'}</span>
                  </div>
                </div>

                <div className="hr-kpi-card">
                  <span className="hr-kpi-icon violet"><Icon name="file-text" size={20} /></span>
                  <div>
                    <small>Uploaded Documents</small>
                    <strong>{documents.length} Files</strong>
                    <span>Verified in Backend</span>
                  </div>
                </div>
              </div>

              <div className="hr-overview-sections-grid">
                <div className="hr-overview-box">
                  <h4>Key Employee Details</h4>
                  <dl className="hr-details-list">
                    <div><dt>Full Legal Name</dt><dd>{d.name || '—'}</dd></div>
                    <div><dt>Serial / ID</dt><dd>{d.serialNumber || d.employeeId || '—'}</dd></div>
                    <div><dt>National ID / Iqama</dt><dd>{d.iqamaNumber || '—'}</dd></div>
                    <div><dt>Date of Birth</dt><dd>{d.dob || '—'}</dd></div>
                    <div><dt>Start Date</dt><dd>{d.startDate || d.contractStart || '—'}</dd></div>
                    <div><dt>Company &amp; Branch</dt><dd>{d.company || 'Natheelco'} · {d.branch || 'Main'}</dd></div>
                  </dl>
                </div>

                <div className="hr-overview-box">
                  <h4>Banking &amp; Payroll Summary</h4>
                  <dl className="hr-details-list">
                    <div><dt>Bank Name</dt><dd>{d.bankName || '—'}</dd></div>
                    <div><dt>Account Number</dt><dd>{d.accountNumber || '—'}</dd></div>
                    <div><dt>IBAN</dt><dd className="mono">{d.iban || '—'}</dd></div>
                    <div><dt>SWIFT / Route</dt><dd className="mono">{d.routeSwift || d.swiftCode || '—'}</dd></div>
                    <div><dt>Overtime Rate</dt><dd>{d.overtimeRate ? `${d.overtimeRate} SAR/hr` : '—'}</dd></div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: General Information */}
          {activeTab === 'general' && (
            <div className="hr-profile-detail-section">
              <h3>General Information</h3>
              <dl className="hr-grid-details">
                <div><dt>First Name</dt><dd>{d.firstName || (d.name ? d.name.split(' ')[0] : '—')}</dd></div>
                <div><dt>Last Name</dt><dd>{d.lastName || (d.name ? d.name.split(' ').slice(1).join(' ') : '—')}</dd></div>
                <div><dt>Full Name</dt><dd>{d.name || '—'}</dd></div>
                <div><dt>Employee Serial Number</dt><dd><b>{d.serialNumber || d.employeeId || '—'}</b></dd></div>
                <div><dt>Date of Birth</dt><dd>{d.dob || '—'}</dd></div>
                <div><dt>Email Address</dt><dd><a href={`mailto:${d.email}`}>{d.email || '—'}</a></dd></div>
                <div><dt>Company / Project</dt><dd>{d.company || '—'}</dd></div>
                <div><dt>Branch</dt><dd>{d.branch || '—'}</dd></div>
              </dl>
            </div>
          )}

          {/* Tab 3: Personal Information */}
          {activeTab === 'personal' && (
            <div className="hr-profile-detail-section">
              <h3>Personal Information</h3>
              <dl className="hr-grid-details">
                <div><dt>Phone Number</dt><dd>{d.phone ? <a href={`tel:${d.phone}`}>{d.phone}</a> : '—'}</dd></div>
                <div><dt>Employee Type</dt><dd>{d.foreignOrLocal || 'Local'}</dd></div>
                <div><dt>Nationality</dt><dd>{d.nationality || '—'}</dd></div>
                <div><dt>National ID / Iqama Number</dt><dd><b>{d.iqamaNumber || '—'}</b></dd></div>
                <div><dt>Passport Number</dt><dd>{d.passportNumber || '—'}</dd></div>
                <div className="full-width"><dt>Residential Address</dt><dd>{d.address || '—'}</dd></div>
              </dl>
            </div>
          )}

          {/* Tab 4: Job Information */}
          {activeTab === 'job' && (
            <div className="hr-profile-detail-section">
              <h3>Job Information</h3>
              <dl className="hr-grid-details">
                <div><dt>Position / Job Title</dt><dd><b>{d.position || d.jobTitle || '—'}</b></dd></div>
                <div><dt>Department</dt><dd>{d.department || '—'}</dd></div>
                <div><dt>Qualification</dt><dd>{d.qualification || '—'}</dd></div>
                <div><dt>Employment Status</dt><dd><span className={`hr-status-pill ${d.status || 'Active'}`}>{d.status || 'Active'}</span></dd></div>
                <div><dt>Contract Type</dt><dd>{d.contractType || 'Permanent'}</dd></div>
                <div><dt>Annual Holiday Entitlement</dt><dd>{d.annualHolidayEntitlement ?? d.holidayDays ?? 30} Days</dd></div>
                <div><dt>Opening Holiday Balance</dt><dd>{d.openingHolidayBalance ?? 0} Days</dd></div>
              </dl>
            </div>
          )}

          {/* Tab 5: Salary and Shifts */}
          {activeTab === 'salary' && (
            <div className="hr-profile-detail-section">
              <h3>Salary and Shifts Information</h3>
              <dl className="hr-grid-details">
                <div><dt>Monthly Salary</dt><dd><b>{d.monthlySalary ? `${Number(d.monthlySalary).toLocaleString()} SAR` : '—'}</b></dd></div>
                <div><dt>Annual Salary</dt><dd><b>{d.annualSalary ? `${Number(d.annualSalary).toLocaleString()} SAR` : '—'}</b></dd></div>
                <div><dt>Overtime Rate Per Hour</dt><dd>{d.overtimeRate ? `${d.overtimeRate} SAR/hr` : '—'}</dd></div>
                <div><dt>Employment Start Date</dt><dd>{d.startDate || d.contractStart || '—'}</dd></div>
                <div><dt>Employment End Date</dt><dd>{d.endDate || d.contractEnd || 'Ongoing / Indefinite'}</dd></div>
                <div className="full-width">
                  <dt>Working Days of the Week</dt>
                  <dd>
                    <div className="hr-days-badges">
                      {Array.isArray(d.workingDays) && d.workingDays.length > 0 ? (
                        d.workingDays.map((day) => <span key={day} className="hr-day-badge">{day}</span>)
                      ) : (
                        <span>{d.workingDays || 'Sunday, Monday, Tuesday, Wednesday, Thursday'}</span>
                      )}
                    </div>
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Tab 6: Bank Information */}
          {activeTab === 'bank' && (
            <div className="hr-profile-detail-section">
              <h3>Bank Information</h3>
              <dl className="hr-grid-details">
                <div><dt>Bank Name</dt><dd><b>{d.bankName || '—'}</b></dd></div>
                <div><dt>Account Number</dt><dd className="mono">{d.accountNumber || '—'}</dd></div>
                <div className="full-width"><dt>IBAN</dt><dd className="mono large">{d.iban || '—'}</dd></div>
                <div><dt>Route Swift / Routing Number</dt><dd className="mono">{d.routeSwift || d.routingNumber || '—'}</dd></div>
                <div><dt>SWIFT / BIC Code</dt><dd className="mono">{d.swiftCode || d.routeSwift || '—'}</dd></div>
                <div><dt>Bank Country</dt><dd>{d.bankCountry || '—'}</dd></div>
              </dl>
            </div>
          )}

          {/* Tab 7: Documents Management */}
          {activeTab === 'documents' && (
            <div className="hr-profile-docs-tab">
              <div className="hr-docs-upload-box">
                <h4><Icon name="upload" size={16} /> Upload New Employee Document</h4>
                <p>Support PDF, JPG, PNG, and Office documents. Stored securely on the backend.</p>

                <form className="hr-docs-upload-form" onSubmit={handleUploadDocument}>
                  <div className="hr-docs-upload-inputs">
                    <label>
                      <span>Document Category</span>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        {DOCUMENT_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Choose File</span>
                      <input
                        id="hr-profile-doc-file-input"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      />
                    </label>

                    <Button className="p" type="submit" disabled={!docFile || uploadingDoc}>
                      <Icon name="upload" size={14} />
                      {uploadingDoc ? 'Uploading…' : 'Upload Document'}
                    </Button>
                  </div>

                  {docError && <div className="hr-doc-alert error">{docError}</div>}
                  {docSuccess && <div className="hr-doc-alert success">{docSuccess}</div>}
                </form>
              </div>

              <div className="hr-docs-list-box">
                <h4>Attached Documents ({documents.length})</h4>
                {documents.length > 0 ? (
                  <div className="hr-docs-grid">
                    {documents.map((doc) => (
                      <div className="hr-doc-card" key={doc.id}>
                        <div className="hr-doc-icon">
                          <Icon name="file-text" size={24} />
                        </div>
                        <div className="hr-doc-info">
                          <strong>{doc.name}</strong>
                          <div className="hr-doc-meta">
                            <span className="hr-doc-category-badge">{doc.category || 'Document'}</span>
                            {doc.size ? <span>{(doc.size / 1024).toFixed(1)} KB</span> : null}
                            {doc.uploadedAt ? <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span> : null}
                          </div>
                        </div>
                        <div className="hr-doc-actions">
                          <button
                            type="button"
                            className="hr-doc-btn"
                            onClick={() => handleDownloadDoc(doc)}
                            title="Download or Preview"
                          >
                            <Icon name="download" size={14} /> Download
                          </button>
                          {deleteConfirmDocId === doc.id ? (
                            <div className="hr-doc-delete-confirm">
                              <span>Sure?</span>
                              <button
                                type="button"
                                className="hr-doc-confirm-yes"
                                onClick={() => handleDeleteDocument(doc)}
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                className="hr-doc-confirm-no"
                                onClick={() => setDeleteConfirmDocId(null)}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="hr-doc-btn delete"
                              onClick={() => setDeleteConfirmDocId(doc.id)}
                              title="Delete file"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="hr-docs-empty">
                    <Icon name="file-text" size={32} />
                    <p>No documents uploaded for this employee yet. Use the upload box above to attach contracts, IDs, or certificates.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="hr-modal-footer">
          <Button onClick={onClose}>Close Profile</Button>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={downloadEmployeeInformation}>
              <Icon name="download" size={14} /> Download Profile (JSON)
            </Button>
            <Button className="p" onClick={() => { onClose(); onEdit(employee) }}>
              <Icon name="edit" size={14} /> Edit Employee
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

