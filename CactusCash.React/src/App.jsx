import { useState } from 'react'
import Dashboard from './components/Dashboard'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Auth from './components/Auth'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('landing')

  const handleDashboardClick = () => {
    setCurrentView('dashboard')
  }

  const handleAuthClick = () => {
    setCurrentView('auth')
  }

  const renderView = () => {
    switch (currentView) {
      case 'auth':
        return <Auth />
      case 'dashboard':
        return <Dashboard />
      case 'landing':
      default:
        return <Hero />
    }
  }

  return (
    <div className="App">
      <Navbar onDashboardClick={handleDashboardClick} onAuthClick={handleAuthClick} />
      {renderView()}
    </div>
  )
}

export default App
