import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { api } from '../../services/api.js'
import { hrApi } from '../../services/hrApi.js'
import { downloadEmployeeTemplate } from './employeeTemplate.js'
import { EmployeeFormModal } from './EmployeeFormModal.jsx'
import { EmployeeProfileModal } from './EmployeeProfileModal.jsx'
import { EmployeeImportModal } from './EmployeeImportModal.jsx'

const HR_COMPANIES = ['Natheelco', 'Hajiss Café', 'Odun Pide', 'Ghalia', 'Dani Designs']

const TODAY = () => new Date().toISOString().slice(0, 10)
const CURRENT_PERIOD = () => new Date().toISOString().slice(0, 7)
const asAmount = (value) => Number(value) || 0
const formatMoney = (value) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(value)

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? '')
          return `"${text.replaceAll('"', '""')}"`
        })
        .join(',')
    )
    .join('\r\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export function HRWorkspace() {
  // Navigation / Views
  const [activeTab, setActiveTab] = useState('employees') // 'employees' | 'attendance' | 'leave' | 'payroll' | 'shifts' | 'holidays' | 'recruitment' | 'policies' | 'activity'
  const [viewMode, setViewMode] = useState('table') // 'table' | 'cards'

  // Data
  const [records, setRecords] = useState([])
  const [storageReady, setStorageReady] = useState(false)
  const [storageError, setStorageError] = useState('')
  const [toastMessage, setToastMessage] = useState(null)

  // Filters & Search for Employee Directory
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [nationalityFilter, setNationalityFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')

  // Sorting & Pagination
  const [sortField, setSortField] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [employeeToEdit, setEmployeeToEdit] = useState(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [selectedProfileEmployee, setSelectedProfileEmployee] = useState(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [deleteConfirmEmployee, setDeleteConfirmEmployee] = useState(null)

  // Operations Submodules State
  const [submoduleEditingRecord, setSubmoduleEditingRecord] = useState(null)
  const [submoduleFormData, setSubmoduleFormData] = useState({})
  const [showSubmoduleForm, setShowSubmoduleForm] = useState(false)

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type })
    window.setTimeout(() => setToastMessage(null), 5000)
  }

  // Load all HR records from backend database
  const loadRecords = async () => {
    try {
      const rows = await api.list('hr')
      setRecords(rows.map((row) => ({ ...row.data, id: row.id })))
      setStorageError('')
    } catch (error) {
      setStorageError(`Could not load HR records from database: ${error.message}`)
    } finally {
      setStorageReady(true)
    }
  }

  useEffect(() => {
    let active = true
    const init = async () => {
      try {
        const rows = await api.list('hr')
        if (active) {
          setRecords(rows.map((row) => ({ ...row.data, id: row.id })))
        }
      } catch (error) {
        if (active) setStorageError(`Could not load HR records: ${error.message}`)
      } finally {
        if (active) setStorageReady(true)
      }
    }
    init()

    const poll = window.setInterval(() => {
      if (!document.hidden) loadRecords()
    }, 15000)

    return () => {
      active = false
      window.clearInterval(poll)
    }
  }, [])

  // Live Records & Scoping
  const liveRecords = useMemo(() => records.filter((r) => !r.archivedAt), [records])
  const scopedRecords = useMemo(
    () =>
      liveRecords.filter(
        (r) =>
          (!companyFilter || r.data?.company === companyFilter) &&
          (!branchFilter || r.data?.branch === branchFilter)
      ),
    [liveRecords, companyFilter, branchFilter]
  )

  // Extract Employees
  const allEmployees = useMemo(
    () => scopedRecords.filter((r) => r.module === 'employees'),
    [scopedRecords]
  )

  // KPI Calculations
  const stats = useMemo(() => {
    const total = allEmployees.length
    const active = allEmployees.filter((e) => (e.data?.status || 'Active') === 'Active').length
    const inactive = allEmployees.filter((e) => e.data?.status === 'Inactive').length

    // Employees on leave
    const leaveSet = new Set(
      scopedRecords
        .filter(
          (r) =>
            r.module === 'leave' &&
            r.data?.status === 'Approved' &&
            r.data?.startDate <= TODAY() &&
            r.data?.endDate >= TODAY()
        )
        .map((r) => r.data?.employee)
    )
    const onLeave = allEmployees.filter((e) => e.data?.status === 'On leave' || leaveSet.has(e.data?.name)).length

    // New employees (joined within 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
    const newEmployees = allEmployees.filter((e) => {
      const start = e.data?.startDate || e.data?.contractStart || e.createdAt?.slice(0, 10) || ''
      return start && start >= ninetyDaysAgo
    }).length

    return { total, active, inactive, onLeave, newEmployees }
  }, [allEmployees, scopedRecords])

  // Filter options dynamically collected from employee records
  const filterOptions = useMemo(() => {
    const nationalities = [...new Set(allEmployees.map((e) => e.data?.nationality).filter(Boolean))].sort()
    const departments = [...new Set(allEmployees.map((e) => e.data?.department).filter(Boolean))].sort()
    const positions = [...new Set(allEmployees.map((e) => e.data?.position || e.data?.jobTitle).filter(Boolean))].sort()
    const companies = [...new Set([...HR_COMPANIES, ...liveRecords.map((r) => r.data?.company).filter(Boolean)])].sort()
    const branches = [
      ...new Set(
        liveRecords
          .filter((r) => !companyFilter || r.data?.company === companyFilter)
          .map((r) => r.data?.branch)
          .filter(Boolean)
      ),
    ].sort()

    return { nationalities, departments, positions, companies, branches }
  }, [allEmployees, liveRecords, companyFilter])

  // Filtered & Sorted Employees
  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase()

    let result = allEmployees.filter((emp) => {
      const d = emp.data || {}
      if (statusFilter && d.status !== statusFilter) return false
      if (nationalityFilter && d.nationality !== nationalityFilter) return false
      if (departmentFilter && d.department !== departmentFilter) return false
      if (positionFilter && (d.position || d.jobTitle) !== positionFilter) return false

      if (q) {
        const text = `${d.name || ''} ${d.serialNumber || ''} ${d.employeeId || ''} ${d.email || ''} ${d.iqamaNumber || ''} ${d.phone || ''} ${d.position || ''} ${d.department || ''}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })

    result.sort((a, b) => {
      let valA = a.data?.[sortField] ?? ''
      let valB = b.data?.[sortField] ?? ''
      if (sortField === 'name') {
        valA = a.data?.name || ''
        valB = b.data?.name || ''
      }
      if (sortField === 'salary') {
        valA = Number(a.data?.monthlySalary || 0)
        valB = Number(b.data?.monthlySalary || 0)
        return sortOrder === 'asc' ? valA - valB : valB - valA
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA
      }
      return sortOrder === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA))
    })

    return result
  }, [allEmployees, search, statusFilter, nationalityFilter, departmentFilter, positionFilter, sortField, sortOrder])

  // Paginated Employees
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredEmployees.slice(start, start + pageSize)
  }, [filteredEmployees, page, pageSize])

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize))

  // Handlers for Employees
  const handleOpenCreateForm = () => {
    setEmployeeToEdit(null)
    setIsFormOpen(true)
  }

  const handleOpenEditForm = (employee) => {
    setEmployeeToEdit(employee)
    setIsFormOpen(true)
  }

  const handleOpenProfile = (employee) => {
    setSelectedProfileEmployee(employee)
    setIsProfileOpen(true)
  }

  const handleSaveEmployee = async (employeeData, editId) => {
    if (editId) {
      await hrApi.updateEmployee(editId, employeeData)
      showToast(`Updated employee ${employeeData.name} successfully!`)
    } else {
      await hrApi.createEmployee(employeeData)
      showToast(`Registered new employee ${employeeData.name} successfully!`)
    }
    await loadRecords()
  }

  const handleDeleteEmployee = async (employee) => {
    try {
      await hrApi.deleteEmployee(employee.id)
      setDeleteConfirmEmployee(null)
      setIsProfileOpen(false)
      showToast(`Deleted employee ${employee.data?.name || 'record'} from database.`)
      await loadRecords()
    } catch (err) {
      showToast(`Could not delete employee: ${err.message}`, 'error')
    }
  }

  const handleEmployeeUpdated = (updated) => {
    setRecords((current) => current.map((r) => (r.id === updated.id ? updated : r)))
    if (selectedProfileEmployee?.id === updated.id) {
      setSelectedProfileEmployee(updated)
    }
  }

  // Export full employee list to CSV
  const exportEmployees = () => {
    const headers = [
      'Serial Number',
      'Full Name',
      'Date of Birth',
      'Email',
      'Phone',
      'Type',
      'Nationality',
      'ID / Iqama',
      'Position',
      'Department',
      'Monthly Salary',
      'Annual Salary',
      'Start Date',
      'Bank Name',
      'IBAN',
      'Status',
      'Company',
      'Branch',
    ]
    const rows = [
      headers,
      ...filteredEmployees.map((e) => {
        const d = e.data || {}
        return [
          d.serialNumber || d.employeeId || '',
          d.name || '',
          d.dob || '',
          d.email || '',
          d.phone || '',
          d.foreignOrLocal || '',
          d.nationality || '',
          d.iqamaNumber || '',
          d.position || d.jobTitle || '',
          d.department || '',
          d.monthlySalary || '',
          d.annualSalary || '',
          d.startDate || d.contractStart || '',
          d.bankName || '',
          d.iban || '',
          d.status || 'Active',
          d.company || '',
          d.branch || '',
        ]
      }),
    ]
    downloadCsv(`employees_export_${TODAY()}.csv`, rows)
  }

  // Instant Download Single Employee Info
  const downloadSingleEmployee = (emp) => {
    const d = emp.data || emp
    const summary = {
      'Serial Number': d.serialNumber || d.employeeId,
      'Full Name': d.name,
      'Email Address': d.email,
      'Contact Phone': d.phone,
      'National ID / Iqama': d.iqamaNumber,
      'Date of Birth': d.dob,
      Nationality: d.nationality,
      Type: d.foreignOrLocal,
      Position: d.position || d.jobTitle,
      Department: d.department,
      Status: d.status,
      'Monthly Salary': `${Number(d.monthlySalary || 0).toLocaleString()} SAR`,
      'Annual Salary': `${Number(d.annualSalary || 0).toLocaleString()} SAR`,
      'Start Date': d.startDate || d.contractStart,
      'Bank Name': d.bankName,
      IBAN: d.iban,
      Company: d.company,
      Branch: d.branch,
    }
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${d.serialNumber || 'employee'}_${(d.name || 'info').replace(/\s+/g, '_')}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="hr-workspace-shell">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`hr-floating-toast ${toastMessage.type}`}>
          <Icon name={toastMessage.type === 'error' ? 'alert-triangle' : 'check'} size={16} />
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Top Banner / Heading */}
      <div className="hr-page-header">
        <div>
          <div className="hr-title-wrap">
            <span className="hr-title-icon"><Icon name="users" size={24} /></span>
            <div>
              <h1>HR Management &amp; Employees</h1>
              <p>Complete enterprise human resources, verified employee directory, database persistence, and document management.</p>
            </div>
          </div>
        </div>

        {/* Global Organization Selectors */}
        <div className="hr-org-filters">
          <label>
            <span>Company</span>
            <select value={companyFilter} onChange={(e) => { setCompanyFilter(e.target.value); setPage(1) }}>
              <option value="">All companies</option>
              {filterOptions.companies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>
            <span>Branch</span>
            <select value={branchFilter} onChange={(e) => { setBranchFilter(e.target.value); setPage(1) }}>
              <option value="">All branches</option>
              {filterOptions.branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
        </div>
      </div>

      {storageError && (
        <div className="hr-error-banner">
          <Icon name="alert-triangle" size={16} />
          <span>{storageError}</span>
        </div>
      )}

      {/* Module Navigation Tabs */}
      <div className="hr-nav-tabs">
        <button
          type="button"
          className={`hr-nav-tab ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => setActiveTab('employees')}
        >
          <Icon name="users" size={16} />
          <span>Employee Directory</span>
          <b className="hr-tab-badge">{allEmployees.length}</b>
        </button>
        <button
          type="button"
          className={`hr-nav-tab ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <Icon name="calendar-clock" size={16} />
          <span>Attendance</span>
        </button>
        <button
          type="button"
          className={`hr-nav-tab ${activeTab === 'leave' ? 'active' : ''}`}
          onClick={() => setActiveTab('leave')}
        >
          <Icon name="calendar" size={16} />
          <span>Leave &amp; Balances</span>
        </button>
        <button
          type="button"
          className={`hr-nav-tab ${activeTab === 'payroll' ? 'active' : ''}`}
          onClick={() => setActiveTab('payroll')}
        >
          <Icon name="wallet" size={16} />
          <span>Payroll</span>
        </button>
        <button
          type="button"
          className={`hr-nav-tab ${activeTab === 'holidays' ? 'active' : ''}`}
          onClick={() => setActiveTab('holidays')}
        >
          <Icon name="sun" size={16} />
          <span>Holidays</span>
        </button>
        <button
          type="button"
          className={`hr-nav-tab ${activeTab === 'recruitment' ? 'active' : ''}`}
          onClick={() => setActiveTab('recruitment')}
        >
          <Icon name="user-plus" size={16} />
          <span>Recruitment</span>
        </button>
        <button
          type="button"
          className={`hr-nav-tab ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <Icon name="database" size={16} />
          <span>Audit Activity</span>
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === 'employees' && (
        <div className="hr-employee-directory-view">
          {/* Top KPI Cards (Mandatory Feature 1) */}
          <div className="hr-dashboard-kpis">
            <div className="hr-kpi-metric-card blue">
              <div className="hr-metric-top">
                <span>Total Employees</span>
                <span className="hr-metric-icon"><Icon name="users" size={18} /></span>
              </div>
              <strong className="hr-metric-number">{stats.total}</strong>
              <small className="hr-metric-sub">Registered across all branches</small>
            </div>

            <div className="hr-kpi-metric-card green">
              <div className="hr-metric-top">
                <span>Active Employees</span>
                <span className="hr-metric-icon"><Icon name="check" size={18} /></span>
              </div>
              <strong className="hr-metric-number">{stats.active}</strong>
              <small className="hr-metric-sub">
                {stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% of workforce` : 'Active status'}
              </small>
            </div>

            <div className="hr-kpi-metric-card gray">
              <div className="hr-metric-top">
                <span>Inactive Employees</span>
                <span className="hr-metric-icon"><Icon name="user-minus" size={18} /></span>
              </div>
              <strong className="hr-metric-number">{stats.inactive}</strong>
              <small className="hr-metric-sub">Archived or resigned</small>
            </div>

            <div className="hr-kpi-metric-card amber">
              <div className="hr-metric-top">
                <span>On Leave</span>
                <span className="hr-metric-icon"><Icon name="clock" size={18} /></span>
              </div>
              <strong className="hr-metric-number">{stats.onLeave}</strong>
              <small className="hr-metric-sub">Annual or medical absence</small>
            </div>

            <div className="hr-kpi-metric-card purple">
              <div className="hr-metric-top">
                <span>New Employees</span>
                <span className="hr-metric-icon"><Icon name="user-plus" size={18} /></span>
              </div>
              <strong className="hr-metric-number">{stats.newEmployees}</strong>
              <small className="hr-metric-sub">Joined in the last 90 days</small>
            </div>
          </div>

          {/* Directory Action & Filter Bar */}
          <div className="hr-directory-control-bar">
            {/* Search Input */}
            <div className="hr-search-wrap">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search by name, serial number, ID/Iqama, or email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
              {search && (
                <button className="hr-clear-search" onClick={() => setSearch('')} type="button">
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="hr-filters-wrap">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                title="Filter by status"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On leave">On leave</option>
              </select>

              <select
                value={departmentFilter}
                onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1) }}
                title="Filter by department"
              >
                <option value="">All Departments</option>
                {filterOptions.departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>

              <select
                value={positionFilter}
                onChange={(e) => { setPositionFilter(e.target.value); setPage(1) }}
                title="Filter by position"
              >
                <option value="">All Positions</option>
                {filterOptions.positions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>

              <select
                value={nationalityFilter}
                onChange={(e) => { setNationalityFilter(e.target.value); setPage(1) }}
                title="Filter by nationality"
              >
                <option value="">All Nationalities</option>
                {filterOptions.nationalities.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {/* View Mode Toggle & Primary Actions */}
            <div className="hr-actions-wrap">
              <div className="hr-view-mode-toggle">
                <button
                  type="button"
                  className={`hr-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                  title="Structured Table View"
                >
                  <Icon name="list" size={16} />
                </button>
                <button
                  type="button"
                  className={`hr-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
                  onClick={() => setViewMode('cards')}
                  title="Profile Cards View"
                >
                  <Icon name="grid" size={16} />
                </button>
              </div>

              <button className="hr-btn-secondary" onClick={downloadEmployeeTemplate} type="button" title="Download standard Excel template">
                <Icon name="download" size={14} /> Download template employee
              </button>

              <button className="hr-btn-secondary" onClick={() => setIsImportModalOpen(true)} type="button">
                <Icon name="upload" size={14} /> Import from Excel
              </button>

              <button className="hr-btn-primary" onClick={handleOpenCreateForm} type="button">
                <Icon name="plus" size={15} /> Add Employee
              </button>

              <button className="hr-btn-export" onClick={exportEmployees} type="button" title="Export matching employees to CSV">
                <Icon name="file-text" size={14} />
              </button>
            </div>
          </div>

          {/* Results Summary Bar */}
          <div className="hr-results-meta">
            <span>
              Showing <strong>{filteredEmployees.length}</strong> employee(s)
              {(search || statusFilter || departmentFilter || positionFilter || nationalityFilter) && (
                <button
                  className="hr-clear-all-filters"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('')
                    setDepartmentFilter('')
                    setPositionFilter('')
                    setNationalityFilter('')
                  }}
                  type="button"
                >
                  Clear filters
                </button>
              )}
            </span>

            <div className="hr-sort-controls">
              <span>Sort by:</span>
              <select value={sortField} onChange={(e) => setSortField(e.target.value)}>
                <option value="name">Name</option>
                <option value="serialNumber">Serial Number</option>
                <option value="startDate">Start Date</option>
                <option value="salary">Salary</option>
                <option value="department">Department</option>
              </select>
              <button
                type="button"
                className="hr-sort-order-btn"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                <Icon name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={14} />
              </button>
            </div>
          </div>

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="hr-table-container">
              {paginatedEmployees.length > 0 ? (
                <table className="hr-main-table">
                  <thead>
                    <tr>
                      <th>Serial No</th>
                      <th>Employee Name</th>
                      <th>Department &amp; Position</th>
                      <th>Status</th>
                      <th>Contact Details</th>
                      <th>Nationality / Type</th>
                      <th>Monthly Salary</th>
                      <th>Documents</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEmployees.map((emp) => {
                      const d = emp.data || {}
                      const docs = Array.isArray(d.documents) ? d.documents : []
                      const initials = (d.name || 'E')
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()

                      return (
                        <tr key={emp.id} className="hr-table-row">
                          <td>
                            <span className="hr-table-serial">{d.serialNumber || d.employeeId || '—'}</span>
                          </td>
                          <td>
                            <div className="hr-table-name-cell">
                              <span className="hr-mini-avatar">{initials}</span>
                              <div>
                                <strong
                                  className="hr-clickable-name"
                                  onClick={() => handleOpenProfile(emp)}
                                >
                                  {d.name || 'Unnamed Employee'}
                                </strong>
                                <small>{[d.company, d.branch].filter(Boolean).join(' · ') || 'Natheelco'}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="hr-table-job-cell">
                              <strong>{d.position || d.jobTitle || 'Unassigned'}</strong>
                              <small>{d.department || 'General'}</small>
                            </div>
                          </td>
                          <td>
                            <span className={`hr-status-pill ${d.status || 'Active'}`}>
                              {d.status || 'Active'}
                            </span>
                          </td>
                          <td>
                            <div className="hr-table-contact-cell">
                              {d.email && <span><Icon name="mail" size={12} /> {d.email}</span>}
                              {d.phone && <span><Icon name="phone" size={12} /> {d.phone}</span>}
                            </div>
                          </td>
                          <td>
                            <span>{d.nationality || '—'}</span>
                            <small className="hr-type-tag">{d.foreignOrLocal || 'Local'}</small>
                          </td>
                          <td>
                            <strong className="hr-salary-text">
                              {d.monthlySalary ? `${Number(d.monthlySalary).toLocaleString()} SAR` : '—'}
                            </strong>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="hr-doc-count-pill"
                              onClick={() => { handleOpenProfile(emp); /* Opens with documents tab */ }}
                              title="View uploaded documents"
                            >
                              <Icon name="file-text" size={13} /> {docs.length}
                            </button>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="hr-row-action-buttons">
                              <button
                                type="button"
                                className="hr-action-icon-btn"
                                onClick={() => handleOpenProfile(emp)}
                                title="View Profile"
                              >
                                <Icon name="user" size={15} />
                              </button>
                              <button
                                type="button"
                                className="hr-action-icon-btn"
                                onClick={() => handleOpenEditForm(emp)}
                                title="Edit Employee"
                              >
                                <Icon name="edit" size={15} />
                              </button>
                              <button
                                type="button"
                                className="hr-action-icon-btn"
                                onClick={() => downloadSingleEmployee(emp)}
                                title="Download Information"
                              >
                                <Icon name="download" size={15} />
                              </button>
                              <button
                                type="button"
                                className="hr-action-icon-btn danger"
                                onClick={() => setDeleteConfirmEmployee(emp)}
                                title="Delete Employee"
                              >
                                <Icon name="trash" size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="hr-empty-directory">
                  <span className="hr-empty-icon"><Icon name="users" size={40} /></span>
                  <h3>No Employees Found</h3>
                  <p>
                    {search || statusFilter || departmentFilter
                      ? 'No employees matched your search or active filters. Try adjusting your filter parameters.'
                      : 'Your employee directory is empty. Register a new employee or import an Excel spreadsheet to begin.'}
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <Button className="p" onClick={handleOpenCreateForm}>
                      <Icon name="plus" size={14} /> Add First Employee
                    </Button>
                    <Button onClick={() => setIsImportModalOpen(true)}>
                      <Icon name="upload" size={14} /> Import from Excel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cards View */}
          {viewMode === 'cards' && (
            <div className="hr-cards-grid-wrapper">
              {paginatedEmployees.length > 0 ? (
                <div className="hr-employee-cards-grid">
                  {paginatedEmployees.map((emp) => {
                    const d = emp.data || {}
                    const docs = Array.isArray(d.documents) ? d.documents : []
                    const initials = (d.name || 'E')
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()

                    return (
                      <article className="hr-emp-profile-card" key={emp.id}>
                        <div className="hr-card-top-bar">
                          <span className="hr-card-serial">{d.serialNumber || d.employeeId}</span>
                          <span className={`hr-status-pill ${d.status || 'Active'}`}>{d.status || 'Active'}</span>
                        </div>

                        <div className="hr-card-hero">
                          <div className="hr-card-avatar">{initials}</div>
                          <div>
                            <h3 onClick={() => handleOpenProfile(emp)}>{d.name || 'Unnamed Employee'}</h3>
                            <p className="hr-card-role">{d.position || d.jobTitle || 'Unassigned Position'}</p>
                            <small className="hr-card-dept">{d.department || 'Operations'} · {d.company || 'Natheelco'}</small>
                          </div>
                        </div>

                        <div className="hr-card-details">
                          <div>
                            <small>Monthly Salary</small>
                            <strong>{d.monthlySalary ? `${Number(d.monthlySalary).toLocaleString()} SAR` : '—'}</strong>
                          </div>
                          <div>
                            <small>Start Date</small>
                            <span>{d.startDate || d.contractStart || '—'}</span>
                          </div>
                          <div>
                            <small>Nationality</small>
                            <span>{d.nationality || '—'} ({d.foreignOrLocal || 'Local'})</span>
                          </div>
                          <div>
                            <small>Documents</small>
                            <span>{docs.length} uploaded</span>
                          </div>
                        </div>

                        <div className="hr-card-contact-strip">
                          {d.email && <span title={d.email}><Icon name="mail" size={13} /> {d.email}</span>}
                          {d.phone && <span title={d.phone}><Icon name="phone" size={13} /> {d.phone}</span>}
                        </div>

                        <div className="hr-card-footer-actions">
                          <button
                            type="button"
                            className="hr-card-btn"
                            onClick={() => handleOpenProfile(emp)}
                          >
                            <Icon name="user" size={14} /> Profile
                          </button>
                          <button
                            type="button"
                            className="hr-card-btn"
                            onClick={() => handleOpenEditForm(emp)}
                          >
                            <Icon name="edit" size={14} /> Edit
                          </button>
                          <button
                            type="button"
                            className="hr-card-btn"
                            onClick={() => downloadSingleEmployee(emp)}
                            title="Download info"
                          >
                            <Icon name="download" size={14} />
                          </button>
                          <button
                            type="button"
                            className="hr-card-btn danger"
                            onClick={() => setDeleteConfirmEmployee(emp)}
                            title="Delete"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="hr-empty-directory">
                  <span className="hr-empty-icon"><Icon name="users" size={40} /></span>
                  <h3>No Employees Found</h3>
                  <p>Try adjusting your search query or filters.</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination Controls */}
          {filteredEmployees.length > 0 && (
            <div className="hr-pagination-bar">
              <div className="hr-page-size-selector">
                <span>Rows per page:</span>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="hr-pagination-info">
                <span>
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({filteredEmployees.length} total)
                </span>

                <div className="hr-pagination-buttons">
                  <button
                    type="button"
                    className="hr-page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <Icon name="chevron-left" size={16} /> Previous
                  </button>
                  <button
                    type="button"
                    className="hr-page-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next <Icon name="chevron-right" size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submodule: Attendance */}
      {activeTab === 'attendance' && (
        <div className="hr-submodule-view">
          <div className="hr-submodule-header">
            <div>
              <h2>Attendance &amp; Time Tracking</h2>
              <p>Daily check-ins, check-outs, absences, and overtime hours.</p>
            </div>
          </div>
          <div className="hr-submodule-content">
            <div className="hr-table-container">
              <table className="hr-main-table">
                <thead>
                  <tr><th>Date</th><th>Employee</th><th>Check-in</th><th>Check-out</th><th>Working Hours</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {scopedRecords.filter((r) => r.module === 'attendance').length > 0 ? (
                    scopedRecords.filter((r) => r.module === 'attendance').map((r) => (
                      <tr key={r.id}>
                        <td>{r.data.date}</td>
                        <td><strong>{r.data.employee}</strong></td>
                        <td>{r.data.checkIn || '—'}</td>
                        <td>{r.data.checkOut || '—'}</td>
                        <td>{r.data.workingHours || 8} hrs</td>
                        <td><span className="hr-status-pill Active">{r.data.status}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30 }} className="mu">No attendance records registered yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Submodule: Leave */}
      {activeTab === 'leave' && (
        <div className="hr-submodule-view">
          <div className="hr-submodule-header">
            <div>
              <h2>Leave Management &amp; Approvals</h2>
              <p>Annual vacation requests, sick leaves, and remaining balance days.</p>
            </div>
          </div>
          <div className="hr-submodule-content">
            <div className="hr-table-container">
              <table className="hr-main-table">
                <thead>
                  <tr><th>Employee</th><th>Leave Type</th><th>Start Date</th><th>End Date</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {scopedRecords.filter((r) => r.module === 'leave').length > 0 ? (
                    scopedRecords.filter((r) => r.module === 'leave').map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.data.employee}</strong></td>
                        <td>{r.data.leaveType}</td>
                        <td>{r.data.startDate}</td>
                        <td>{r.data.endDate}</td>
                        <td><span className={`hr-status-pill ${r.data.status === 'Approved' ? 'Active' : 'On leave'}`}>{r.data.status}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30 }} className="mu">No leave requests recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Submodule: Payroll */}
      {activeTab === 'payroll' && (
        <div className="hr-submodule-view">
          <div className="hr-submodule-header">
            <div>
              <h2>Payroll &amp; Compensation Records</h2>
              <p>Monthly salary runs, allowances, overtime, and payslips.</p>
            </div>
          </div>
          <div className="hr-submodule-content">
            <div className="hr-table-container">
              <table className="hr-main-table">
                <thead>
                  <tr><th>Employee</th><th>Period</th><th>Basic Salary</th><th>Allowances</th><th>Overtime</th><th>Net Pay</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {scopedRecords.filter((r) => r.module === 'payroll').length > 0 ? (
                    scopedRecords.filter((r) => r.module === 'payroll').map((r) => {
                      const net = asAmount(r.data.basicSalary) + asAmount(r.data.allowances) + asAmount(r.data.overtime) - asAmount(r.data.deductions)
                      return (
                        <tr key={r.id}>
                          <td><strong>{r.data.employee}</strong></td>
                          <td>{r.data.period}</td>
                          <td>{formatMoney(r.data.basicSalary)}</td>
                          <td>{formatMoney(r.data.allowances)}</td>
                          <td>{formatMoney(r.data.overtime)}</td>
                          <td><strong>{formatMoney(net)}</strong></td>
                          <td><span className="hr-status-pill Active">{r.data.status}</span></td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30 }} className="mu">No payroll records logged yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Submodule: Holidays */}
      {activeTab === 'holidays' && (
        <div className="hr-submodule-view">
          <div className="hr-submodule-header">
            <div>
              <h2>Public &amp; Company Holidays</h2>
              <p>Official calendar holidays and branch closures across Saudi Arabia.</p>
            </div>
          </div>
          <div className="hr-submodule-content">
            <div className="hr-table-container">
              <table className="hr-main-table">
                <thead>
                  <tr><th>Holiday Name</th><th>Start Date</th><th>End Date</th><th>Type</th><th>Applies To</th></tr>
                </thead>
                <tbody>
                  {scopedRecords.filter((r) => r.module === 'holidays').length > 0 ? (
                    scopedRecords.filter((r) => r.module === 'holidays').map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.data.name}</strong></td>
                        <td>{r.data.startDate}</td>
                        <td>{r.data.endDate}</td>
                        <td>{r.data.type || 'Public Holiday'}</td>
                        <td>{r.data.company || 'All Companies'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30 }} className="mu">No holidays scheduled yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Submodule: Recruitment */}
      {activeTab === 'recruitment' && (
        <div className="hr-submodule-view">
          <div className="hr-submodule-header">
            <div>
              <h2>Recruitment &amp; Vacancies</h2>
              <p>Open roles, candidates, interviews, and hiring pipeline.</p>
            </div>
          </div>
          <div className="hr-submodule-content">
            <div className="hr-table-container">
              <table className="hr-main-table">
                <thead>
                  <tr><th>Position</th><th>Department</th><th>Candidate Name</th><th>Hiring Stage</th><th>Interview Date</th></tr>
                </thead>
                <tbody>
                  {scopedRecords.filter((r) => r.module === 'recruitment').length > 0 ? (
                    scopedRecords.filter((r) => r.module === 'recruitment').map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.data.position}</strong></td>
                        <td>{r.data.department || '—'}</td>
                        <td>{r.data.candidate || '—'}</td>
                        <td><span className="hr-status-pill Active">{r.data.stage}</span></td>
                        <td>{r.data.nextInterview || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30 }} className="mu">No recruitment records active.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Submodule: Audit Activity */}
      {activeTab === 'activity' && (
        <div className="hr-submodule-view">
          <div className="hr-submodule-header">
            <div>
              <h2>HR Audit &amp; Activity Log</h2>
              <p>Permanent record of employee onboarding, updates, document uploads, and deletions.</p>
            </div>
          </div>
          <div className="hr-submodule-content">
            <div className="hr-activity-list">
              {records
                .filter((r) => r.module === 'activity')
                .sort((a, b) => String(b.data?.at || '').localeCompare(String(a.data?.at || '')))
                .slice(0, 30)
                .map((item) => (
                  <div className="hr-activity-item" key={item.id}>
                    <span className="hr-activity-icon"><Icon name="database" size={15} /></span>
                    <div className="hr-activity-text">
                      <strong>{item.data?.action}</strong> {item.data?.label}
                      <small>{[item.data?.company, item.data?.branch].filter(Boolean).join(' · ')} · {new Date(item.data?.at || item.createdAt).toLocaleString()}</small>
                    </div>
                  </div>
                ))}
              {!records.some((r) => r.module === 'activity') && (
                <p className="mu" style={{ padding: 30, textAlign: 'center' }}>All operations performed in HR will be permanently recorded here.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmEmployee && (
        <div className="hr-modal-overlay" onClick={() => setDeleteConfirmEmployee(null)}>
          <div className="hr-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="hr-confirm-icon"><Icon name="alert-triangle" size={32} /></div>
            <h3>Delete Employee Record?</h3>
            <p>
              Are you sure you want to permanently delete <strong>{deleteConfirmEmployee.data?.name}</strong> (Serial: {deleteConfirmEmployee.data?.serialNumber})?
              All attached documents and database records will be removed. This action cannot be undone.
            </p>
            <div className="hr-confirm-actions">
              <Button onClick={() => setDeleteConfirmEmployee(null)}>Cancel</Button>
              <Button className="p danger" onClick={() => handleDeleteEmployee(deleteConfirmEmployee)}>
                <Icon name="trash" size={15} /> Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Registration & Edit Form Modal */}
      <EmployeeFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        employeeToEdit={employeeToEdit}
        existingEmployees={allEmployees}
        onSave={handleSaveEmployee}
        defaultCompany={companyFilter}
        defaultBranch={branchFilter}
      />

      {/* Dedicated Employee Profile Modal */}
      <EmployeeProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        employee={selectedProfileEmployee}
        onEdit={(emp) => handleOpenEditForm(emp)}
        onDelete={(emp) => setDeleteConfirmEmployee(emp)}
        onEmployeeUpdated={handleEmployeeUpdated}
      />

      {/* Excel Employee Import Modal */}
      <EmployeeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingEmployees={allEmployees}
        onImportComplete={async () => {
          await loadRecords()
          showToast('Employees successfully imported into the database!')
        }}
        company={companyFilter}
        branch={branchFilter}
      />
    </div>
  )
}

export default HRWorkspace
