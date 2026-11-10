import { useEffect, useState } from 'react'
import { Button } from '../ui/Button.jsx'
import { request } from '../../services/api.js'

export function PinGate({ auth, onAuthenticated }) {
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [message, setMessage] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const setup = !auth?.configured
  useEffect(() => setMessage(auth?.error || ''), [auth?.error])

  async function submit(event) {
    event.preventDefault()
    if (busy || pin.length < 4) return
    if (setup && !firstPin) {
      setFirstPin(pin)
      setPin('')
      setMessage('Enter the same PIN again to confirm.')
      return
    }
    if (setup && firstPin !== pin) {
      setFirstPin('')
      setPin('')
      setMessage('PINs did not match. Start again.')
      return
    }
    setBusy(true)
    setMessage('Checking…')
    try {
      const body = await request('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: setup ? 'setup' : 'login', pin, remember }),
      })
      if (body.ok) {
        await onAuthenticated({ ...body, authed: true, configured: true })
      } else {
        setMessage(body.error || 'Could not unlock dashboard.')
      }
    } catch (error) {
      setMessage(error.message)
      setPin('')
      setFirstPin('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div id="lock">
      <form className="lk" onSubmit={submit}>
        <img src="/img/logo.png" alt="" />
        <h1>Natheelco TaskFlow</h1>
        <p className="mu">
          {setup
            ? firstPin
              ? 'Confirm your new PIN'
              : 'Create a PIN (4–8 digits) to protect this dashboard'
            : 'Enter your dashboard PIN or your 4-digit user PIN'}
        </p>
        <input
          aria-label="PIN"
          autoComplete={setup ? 'new-password' : 'current-password'}
          autoFocus
          inputMode="numeric"
          maxLength={8}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
          type="password"
          value={pin}
        />
        <div className="pd" aria-hidden="true">
          {Array.from({ length: Math.max(4, pin.length) }, (_, index) => (
            <i className={index < pin.length ? 'f' : ''} key={index} />
          ))}
        </div>
        <div className="lkm" role="status">{message}</div>
        <div className="kp">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
            <button key={number} onClick={() => setPin((current) => (current + number).slice(0, 8))} type="button">
              {number}
            </button>
          ))}
          <button className="x" onClick={() => setPin('')} type="button">Clear</button>
          <button onClick={() => setPin((current) => (current + '0').slice(0, 8))} type="button">0</button>
          <button className="x" onClick={() => setPin((current) => current.slice(0, -1))} type="button">⌫</button>
        </div>
        <label className="mu remember">
          <input checked={remember} onChange={(event) => setRemember(event.target.checked)} type="checkbox" /> Remember this device for 30 days
        </label>
        <p className="pin-user-hint">Sign in with your admin PIN or assigned user PIN.</p>
        <Button disabled={busy || pin.length < 4} primary type="submit">
          {busy ? 'Please wait…' : setup ? 'Continue' : 'Unlock'}
        </Button>
      </form>
    </div>
  )
}
