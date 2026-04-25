export function ArchiveTable({ rows, onView, onEdit, onDelete, canEditRow }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Date</th>
            <th>Votes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td>{item.categories?.name ?? '-'}</td>
              <td><span className={`status-chip status-${item.status.replace(/\s+/g, '-').toLowerCase()}`}>{item.status}</span></td>
              <td>{item.artifact_date}</td>
              <td>{item.vote_score ?? 0}</td>
              <td className="actions-cell">
                <button onClick={() => onView(item.id)}>View</button>
                {canEditRow(item) ? <button onClick={() => onEdit(item)}>Edit</button> : null}
                {canEditRow(item) ? <button className="danger" onClick={() => onDelete(item.id)}>Delete</button> : null}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={6}>No artifacts found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
