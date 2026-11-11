import * as XLSX from 'xlsx'

export async function getXLSX() {
  if (typeof XLSX !== 'undefined' && XLSX.utils) return XLSX
  if (typeof window !== 'undefined' && window.XLSX) return window.XLSX
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
    script.onload = () => resolve(window.XLSX)
    script.onerror = () => reject(new Error('Could not load Excel processor.'))
    document.head.appendChild(script)
  })
}

export const TEMPLATE_COLUMNS = [
  // General Information
  'First Name',
  'Last Name',
  'Serial Number',
  'Date of Birth',
  'Email Address',
  // Personal Information
  'Phone Number',
  'Foreign/Local',
  'Nationality',
  'ID/Iqama Number',
  'Passport Number',
  'Address',
  // Salary and shifts information
  'Monthly Salary',
  'Annual Salary',
  'Overtime Rate Per Hour',
  'Start Date',
  'End Date',
  'Working Days',
  // Job information
  'Position',
  'Qualification',
  'Number of Holidays Days',
  'Opening Holiday Balance',
  // Bank Information
  'Bank Name',
  'Account Number',
  'IBAN',
  'Route Swift',
  'Bank Country',
  // Organization Placement
  'Company',
  'Branch',
]

export const SAMPLE_EMPLOYEES = [
  [
    'Ahmed',
    'Al-Mansour',
    'EMP-1001',
    '1992-05-14',
    'ahmed.mansour@natheelco.com',
    '+966501234567',
    'Local',
    'Saudi',
    '1098765432',
    'K12345678',
    'Riyadh, Olaya District',
    12000,
    144000,
    75,
    '2024-01-01',
    '2026-12-31',
    'Sunday - Thursday (5 days)',
    'Senior Operations Specialist',
    "Bachelor's in Business Administration",
    30,
    15,
    'Al Rajhi Bank',
    '12345678901234',
    'SA0380000000123456789012',
    'RJHISARI',
    'Saudi Arabia',
    'Natheelco',
    'Riyadh HQ',
  ],
  [
    'John',
    'Doe',
    'EMP-1002',
    '1990-11-20',
    'john.doe@natheelco.com',
    '+966509876543',
    'Foreign',
    'British',
    '2098765432',
    'GB98765432',
    'Riyadh, Al Malqa',
    18000,
    216000,
    110,
    '2023-06-01',
    '2025-05-31',
    'Sunday - Thursday (5 days)',
    'Financial Analyst',
    "Master's in Finance",
    30,
    10,
    'SNB (National Commercial Bank)',
    '98765432109876',
    'SA4410000009876543210987',
    'NCBISARI',
    'Saudi Arabia',
    'Natheelco',
    'Riyadh HQ',
  ],
]

export async function downloadEmployeeTemplate() {
  const xlsx = await getXLSX()
  const data = [TEMPLATE_COLUMNS, ...SAMPLE_EMPLOYEES]
  const wb = xlsx.utils.book_new()
  const ws = xlsx.utils.aoa_to_sheet(data)

  // Configure column widths for readability
  ws['!cols'] = [
    { wch: 15 }, // First Name
    { wch: 15 }, // Last Name
    { wch: 16 }, // Serial Number
    { wch: 14 }, // Date of Birth
    { wch: 28 }, // Email Address
    { wch: 18 }, // Phone Number
    { wch: 14 }, // Foreign/Local
    { wch: 15 }, // Nationality
    { wch: 18 }, // ID/Iqama Number
    { wch: 16 }, // Passport Number
    { wch: 26 }, // Address
    { wch: 16 }, // Monthly Salary
    { wch: 16 }, // Annual Salary
    { wch: 22 }, // Overtime Rate Per Hour
    { wch: 14 }, // Start Date
    { wch: 14 }, // End Date
    { wch: 28 }, // Working Days
    { wch: 26 }, // Position
    { wch: 28 }, // Qualification
    { wch: 24 }, // Number of Holidays Days
    { wch: 24 }, // Opening Holiday Balance
    { wch: 20 }, // Bank Name
    { wch: 20 }, // Account Number
    { wch: 28 }, // IBAN
    { wch: 16 }, // Route Swift
    { wch: 16 }, // Bank Country
    { wch: 16 }, // Company
    { wch: 16 }, // Branch
  ]

  xlsx.utils.book_append_sheet(wb, ws, 'Employee Template')
  xlsx.writeFile(wb, 'Employee_Import_Template.xlsx')
}

function getVal(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      if (row[k] instanceof Date) return row[k].toISOString().slice(0, 10)
      return String(row[k]).trim()
    }
  }
  const rowKeys = Object.keys(row)
  for (const k of keys) {
    const target = k.toLowerCase().replace(/[^a-z0-9]/g, '')
    for (const rk of rowKeys) {
      if (rk.toLowerCase().replace(/[^a-z0-9]/g, '') === target) {
        const val = row[rk]
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          if (val instanceof Date) return val.toISOString().slice(0, 10)
          return String(val).trim()
        }
      }
    }
  }
  return ''
}

export async function parseEmployeeExcel(file, defaultCompany = '', defaultBranch = '') {
  const xlsx = await getXLSX()
  const buffer = await file.arrayBuffer()
  const workbook = xlsx.read(buffer, { cellDates: true, raw: false })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) throw new Error('The uploaded Excel spreadsheet contains no sheets.')

  const worksheet = workbook.Sheets[firstSheetName]
  const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: '' })
  if (!rawRows.length) throw new Error('The uploaded file contains no employee data rows.')

  const parsed = []
  rawRows.forEach((row, index) => {
    // General Information
    const firstName = getVal(row, 'First Name', 'firstName')
    const lastName = getVal(row, 'Last Name', 'lastName')
    const serialNumber = getVal(row, 'Serial Number', 'serialNumber', 'employeeId', 'Employee ID', 'ID')
    const dob = getVal(row, 'Date of Birth', 'DOB', 'birthDate', 'Date Of Birth')
    const email = getVal(row, 'Email Address', 'Email', 'emailAddress')

    // Personal Information
    const phone = getVal(row, 'Phone Number', 'Phone', 'contactNumber', 'Mobile')
    const foreignOrLocal = getVal(row, 'Foreign/Local', 'Foreign / Local', 'foreignOrLocal', 'ForeignLocal')
    const nationality = getVal(row, 'Nationality')
    const iqamaNumber = getVal(row, 'ID/Iqama Number', 'ID / Iqama Number', 'Iqama Number', 'National ID', 'Iqama', 'ID Number')
    const passportNumber = getVal(row, 'Passport Number', 'Passport')
    const address = getVal(row, 'Address')

    // Salary and Shifts Information
    const monthlySalary = getVal(row, 'Monthly Salary', 'Basic Salary', 'Salary')
    const annualSalary = getVal(row, 'Annual Salary')
    const overtimeRate = getVal(row, 'Overtime Rate Per Hour', 'Overtime Rate')
    const startDate = getVal(row, 'Start Date', 'contractStart', 'Hire Date')
    const endDate = getVal(row, 'End Date', 'contractEnd')
    const workingDays = getVal(row, 'Working Days', 'Work Days')

    // Job Information
    const position = getVal(row, 'Position', 'jobTitle', 'Job Title')
    const qualification = getVal(row, 'Qualification', 'Degree', 'Education')
    const holidayDays = getVal(row, 'Number of Holidays Days', 'Holidays Days', 'Annual Holidays')
    const openingHolidayBalance = getVal(row, 'Opening Holiday Balance', 'Holiday Balance', 'Opening Balance')

    // Bank Information
    const bankName = getVal(row, 'Bank Name', 'Bank')
    const accountNumber = getVal(row, 'Account Number', 'Account No')
    const iban = getVal(row, 'IBAN')
    const routeSwift = getVal(row, 'Route Swift', 'Swift Code', 'Swift')
    const bankCountry = getVal(row, 'Bank Country')

    // Placement
    const company = getVal(row, 'Company', 'Project', 'Company / project') || defaultCompany || 'Natheelco'
    const branch = getVal(row, 'Branch') || defaultBranch || 'Main Branch'

    // Skip empty lines
    if (!firstName && !lastName && !serialNumber && !email && !position && !monthlySalary) {
      return
    }

    const name = [firstName, lastName].filter(Boolean).join(' ') || serialNumber || `Employee ${index + 1}`
    const employeeId = serialNumber || `EMP-${Date.now().toString().slice(-6)}-${index + 1}`
    const now = new Date().toISOString()

    const employeeRecord = {
      id: `hr-emp-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
      module: 'employees',
      data: {
        employeeId,
        serialNumber,
        firstName,
        lastName,
        name,
        dob,
        email,
        phone,
        foreignOrLocal: foreignOrLocal || 'Local',
        nationality,
        iqamaNumber,
        passportNumber,
        address,
        basicSalary: monthlySalary,
        monthlySalary,
        annualSalary: annualSalary || (monthlySalary ? String(Number(monthlySalary) * 12) : ''),
        overtimeRate,
        contractStart: startDate,
        startDate,
        contractEnd: endDate,
        endDate,
        workingDays,
        jobTitle: position,
        position,
        qualification,
        holidayDays,
        openingHolidayBalance,
        bankName,
        accountNumber,
        iban,
        routeSwift,
        bankCountry,
        company,
        branch,
        status: 'Active',
      },
      createdAt: now,
      updatedAt: now,
      archivedAt: '',
    }

    parsed.push(employeeRecord)
  })

  if (!parsed.length) {
    throw new Error('No valid employee records found in the file. Ensure you fill in the template columns.')
  }

  return parsed
}
