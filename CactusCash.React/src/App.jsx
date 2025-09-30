import { useState } from 'react'
import Dashboard from './components/Dashboard'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('landing')

  const handleDashboardClick = () => {
    setCurrentView('dashboard')
  }

  return (
    <div className="App">
      <Navbar onDashboardClick={handleDashboardClick} />
      {currentView === 'landing' ? <Hero /> : <Dashboard />}
    </div>
  )
}

export default App
