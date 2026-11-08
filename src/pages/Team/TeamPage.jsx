import { useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Field } from '../../components/ui/Field.jsx'
import { KpiTable } from '../../components/shared/KpiTable.jsx'

export function TeamPage({
  config,
  setConfig,
  saveConfig,
  people,
  kpis,
  history,
  onImport,
  onRemoveHistory,
  onChangePin,
  onLogo,
  onSelectEmployee,
  onError,
  onSuccess,
}) {
  const [employee, setEmployee] = useState('')
  const patch = (key, value) => setConfig((current) => ({ ...current, [key]: value }))

  async function runAction(action, successMessage) {
    try {
      await action()
      if (successMessage) onSuccess(successMessage)
    } catch (cause) {
      onError(cause.message)
    }
  }

  return (
    <>
      <header className="top">
        <div>
          <h1>Team & KPIs</h1>
          <div className="mu">Manage employees, imports, and the KPI model</div>
        </div>
        <Button onClick={onChangePin}>Change PIN</Button>
      </header>
      <section className="card hub">
        <div className="modal-header team-import-header" style={{ marginBottom: 12 }}>
          <div className="modal-title-wrap">
            <span className="modal-icon-badge">
              <Icon name="upload" size={20} />
            </span>
            <div>
              <h2>Past work from Google Sheets / Excel</h2>
              <div className="mu">{history.length} imported row(s); historical work counts in KPI scores.</div>
            </div>
          </div>
          <div className="row team-import-actions">
            <Button onClick={onImport} primary>
              Import spreadsheet
            </Button>
            {history.length > 0 && <Button onClick={() => runAction(onRemoveHistory)}>Remove imported rows</Button>}
          </div>
        </div>
        <div className="row sp">
          <Field label="Credit imported work to">
            <input
              onChange={(event) => patch('credit', { ...config.credit, name: event.target.value })}
              value={config.credit?.name || ''}
            />
          </Field>
          <Field label="ClickUp list / folder / space">
            <input
              onChange={(event) => patch('credit', { ...config.credit, list: event.target.value })}
              value={config.credit?.list || ''}
            />
          </Field>
          <Field label="ClickUp tag">
            <input
              onChange={(event) => patch('credit', { ...config.credit, tag: event.target.value })}
              value={config.credit?.tag || ''}
            />
          </Field>
          <Field label="Tasks created on or before">
            <input
              onChange={(event) => patch('credit', { ...config.credit, before: event.target.value })}
              type="date"
              value={config.credit?.before || ''}
            />
          </Field>
          <Button onClick={() => runAction(() => saveConfig(config), 'Credit rule saved.')} primary>
            Save credit rule
          </Button>
        </div>
      </section>
      <section className="card sp">
        <h2>Team members</h2>
        <div className="grid k4">
          {kpis.map((row) => (
            <div className="card" key={row.name}>
              <b>{row.name}</b>
              <p className="mu">
                {row.total} managed • {row.done} done • {row.overdue} overdue
              </p>
              <div className="bar">
                <i style={{ width: `${row.score}%` }} />
              </div>
              <span className="mu">KPI score {Math.round(row.score)}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="grid k2 sp">
        <section className="card">
          <h2>Employees</h2>
          <div className="row">
            <input
              onChange={(event) => setEmployee(event.target.value)}
              placeholder="Employee name"
              value={employee}
            />
            <Button
              disabled={!employee.trim() || config.team.includes(employee.trim())}
              onClick={() =>
                runAction(async () => {
                  const name = employee.trim()
                  await saveConfig({ ...config, team: [...config.team, name] })
                  setEmployee('')
                }, 'Employee added.')
              }
              primary
            >
              Add
            </Button>
          </div>
          <div className="row sp">
            {config.team.map((name) => (
              <span className="pill" key={name}>
                {name}{' '}
                <button
                  aria-label={`Remove ${name}`}
                  className="inline-remove"
                  onClick={() =>
                    runAction(
                      () => saveConfig({ ...config, team: config.team.filter((item) => item !== name) }),
                      'Employee removed.'
                    )
                  }
                >
                  <Icon name="close" size={11} />
                </button>
              </span>
            ))}
          </div>
          <p className="mu">
            ClickUp workspace members:{' '}
            {people.filter((name) => !config.team.includes(name)).join(', ') || 'Connect ClickUp to load members.'}
          </p>
        </section>
        <section className="card">
          <h2>KPI model (editable)</h2>
          <div className="row">
            {[
              ['ontime', 'On-time'],
              ['target', 'Pace'],
              ['overdue', 'No-overdue'],
              ['volume', 'Volume'],
            ].map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  min="0"
                  onChange={(event) => patch('w', { ...config.w, [key]: +event.target.value })}
                  type="number"
                  value={config.w?.[key] ?? 0}
                />
              </Field>
            ))}
            <Field label="Monthly target">
              <input
                min="1"
                onChange={(event) => patch('target', +event.target.value)}
                type="number"
                value={config.target}
              />
            </Field>
          </div>
          <Button className="sp" onClick={() => runAction(() => saveConfig(config), 'KPI model saved.')} primary>
            Save KPI model
          </Button>
        </section>
        <section className="card">
          <h2>Emails & reminders</h2>
          <Field label="CEO email">
            <input onChange={(event) => patch('ceoEmail', event.target.value)} value={config.ceoEmail || ''} />
          </Field>
          {people
            .filter((name) => name !== 'CEO')
            .map((name) => (
              <Field key={name} label={name}>
                <input
                  onChange={(event) => patch('emails', { ...config.emails, [name]: event.target.value })}
                  value={config.emails?.[name] || ''}
                />
              </Field>
            ))}
          <Button onClick={() => runAction(() => saveConfig(config), 'Emails saved.')} primary>
            Save emails
          </Button>
        </section>
        <section className="card">
          <h2>Company logo</h2>
          <input
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) runAction(() => onLogo(file), 'Logo updated.')
            }}
            type="file"
          />
          <p className="mu">PNG, JPG, GIF, or WebP up to 5 MB.</p>
        </section>
      </div>
      <section className="card sp">
        <h2>Employee scorecard</h2>
        <KpiTable rows={kpis} onSelect={onSelectEmployee} />
      </section>
    </>
  )
}

export default TeamPage

