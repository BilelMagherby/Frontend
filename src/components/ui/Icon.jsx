import React from 'react'

export function Icon({ name, size = 18, className = '', color = 'currentColor', style = {}, ...props }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: `agy-icon ${className}`,
    style: { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style },
    'aria-hidden': 'true',
    ...props,
  }

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect width="7" height="9" x="3" y="3" rx="1.5" />
          <rect width="7" height="5" x="14" y="3" rx="1.5" />
          <rect width="7" height="9" x="14" y="12" rx="1.5" />
          <rect width="7" height="5" x="3" y="16" rx="1.5" />
        </svg>
      )

    case 'meet':
    case 'google-meet':
      return (
        <svg {...common} viewBox="0 0 24 24" stroke="none">
          {/* Professional Google Meet Camera silhouette with distinctive quad-color or clean multi-tone */}
          <rect x="2.5" y="5" width="13" height="14" rx="3" fill="#00832d" />
          <path d="M15.5 9.5L21.5 5.5v13l-6-4v-5z" fill="#00ac47" />
          <path d="M6 8.5h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z" fill="#ffffff" fillOpacity="0.25" />
        </svg>
      )

    case 'zoom':
      return (
        <svg {...common} viewBox="0 0 24 24" stroke="none">
          {/* Distinctive Zoom Camera on rounded blue badge */}
          <rect x="2" y="3" width="20" height="18" rx="5" fill="#2d8cff" />
          <path d="M6.5 8.5h6a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 5 14v-4A1.5 1.5 0 0 1 6.5 8.5z" fill="#ffffff" />
          <path d="M14 10.5l4-2.5v8l-4-2.5v-3z" fill="#ffffff" />
        </svg>
      )

    case 'video':
      return (
        <svg {...common}>
          <path d="m15.5 8 5-3.5v15l-5-3.5" />
          <rect width="13" height="14" x="2.5" y="5" rx="2.5" />
        </svg>
      )

    case 'video-instant':
      return (
        <svg {...common}>
          <polygon points="6 4 20 12 6 20 6 4" fill="currentColor" fillOpacity="0.15" />
          <path d="M15 8l5-3v14l-5-3" />
          <rect x="3" y="5" width="12" height="14" rx="2" />
          <polygon points="8 9.5 12 12 8 14.5" fill="currentColor" />
        </svg>
      )

    case 'calendar':
      return (
        <svg {...common}>
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      )

    case 'calendar-plus':
      return (
        <svg {...common}>
          <path d="M8 2v4M16 2v4M3 10h18" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M10 16h4M12 14v4" />
        </svg>
      )

    case 'calendar-clock':
      return (
        <svg {...common}>
          <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <circle cx="17.5" cy="17.5" r="4.5" />
          <path d="M17.5 15.5v2l1.25 1.25" />
        </svg>
      )

    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )

    case 'analytics':
    case 'chart':
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-5 5" />
          <polyline points="15 9 19 9 19 13" />
        </svg>
      )

    case 'trending-up':
      return (
        <svg {...common}>
          <path d="m3 17 6-6 4 4 8-8" />
          <path d="M15 7h6v6" />
        </svg>
      )

    case 'trending-down':
      return (
        <svg {...common}>
          <path d="m3 7 6 6 4-4 8 8" />
          <path d="M15 17h6v-6" />
        </svg>
      )

    case 'minus':
      return (
        <svg {...common}>
          <path d="M5 12h14" />
        </svg>
      )

    case 'target':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      )

    case 'more-horizontal':
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </svg>
      )

    case 'sun':
    case 'day':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )

    case 'check-square':
      return (
        <svg {...common}>
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )

    case 'tasks':
      return (
        <svg {...common}>
          <path d="m4 7 1.5 1.5L8 6" />
          <path d="M11 7h9" />
          <path d="m4 13 1.5 1.5L8 12" />
          <path d="M11 13h9" />
          <path d="m4 19 1.5 1.5L8 18" />
          <path d="M11 19h9" />
        </svg>
      )

    case 'decision':
      return (
        <svg {...common}>
          <path d="M12 3 17 8 12 13 7 8 12 3Z" />
          <path d="M12 13v2M12 15H6v3M12 15h6v3" />
          <circle cx="6" cy="20" r="1.5" />
          <circle cx="18" cy="20" r="1.5" />
        </svg>
      )

    case 'clickup':
      return (
        <svg {...common} viewBox="0 0 24 24">
          {/* ClickUp signature check chevron + base bar */}
          <path d="M4 17.5c2.8 1.5 5.2 2.5 8 2.5s5.2-1 8-2.5" />
          <path d="m5 10.5 7-6.5 7 6.5" />
        </svg>
      )

    case 'projects':
    case 'folder':
      return (
        <svg {...common}>
          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
        </svg>
      )

    case 'team':
    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )

    case 'hr':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="2.5" />
          <path d="M8 4V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" />
          <circle cx="12" cy="10" r="2.5" />
          <path d="M7.5 18a4.5 4.5 0 0 1 9 0" />
        </svg>
      )

    case 'roles':
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
          <path d="M9 11a3 3 0 1 1 6 0" />
          <path d="M8 17a4 4 0 0 1 8 0" />
        </svg>
      )

    case 'wallet':
      return (
        <svg {...common}>
          <path d="M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v11a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" />
          <path d="M20 13h-4a2 2 0 0 0 0 4h4" />
          <path d="M16 15h.01" />
        </svg>
      )

    case 'book-open':
      return (
        <svg {...common}>
          <path d="M12 7v14" />
          <path d="M3 18V5a2 2 0 0 1 2-2h3a4 4 0 0 1 4 4 4 4 0 0 1 4-4h3a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-4a3 3 0 0 0-3 2 3 3 0 0 0-3-2H5a2 2 0 0 1-2-2Z" />
        </svg>
      )

    case 'file-check':
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h7" />
          <path d="M14 2v6h6" />
          <path d="M14 2 20 8" />
          <path d="m15 19 2 2 4-4" />
        </svg>
      )

    case 'user':
      return (
        <svg {...common}>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )

    case 'user-plus':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" x2="19" y1="8" y2="14" />
          <line x1="22" x2="16" y1="11" y2="11" />
        </svg>
      )

    case 'lock':
      return (
        <svg {...common}>
          <rect width="16" height="11" x="4" y="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )

    case 'bell':
      return (
        <svg {...common}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      )

    case 'sparkles':
      return (
        <svg {...common}>
          <path d="m12 3-1.9 4.8L5 9.7l4.1 3.5L8.1 18l4.4-2.8 4.4 2.8-1-4.8 4.1-3.5-5.1-1.9z" fill="currentColor" fillOpacity="0.15" />
          <path d="M19 3v4M21 5h-4" />
        </svg>
      )

    case 'file-text':
      return (
        <svg {...common}>
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
          <line x1="10" x2="8" y1="9" y2="9" />
        </svg>
      )

    case 'database':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
          <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
          <path d="M4 18c0 1.66 3.58 3 8 3s8-1.34 8-3" />
        </svg>
      )

    case 'table':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M9 4v16M15 10v10" />
        </svg>
      )

    case 'decisions':
    case 'award':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="6" />
          <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.744.524L12 19.8l-4.248 2.14a.5.5 0 0 1-.744-.524l1.515-8.526" />
          <path d="m9 8 2 2 4-4" />
        </svg>
      )

    case 'check-circle':
      return (
        <svg {...common}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )

    case 'check':
      return (
        <svg {...common}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )

    case 'x-circle':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <line x1="15" x2="9" y1="9" y2="15" />
          <line x1="9" x2="15" y1="9" y2="15" />
        </svg>
      )

    case 'close':
    case 'x':
      return (
        <svg {...common}>
          <line x1="18" x2="6" y1="6" y2="18" />
          <line x1="6" x2="18" y1="6" y2="18" />
        </svg>
      )

    case 'plus':
      return (
        <svg {...common}>
          <line x1="12" x2="12" y1="5" y2="19" />
          <line x1="5" x2="19" y1="12" y2="12" />
        </svg>
      )

    case 'external-link':
      return (
        <svg {...common}>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" x2="21" y1="14" y2="3" />
        </svg>
      )

    case 'refresh':
    case 'sync':
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M21 21v-5h-5" />
        </svg>
      )

    case 'alert-triangle':
      return (
        <svg {...common}>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" x2="12" y1="9" y2="13" />
          <line x1="12" x2="12.01" y1="17" y2="17" />
        </svg>
      )

    case 'alert-circle':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      )

    case 'trophy':
      return (
        <svg {...common}>
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      )

    case 'flag':
      return (
        <svg {...common}>
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" x2="4" y1="22" y2="15" />
        </svg>
      )

    case 'percent':
      return (
        <svg {...common}>
          <line x1="19" x2="5" y1="5" y2="19" />
          <circle cx="6.5" cy="6.5" r="2.5" />
          <circle cx="17.5" cy="17.5" r="2.5" />
        </svg>
      )

    case 'trash':
      return (
        <svg {...common}>
          <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <line x1="10" x2="10" y1="11" y2="17" />
          <line x1="14" x2="14" y1="11" y2="17" />
        </svg>
      )

    case 'chevron-left':
      return (
        <svg {...common}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      )

    case 'chevron-right':
      return (
        <svg {...common}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )

    case 'arrow-right':
      return (
        <svg {...common}>
          <line x1="5" x2="19" y1="12" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      )

    case 'menu':
      return (
        <svg {...common}>
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
      )

    case 'filter':
      return (
        <svg {...common}>
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      )

    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      )

    case 'upload':
    case 'import':
      return (
        <svg {...common}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
      )

    case 'download':
      return (
        <svg {...common}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
      )

    case 'mail':
      return (
        <svg {...common}>
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      )

    case 'inbox':
      return (
        <svg {...common}>
          <path d="M4 4h16l2 11v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-4L4 4Z" />
          <path d="M2 14h5l2 3h6l2-3h5" />
        </svg>
      )

    case 'star':
      return (
        <svg {...common}>
          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
        </svg>
      )

    case 'tag':
      return (
        <svg {...common}>
          <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V4h9l8.6 6.6a2 2 0 0 1 0 2.8Z" />
          <circle cx="7.5" cy="8.5" r="1" />
        </svg>
      )

    case 'edit':
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      )

    case 'paperclip':
      return (
        <svg {...common}>
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.82-2.83l8.48-8.48" />
        </svg>
      )

    case 'send':
      return (
        <svg {...common}>
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      )

    case 'info':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      )

    case 'crown':
      return (
        <svg {...common}>
          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" fill="currentColor" fillOpacity="0.2" />
          <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
          <circle cx="12" cy="4" r="1.5" />
          <circle cx="2" cy="4" r="1.5" />
          <circle cx="22" cy="4" r="1.5" />
        </svg>
      )

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      )
  }
}
