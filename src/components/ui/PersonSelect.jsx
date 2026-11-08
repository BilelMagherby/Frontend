export function PersonSelect({ people = [], value, onChange }) {
  return (
    <select onChange={(event) => onChange(event.target.value)} value={value}>
      <option value="">All assignees</option>
      {people.map((person) => (
        <option key={person}>{person}</option>
      ))}
    </select>
  )
}

