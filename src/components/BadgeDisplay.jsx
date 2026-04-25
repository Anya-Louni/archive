import { getBadgeDef } from '../lib/badges'

export function BadgeDisplay({ badges, max, size = 'md', showEmpty = false }) {
  if (!badges?.length) {
    if (showEmpty) {
      return <p className="meta-line" style={{ fontSize: '0.82rem' }}>No badges earned yet.</p>
    }
    return null
  }

  const visible = max ? badges.slice(0, max) : badges
  const overflow = max && badges.length > max ? badges.length - max : 0

  return (
    <div className={`badge-row badge-row--${size}`}>
      {visible.map((label) => {
        const def = getBadgeDef(label)
        return (
          <span
            key={label}
            className="badge-chip"
            style={def ? { color: def.color, background: def.bg, borderColor: def.border } : undefined}
            title={def ? def.description : label}
          >
            {label}
          </span>
        )
      })}
      {overflow > 0 && (
        <span className="badge-chip badge-chip--overflow">+{overflow}</span>
      )}
    </div>
  )
}
