import { useState } from 'react'

const defaultValues = {
  title: '',
  description: '',
  category_id: '',
  source_link: '',
  media_url: '',
  artifact_date: '',
  status: 'Unknown',
}

export function ArtifactForm({ categories, onSubmit, loading, initialValues }) {
  const [values, setValues] = useState(initialValues ?? defaultValues)
  const [errors, setErrors] = useState({})

  const update = (field, value) => setValues((old) => ({ ...old, [field]: value }))

  const validate = () => {
    const next = {}
    if (!values.title.trim()) next.title = 'Title is required.'
    if (!values.description.trim()) next.description = 'Description is required.'
    if (!values.category_id) next.category_id = 'Category is required.'
    if (!values.artifact_date) next.artifact_date = 'Date is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = (event) => {
    event.preventDefault()
    if (!validate()) return
    onSubmit(values)
  }

  return (
    <form className="ledger-form" onSubmit={submit}>
      <label>
        Title *
        <input value={values.title} onChange={(e) => update('title', e.target.value)} />
        {errors.title && <small>{errors.title}</small>}
      </label>

      <label>
        Description *
        <textarea rows={4} value={values.description} onChange={(e) => update('description', e.target.value)} />
        {errors.description && <small>{errors.description}</small>}
      </label>

      <label>
        Category *
        <select value={values.category_id} onChange={(e) => update('category_id', e.target.value)}>
          <option value="">Select</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {errors.category_id && <small>{errors.category_id}</small>}
      </label>

      <div className="grid-two">
        <label>
          Source link
          <input value={values.source_link} onChange={(e) => update('source_link', e.target.value)} />
        </label>
        <label>
          Media URL
          <input value={values.media_url} onChange={(e) => update('media_url', e.target.value)} />
        </label>
      </div>

      <div className="grid-two">
        <label>
          Date *
          <input type="date" value={values.artifact_date} onChange={(e) => update('artifact_date', e.target.value)} />
          {errors.artifact_date && <small>{errors.artifact_date}</small>}
        </label>
        <label>
          Status
          <select value={values.status} onChange={(e) => update('status', e.target.value)}>
            <option>Unknown</option>
            <option>Under Investigation</option>
            <option>Explained</option>
            <option>Archived</option>
          </select>
        </label>
      </div>

      <button disabled={loading} className="stamp-button" type="submit">
        {loading ? 'Filing...' : 'Save Artifact'}
      </button>
    </form>
  )
}
