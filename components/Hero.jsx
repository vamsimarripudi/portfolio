import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function Hero() {
  const root = useRef()

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-card', { y: 18, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out' })
      gsap.from('.avatar img', { scale: 0.9, opacity: 0, duration: 0.9, ease: 'elastic.out(1,0.6)' })

      // reveal skills as they scroll into view
      gsap.utils.toArray('.skill').forEach((el) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 85%' },
          y: 8, opacity: 0, duration: 0.6, ease: 'power2.out'
        })
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={root} className="hero">
      <div className="hero-card">
        <h1>Hi, I'm Vamsi 👋</h1>
        <p>I'm a full-stack developer who builds performant web apps and delightful UX. I enjoy working with React, Node.js, and cloud platforms to ship reliable products.</p>

        <div className="skills">
          <span className="skill">React</span>
          <span className="skill">Node.js</span>
          <span className="skill">TypeScript</span>
          <span className="skill">GraphQL</span>
          <span className="skill">Postgres</span>
        </div>

        <div className="cta">
          <a className="btn" href="#contact">Work with me</a>
          <a className="outline" href="#projects">See projects</a>
        </div>
      </div>

      <div className="avatar hero-card">
        <img src="/src/assets/monogram.svg" alt="VM" style={{ width: '100%', height: '100%' }} />
      </div>
    </section>
  )
}
