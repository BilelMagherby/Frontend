import { useMemo, useState } from 'react'
import { Icon } from '../ui/Icon.jsx'
import { Button } from '../ui/Button.jsx'
import { Field } from '../ui/Field.jsx'
import { normalize, projectName } from '../../utils/helpers.js'

export function ImportForm({ people = [], projects = [], onClose, onImport }) {
  const [rows, setRows] = useState(null)
  const [columns, setColumns] = useState({})
  const [fileName, setFileName] = useState('')
  const [pasted, setPasted] = useState('')
  const [assignee, setAssignee] = useState('')
  const [project, setProject] = useState(projects[0]?.id || 'nathilco')
  const [allDone, setAllDone] = useState(true)
  const [oneAssignee, setOneAssignee] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fields = [
    ['title', 'Task title', /task|title|name|job|subject|tache|mission|activity|description/],
    ['status', 'Status', /status|state|statut|etat|progress|done/],
    ['due', 'Due date', /due|deadline|echeance|limite|target date/],
    ['done', 'Completed on', /complet|done date|finish|closed|end|fin|delivered|date/],
    ['assignee', 'Done by', /assign|owner|responsib|by|who|person|employee|staff|member|resp/],
    ['project', 'Project / brand', /project|projet|brand|client|company|categor|list|department|business/],
    ['priority', 'Priority', /priorit|urgenc|importance/],
    ['note', 'Notes', /note|comment|remark|detail/],
  ]
  const parseDelimited = (text) => {
    const header = text.replace(/^\uFEFF/, '').split(/\r?\n/)[0] || ''
    const delimiter = ['\t', ';', ','].sort((a, b) => header.split(b).length - header.split(a).length)[0]
    const result = []
    let row = []
    let cell = ''
    let quoted = false
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index]
      if (quoted) {
        if (char === '"' && text[index + 1] === '"') {
          cell += '"'
          index += 1
        } else if (char === '"') quoted = false
        else cell += char
      } else if (char === '"' && !cell) quoted = true
      else if (char === delimiter) {
        row.push(cell)
        cell = ''
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && text[index + 1] === '\n') index += 1
        row.push(cell)
        result.push(row)
        row = []
        cell = ''
      } else cell += char
    }
    if (cell || row.length) {
      row.push(cell)
      result.push(row)
    }
    return result.filter((item) => item.some((value) => String(value).trim()))
  }
  const setData = (data, name) => {
    const header = data[0] || []
    const used = new Set()
    const guesses = {}
    fields.forEach(([key, , pattern]) => {
      const found = header.findIndex((value, index) => !used.has(index) && pattern.test(normalize(value)))
      guesses[key] = found
      if (found >= 0) used.add(found)
    })
    if (guesses.title < 0) guesses.title = 0
    setRows(data)
    setColumns(guesses)
    setFileName(name)
  }
  const selectedRows = useMemo(() => {
    if (!rows) return []
    const asDate = (value) => {
      if (!value) return ''
      const text = String(value).trim()
      if (/^\d{5}(\.\d+)?$/.test(text))
        return new Date(Date.UTC(1899, 11, 30) + +text * 86_400_000).toISOString().slice(0, 10)
      const match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
      if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
      const parsed = new Date(text)
      return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('en-CA')
    }
    return rows
      .slice(1)
      .map((row) => {
        const value = (key) => (columns[key] >= 0 ? row[columns[key]] : '')
        const title = String(value('title') || '').trim()
        const done = allDone || /done|complete|closed|finished|yes|oui|true|100/i.test(String(value('status')))
        return {
          title,
          status: done ? 'Done' : 'To Do',
          due: asDate(value('due')),
          doneAt: asDate(value('done')) ? new Date(asDate(value('done'))).getTime() : 0,
          assignee: oneAssignee ? assignee : String(value('assignee') || '').trim(),
          project: String(value('project') || project).trim(),
          priority: String(value('priority') || 'Normal'),
          note: String(value('note') || ''),
        }
      })
      .filter((item) => item.title)
  }, [allDone, assignee, columns, oneAssignee, project, rows])
  async function readFile(file) {
    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (['xlsx', 'xlsm', 'xls', 'ods'].includes(extension)) {
        if (!window.XLSX) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
            script.onload = resolve
            script.onerror = () => reject(new Error('Could not load Excel reader. Export the sheet as CSV instead.'))
            document.head.appendChild(script)
          })
        }
        const workbook = window.XLSX.read(await file.arrayBuffer(), { cellDates: true })
        const data = workbook.SheetNames.flatMap((name, index) => {
          const sheetRows = window.XLSX.utils
            .sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: '' })
            .filter((row) => row.some((value) => String(value).trim()))
          return index && String(sheetRows[0]) === String(rows?.[0]) ? sheetRows.slice(1) : sheetRows
        })
        setData(data, file.name)
      } else setData(parseDelimited(await file.text()), file.name)
    } catch (cause) {
      setError(cause.message)
    }
  }
  return (
    <div className="react-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="mdl">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge">
              <Icon name="upload" size={20} />
            </span>
            <h2>Import past work</h2>
          </div>
          <button aria-label="Close" className="btn-icon-close" onClick={onClose} type="button">
            <Icon name="close" size={18} />
          </button>
        </div>
        <p className="mu">
          Upload CSV, TSV, Excel, or OpenDocument files—or paste rows copied from a spreadsheet, including the header row.
        </p>
        <Field label="Choose spreadsheet">
          <input
            accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,.ods"
            onChange={(event) => event.target.files?.[0] && readFile(event.target.files[0])}
            type="file"
          />
        </Field>
        <Field label="Or paste spreadsheet rows">
          <textarea onChange={(event) => setPasted(event.target.value)} rows="4" value={pasted} />
        </Field>
        <Button onClick={() => setData(parseDelimited(pasted), 'pasted rows')} type="button">
          Read pasted rows
        </Button>
        {rows && (
          <>
            <p className="sp">
              <b>{rows.length - 1} row(s) found.</b> Map the spreadsheet columns:
            </p>
            <div className="f2">
              {fields.map(([key, label]) => (
                <Field key={key} label={label}>
                  <select
                    onChange={(event) => setColumns({ ...columns, [key]: +event.target.value })}
                    value={columns[key] ?? -1}
                  >
                    <option value={-1}>—</option>
                    {(rows[0] || []).map((name, index) => (
                      <option key={index} value={index}>
                        {String(name || `Column ${index + 1}`)}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <div className="f2 sp">
              <Field label="Credit all tasks to">
                <input list="import-people" onChange={(event) => setAssignee(event.target.value)} value={assignee} />
                <datalist id="import-people">
                  {people.map((person) => (
                    <option key={person}>{person}</option>
                  ))}
                </datalist>
              </Field>
              <Field label="Default project">
                <select onChange={(event) => setProject(event.target.value)} value={project}>
                  {projects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="row sp">
              <label className="chk">
                <input checked={allDone} onChange={(event) => setAllDone(event.target.checked)} type="checkbox" /> Count every row as completed
              </label>
              <label className="chk">
                <input checked={oneAssignee} onChange={(event) => setOneAssignee(event.target.checked)} type="checkbox" /> Credit all rows to one person
              </label>
            </div>
            <div
              aria-label="Spreadsheet preview. Scroll horizontally to view all columns"
              className="scroll sp"
              role="region"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    {fields.slice(0, 6).map(([, label]) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedRows.slice(0, 6).map((item, index) => (
                    <tr key={index}>
                      <td>{item.title}</td>
                      <td>{item.status}</td>
                      <td>{item.due || '—'}</td>
                      <td>{item.doneAt ? new Date(item.doneAt).toLocaleDateString() : '—'}</td>
                      <td>{item.assignee || '—'}</td>
                      <td>{projectName(projects, item.project)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row sp" style={{ justifyContent: 'flex-end' }}>
              <Button disabled={busy} onClick={onClose} type="button">
                Cancel
              </Button>
              <Button
                disabled={busy || !selectedRows.length}
                onClick={async () => {
                  setBusy(true)
                  setError('')
                  try {
                    await onImport(selectedRows, fileName)
                    onClose()
                  } catch (cause) {
                    setError(cause.message)
                  } finally {
                    setBusy(false)
                  }
                }}
                primary
                type="button"
              >
                {busy ? 'Importing…' : `Import ${selectedRows.length} task(s)`}
              </Button>
            </div>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}

