export function Avatar({ name, members = [] }) {
  const member = members?.find((person) => person.name === name)
  if (member?.avatar) return <img alt="" className="av" src={member.avatar} />
  const letters = (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
  return <span className="av">{letters}</span>
}

