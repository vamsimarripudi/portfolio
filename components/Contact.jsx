import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function Contact() {
  const root = useRef()
  const [form, setForm] = useState({ name: '', email: '', siteType: 'responsive', budget: '', description: '' })
  const [status, setStatus] = useState({ sending: false, ok: null, message: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const MAX_WORDS = 300

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.contact .left h2', { x: -12, opacity: 0, duration: 0.7, ease: 'power3.out' })
      gsap.from('.contact .right', { x: 12, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.08 })
      gsap.from('.contact form', { y: 8, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.12 })
    }, root)

    return () => ctx.revert()
  }, [])

  function countWords(text) {
    const trimmed = text.trim()
    if (!trimmed) return 0
    return trimmed.split(/\s+/).length
  }

  function handleDescriptionChange(e) {
    const raw = e.target.value
    const words = raw.trim().split(/\s+/).filter(Boolean)
    if (words.length > MAX_WORDS) {
      const sliced = words.slice(0, MAX_WORDS).join(' ')
      setForm(f => ({ ...f, description: sliced }))
    } else {
      setForm(f => ({ ...f, description: raw }))
    }
    setError('')
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setError('')
  }

  function validEmail(email) {
    return /^\S+@\S+\.\S+$/.test(email)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const { name, email, description } = form
    if (!name.trim()) return setError('Please enter your name')
    if (!validEmail(email)) return setError('Please enter a valid email')
    if (countWords(description) === 0) return setError('Please add a short project description (max 300 words)')

    // For now we just log the submission. Replace with API or mailer as needed.
    console.log('Contact form submitted', form)
    setSuccess('Thanks — your message was received (demo). I will follow up via email.')
    setForm({ name: '', email: '', siteType: 'Responsive', budget: '', description: '' })
  }

  const remaining = MAX_WORDS - countWords(form.description)

  return (
    <section ref={root} id="contact" className="contact">
      <div className="left">
        <h2>Let's build something together</h2>
        <p>If you have a project or an opportunity, fill the form and I'll follow up — available for freelance and full-time roles.</p>

        <form onSubmit={handleSubmit} className="contact-form" style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          <label>
            Name
            <input name="name" value={form.name} onChange={handleChange} required placeholder="Your name" />
          </label>

          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@company.com" />
          </label>

          <label>
            Type of website
            <select name="siteType" value={form.siteType} onChange={handleChange}>
              <option>Static</option>
              <option>Responsive</option>
              <option>Dynamic</option>
            </select>
          </label>

          <label>
            Budget (USD)
            <input name="budget" type="number" min="0" value={form.budget} onChange={handleChange} placeholder="e.g. 3000" />
          </label>

          <label>
            Project description (max {MAX_WORDS} words)
            <textarea name="description" value={form.description} onChange={handleDescriptionChange} rows={6} placeholder="Briefly describe the goals, pages, integrations, and timeline..." />
          </label>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ color: remaining < 0 ? 'crimson' : 'var(--muted)' }}>{remaining} words left</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn">Send</button>
            </div>
          </div>

          {error && <div style={{ color: 'crimson' }}>{error}</div>}
          {success && <div style={{ color: 'limegreen' }}>{success}</div>}
        </form>
      </div>

      <div className="right">
        <strong>Open to:</strong>
        <ul>
          <li>Remote roles</li>
          <li>Freelance projects</li>
          <li>Collaborations</li>
        </ul>
      </div>
    </section>
  )
}
