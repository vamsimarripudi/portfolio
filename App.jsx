
// Import global styles
import './App.css';

// Import main components
import Header from './portfolio/src/components/Header';
import Hero from './portfolio/src/components/Hero';
import Projects from './portfolio/src/components/Projects';
import Contact from './portfolio/src/components/Contact';

// Main App component
function App() {
  // Get the current year for the footer
  const currentYear = new Date().getFullYear();

  return (
    <div className="site-root">
      {/* Site header with navigation */}
      <Header />

      {/* Main content area */}
      <main>
        <Hero />
        <Projects />
        <Contact />
      </main>

      {/* Footer with copyright info */}
      <footer className="site-footer">
        &copy; {currentYear} Vamsi Marripudi &mdash; Built with React & Vite
      </footer>
    </div>
  );
}

export default App;
