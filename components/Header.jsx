import './header.css'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

export default function Header() {
  const root = useRef()

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.brand', { x: -24, opacity: 0, duration: 0.8, ease: 'power3.out' })
      gsap.from('.nav a', { y: -8, opacity: 0, stagger: 0.08, duration: 0.6, ease: 'power3.out' })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <header ref={root} className="site-header">
      <div className="brand">
        <div className="monogram">VM</div>
        <div>
          <div style={{ fontWeight: 700 }}>Vamsi Marripudi</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Full-stack Developer</div>
        </div>
      </div>
      <nav className="nav">
        <a href="#projects">Projects</a>
        <a href="#contact">Contact</a>
      </nav>
    </header>
  )
}
