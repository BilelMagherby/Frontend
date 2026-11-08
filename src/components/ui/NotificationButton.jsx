import { Icon } from './Icon.jsx'

export function NotificationButton({ count, onClick }) {
  return (
    <button
      aria-label="Calendar reminders"
      className="btn g bell"
      onClick={onClick}
      title={count ? `${count} event(s) today` : 'No events today'}
    >
      <Icon name="bell" size={18} />
      {count > 0 && <span className="bubble">{count}</span>}
    </button>
  )
}
