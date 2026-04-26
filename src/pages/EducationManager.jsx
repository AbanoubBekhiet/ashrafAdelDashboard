import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function EducationManager() {
  const [education, setEducation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  
  const [formData, setFormData] = useState({
    faculty_name: '',
    degree: '',
    duration: ''
  })

  useEffect(() => {
    fetchEducation()
  }, [])

  async function fetchEducation() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('education')
        .select('*')
        .maybeSingle()
      
      if (error) throw error
      if (data) {
        setEducation(data)
        setFormData({
          faculty_name: data.faculty_name,
          degree: data.degree,
          duration: data.duration || ''
        })
      }
    } catch (error) {
      console.error('Error fetching education:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.faculty_name.trim()) newErrors.faculty_name = 'Faculty name is required'
    if (!formData.degree.trim()) newErrors.degree = 'Degree/Major is required'
    if (!formData.duration.trim()) newErrors.duration = 'Duration is required (e.g. 2018 - 2022)'
    
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

      if (education) {
        const { error } = await supabase
          .from('education')
          .update(record)
          .eq('id', education.id)
        
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('education')
          .insert([record])
          .select()
          .single()
        
        if (error) throw error
        setEducation(data)
      }
      
      alert('Education record updated successfully!')
    } catch (error) {
      console.error('Error saving education:', error.message)
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
              <h1 className="text-lg sm:text-2xl font-serif font-bold text-on-background tracking-tight">Academic Foundation</h1>
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
                    <path d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
               </div>
               <h2 className="text-2xl font-serif font-bold text-on-background tracking-tight">Academic Profile</h2>
               <p className="text-xs text-on-surface-variant/60 font-bold uppercase tracking-widest mt-2 px-10 leading-relaxed">
                 Configure your primary education record that appears on your professional dashboard.
               </p>
            </div>

            {loading ? (
               <div className="flex flex-col items-center justify-center py-12 gap-4">
                 <div className="h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                 <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">Accessing repository...</p>
               </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Faculty / Institution Name</label>
                  <input
                    name="faculty_name"
                    value={formData.faculty_name}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-4 bg-white border ${errors.faculty_name ? 'border-error/40' : 'border-outline-variant/20'} rounded-terra-lg text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm`}
                    placeholder="e.g. Faculty of Engineering, Cairo University..."
                  />
                  {errors.faculty_name && <p className="text-[10px] text-error font-bold mt-1 px-1">{errors.faculty_name}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Specialization / Education Field</label>
                  <input
                    name="degree"
                    value={formData.degree}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-4 bg-white border ${errors.degree ? 'border-error/40' : 'border-outline-variant/20'} rounded-terra-lg text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm`}
                    placeholder="e.g. B.Sc. in Computer Science..."
                  />
                  {errors.degree && <p className="text-[10px] text-error font-bold mt-1 px-1">{errors.degree}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Study Period</label>
                  <input
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-4 bg-white border ${errors.duration ? 'border-error/40' : 'border-outline-variant/20'} rounded-terra-lg text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm`}
                    placeholder="e.g. 2018 - 2022"
                  />
                  {errors.duration && <p className="text-[10px] text-error font-bold mt-1 px-1">{errors.duration}</p>}
                </div>

                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary w-full py-4 text-sm shadow-terra-md"
                  >
                    {saving ? 'Committing Changes...' : education ? 'Update Academic Record' : 'Create Academic Record'}
                  </button>
                </div>
              </form>
            )}
            
            <div className="mt-12 pt-8 border-t border-outline-variant/10 text-center">
               <p className="text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-[0.2em]">Verified Data Persistence Layer</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
