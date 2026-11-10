export const FOODICS_SECTIONS = [
  { id: 'reports', label: 'Reports library', shortLabel: 'Reports', icon: 'chart', description: 'A searchable, classified home for every Foodics report and period.' },
  { id: 'purchases', label: 'Purchase bills', shortLabel: 'Purchase bills', icon: 'wallet', description: 'File supplier invoices, supporting documents, and payment status.' },
  { id: 'sales', label: 'Sales bills', shortLabel: 'Sales bills', icon: 'file-check', description: 'Keep sales invoices and bill references together with their source files.' },
  { id: 'vat', label: 'VAT reminders', shortLabel: 'VAT reminders', icon: 'bell', description: 'Maintain filing and review dates without guessing your tax deadlines.' },
  { id: 'procedures', label: 'Procedures', shortLabel: 'Procedures', icon: 'check-square', description: 'Practical opening, shift-close, and exception-handling checklists.' },
  { id: 'accounts', label: 'Chart of Accounts', shortLabel: 'Chart of Accounts', icon: 'table', description: 'A structured reference for mapping Foodics activity to your ledger.' },
  { id: 'documents', label: 'Secure Documents', shortLabel: 'Secure Documents', icon: 'lock', description: 'An organized register for important company and compliance files.' },
]

export const FOODICS_PROJECTS = [
  { id: 'natheel', name: 'Natheel', color: '#d5a33b' },
  { id: 'ghalia', name: 'Ghalia', color: '#d77f9f' },
  { id: 'hajiss', name: 'Hajiss', color: '#d88a55' },
  { id: 'danisquare', name: 'DaniSquare', color: '#62a8b8' },
]

export const PROJECT_SECTIONS = FOODICS_SECTIONS.filter((section) => section.id !== 'reports')

export const OVERVIEW_SECTION = {
  id: 'overview',
  label: 'Foodics Management',
  shortLabel: 'Overview',
  icon: 'folder',
  description: 'Choose a project workspace to manage its finance and operations records.',
}

export const REPORT_TYPES = ['Daily sales', 'Sales by product', 'Payment reconciliation', 'Inventory movement', 'Discounts & voids', 'VAT summary', 'Operations', 'Other']

export const DOCUMENT_TYPES = ['Commercial registration', 'Tax registration', 'Foodics agreement', 'Banking', 'Insurance', 'Policy', 'Other']

export const PROCEDURES = [
  {
    id: 'opening',
    title: 'Opening readiness',
    cadence: 'Start of day',
    description: 'Confirm the outlet is ready before accepting orders.',
    steps: [
      'Confirm the correct outlet, business date, and active register.',
      'Review menu availability, prices, and any approved service notices.',
      'Check the receipt printer, network connection, and payment terminal.',
      'Count and record the opening cash float using the approved cash-control process.',
      'Escalate access, pricing, or equipment issues before service begins.',
    ],
  },
  {
    id: 'shift-close',
    title: 'Shift close & reconciliation',
    cadence: 'Every shift',
    description: 'Close the shift and retain evidence for the finance review.',
    steps: [
      'Review the shift totals and confirm the business date and outlet.',
      'Reconcile cash and card totals against the corresponding settlement evidence.',
      'Review refunds, voids, and discounts against their approvals and notes.',
      'Complete the close procedure in the current Foodics setup and save its report.',
      'Record variances, assign an owner, and retain supporting documents.',
    ],
  },
  {
    id: 'exception',
    title: 'Refund, void & discount review',
    cadence: 'Each exception',
    description: 'Apply the company approval policy and keep a traceable record.',
    steps: [
      'Confirm the transaction and outlet using the original bill reference.',
      'Verify the request and approval against the current company authorization policy.',
      'Record the reason and supporting evidence before completing the action.',
      'Confirm the final transaction status and include it in the shift review.',
      'Escalate suspected misuse or unresolved discrepancies to the designated manager.',
    ],
  },
  {
    id: 'reporting',
    title: 'Daily report filing',
    cadence: 'End of day',
    description: 'Keep reports consistent and easy to retrieve for review.',
    steps: [
      'Export the approved daily sales and payment reports for the correct date range.',
      'Use a consistent file name: outlet, report type, and period.',
      'Classify each report and add its source, preparer, and notes to the Reports library.',
      'Compare key totals with the closing record and flag any difference.',
      'Store the final version in the approved company record-keeping location.',
    ],
  },
]

