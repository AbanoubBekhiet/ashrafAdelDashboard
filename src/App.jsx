import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProjectEditor from './pages/ProjectEditor'
import Settings from './pages/Settings'
import CategoryManager from './pages/CategoryManager'
import ExperienceManager from './pages/ExperienceManager'
import EducationManager from './pages/EducationManager'
import SkillManager from './pages/SkillManager'
import LocationManager from './pages/LocationManager'
import './App.css'

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Routes>
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
      <Route path="/" element={session ? <Dashboard /> : <Navigate to="/login" />} />
      <Route path="/edit-project/:id?" element={session ? <ProjectEditor /> : <Navigate to="/login" />} />
      <Route path="/settings" element={session ? <Settings /> : <Navigate to="/login" />} />
      <Route path="/categories" element={session ? <CategoryManager /> : <Navigate to="/login" />} />
      <Route path="/experiences" element={session ? <ExperienceManager /> : <Navigate to="/login" />} />
      <Route path="/education" element={session ? <EducationManager /> : <Navigate to="/login" />} />
      <Route path="/skills" element={session ? <SkillManager /> : <Navigate to="/login" />} />
      <Route path="/location" element={session ? <LocationManager /> : <Navigate to="/login" />} />
    </Routes>
  )
}

export default App