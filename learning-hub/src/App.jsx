import { useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import Icon from './components/Icon.jsx'
import { ProgressBar } from './components/ui.jsx'
import { milestones } from './data/index.js'
import { statusOf, useProgress } from './lib/progress.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Glossary from './pages/Glossary.jsx'
import Journeys from './pages/Journeys.jsx'
import Launch from './pages/Launch.jsx'
import MilestoneDetail from './pages/MilestoneDetail.jsx'
import Milestones from './pages/Milestones.jsx'
import NotFound from './pages/NotFound.jsx'
import Practice from './pages/Practice.jsx'
import ProjectMap from './pages/ProjectMap.jsx'
import Review from './pages/Review.jsx'

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'home' },
  { to: '/milestones', label: 'Milestones', icon: 'book' },
  { to: '/map', label: 'Project map', icon: 'map' },
  { to: '/journeys', label: 'Request journeys', icon: 'route' },
  { to: '/practice', label: 'Practice lab', icon: 'flask' },
  { to: '/review', label: 'Quiz & review', icon: 'quiz' },
  { to: '/launch', label: 'Launch readiness', icon: 'rocket' },
  { to: '/glossary', label: 'Glossary', icon: 'text' },
]

function useTheme() {
  const { state, setTheme } = useProgress()
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  const theme = state.theme || (systemDark ? 'dark' : 'light')
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')]
}

export default function App() {
  const { state, reset } = useProgress()
  const [theme, toggleTheme] = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const location = useLocation()

  useEffect(() => { setMenuOpen(false); window.scrollTo(0, 0) }, [location.pathname])

  const done = milestones.filter((m) => statusOf(state.milestones[m.id]) === 'completed').length

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand"><span className="brand-mark" />WebWatch Academy</span>
        <button className="icon-btn" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="sidebar" aria-label="Menu">
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
      </header>

      <aside id="sidebar" className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <span className="brand desktop-only"><span className="brand-mark" />WebWatch Academy</span>
        <nav aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              <Icon name={item.icon} />{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="mini-progress">
            <span>{done}/{milestones.length} milestones</span>
            <ProgressBar value={milestones.length ? done / milestones.length : 0} label="Overall progress" />
          </div>
          <div className="row">
            <button className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
            {!confirmReset ? (
              <button className="btn btn-ghost small" onClick={() => setConfirmReset(true)}><Icon name="reset" size={14} />Reset</button>
            ) : (
              <span className="confirm small">
                Erase all progress?
                <button className="btn btn-danger small" onClick={() => { reset(); setConfirmReset(false) }}>Erase</button>
                <button className="btn btn-ghost small" onClick={() => setConfirmReset(false)}>Cancel</button>
              </span>
            )}
          </div>
        </div>
      </aside>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/milestones" element={<Milestones />} />
          <Route path="/milestones/:id" element={<MilestoneDetail />} />
          <Route path="/map" element={<ProjectMap />} />
          <Route path="/journeys" element={<Journeys />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/review" element={<Review />} />
          <Route path="/launch" element={<Launch />} />
          <Route path="/glossary" element={<Glossary />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
