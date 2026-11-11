import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const HR_COMPANIES = ['Natheelco', 'Hajiss Café', 'Odun Pide', 'Ghalia', 'Dani Designs']
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const IBAN_REGEX = /^[A-Z0-9]{15,34}$/i

export function EmployeeFormModal({
  isOpen,
  onClose,
  employeeToEdit = null,
  existingEmployees = [],
  onSave,
  defaultCompany = '',
  defaultBranch = '',
}) {
  const [activeTab, setActiveTab] = useState('general') // 'general' | 'personal' | 'salary' | 'job' | 'bank'
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    serialNumber: '',
    dob: '',
    email: '',
    phone: '',
    foreignOrLocal: 'Local',
    nationality: '',
    iqamaNumber: '',
    passportNumber: '',
    address: '',
    monthlySalary: '',
    annualSalary: '',
    overtimeRate: '',
    startDate: '',
    endDate: '',
    workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    position: '',
    department: '',
    qualification: '',
    holidayDays: 30,
    openingHolidayBalance: 0,
    status: 'Active',
    contractType: 'Permanent',
    bankName: '',
    accountNumber: '',
    iban: '',
    routeSwift: '',
    swiftCode: '',
    bankCountry: 'Saudi Arabia',
    company: defaultCompany || 'Natheelco',
    branch: defaultBranch || 'Main Branch',
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [annualSalaryManuallyEdited, setAnnualSalaryManuallyEdited] = useState(false)

  useEffect(() => {
    if (employeeToEdit) {
      const d = employeeToEdit.data || employeeToEdit
      const working = Array.isArray(d.workingDays)
        ? d.workingDays
        : (d.workingDays ? String(d.workingDays).split(',').map((s) => s.trim()) : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'])

      const first = d.firstName || (d.name ? d.name.split(' ')[0] : '')
      const last = d.lastName || (d.name ? d.name.split(' ').slice(1).join(' ') : '')

      setFormData({
        firstName: first,
        lastName: last,
        serialNumber: d.serialNumber || d.employeeId || '',
        dob: d.dob || '',
        email: d.email || '',
        phone: d.phone || '',
        foreignOrLocal: d.foreignOrLocal || 'Local',
        nationality: d.nationality || '',
        iqamaNumber: d.iqamaNumber || '',
        passportNumber: d.passportNumber || '',
        address: d.address || '',
        monthlySalary: d.monthlySalary ?? d.basicSalary ?? '',
        annualSalary: d.annualSalary ?? '',
        overtimeRate: d.overtimeRate ?? '',
        startDate: d.startDate || d.contractStart || '',
        endDate: d.endDate || d.contractEnd || '',
        workingDays: working,
        position: d.position || d.jobTitle || '',
        department: d.department || '',
        qualification: d.qualification || '',
        holidayDays: d.annualHolidayEntitlement ?? d.holidayDays ?? 30,
        openingHolidayBalance: d.openingHolidayBalance ?? 0,
        status: d.status || 'Active',
        contractType: d.contractType || 'Permanent',
        bankName: d.bankName || '',
        accountNumber: d.accountNumber || '',
        iban: d.iban || '',
        routeSwift: d.routeSwift || d.routingNumber || '',
        swiftCode: d.swiftCode || d.routeSwift || '',
        bankCountry: d.bankCountry || 'Saudi Arabia',
        company: d.company || defaultCompany || 'Natheelco',
        branch: d.branch || defaultBranch || 'Main Branch',
      })
      setAnnualSalaryManuallyEdited(Boolean(d.annualSalary))
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        serialNumber: '',
        dob: '',
        email: '',
        phone: '',
        foreignOrLocal: 'Local',
        nationality: '',
        iqamaNumber: '',
        passportNumber: '',
        address: '',
        monthlySalary: '',
        annualSalary: '',
        overtimeRate: '',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        position: '',
        department: '',
        qualification: '',
        holidayDays: 30,
        openingHolidayBalance: 0,
        status: 'Active',
        contractType: 'Permanent',
        bankName: '',
        accountNumber: '',
        iban: '',
        routeSwift: '',
        swiftCode: '',
        bankCountry: 'Saudi Arabia',
        company: defaultCompany || 'Natheelco',
        branch: defaultBranch || 'Main Branch',
      })
      setAnnualSalaryManuallyEdited(false)
    }
    setErrors({})
  }, [employeeToEdit, defaultCompany, defaultBranch, isOpen])

  if (!isOpen) return null

  // Handle Monthly Salary auto-calc
  const handleMonthlySalaryChange = (value) => {
    const num = Number(value) || 0
    setFormData((prev) => ({
      ...prev,
      monthlySalary: value,
      annualSalary: annualSalaryManuallyEdited ? prev.annualSalary : (num ? String(num * 12) : ''),
    }))
  }

  // Toggle working days
  const toggleWorkingDay = (day) => {
    setFormData((prev) => {
      const current = prev.workingDays || []
      const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
      return { ...prev, workingDays: updated }
    })
  }

  // Validate form
  const validate = () => {
    const newErrors = {}

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required.'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required.'
    if (!formData.serialNumber.trim()) newErrors.serialNumber = 'Employee serial number is required.'
    if (!formData.dob) newErrors.dob = 'Date of birth is required.'
    if (!formData.email.trim()) newErrors.email = 'Email address is required.'
    else if (!EMAIL_REGEX.test(formData.email.trim())) newErrors.email = 'Invalid email address.'

    // Check duplicate serial number
    const normalizedSerial = formData.serialNumber.trim().toUpperCase()
    if (normalizedSerial) {
      const duplicate = existingEmployees.find((emp) => {
        if (employeeToEdit && emp.id === employeeToEdit.id) return false
        const otherSerial = String(emp.data?.serialNumber || emp.data?.employeeId || '').trim().toUpperCase()
        return otherSerial === normalizedSerial
      })
      if (duplicate) {
        newErrors.serialNumber = `Serial number is already assigned to ${duplicate.data?.name || 'another employee'}.`
      }
    }

    if (formData.iban && !IBAN_REGEX.test(formData.iban.replaceAll(' ', ''))) {
      newErrors.iban = 'Invalid IBAN format (15–34 alphanumeric characters).'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      const payload = {
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        employeeId: formData.serialNumber.trim().toUpperCase(),
        serialNumber: formData.serialNumber.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
        monthlySalary: Number(formData.monthlySalary) || 0,
        annualSalary: Number(formData.annualSalary) || 0,
        overtimeRate: Number(formData.overtimeRate) || 0,
        holidayDays: Number(formData.holidayDays) || 30,
        openingHolidayBalance: Number(formData.openingHolidayBalance) || 0,
      }
      await onSave(payload, employeeToEdit?.id)
      onClose()
    } catch (err) {
      setErrors({ form: err.message || 'Failed to save employee record.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="hr-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="hr-modal-card hr-form-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="hr-modal-header">
          <div>
            <h2>
              <Icon name={employeeToEdit ? 'edit' : 'user-plus'} size={20} />
              {employeeToEdit ? `Edit Employee: ${employeeToEdit.data?.name}` : 'Register New Employee'}
            </h2>
            <p>Fill out all employee information across the sections below. All changes persist in the database.</p>
          </div>
          <button className="btn-icon-close" onClick={onClose} type="button" aria-label="Close modal">
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="hr-form-tabs">
          <button
            type="button"
            className={`hr-form-tab ${activeTab === 'general' ? 'active' : ''} ${errors.firstName || errors.lastName || errors.serialNumber || errors.dob || errors.email ? 'has-error' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Icon name="users" size={15} /> A. General Info
          </button>
          <button
            type="button"
            className={`hr-form-tab ${activeTab === 'personal' ? 'active' : ''} ${errors.phone || errors.iqamaNumber ? 'has-error' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            <Icon name="user" size={15} /> B. Personal Info
          </button>
          <button
            type="button"
            className={`hr-form-tab ${activeTab === 'salary' ? 'active' : ''}`}
            onClick={() => setActiveTab('salary')}
          >
            <Icon name="wallet" size={15} /> C. Salary &amp; Shifts
          </button>
          <button
            type="button"
            className={`hr-form-tab ${activeTab === 'job' ? 'active' : ''}`}
            onClick={() => setActiveTab('job')}
          >
            <Icon name="briefcase" size={15} /> D. Job Info
          </button>
          <button
            type="button"
            className={`hr-form-tab ${activeTab === 'bank' ? 'active' : ''} ${errors.iban ? 'has-error' : ''}`}
            onClick={() => setActiveTab('bank')}
          >
            <Icon name="credit-card" size={15} /> E. Bank Info
          </button>
        </div>

        {errors.form && (
          <div className="hr-form-alert error">
            <Icon name="alert-triangle" size={16} />
            <span>{errors.form}</span>
          </div>
        )}

        {/* Form Body */}
        <form className="hr-employee-form" onSubmit={handleSubmit}>
          <div className="hr-form-body-scroll">
            {/* Section A: General Info */}
            {activeTab === 'general' && (
              <div className="hr-section-block">
                <div className="hr-section-title">
                  <h3>General Information</h3>
                  <p>Basic identification and contact details required for system records.</p>
                </div>
                <div className="hr-form-grid">
                  <label className="hr-field">
                    <span>First Name <i className="req">*</i></span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ahmed"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                    {errors.firstName && <small className="field-err">{errors.firstName}</small>}
                  </label>

                  <label className="hr-field">
                    <span>Last Name <i className="req">*</i></span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Al-Mansour"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                    {errors.lastName && <small className="field-err">{errors.lastName}</small>}
                  </label>

                  <label className="hr-field">
                    <span>Employee Serial Number (Unique) <i className="req">*</i></span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EMP-1001"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    />
                    {errors.serialNumber && <small className="field-err">{errors.serialNumber}</small>}
                  </label>

                  <label className="hr-field">
                    <span>Date of Birth <i className="req">*</i></span>
                    <input
                      type="date"
                      required
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    />
                    {errors.dob && <small className="field-err">{errors.dob}</small>}
                  </label>

                  <label className="hr-field wide">
                    <span>Email Address <i className="req">*</i></span>
                    <input
                      type="email"
                      required
                      placeholder="e.g. ahmed.mansour@natheelco.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    {errors.email && <small className="field-err">{errors.email}</small>}
                  </label>

                  <label className="hr-field">
                    <span>Company / Project</span>
                    <select
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    >
                      {HR_COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>

                  <label className="hr-field">
                    <span>Branch</span>
                    <input
                      type="text"
                      placeholder="e.g. Riyadh HQ"
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Section B: Personal Info */}
            {activeTab === 'personal' && (
              <div className="hr-section-block">
                <div className="hr-section-title">
                  <h3>Personal Information</h3>
                  <p>Residency, identification documents, and personal contact info.</p>
                </div>
                <div className="hr-form-grid">
                  <label className="hr-field">
                    <span>Phone Number</span>
                    <input
                      type="tel"
                      placeholder="e.g. +966501234567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </label>

                  <label className="hr-field">
                    <span>Employee Type</span>
                    <select
                      value={formData.foreignOrLocal}
                      onChange={(e) => setFormData({ ...formData, foreignOrLocal: e.target.value })}
                    >
                      <option value="Local">Local (Saudi National)</option>
                      <option value="Foreign">Foreign (Resident)</option>
                    </select>
                  </label>

                  <label className="hr-field">
                    <span>Nationality</span>
                    <input
                      type="text"
                      placeholder="e.g. Saudi, Egyptian, Jordanian"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    />
                  </label>

                  <label className="hr-field">
                    <span>National ID / Iqama Number</span>
                    <input
                      type="text"
                      placeholder="10-digit ID / Iqama number"
                      value={formData.iqamaNumber}
                      onChange={(e) => setFormData({ ...formData, iqamaNumber: e.target.value })}
                    />
                  </label>

                  <label className="hr-field">
                    <span>Passport Number</span>
                    <input
                      type="text"
                      placeholder="Passport document number"
                      value={formData.passportNumber}
                      onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                    />
                  </label>

                  <label className="hr-field wide">
                    <span>Residential Address</span>
                    <textarea
                      rows={2}
                      placeholder="Street, District, City, Country"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Section C: Salary and Shifts */}
            {activeTab === 'salary' && (
              <div className="hr-section-block">
                <div className="hr-section-title">
                  <h3>Salary and Shifts Information</h3>
                  <p>Compensation packages, contract dates, and shift working days.</p>
                </div>
                <div className="hr-form-grid">
                  <label className="hr-field">
                    <span>Monthly Salary (SAR)</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="e.g. 15000"
                      value={formData.monthlySalary}
                      onChange={(e) => handleMonthlySalaryChange(e.target.value)}
                    />
                  </label>

                  <label className="hr-field">
                    <span>Annual Salary (SAR) <small>(Auto: Monthly × 12)</small></span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      placeholder="e.g. 180000"
                      value={formData.annualSalary}
                      onChange={(e) => {
                        setAnnualSalaryManuallyEdited(true)
                        setFormData({ ...formData, annualSalary: e.target.value })
                      }}
                    />
                  </label>

                  <label className="hr-field">
                    <span>Overtime Rate Per Hour (SAR)</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g. 75"
                      value={formData.overtimeRate}
                      onChange={(e) => setFormData({ ...formData, overtimeRate: e.target.value })}
                    />
                  </label>

                  <label className="hr-field">
                    <span>Employment Start Date</span>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </label>

                  <label className="hr-field">
                    <span>Employment End Date</span>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </label>

                  <div className="hr-field wide">
                    <span>Working Days of the Week</span>
                    <div className="hr-days-selector">
                      {DAYS_OF_WEEK.map((day) => {
                        const selected = (formData.workingDays || []).includes(day)
                        return (
                          <button
                            key={day}
                            type="button"
                            className={`hr-day-pill ${selected ? 'selected' : ''}`}
                            onClick={() => toggleWorkingDay(day)}
                          >
                            {day.slice(0, 3)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section D: Job Information */}
            {activeTab === 'job' && (
              <div className="hr-section-block">
                <div className="hr-section-title">
                  <h3>Job Information</h3>
                  <p>Role positioning, qualification, and annual holiday entitlements.</p>
                </div>
                <div className="hr-form-grid">
                  <label className="hr-field">
                    <span>Position / Job Title</span>
                    <input
                      type="text"
                      placeholder="e.g. Senior Operations Manager"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                  </label>

                  <label className="hr-field">
                    <span>Department</span>
                    <input
                      type="text"
                      placeholder="e.g. Operations, Marketing, IT, Finance"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </label>

                  <label className="hr-field">
                    <span>Qualification / Degree</span>
                    <input
                      type="text"
                      placeholder="e.g. Bachelor in Business Administration"
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    />
                  </label>

                  <label className="hr-field">
                    <span>Employment Status</span>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="On leave">On leave</option>
                    </select>
                  </label>

                  <label className="hr-field">
                    <span>Contract Type</span>
                    <select
                      value={formData.contractType}
                      onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                    >
                      <option value="Permanent">Permanent</option>
                      <option value="Fixed term">Fixed term</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Temporary">Temporary</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <label className="hr-field">
                    <span>Annual Holiday Entitlement (Days)</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.holidayDays}
                      onChange={(e) => setFormData({ ...formData, holidayDays: e.target.value })}
                    />
                  </label>

                  <label className="hr-field">
                    <span>Opening Holiday Balance (Days)</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.openingHolidayBalance}
                      onChange={(e) => setFormData({ ...formData, openingHolidayBalance: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Section E: Bank Information */}
            {activeTab === 'bank' && (
              <div className="hr-section-block">
                <div className="hr-section-title">
                  <h3>Bank Information</h3>
                  <p>Banking coordinates for payroll disbursements and direct deposits.</p>
                </div>
                <div className="hr-form-grid">
                  <label className="hr-field">
                    <span>Bank Name</span>
                    <input
                      type="text"
                      placeholder="e.g. Al Rajhi Bank, SNB, Riyad Bank"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    />
                  </label>

                  <label className="hr-field">
                    <span>Account Number</span>
                    <input
                      type="text"
                      placeholder="Account number"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    />
                  </label>

                  <label className="hr-field wide">
                    <span>IBAN</span>
                    <input
                      type="text"
                      placeholder="SA00 0000 0000 0000 0000 0000"
                      value={formData.iban}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                    />
                    {errors.iban && <small className="field-err">{errors.iban}</small>}
                  </label>

                  <label className="hr-field">
                    <span>Routing Number / Route Swift</span>
                    <input
                      type="text"
                      placeholder="e.g. RJHISARI"
                      value={formData.routeSwift}
                      onChange={(e) => setFormData({ ...formData, routeSwift: e.target.value })}
                    />
                  </label>

                  <label className="hr-field">
                    <span>SWIFT / BIC Code</span>
                    <input
                      type="text"
                      placeholder="SWIFT code"
                      value={formData.swiftCode}
                      onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })}
                    />
                  </label>

                  <label className="hr-field">
                    <span>Bank Country</span>
                    <input
                      type="text"
                      placeholder="e.g. Saudi Arabia"
                      value={formData.bankCountry}
                      onChange={(e) => setFormData({ ...formData, bankCountry: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="hr-modal-footer">
            <Button onClick={onClose} type="button">Cancel</Button>
            <div style={{ display: 'flex', gap: 10 }}>
              {activeTab !== 'general' && (
                <Button
                  type="button"
                  onClick={() => {
                    const tabs = ['general', 'personal', 'salary', 'job', 'bank']
                    const idx = tabs.indexOf(activeTab)
                    if (idx > 0) setActiveTab(tabs[idx - 1])
                  }}
                >
                  Previous
                </Button>
              )}
              {activeTab !== 'bank' ? (
                <Button
                  type="button"
                  onClick={() => {
                    const tabs = ['general', 'personal', 'salary', 'job', 'bank']
                    const idx = tabs.indexOf(activeTab)
                    if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1])
                  }}
                >
                  Next Section <Icon name="chevron-right" size={14} />
                </Button>
              ) : null}
              <Button className="p" type="submit" disabled={isSubmitting}>
                <Icon name="check" size={15} />
                {isSubmitting ? 'Saving to Database…' : employeeToEdit ? 'Save Changes' : 'Register Employee'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
