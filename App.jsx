import './App.css'
import Header from './components/Header'
import Hero from './components/Hero'
import Projects from './components/Projects'
import Contact from './components/Contact'

function App() {
  return (
    <div className="site-root">
      <Header />
      <main>
        <Hero />
        <Projects />
        <Contact />
      </main>
      <footer className="site-footer">© {new Date().getFullYear()} Vamsi Marripudi — Built with React & Vite</footer>
    </div>
  )
}

export default App
