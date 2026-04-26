import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function LocationManager() {
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    fetchLocation()
  }, [])

  async function fetchLocation() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .maybeSingle()
      
      if (error) throw error
      if (data) {
        setLocation(data)
        setFormData({
          name: data.name,
          description: data.description || ''
        })
      }
    } catch (error) {
      console.error('Error fetching location:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Location name is required (e.g. city, country)'
    if (!formData.description.trim()) newErrors.description = 'A short description is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const record = { ...formData, user_id: user.id, updated_at: new Date().toISOString() }

      if (location) {
        const { error } = await supabase
          .from('locations')
          .update(record)
          .eq('id', location.id)
        
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('locations')
          .insert([record])
          .select()
          .single()
        
        if (error) throw error
        setLocation(data)
      }
      
      alert('Location updated successfully!')
    } catch (error) {
      console.error('Error saving location:', error.message)
      alert('Failed to save: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <nav className="bg-surface/80 backdrop-blur-md border-b border-outline-variant/20 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex justify-between h-16 sm:h-20 items-center">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-on-surface-variant hover:text-primary transition-all p-2 rounded-full hover:bg-primary/5">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-lg sm:text-2xl font-serif font-bold text-on-background tracking-tight">Geographic Identity</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto w-full p-6 lg:p-14 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="w-full">
          <div className="card-terra p-10 max-w-2xl mx-auto">
            <div className="text-center mb-10">
               <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4 shadow-sm">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
               </div>
               <h2 className="text-2xl font-serif font-bold text-on-background tracking-tight">Current Location</h2>
               <p className="text-xs text-on-surface-variant/60 font-bold uppercase tracking-widest mt-2 px-10 leading-relaxed">
                 Set your primary physical base for your professional profile.
               </p>
            </div>

            {loading ? (
               <div className="flex flex-col items-center justify-center py-12 gap-4">
                 <div className="h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                 <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">Locating data...</p>
               </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">City, Country</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-4 bg-white border ${errors.name ? 'border-error/40' : 'border-outline-variant/20'} rounded-terra-lg text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm`}
                    placeholder="e.g. Alexandria, Egypt"
                  />
                  {errors.name && <p className="text-[10px] text-error font-bold mt-1 px-1">{errors.name}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Identity Context (Location Description)</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className={`w-full px-5 py-4 bg-white border ${errors.description ? 'border-error/40' : 'border-outline-variant/20'} rounded-terra-lg text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none shadow-sm`}
                    placeholder="e.g. Based in the historical city of Alexandria, operating globally."
                  />
                  {errors.description && <p className="text-[10px] text-error font-bold mt-1 px-1">{errors.description}</p>}
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary w-full py-4 text-sm shadow-terra-md"
                  >
                    {saving ? 'Transmitting...' : location ? 'Update Geographical Data' : 'Establish Location'}
                  </button>
                </div>
              </form>
            )}
            
            <div className="mt-12 pt-8 border-t border-outline-variant/10 text-center">
               <p className="text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-[0.2em]">Global Positioning System Metadata</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
