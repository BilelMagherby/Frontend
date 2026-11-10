import { useRef, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { formatBytes } from '../../utils/helpers.js'
import { REPORT_TYPES, DOCUMENT_TYPES } from './foodicsData.js'

export function FoodicsEntryDialog({ section, onClose, onSave }) {
  const [values, setValues] = useState({
    title: '',
    category: section.id === 'reports' ? REPORT_TYPES[0] : section.id === 'documents' ? DOCUMENT_TYPES[0] : '',
    reference: '',
    counterparty: '',
    date: '',
    dueDate: '',
    frequency: 'One time',
    amount: '',
    currency: 'SAR',
    status: section.id === 'purchases' ? 'Received' : section.id === 'sales' ? 'Issued' : 'Open',
    classification: 'Confidential',
    notes: '',
    file: null,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInput = useRef(null)
  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }))
  const isVat = section.id === 'vat'
  const isBill = section.id === 'purchases' || section.id === 'sales'
  const isAccount = section.id === 'accounts'
  const needsDate = section.id === 'vat' || isBill

  async function submit(event) {
    event.preventDefault()
    if (saving) return
    if (!values.title.trim()) return setError('Enter a clear title before saving.')
    if (needsDate && !values.date && !values.dueDate) return setError(isVat ? 'Choose the reminder due date.' : 'Choose the bill date.')
    if (isBill && !values.reference.trim()) return setError('Enter the bill or invoice reference.')
    if (isAccount && !values.reference.trim()) return setError('Enter the account code.')
    if (isAccount && !values.category) return setError('Choose the account type.')
    if (values.file && values.file.size > 100 * 1024 * 1024) return setError('Files must be 100 MB or smaller.')
    setSaving(true)
    setError('')
    try {
      await onSave(
        {
          id: `foodics-${crypto.randomUUID()}`,
          section: section.id,
          title: values.title.trim(),
          category: values.category,
          reference: values.reference.trim(),
          counterparty: values.counterparty.trim(),
          date: values.date,
          dueDate: values.dueDate,
          frequency: values.frequency,
          amount: values.amount === '' ? '' : Number(values.amount),
          currency: values.currency,
          status: values.status,
          classification: values.classification,
          notes: values.notes.trim(),
          fileName: values.file?.name || '',
          fileSize: values.file?.size || 0,
          fileType: values.file?.type || '',
          fileId: values.file ? `foodics-file-${crypto.randomUUID()}` : '',
          createdAt: new Date().toISOString(),
        },
        values.file
      )
      onClose()
    } catch (cause) {
      setError(cause.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="foodics-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form aria-labelledby="foodics-entry-title" aria-modal="true" className="foodics-entry-modal" onSubmit={submit} role="dialog">
        <header className="foodics-modal-header">
          <div>
            <span className="foodics-kicker">FOODICS MANAGEMENT</span>
            <h2 id="foodics-entry-title">Add to {section.shortLabel}</h2>
          </div>
          <button aria-label="Close dialog" className="foodics-icon-button" onClick={onClose} type="button">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="foodics-form-grid">
          <label className="foodics-field foodics-field-wide">
            <span>{isVat ? 'Reminder name' : isBill ? 'Bill title' : isAccount ? 'Account name' : 'Title'}</span>
            <input
              autoFocus
              maxLength="140"
              onChange={(event) => update('title', event.target.value)}
              placeholder={isVat ? 'Enter reminder name' : isAccount ? 'Enter the actual account name' : 'Give this record a clear name'}
              required
              value={values.title}
            />
          </label>
          {(section.id === 'reports' || section.id === 'documents' || isAccount) && (
            <label className="foodics-field">
              <span>{isAccount ? 'Account type' : 'Classification'}</span>
              <select onChange={(event) => update('category', event.target.value)} required={isAccount} value={values.category}>
                {isAccount && <option disabled value="">Select account type</option>}
                {(isAccount ? ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] : section.id === 'reports' ? REPORT_TYPES : DOCUMENT_TYPES).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          )}
          {isAccount && (
            <label className="foodics-field">
              <span>Account code</span>
              <input
                maxLength="40"
                onChange={(event) => update('reference', event.target.value)}
                placeholder="Enter code from your approved chart"
                required
                value={values.reference}
              />
            </label>
          )}
          {isBill && (
            <label className="foodics-field">
              <span>{section.id === 'purchases' ? 'Supplier' : 'Customer / channel'}</span>
              <input
                onChange={(event) => update('counterparty', event.target.value)}
                placeholder={section.id === 'purchases' ? 'Supplier name' : 'Customer or sales channel'}
                value={values.counterparty}
              />
            </label>
          )}
          {isBill && (
            <label className="foodics-field">
              <span>Invoice / bill number</span>
              <input
                onChange={(event) => update('reference', event.target.value)}
                placeholder="Reference number"
                required
                value={values.reference}
              />
            </label>
          )}
          {isBill && (
            <label className="foodics-field">
              <span>Amount (SAR)</span>
              <input
                min="0"
                onChange={(event) => update('amount', event.target.value)}
                placeholder="0.00"
                step="0.01"
                type="number"
                value={values.amount}
              />
            </label>
          )}
          {isBill && (
            <label className="foodics-field">
              <span>Bill date</span>
              <input onChange={(event) => update('date', event.target.value)} required type="date" value={values.date} />
            </label>
          )}
          {isBill && (
            <label className="foodics-field">
              <span>Record status</span>
              <select onChange={(event) => update('status', event.target.value)} value={values.status}>
                {(section.id === 'purchases'
                  ? ['Received', 'Under review', 'Approved', 'Paid', 'On hold']
                  : ['Issued', 'Part paid', 'Paid', 'Voided']
                ).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          )}
          {isVat && (
            <label className="foodics-field">
              <span>Due date</span>
              <input onChange={(event) => update('dueDate', event.target.value)} required type="date" value={values.dueDate} />
            </label>
          )}
          {isVat && (
            <label className="foodics-field">
              <span>Cycle reference</span>
              <select onChange={(event) => update('frequency', event.target.value)} value={values.frequency}>
                {['One time', 'Monthly', 'Quarterly', 'Annual', 'As scheduled'].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <small>Enter each filing date separately; this does not automatically schedule the next date.</small>
            </label>
          )}
          {section.id === 'documents' && (
            <label className="foodics-field">
              <span>Access classification</span>
              <select onChange={(event) => update('classification', event.target.value)} value={values.classification}>
                {['Confidential', 'Restricted', 'Internal'].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          )}
          {section.id === 'reports' && (
            <label className="foodics-field">
              <span>Report period</span>
              <input onChange={(event) => update('date', event.target.value)} type="month" value={values.date} />
            </label>
          )}
          <label className="foodics-field foodics-field-wide">
            <span>Notes</span>
            <textarea
              maxLength="1200"
              onChange={(event) => update('notes', event.target.value)}
              placeholder="Add context, owner, approval reference, or review notes"
              rows="3"
              value={values.notes}
            />
          </label>
          <label className="foodics-field foodics-field-wide">
            <span>
              Supporting file <small>Optional · maximum 100 MB</small>
            </span>
            <input onChange={(event) => update('file', event.target.files?.[0] || null)} ref={fileInput} type="file" />
            {values.file && (
              <span className="foodics-selected-file">
                <Icon name="paperclip" size={13} /> {values.file.name} · {formatBytes(values.file.size)}
              </span>
            )}
          </label>
        </div>
        {error && (
          <p className="foodics-form-error" role="alert">
            <Icon name="alert-triangle" size={15} /> {error}
          </p>
        )}
        <footer className="foodics-modal-actions">
          <button className="foodics-button secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="foodics-button primary" disabled={saving} type="submit">
            {saving ? 'Saving…' : 'Save record'}
          </button>
        </footer>
      </form>
    </div>
  )
}
