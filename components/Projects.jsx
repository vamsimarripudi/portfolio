import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const SAMPLE = [
  { title: 'Portfolio Website', desc: 'This site: built with React, Vite and modern CSS. Fast, accessible, and responsive.' },
  { title: 'Task Manager API', desc: 'A REST + GraphQL hybrid API with auth, Postgres persistence and tests.' },
  { title: 'Realtime Chat', desc: 'Websocket-based group chat with typing indicators and presence.' }
]

export default function Projects() {
  const root = useRef()

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.projects h2', { y: 12, opacity: 0, duration: 0.7, ease: 'power3.out' })
      gsap.from('.project', {
        scrollTrigger: { trigger: '.projects-grid', start: 'top 85%' },
        y: 16, opacity: 0, stagger: 0.12, duration: 0.7, ease: 'power3.out'
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} id="projects" className="projects">
      <h2>Selected projects</h2>
      <div className="projects-grid">
        {SAMPLE.map(p => (
          <article key={p.title} className="project">
            <h3>{p.title}</h3>
            <p>{p.desc}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
