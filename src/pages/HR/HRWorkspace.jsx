import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { api } from '../../services/api.js'

const HR_COMPANIES = ['Natheelco', 'Hajiss Café', 'Odun Pide', 'Ghalia', 'Dani Designs']

const ORGANIZATION_FIELDS = [
  { key: 'company', label: 'Company / project', type: 'select', options: HR_COMPANIES, required: true },
  { key: 'branch', label: 'Branch', type: 'text', required: true },
]

const MODULES = [
  {
    id: 'employees',
    title: 'Employees',
    description: 'Employee profiles, employment, contracts, salary, and documents.',
    icon: 'users',
    tone: 'blue',
    fields: [
      { key: 'employeeId', label: 'Employee ID', required: true },
      { key: 'name', label: 'Full name', required: true },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Contact number', type: 'tel' },
      { key: 'jobTitle', label: 'Job title' },
      { key: 'department', label: 'Department' },
      { key: 'status', label: 'Employment status', type: 'select', options: ['Active', 'Inactive', 'On leave'], required: true },
      { key: 'contractType', label: 'Contract type', type: 'select', options: ['Permanent', 'Fixed term', 'Part-time', 'Temporary', 'Other'] },
      { key: 'contractStart', label: 'Contract start', type: 'date' },
      { key: 'contractEnd', label: 'Contract end', type: 'date' },
      { key: 'basicSalary', label: 'Basic monthly salary (SAR)', type: 'number' },
      { key: 'allowances', label: 'Monthly allowances (SAR)', type: 'number' },
      { key: 'documents', label: 'Document names or secure file references', type: 'textarea' },
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance',
    description: 'Check-in and check-out, working hours, absences, and overtime.',
    icon: 'calendar-clock',
    tone: 'blue',
    fields: [
      { key: 'employee', label: 'Employee', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'checkIn', label: 'Check-in', type: 'time' },
      { key: 'checkOut', label: 'Check-out', type: 'time' },
      { key: 'workingHours', label: 'Working hours', type: 'number' },
      { key: 'overtimeHours', label: 'Overtime hours', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: ['Present', 'Late', 'Absent', 'Remote'], required: true },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    id: 'shifts',
    title: 'Shifts',
    description: 'Schedule shifts by employee, company, and branch.',
    icon: 'calendar',
    tone: 'teal',
    fields: [
      { key: 'employee', label: 'Employee', required: true },
      { key: 'date', label: 'Shift date', type: 'date', required: true },
      { key: 'startTime', label: 'Start time', type: 'time', required: true },
      { key: 'endTime', label: 'End time', type: 'time', required: true },
      { key: 'status', label: 'Shift status', type: 'select', options: ['Scheduled', 'Confirmed', 'Completed', 'Cancelled'], required: true },
      { key: 'notes', label: 'Notes' },
    ],
  },
  {
    id: 'leave',
    title: 'Leave management',
    description: 'Submit requests, track balances, and approve leave.',
    icon: 'calendar',
    tone: 'violet',
    fields: [
      { key: 'employee', label: 'Employee', required: true },
      { key: 'leaveType', label: 'Leave type', type: 'select', options: ['Annual leave', 'Sick leave', 'Unpaid leave', 'Other'], required: true },
      { key: 'startDate', label: 'Start date', type: 'date', required: true },
      { key: 'endDate', label: 'End date', type: 'date', required: true },
      { key: 'balanceDays', label: 'Remaining balance (days)', type: 'number' },
      { key: 'status', label: 'Request status', type: 'select', options: ['Pending', 'Approved', 'Declined'], required: true },
      { key: 'notes', label: 'Notes' },
    ],
  },
  {
    id: 'payroll',
    title: 'Payroll',
    description: 'Monthly salaries, allowances, deductions, advances, and payslips.',
    icon: 'wallet',
    tone: 'green',
    fields: [
      { key: 'employee', label: 'Employee', required: true },
      { key: 'period', label: 'Pay period (YYYY-MM)', required: true },
      { key: 'basicSalary', label: 'Basic salary (SAR)', type: 'number', required: true },
      { key: 'allowances', label: 'Allowances (SAR)', type: 'number' },
      { key: 'overtime', label: 'Overtime (SAR)', type: 'number' },
      { key: 'deductions', label: 'Deductions (SAR)', type: 'number' },
      { key: 'advances', label: 'Salary advances (SAR)', type: 'number' },
      { key: 'endOfService', label: 'End-of-service amount (SAR)', type: 'number' },
      { key: 'payDate', label: 'Pay date', type: 'date' },
      { key: 'status', label: 'Payroll status', type: 'select', options: ['Draft', 'In review', 'Ready', 'Paid'], required: true },
      { key: 'notes', label: 'Notes' },
    ],
  },
  {
    id: 'recruitment',
    title: 'Recruitment',
    description: 'Vacancies, candidate profiles, interviews, evaluation, and hiring.',
    icon: 'user-plus',
    tone: 'amber',
    fields: [
      { key: 'position', label: 'Vacancy / position', required: true },
      { key: 'department', label: 'Department' },
      { key: 'candidate', label: 'Candidate name' },
      { key: 'email', label: 'Candidate email', type: 'email' },
      { key: 'phone', label: 'Candidate contact', type: 'tel' },
      { key: 'cv', label: 'CV reference or link', type: 'url' },
      { key: 'stage', label: 'Hiring stage', type: 'select', options: ['New', 'Screening', 'Interview', 'Offer', 'Hired', 'Not selected'], required: true },
      { key: 'nextInterview', label: 'Interview date', type: 'date' },
      { key: 'evaluation', label: 'Candidate evaluation', type: 'textarea' },
    ],
  },
  {
    id: 'holidays',
    title: 'Holidays',
    description: 'Company and branch holiday calendar.',
    icon: 'calendar',
    tone: 'indigo',
    fields: [
      { key: 'name', label: 'Holiday name', required: true },
      { key: 'startDate', label: 'Start date', type: 'date', required: true },
      { key: 'endDate', label: 'End date', type: 'date', required: true },
      { key: 'type', label: 'Holiday type', type: 'select', options: ['Public holiday', 'Company holiday', 'Branch closure', 'Other'], required: true },
      { key: 'notes', label: 'Notes' },
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
      { key: 'notes', label: 'Notes' },
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

const MODULE_BY_ID = new Map(MODULES.map((module) => [module.id, module]))
const TODAY = () => new Date().toISOString().slice(0, 10)
const CURRENT_PERIOD = () => new Date().toISOString().slice(0, 7)
const asAmount = (value) => Number(value) || 0
const formatMoney = (value) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(value)

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((value) => {
    const text = String(value ?? '')
    return `"${text.replaceAll('"', '""')}"`
  }).join(',')).join('\r\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export function HRWorkspace() {
  const [records, setRecords] = useState([])
  const [storageReady, setStorageReady] = useState(false)
  const [storageError, setStorageError] = useState('')
  const [activeModuleId, setActiveModuleId] = useState('')
  const [editingRecord, setEditingRecord] = useState(null)
  const [formData, setFormData] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [documentFile, setDocumentFile] = useState(null)

  useEffect(() => {
    let active = true
    async function loadRecords() {
      try {
        let rows = await api.list('hr')
        const saved = localStorage.getItem('taskflow_hr_records')
        const legacyRecords = saved ? JSON.parse(saved) : []
        if (
          !Array.isArray(legacyRecords) ||
          legacyRecords.some((record) =>
            !record || typeof record.id !== 'string' || typeof record.module !== 'string' ||
            !MODULE_BY_ID.has(record.module) || !record.data || typeof record.data !== 'object' ||
            Array.isArray(record.data) ||
            Object.values(record.data).some((value) => typeof value !== 'string')
          )
        ) {
          throw new Error('Stored HR data has an invalid format.')
        }
        const existingIds = new Set(rows.map((row) => row.id))
        const missingRecords = legacyRecords.filter((record) => !existingIds.has(record.id))
        await Promise.all(missingRecords.map((record) => api.put(`hr/${record.id}`, record)))
        rows = [...rows, ...missingRecords.map((record) => ({ id: record.id, data: record }))]
        if (saved) localStorage.removeItem('taskflow_hr_records')
        if (active) setRecords(rows.map((row) => ({ ...row.data, id: row.id })))
      } catch (error) {
        if (active) setStorageError(`Could not load HR records: ${error.message}`)
      } finally {
        if (active) setStorageReady(true)
      }
    }
    loadRecords()
    return () => {
      active = false
    }
  }, [])

  const liveRecords = records.filter((record) => !record.archivedAt)
  const scopedRecords = liveRecords.filter((record) =>
    (!companyFilter || record.data.company === companyFilter) &&
    (!branchFilter || record.data.branch === branchFilter))
  const employees = scopedRecords.filter((record) => record.module === 'employees')
  const activeEmployees = employees.filter((record) => record.data.status === 'Active')
  const inactiveEmployees = employees.filter((record) => record.data.status === 'Inactive')
  const todayAttendance = scopedRecords.filter(
    (record) => record.module === 'attendance' && record.data.date === TODAY(),
  )
  const absentToday = todayAttendance.filter((record) => record.data.status === 'Absent').length
  const lateToday = todayAttendance.filter((record) => record.data.status === 'Late').length
  const employeesOnLeave = new Set(scopedRecords.filter(
    (record) =>
      record.module === 'leave' &&
      record.data.status === 'Approved' &&
      record.data.startDate <= TODAY() &&
      record.data.endDate >= TODAY(),
  ).map((record) => record.data.employee)).size
  const payrollTotal = scopedRecords
    .filter((record) => record.module === 'payroll' && record.data.period === CURRENT_PERIOD())
    .reduce((sum, record) => sum + asAmount(record.data.basicSalary) + asAmount(record.data.allowances) +
      asAmount(record.data.overtime) - asAmount(record.data.deductions) - asAmount(record.data.advances), 0)
  const branchCounts = employees.reduce((counts, employee) => {
    const branch = employee.data.branch || 'Unassigned'
    counts.set(branch, (counts.get(branch) || 0) + 1)
    return counts
  }, new Map())
  const upcomingHolidays = scopedRecords
    .filter((record) => record.module === 'holidays' && record.data.endDate >= TODAY())
    .sort((a, b) => a.data.startDate.localeCompare(b.data.startDate))
    .slice(0, 5)
  const pendingApprovals = scopedRecords.filter((record) => record.module === 'leave' && record.data.status === 'Pending')
  const expiringContracts = employees.filter((employee) => {
    const daysRemaining = Math.ceil((new Date(`${employee.data.contractEnd}T00:00:00`) - new Date(`${TODAY()}T00:00:00`)) / 86_400_000)
    return employee.data.contractEnd && daysRemaining >= 0 && daysRemaining <= 30
  })
  const upcomingInterviews = scopedRecords.filter((record) => {
    if (record.module !== 'recruitment' || !record.data.nextInterview) return false
    const daysRemaining = Math.ceil((new Date(`${record.data.nextInterview}T00:00:00`) - new Date(`${TODAY()}T00:00:00`)) / 86_400_000)
    return daysRemaining >= 0 && daysRemaining <= 7 && record.data.stage !== 'Hired' && record.data.stage !== 'Not selected'
  })
  const activeModule = MODULE_BY_ID.get(activeModuleId)
  const companyOptions = [...new Set([
    ...HR_COMPANIES,
    ...liveRecords.map((record) => record.data.company).filter(Boolean),
  ])]
  const branchOptions = [...new Set(liveRecords
    .filter((record) => !companyFilter || record.data.company === companyFilter)
    .map((record) => record.data.branch)
    .filter(Boolean))].sort()

  const moduleRecords = useMemo(() => {
    if (!activeModuleId) return []
    return records.filter((record) => record.module === activeModuleId &&
      Boolean(record.archivedAt) === showArchived &&
      (!companyFilter || record.data.company === companyFilter) &&
      (!branchFilter || record.data.branch === branchFilter) &&
      (!statusFilter || (record.data.status || record.data.stage) === statusFilter) &&
      (!search || JSON.stringify(record.data).toLowerCase().includes(search.trim().toLowerCase())))
  }, [activeModuleId, branchFilter, companyFilter, records, search, showArchived, statusFilter])

  async function saveRecord(record, action) {
    const historyRecord = {
      id: `hr-history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      module: 'activity',
      data: {
        action,
        recordId: record.id,
        module: record.module,
        label: record.data.name || record.data.employee || record.data.position || record.data.policy || record.data.course || 'HR record',
        company: record.data.company || '',
        branch: record.data.branch || '',
        at: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    }
    try {
      await Promise.all([api.put(`hr/${record.id}`, record), api.put(`hr/${historyRecord.id}`, historyRecord)])
      setRecords((current) => [
        record,
        ...current.filter((item) => item.id !== record.id && item.module !== 'activity'),
        historyRecord,
        ...current.filter((item) => item.module === 'activity'),
      ])
      setStorageError('')
      setEditingRecord(null)
      setFormData({})
      setShowForm(false)
    } catch (error) {
      setStorageError(`Could not save HR record: ${error.message}`)
    }
  }

  function startCreate(moduleId = activeModuleId) {
    setActiveModuleId(moduleId)
    setEditingRecord(null)
    setDocumentFile(null)
    setFormData({
      ...(companyFilter ? { company: companyFilter } : {}),
      ...(branchFilter ? { branch: branchFilter } : {}),
      ...(moduleId === 'employees' ? { status: 'Active' } : {}),
      ...(moduleId === 'attendance' ? { date: TODAY(), status: 'Present' } : {}),
      ...(moduleId === 'leave' ? { status: 'Pending' } : {}),
      ...(moduleId === 'payroll' ? { period: CURRENT_PERIOD(), status: 'Draft' } : {}),
    })
    setShowForm(true)
  }

  function startEdit(record) {
    setDocumentFile(null)
    setEditingRecord(record)
    setFormData({
      company: record.data.company || 'Unassigned',
      branch: record.data.branch || 'Unassigned',
      ...record.data,
    })
    setShowForm(true)
  }

  async function submitRecord(event) {
    event.preventDefault()
    if (!activeModule) return
    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      setStorageError('The end date must be on or after the start date.')
      return
    }
    const now = new Date().toISOString()
    let data = { ...formData }
    if (documentFile && activeModuleId === 'employees') {
      try {
        const uploaded = await api.uploadFile(documentFile, 'hr')
        data = { ...data, documentFileId: uploaded.id, documentFileName: documentFile.name }
      } catch (error) {
        setStorageError(`Could not upload the employee document: ${error.message}`)
        return
      }
    }
    const record = {
      id: editingRecord?.id || `hr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      module: activeModuleId,
      data,
      createdAt: editingRecord?.createdAt || now,
      updatedAt: now,
      archivedAt: editingRecord?.archivedAt || '',
    }
    await saveRecord(record, editingRecord ? 'Updated' : 'Created')
    setDocumentFile(null)
  }

  async function toggleArchive(record) {
    await saveRecord({ ...record, archivedAt: record.archivedAt ? '' : new Date().toISOString(), updatedAt: new Date().toISOString() },
      record.archivedAt ? 'Restored' : 'Archived')
  }

  async function updateLeaveStatus(record, status) {
    await saveRecord({ ...record, data: { ...record.data, status }, updatedAt: new Date().toISOString() },
      `Leave ${status.toLowerCase()}`)
  }

  async function toggleAttendance(employee) {
    const name = employee.data.name
    const attendance = liveRecords.find((record) =>
      record.module === 'attendance' && record.data.employee === name && record.data.date === TODAY())
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    if (!attendance) {
      await saveRecord({
        id: `hr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        module: 'attendance',
        data: {
          employee: name,
          company: employee.data.company || '',
          branch: employee.data.branch || '',
          date: TODAY(),
          checkIn: time,
          status: 'Present',
        },
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        archivedAt: '',
      }, 'Checked in')
      return
    }
    if (!attendance.data.checkIn) {
      await saveRecord({ ...attendance, data: { ...attendance.data, checkIn: time, status: 'Present' }, updatedAt: now.toISOString() }, 'Checked in')
      return
    }
    if (!attendance.data.checkOut) {
      const [inHours, inMinutes] = attendance.data.checkIn.split(':').map(Number)
      const [outHours, outMinutes] = time.split(':').map(Number)
      let workedMinutes = outHours * 60 + outMinutes - inHours * 60 - inMinutes
      if (workedMinutes < 0) workedMinutes += 24 * 60
      const workingHours = (workedMinutes / 60).toFixed(2)
      await saveRecord({
        ...attendance,
        data: {
          ...attendance.data,
          checkOut: time,
          workingHours,
        },
        updatedAt: now.toISOString(),
      }, 'Checked out')
    }
  }

  async function downloadEmployeeDocument(record) {
    try {
      const blobUrl = URL.createObjectURL(await api.downloadFile(record.data.documentFileId))
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = record.data.documentFileName || 'employee-document'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    } catch (error) {
      setStorageError(`Could not download the employee document: ${error.message}`)
    }
  }

  function printPayslip(record) {
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character])
    const fields = activeModule.fields
      .filter((field) => record.data[field.key])
      .map((field) => `<tr><th>${escapeHtml(field.label)}</th><td>${escapeHtml(record.data[field.key])}</td></tr>`)
      .join('')
    const netPay = formatMoney(asAmount(record.data.basicSalary) + asAmount(record.data.allowances) +
      asAmount(record.data.overtime) - asAmount(record.data.deductions) - asAmount(record.data.advances))
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setStorageError('Allow pop-ups to generate the payslip.')
      return
    }
    printWindow.document.write(`<title>Payslip - ${escapeHtml(record.data.employee)}</title><h1>Natheelco Holding · Payslip</h1><table>${fields}</table><h2>Net pay: ${escapeHtml(netPay)}</h2><script>window.print()</script>`)
    printWindow.document.close()
  }

  async function convertCandidate(record) {
    const employee = {
      id: `hr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      module: 'employees',
      data: {
        employeeId: `EMP-${Date.now().toString().slice(-6)}`,
        name: record.data.candidate || '',
        email: record.data.email || '',
        phone: record.data.phone || '',
        jobTitle: record.data.position || '',
        department: record.data.department || '',
        company: record.data.company || '',
        branch: record.data.branch || '',
        status: 'Active',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: '',
    }
    await saveRecord(employee, 'Candidate converted to employee')
    if (record.data.stage !== 'Hired') {
      await saveRecord({ ...record, data: { ...record.data, stage: 'Hired' }, updatedAt: new Date().toISOString() },
        'Candidate marked hired')
    }
    setActiveModuleId('employees')
  }

  function exportModule() {
    const fields = activeModule?.fields || []
    const rows = [
      ['ID', 'Company', 'Branch', ...fields.map((field) => field.label), 'Status', 'Archived'],
      ...moduleRecords.map((record) => [
        record.id,
        record.data.company,
        record.data.branch,
        ...fields.map((field) => record.data[field.key]),
        record.data.status || record.data.stage || '',
        record.archivedAt ? 'Yes' : 'No',
      ]),
    ]
    downloadCsv(`hr-${activeModuleId || 'records'}-${TODAY()}.csv`, rows)
  }

  function exportPdf() {
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character])
    const fields = activeModule?.fields || []
    const visible = activeModule ? moduleRecords : scopedRecords.filter((record) => record.module === 'employees')
    const headers = activeModule
      ? ['Company', 'Branch', ...fields.map((field) => field.label)]
      : ['Employee ID', 'Name', 'Job title', 'Department', 'Status', 'Company', 'Branch']
    const rows = visible.map((record) => activeModule
      ? [record.data.company, record.data.branch, ...fields.map((field) => record.data[field.key])]
      : [record.data.employeeId, record.data.name, record.data.jobTitle, record.data.department, record.data.status, record.data.company, record.data.branch])
    const table = `<table><thead><tr>${headers.map((value) => `<th>${escapeHtml(value)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setStorageError('Allow pop-ups to export HR records as PDF.')
      return
    }
    printWindow.document.write(`<title>Natheelco HR ${escapeHtml(activeModule?.title || 'Overview')}</title><style>body{font:14px Arial,sans-serif;padding:24px;color:#172033}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{text-align:left;padding:8px;border:1px solid #dbe2ea}th{background:#f1f5f9}@media print{body{padding:0}}</style><h1>Natheelco Holding · HR ${escapeHtml(activeModule?.title || 'Overview')}</h1><p>${escapeHtml(companyFilter || 'All companies')} · ${escapeHtml(branchFilter || 'All branches')} · ${TODAY()}</p>${table}<script>window.print()</script>`)
    printWindow.document.close()
  }

  const employeeNames = employees.map((employee) => employee.data.name).filter(Boolean)
  const statusOptions = activeModule
    ? [...new Set(records
      .filter((record) => record.module === activeModuleId)
      .map((record) => record.data.status || record.data.stage)
      .filter(Boolean))].sort()
    : []

  return (
    <section aria-labelledby="hr-page-title" className="hr-page hr-workspace">
      <header className="hr-page-heading">
        <div>
          <span className="gulf-eyebrow"><Icon name="hr" size={15} /> NATHEELCO HOLDING · CENTRAL HR</span>
          <h1 id="hr-page-title">{activeModule ? activeModule.title : 'HR Management'}</h1>
          <p>{activeModule ? activeModule.description : 'People, attendance, leave, and payroll across all companies and branches.'}</p>
        </div>
        <div className="hr-header-actions">
          {activeModule ? (
            <Button onClick={() => { setActiveModuleId(''); setSearch(''); setShowForm(false) }}>
              <Icon name="chevron-left" size={15} /> HR overview
            </Button>
          ) : (
            <span className="hr-system-status"><i /> Central HR records</span>
          )}
          <Button onClick={exportPdf}><Icon name="download" size={14} /> Export PDF</Button>
        </div>
      </header>

      {storageError && <p className="hr-storage-error" role="alert">{storageError}</p>}
      {pendingApprovals.length > 0 && !activeModule && (
        <div className="hr-setup-notice" role="status">
          <span className="hr-notice-icon"><Icon name="info" size={17} /></span>
          <div><b>{pendingApprovals.length} leave request{pendingApprovals.length === 1 ? '' : 's'} awaiting approval</b>
            <p>Review and approve or decline requests in Leave Management.</p></div>
          <Button onClick={() => setActiveModuleId('leave')}>Review requests</Button>
        </div>
      )}
      {!activeModule && (expiringContracts.length > 0 || upcomingInterviews.length > 0) && (
        <div className="hr-reminder-strip" role="status">
        <Icon name="calendar-clock" size={16} />
        <span>
          {[
            expiringContracts.length ? `${expiringContracts.length} contract(s) expire within 30 days` : '',
            upcomingInterviews.length ? `${upcomingInterviews.length} interview(s) scheduled within 7 days` : '',
          ].filter(Boolean).join(' · ')}
        </span>
        </div>
      )}

      <div className="hr-workspace-filters">
        <label>Company / project
          <select onChange={(event) => { setCompanyFilter(event.target.value); setBranchFilter('') }} value={companyFilter}>
            <option value="">All companies</option>
            {companyOptions.map((company) => <option key={company}>{company}</option>)}
          </select>
        </label>
        <label>Branch
          <select onChange={(event) => setBranchFilter(event.target.value)} value={branchFilter}>
            <option value="">All branches</option>
            {branchOptions.map((branch) => <option key={branch}>{branch}</option>)}
          </select>
        </label>
      </div>

      {!activeModule && (
        <>
          <div className="hr-summary-grid">
            {[
              ['Total employees', employees.length, `${activeEmployees.length} active · ${inactiveEmployees.length} inactive`],
              ['Attendance today', todayAttendance.filter((record) => ['Present', 'Late', 'Remote'].includes(record.data.status)).length, `${absentToday} absent · ${lateToday} late`],
              ['Employees on leave', employeesOnLeave.length, 'Approved leave today'],
              ['Monthly payroll', formatMoney(payrollTotal), CURRENT_PERIOD()],
            ].map(([label, value, detail]) => (
              <article className="hr-summary-card" key={label}>
                <span>{label}</span><strong>{value}</strong><small>{detail}</small>
              </article>
            ))}
          </div>
          <div className="hr-overview-grid">
            <section className="card sp hr-branch-panel">
              <h2>Employees by branch</h2>
              {branchCounts.size ? [...branchCounts].sort((a, b) => b[1] - a[1]).map(([branch, count]) => (
                <div className="hr-branch-row" key={branch}><span>{branch}</span><b>{count}</b><i style={{ width: `${Math.max(4, count / employees.length * 100)}%` }} /></div>
              )) : <p className="mu">Add employee profiles to see branch distribution.</p>}
            </section>
            <section className="card sp hr-holiday-panel">
              <div><h2>Upcoming holidays</h2><Button onClick={() => startCreate('holidays')}><Icon name="plus" size={14} /> Add</Button></div>
              {upcomingHolidays.length ? upcomingHolidays.map((holiday) => (
                <article key={holiday.id}><b>{holiday.data.name}</b><span>{holiday.data.startDate}{holiday.data.endDate !== holiday.data.startDate ? ` – ${holiday.data.endDate}` : ''}</span><small>{[holiday.data.company, holiday.data.branch].filter(Boolean).join(' · ') || 'All companies'}</small></article>
              )) : <p className="mu">No upcoming holidays scheduled.</p>}
            </section>
          </div>
          <div className="hr-module-heading">
            <div><h2>HR operations</h2><p>Manage employees, attendance, leave, payroll, and hiring centrally.</p></div>
            <span>{MODULES.length} modules</span>
          </div>
          <div className="hr-module-grid">
            {MODULES.map((module) => {
              const count = scopedRecords.filter((record) => record.module === module.id).length
              return (
                <button className="hr-module-card" key={module.id} onClick={() => { setActiveModuleId(module.id); setStatusFilter('') }} type="button">
                  <span className="hr-module-card-top">
                    <span className={`hr-module-icon ${module.tone}`}><Icon name={module.icon} size={19} /></span>
                    <span className={`hr-module-status${count ? ' configured' : ''}`}>{count ? `${count} records` : 'No records'}</span>
                  </span>
                  <span className="hr-module-card-title">{module.title}</span>
                  <span className="hr-module-card-description">{module.description}</span>
                  <span className="hr-module-card-footer"><span><i /> Manage records</span><Icon name="chevron-right" size={15} /></span>
                </button>
              )
            })}
          </div>
          <section className="card sp hr-history-panel">
            <h2>Recent HR activity</h2>
            {records.filter((record) => record.module === 'activity')
              .sort((a, b) => String(b.data.at).localeCompare(String(a.data.at))).slice(0, 8).map((entry) => (
              <p key={entry.id}><b>{entry.data.action}</b> {entry.data.label} <span>{entry.data.company}{entry.data.branch ? ` · ${entry.data.branch}` : ''} · {new Date(entry.data.at).toLocaleString()}</span></p>
            ))}
            {!records.some((record) => record.module === 'activity') && <p className="mu">Updates to HR records will appear here.</p>}
          </section>
        </>
      )}

      {activeModule && (
        <section aria-label={`${activeModule.title} records`} className="hr-records-panel">
          <div className="hr-records-toolbar">
            <div><span className={`hr-module-icon ${activeModule.tone}`}><Icon name={activeModule.icon} size={19} /></span>
              <div><h2>{activeModule.title}</h2><p>{moduleRecords.length} matching records</p></div></div>
            <div className="hr-record-actions">
              <label className="hr-record-search"><Icon name="search" size={15} /><input aria-label={`Search ${activeModule.title}`} onChange={(event) => setSearch(event.target.value)} placeholder="Search records" value={search} /></label>
              <select aria-label="Filter records by status" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                <option value="">All statuses</option>{statusOptions.map((status) => <option key={status}>{status}</option>)}
              </select>
              <label className="hr-archived-toggle"><input checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} type="checkbox" /> Archived</label>
              <Button onClick={exportModule}><Icon name="download" size={14} /> Excel CSV</Button>
              <Button className="p" disabled={!storageReady} onClick={() => startCreate()}><Icon name="plus" size={15} /> Add record</Button>
            </div>
          </div>

          {showForm && (
            <form className="hr-record-form" onSubmit={submitRecord}>
              <div className="hr-record-form-heading"><div><h3>{editingRecord ? 'Edit record' : `Add ${activeModule.title.toLowerCase()} record`}</h3><p>Records are scoped to a company and branch for centralized reporting.</p></div>
                <button aria-label="Close record form" className="btn-icon-close" onClick={() => { setEditingRecord(null); setShowForm(false) }} type="button"><Icon name="close" size={16} /></button></div>
              <div className="hr-record-fields">
                {[...ORGANIZATION_FIELDS, ...activeModule.fields].map((field) => (
                  <label className={`hr-record-field${field.type === 'textarea' ? ' wide' : ''}`} key={field.key}>
                    <span>{field.label}{field.required && <i>Required</i>}</span>
                    {field.type === 'select' ? (
                      <select onChange={(event) => setFormData((current) => ({ ...current, [field.key]: event.target.value }))} required={field.required} value={formData[field.key] || ''}>
                        <option value="">Select…</option>
                        {[...new Set([
                          ...field.options,
                          ...(field.key === 'company' && formData.company && !field.options.includes(formData.company)
                            ? [formData.company]
                            : []),
                        ])].map((option) => <option key={option}>{option}</option>)}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea onChange={(event) => setFormData((current) => ({ ...current, [field.key]: event.target.value }))} rows={3} value={formData[field.key] || ''} />
                    ) : (
                      <input list={field.key === 'employee' ? 'hr-employee-options' : undefined} onChange={(event) => setFormData((current) => ({ ...current, [field.key]: event.target.value }))} required={field.required} min={field.type === 'number' ? '0' : undefined} step={field.type === 'number' ? '0.01' : undefined} type={field.type || 'text'} value={formData[field.key] || ''} />
                    )}
                  </label>
                ))}
                {activeModuleId === 'employees' && (
                  <label className="hr-record-field wide">
                    <span>Upload employee document{editingRecord?.data.documentFileName ? ` · current: ${editingRecord.data.documentFileName}` : ''}</span>
                    <input accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} type="file" />
                  </label>
                )}
              </div>
              <div className="hr-record-form-actions"><Button onClick={() => { setEditingRecord(null); setShowForm(false); setDocumentFile(null) }}>Cancel</Button><Button className="p" disabled={!storageReady} type="submit"><Icon name="check" size={15} /> Save record</Button></div>
            </form>
          )}

          {moduleRecords.length ? (
            <div className="hr-record-list">
              {moduleRecords.map((record) => {
                const title = record.data.name || record.data.employee || record.data.position || record.data.policy || record.data.course || record.data.employeeId || 'HR record'
                const attendanceToday = record.module === 'employees'
                  ? liveRecords.find((item) => item.module === 'attendance' && item.data.employee === record.data.name && item.data.date === TODAY())
                  : null
                return (
                  <article className="hr-record-card" key={record.id}>
                    <div className="hr-record-card-heading"><div><span className={`hr-module-icon ${activeModule.tone}`}><Icon name={activeModule.icon} size={17} /></span>
                      <div><h3>{title}</h3><small>{[record.data.company, record.data.branch].filter(Boolean).join(' · ') || 'Unassigned'} · {new Date(record.updatedAt || record.createdAt).toLocaleString()}</small></div></div>
                      <div><Button onClick={() => startEdit(record)}><Icon name="edit" size={14} /> Edit</Button>
                        {record.module === 'employees' && !record.archivedAt && <Button disabled={Boolean(attendanceToday?.data.checkOut)} onClick={() => toggleAttendance(record)}>{attendanceToday?.data.checkIn ? 'Check out' : 'Check in'}</Button>}
                        {record.module === 'employees' && record.data.documentFileId && <Button onClick={() => downloadEmployeeDocument(record)}>Download document</Button>}
                        {record.module === 'payroll' && <Button onClick={() => printPayslip(record)}>Generate payslip</Button>}
                        {record.module === 'leave' && record.data.status === 'Pending' && <><Button onClick={() => updateLeaveStatus(record, 'Approved')}>Approve</Button><Button onClick={() => updateLeaveStatus(record, 'Declined')}>Decline</Button></>}
                        {record.module === 'recruitment' && record.data.stage !== 'Hired' && record.data.candidate && <Button onClick={() => convertCandidate(record)}>Hire</Button>}
                        <Button onClick={() => toggleArchive(record)}>{record.archivedAt ? 'Restore' : 'Archive'}</Button></div></div>
                    <dl>{activeModule.fields.filter((field) => record.data[field.key]).map((field) => <div key={field.key}><dt>{field.label}</dt><dd>{record.data[field.key]}</dd></div>)}</dl>
                    {record.module === 'payroll' && <p className="hr-payroll-net">Net pay: <b>{formatMoney(asAmount(record.data.basicSalary) + asAmount(record.data.allowances) + asAmount(record.data.overtime) - asAmount(record.data.deductions) - asAmount(record.data.advances))}</b></p>}
                    {record.archivedAt && <p className="hr-archived-label">Archived {new Date(record.archivedAt).toLocaleDateString()}</p>}
                  </article>
                )
              })}
            </div>
          ) : !showForm ? (
            <div className="hr-record-empty"><span className={`hr-module-icon ${activeModule.tone}`}><Icon name={activeModule.icon} size={21} /></span>
              <h3>{search ? 'No matching records' : `No ${activeModule.title.toLowerCase()} records yet`}</h3><p>Try changing your filters or add a record to get started.</p>
              <Button className="p" disabled={!storageReady} onClick={() => startCreate()}><Icon name="plus" size={15} /> Add record</Button></div>
          ) : null}
          <p className="hr-record-storage-note"><Icon name="info" size={14} /> Protect payroll and personal information using your approved company storage, backup, and access policies.</p>
        </section>
      )}
      <datalist id="hr-employee-options">{employeeNames.map((name) => <option key={name} value={name} />)}</datalist>
    </section>
  )
}

export default HRWorkspace
