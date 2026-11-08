import { useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Field } from '../../components/ui/Field.jsx'
import { ALL_ROLE_PERMISSIONS, ROLE_PERMISSION_LABELS } from '../../utils/constants.js'

export function RolesPage({ users = [], error, masterPin, onSaveUsers }) {
  const [editingId, setEditingId] = useState('')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [permissions, setPermissions] = useState([])
  const [formError, setFormError] = useState('')

  function resetForm() {
    setEditingId('')
    setName('')
    setPin('')
    setPermissions([])
    setFormError('')
  }

  function editUser(user) {
    setEditingId(user.id)
    setName(user.name)
    setPin('')
    setPermissions(user.permissions.filter((permission) => ALL_ROLE_PERMISSIONS.includes(permission)))
    setFormError('')
  }

  async function submit(event) {
    event.preventDefault()
    const cleanName = name.trim()
    const existing = users.find((user) => user.id === editingId)
    if (!cleanName) return setFormError('Enter the user’s name.')
    if ((!existing || pin) && !/^\d{4}$/.test(pin)) return setFormError('The PIN must be exactly 4 digits.')
    if (pin && masterPin && pin === masterPin) return setFormError('Choose a PIN different from the dashboard admin PIN.')
    if (pin && users.some((user) => user.id !== editingId && user.pin === pin)) return setFormError('Each user must have a unique PIN.')

    const user = {
      id: existing?.id || globalThis.crypto?.randomUUID?.() || `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: cleanName,
      permissions: ALL_ROLE_PERMISSIONS.filter((permission) => permissions.includes(permission)),
      ...(pin || existing?.pin ? { pin: pin || existing.pin } : {}),
    }
    const nextUsers = existing
      ? users.map((item) => (item.id === existing.id ? user : item))
      : [...users, user]
    try {
      if (await onSaveUsers(nextUsers)) resetForm()
    } catch (cause) {
      setFormError(cause.message || 'Could not save this user.')
    }
  }

  async function removeUser(user) {
    if (!window.confirm(`Remove ${user.name} and their dashboard access?`)) return
    try {
      await onSaveUsers(users.filter((item) => item.id !== user.id))
    } catch (cause) {
      setFormError(cause.message || 'Could not remove this user.')
      return
    }
    if (editingId === user.id) resetForm()
  }

  return (
    <section className="roles-page">
      <header className="top">
        <div>
          <h1>
            <Icon name="roles" size={23} /> Roles &amp; permissions
          </h1>
          <p className="mu">Create user PINs and choose which dashboard sections each person can open.</p>
        </div>
      </header>
      <div className="roles-notice">
        <Icon name="info" size={17} />
        <span>
          User PINs are securely hashed on the server, and section permissions are checked by the backend.
        </span>
      </div>
      {error && (
        <div className="roles-error" role="alert">
          {error}
        </div>
      )}
      <div className="roles-layout">
        <form className="card roles-form" onSubmit={submit}>
          <div className="roles-form-heading">
            <span className="roles-form-icon">
              <Icon name={editingId ? 'edit' : 'user-plus'} size={18} />
            </span>
            <div>
              <h2>{editingId ? 'Edit user' : 'Add a user'}</h2>
              <p className="mu">{editingId ? 'Update access or set a new PIN.' : 'Give a user a unique 4-digit login PIN.'}</p>
            </div>
          </div>
          <Field label="User name">
            <input
              autoComplete="off"
              maxLength={70}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Hajar Hanafi"
              required
              value={name}
            />
          </Field>
          <Field label={editingId ? 'New 4-digit PIN (leave blank to keep current)' : '4-digit PIN'}>
            <input
              autoComplete="new-password"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              required={!editingId}
              type="password"
              value={pin}
            />
          </Field>
          <fieldset className="roles-permissions">
            <legend>Dashboard sections</legend>
            <div className="roles-permission-grid">
              {ALL_ROLE_PERMISSIONS.map((permission) => (
                <label className="roles-permission-option" key={permission}>
                  <input
                    checked={permissions.includes(permission)}
                    onChange={(event) =>
                      setPermissions((current) =>
                        event.target.checked ? [...current, permission] : current.filter((value) => value !== permission)
                      )
                    }
                    type="checkbox"
                  />
                  <span>{ROLE_PERMISSION_LABELS[permission]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {formError && (
            <p className="roles-error" role="alert">
              {formError}
            </p>
          )}
          <div className="roles-form-actions">
            {editingId && (
              <Button onClick={resetForm} type="button">
                Cancel
              </Button>
            )}
            <Button primary type="submit">
              <Icon name={editingId ? 'check' : 'user-plus'} size={15} /> {editingId ? 'Save changes' : 'Add user'}
            </Button>
          </div>
        </form>

        <section aria-label="Dashboard users" className="card roles-list">
          <div className="roles-list-heading">
            <div>
              <h2>Users</h2>
              <p className="mu">
                {users.length} user{users.length === 1 ? '' : 's'} with PIN access
              </p>
            </div>
            <span className="roles-count">{users.length}</span>
          </div>
          {users.length ? (
            <div className="roles-user-list">
              {users.map((user) => {
                const userPermissions = user.permissions.filter((permission) => ALL_ROLE_PERMISSIONS.includes(permission))
                return (
                  <article className="roles-user" key={user.id}>
                    <div className="roles-user-avatar">
                      <Icon name="user" size={19} />
                    </div>
                    <div className="roles-user-main">
                      <div className="roles-user-heading">
                        <strong>{user.name}</strong>
                        <span aria-label="PIN saved" className="roles-pin">
                          ••••
                        </span>
                      </div>
                      <div className="roles-user-permissions">
                        {userPermissions.length ? (
                          userPermissions.map((permission) => (
                            <span className="roles-tag" key={permission}>
                              {ROLE_PERMISSION_LABELS[permission]}
                            </span>
                          ))
                        ) : (
                          <span className="roles-no-access">No sections assigned</span>
                        )}
                      </div>
                    </div>
                    <div className="roles-user-actions">
                      <button
                        aria-label={`Edit ${user.name}`}
                        className="roles-icon-button"
                        onClick={() => editUser(user)}
                        title="Edit permissions"
                        type="button"
                      >
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        aria-label={`Remove ${user.name}`}
                        className="roles-icon-button danger"
                        onClick={() => removeUser(user)}
                        title="Remove user"
                        type="button"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="roles-empty">
              <span>
                <Icon name="users" size={23} />
              </span>
              <b>No users added yet</b>
              <p>Add a user and assign their dashboard sections.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
