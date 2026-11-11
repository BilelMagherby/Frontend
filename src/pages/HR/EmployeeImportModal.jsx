import { useMemo, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { downloadEmployeeTemplate, parseEmployeeExcel, validateExcelRows } from './employeeTemplate.js'
import { hrApi } from '../../services/hrApi.js'

export function EmployeeImportModal({ isOpen, onClose, existingEmployees = [], onImportComplete, company = '', branch = '' }) {
  const [file, setFile] = useState(null)
  const [parsedRows, setParsedRows] = useState(null)
  const [validationItems, setValidationItems] = useState([])
  const [filterTab, setFilterTab] = useState('all') // 'all' | 'ready' | 'issues'
  const [editingRowIndex, setEditingRowIndex] = useState(null)
  const [editFormData, setEditFormData] = useState({})
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [finalReport, setFinalReport] = useState(null)
  const [parsingError, setParsingError] = useState('')

  if (!isOpen) return null

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return
    setFile(selectedFile)
    setParsingError('')
    setFinalReport(null)

    try {
      const parsed = await parseEmployeeExcel(selectedFile, company, branch)
      setParsedRows(parsed)
      const validated = validateExcelRows(parsed, existingEmployees)
      setValidationItems(validated)
    } catch (err) {
      setParsingError(err.message || 'Failed to read Excel file.')
      setParsedRows(null)
      setValidationItems([])
    }
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    const droppedFile = event.dataTransfer.files?.[0]
    if (!droppedFile) return
    setFile(droppedFile)
    setParsingError('')
    setFinalReport(null)

    try {
      const parsed = await parseEmployeeExcel(droppedFile, company, branch)
      setParsedRows(parsed)
      const validated = validateExcelRows(parsed, existingEmployees)
      setValidationItems(validated)
    } catch (err) {
      setParsingError(err.message || 'Failed to read Excel file.')
      setParsedRows(null)
      setValidationItems([])
    }
  }

  const toggleRowSelection = (index) => {
    setValidationItems((current) =>
      current.map((item) => (item.index === index ? { ...item, selected: !item.selected } : item))
    )
  }

  const selectAllValid = () => {
    setValidationItems((current) =>
      current.map((item) => ({ ...item, selected: item.status === 'ready' }))
    )
  }

  const deselectAll = () => {
    setValidationItems((current) =>
      current.map((item) => ({ ...item, selected: false }))
    )
  }

  const skipAllErrors = () => {
    setValidationItems((current) =>
      current.map((item) => ({ ...item, selected: item.status === 'ready' }))
    )
  }

  // Row inline edit handlers
  const startEditRow = (item) => {
    setEditingRowIndex(item.index)
    setEditFormData({
      firstName: item.employee.data.firstName || '',
      lastName: item.employee.data.lastName || '',
      serialNumber: item.employee.data.serialNumber || '',
      dob: item.employee.data.dob || '',
      email: item.employee.data.email || '',
      phone: item.employee.data.phone || '',
      position: item.employee.data.position || '',
      monthlySalary: item.employee.data.monthlySalary || '',
    })
  }

  const saveEditRow = () => {
    if (editingRowIndex === null) return
    const updatedEmployees = parsedRows.map((emp, idx) => {
      if (idx !== editingRowIndex) return emp
      return {
        ...emp,
        data: {
          ...emp.data,
          ...editFormData,
          name: `${editFormData.firstName} ${editFormData.lastName}`.trim(),
          employeeId: editFormData.serialNumber,
          serialNumber: editFormData.serialNumber,
        },
      }
    })
    setParsedRows(updatedEmployees)
    const revalidated = validateExcelRows(updatedEmployees, existingEmployees)
    setValidationItems(revalidated)
    setEditingRowIndex(null)
  }

  // Counts
  const readyCount = validationItems.filter((i) => i.status === 'ready').length
  const duplicateCount = validationItems.filter((i) => i.status === 'duplicate').length
  const errorCount = validationItems.filter((i) => i.status === 'error').length
  const selectedCount = validationItems.filter((i) => i.selected).length

  // Filtered preview items
  const displayedItems = useMemo(() => {
    if (filterTab === 'ready') return validationItems.filter((i) => i.status === 'ready')
    if (filterTab === 'issues') return validationItems.filter((i) => i.status !== 'ready')
    return validationItems
  }, [filterTab, validationItems])

  // Execute Import
  const handleExecuteImport = async () => {
    const toImport = validationItems
      .filter((item) => item.selected)
      .map((item) => item.employee.data)

    if (!toImport.length) return

    setImporting(true)
    setImportProgress(10)

    try {
      setImportProgress(40)
      const res = await hrApi.importEmployees(toImport)
      setImportProgress(100)

      const skippedCount = validationItems.length - toImport.length
      setFinalReport({
        success: true,
        imported: res.importedCount || toImport.length,
        skipped: skippedCount,
        failed: res.failedCount || 0,
        failedRows: res.failedRows || [],
      })

      if (onImportComplete) {
        onImportComplete()
      }
    } catch (err) {
      setFinalReport({
        success: false,
        error: err.message || 'Import failed while saving records to database.',
      })
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setParsedRows(null)
    setValidationItems([])
    setFinalReport(null)
    setParsingError('')
  }

  return (
    <div className="hr-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="hr-modal-card hr-import-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="hr-modal-header">
          <div>
            <h2><Icon name="upload" size={20} /> Excel Employee Import System</h2>
            <p>Upload your employee Excel sheet, validate rows, resolve duplicates, and batch-save to the database.</p>
          </div>
          <button className="btn-icon-close" onClick={onClose} type="button" aria-label="Close modal">
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="hr-modal-body">
          {/* Step 1: Upload / Dropzone if no file or reset */}
          {!parsedRows && !finalReport && (
            <div className="hr-import-upload-zone">
              <div
                className="hr-dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <span className="hr-dropzone-icon"><Icon name="file-text" size={38} /></span>
                <h3>Drag and drop your Excel spreadsheet here</h3>
                <p>Supports .xlsx and .xls files generated from our employee template.</p>

                <div className="hr-dropzone-actions">
                  <label className="hr-upload-btn-styled">
                    <Icon name="upload" size={15} /> Select File
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button className="hr-template-download-btn" onClick={downloadEmployeeTemplate} type="button">
                    <Icon name="download" size={15} /> Download template employee (.xlsx)
                  </button>
                </div>
              </div>

              {parsingError && (
                <div className="hr-import-alert error">
                  <Icon name="alert-triangle" size={16} />
                  <span>{parsingError}</span>
                </div>
              )}

              <div className="hr-import-instructions">
                <h4><Icon name="info" size={15} /> How to prepare your employee file:</h4>
                <ul>
                  <li>Use the <strong>download template employee</strong> button above to get the standard format.</li>
                  <li>Required fields: <strong>First Name, Last Name, Serial Number, Date of Birth, Email Address</strong>.</li>
                  <li>Ensure each employee has a <strong>unique Serial Number</strong> to prevent duplicates.</li>
                  <li>Salary, job entitlement, and bank information will automatically map into the employee profile.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Interactive Preview and Row Validation */}
          {parsedRows && !finalReport && (
            <div className="hr-import-preview-container">
              {/* Stats Bar */}
              <div className="hr-import-stats-bar">
                <div className="hr-stat-pill total">
                  <span>Total Rows</span>
                  <strong>{validationItems.length}</strong>
                </div>
                <div className="hr-stat-pill ready">
                  <span>Ready to Import</span>
                  <strong>{readyCount}</strong>
                </div>
                {duplicateCount > 0 && (
                  <div className="hr-stat-pill duplicate">
                    <span>Duplicates</span>
                    <strong>{duplicateCount}</strong>
                  </div>
                )}
                {errorCount > 0 && (
                  <div className="hr-stat-pill error">
                    <span>Errors / Missing</span>
                    <strong>{errorCount}</strong>
                  </div>
                )}
                <div className="hr-stat-pill selected">
                  <span>Selected</span>
                  <strong>{selectedCount}</strong>
                </div>
              </div>

              {/* Toolbar */}
              <div className="hr-import-toolbar">
                <div className="hr-import-filter-tabs">
                  <button
                    className={`hr-tab-pill ${filterTab === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterTab('all')}
                    type="button"
                  >
                    All Rows ({validationItems.length})
                  </button>
                  <button
                    className={`hr-tab-pill ${filterTab === 'ready' ? 'active' : ''}`}
                    onClick={() => setFilterTab('ready')}
                    type="button"
                  >
                    Ready ({readyCount})
                  </button>
                  <button
                    className={`hr-tab-pill ${filterTab === 'issues' ? 'active' : ''}`}
                    onClick={() => setFilterTab('issues')}
                    type="button"
                  >
                    Needs Attention ({duplicateCount + errorCount})
                  </button>
                </div>

                <div className="hr-import-quick-actions">
                  <button className="hr-btn-text" onClick={selectAllValid} type="button">Select all ready</button>
                  <button className="hr-btn-text" onClick={deselectAll} type="button">Deselect all</button>
                  {(duplicateCount > 0 || errorCount > 0) && (
                    <button className="hr-btn-text skip" onClick={skipAllErrors} type="button">Skip invalid rows</button>
                  )}
                  <button className="hr-btn-text reset" onClick={handleReset} type="button">Choose another file</button>
                </div>
              </div>

              {/* Table Preview */}
              <div className="hr-import-table-wrapper">
                <table className="hr-import-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <input
                          type="checkbox"
                          checked={selectedCount === displayedItems.length && displayedItems.length > 0}
                          onChange={(e) => {
                            const check = e.target.checked
                            setValidationItems((current) =>
                              current.map((item) => (displayedItems.some((d) => d.index === item.index) ? { ...item, selected: check } : item))
                            )
                          }}
                        />
                      </th>
                      <th>Row</th>
                      <th>Status</th>
                      <th>Serial Number</th>
                      <th>Employee Name</th>
                      <th>Email Address</th>
                      <th>Position / Job</th>
                      <th>Monthly Salary</th>
                      <th>Validation Note</th>
                      <th style={{ width: 60 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedItems.map((item) => {
                      const emp = item.employee.data
                      const isEditing = editingRowIndex === item.index
                      return (
                        <tr
                          key={item.index}
                          className={`hr-import-row ${item.status} ${item.selected ? 'is-selected' : ''}`}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => toggleRowSelection(item.index)}
                            />
                          </td>
                          <td>#{item.index + 1}</td>
                          <td>
                            <span className={`hr-row-badge ${item.status}`}>
                              {item.status === 'ready' && <><Icon name="check" size={12} /> Ready</>}
                              {item.status === 'duplicate' && <><Icon name="alert-triangle" size={12} /> Duplicate</>}
                              {item.status === 'error' && <><Icon name="close" size={12} /> Error</>}
                            </span>
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                className="hr-cell-input"
                                value={editFormData.serialNumber}
                                onChange={(e) => setEditFormData({ ...editFormData, serialNumber: e.target.value })}
                              />
                            ) : (
                              <strong>{emp.serialNumber || '—'}</strong>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <input
                                  className="hr-cell-input"
                                  placeholder="First"
                                  value={editFormData.firstName}
                                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                                />
                                <input
                                  className="hr-cell-input"
                                  placeholder="Last"
                                  value={editFormData.lastName}
                                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                                />
                              </div>
                            ) : (
                              <span>{emp.name || '—'}</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                className="hr-cell-input"
                                value={editFormData.email}
                                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                              />
                            ) : (
                              <small>{emp.email || '—'}</small>
                            )}
                          </td>
                          <td>{emp.position || emp.jobTitle || '—'}</td>
                          <td>{emp.monthlySalary ? `${Number(emp.monthlySalary).toLocaleString()} SAR` : '—'}</td>
                          <td>
                            {item.errors.length > 0 ? (
                              <span className="hr-error-text">{item.errors.join(' ')}</span>
                            ) : item.warnings.length > 0 ? (
                              <span className="hr-warning-text">{item.warnings.join(' ')}</span>
                            ) : (
                              <span className="hr-ok-text">Valid record</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <button className="hr-cell-action-btn save" onClick={saveEditRow} type="button" title="Save row">
                                <Icon name="check" size={14} />
                              </button>
                            ) : (
                              <button className="hr-cell-action-btn" onClick={() => startEditRow(item)} type="button" title="Fix / Edit row">
                                <Icon name="edit" size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 3: Final Import Report */}
          {finalReport && (
            <div className="hr-import-report">
              {finalReport.success ? (
                <>
                  <div className="hr-report-header success">
                    <span className="hr-report-icon"><Icon name="check" size={36} /></span>
                    <h3>Employee Import Complete!</h3>
                    <p>All validated employee records were saved permanently into the backend database.</p>
                  </div>
                  <div className="hr-report-stats">
                    <div className="hr-report-stat green">
                      <strong>{finalReport.imported}</strong>
                      <span>Employees Imported</span>
                    </div>
                    <div className="hr-report-stat gray">
                      <strong>{finalReport.skipped}</strong>
                      <span>Skipped / Excluded</span>
                    </div>
                    {finalReport.failed > 0 && (
                      <div className="hr-report-stat red">
                        <strong>{finalReport.failed}</strong>
                        <span>Failed</span>
                      </div>
                    )}
                  </div>
                  {finalReport.failedRows?.length > 0 && (
                    <div className="hr-report-failures">
                      <h4>Failed Rows:</h4>
                      <ul>
                        {finalReport.failedRows.map((f, i) => (
                          <li key={i}>Row #{f.row} ({f.serialNumber}): {f.error || f.errors?.join(', ')}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="hr-report-header error">
                  <span className="hr-report-icon"><Icon name="alert-triangle" size={36} /></span>
                  <h3>Import Failed</h3>
                  <p>{finalReport.error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="hr-modal-footer">
          {finalReport ? (
            <Button className="p" onClick={onClose}>Done</Button>
          ) : parsedRows ? (
            <>
              <Button onClick={handleReset} disabled={importing}>Cancel</Button>
              <Button
                className="p"
                disabled={selectedCount === 0 || importing}
                onClick={handleExecuteImport}
              >
                {importing ? (
                  <>Processing ({importProgress}%)…</>
                ) : (
                  <><Icon name="database" size={15} /> Import {selectedCount} Employee(s) into Database</>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>Close</Button>
          )}
        </div>
      </div>
    </div>
  )
}
