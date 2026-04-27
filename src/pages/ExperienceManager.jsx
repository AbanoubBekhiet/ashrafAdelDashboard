import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ExperienceManager() {
  const [experiences, setExperiences] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [errors, setErrors] = useState({})
  
  const [formData, setFormData] = useState({
    company: '',
    position: '',
    duration: '',
    description: '',
    is_current: false
  })

  useEffect(() => {
    fetchExperiences()
  }, [])

  async function fetchExperiences() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('experiences')
        .select('*')
        .order('is_current', { ascending: false })
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setExperiences(data || [])
    } catch (error) {
      console.error('Error fetching experiences:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.company.trim()) newErrors.company = 'Company name is required'
    if (!formData.position.trim()) newErrors.position = 'Position/Role is required'
    if (!formData.duration.trim()) newErrors.duration = 'Duration is required (e.g. 2021 - 2023)'
    if (!formData.description.trim()) newErrors.description = 'A brief description of your impact is required'
    if (formData.description.trim().length < 10) newErrors.description = 'Description should be at least 10 characters'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      // If setting this as current, remove current status from others
      if (formData.is_current) {
        await supabase
          .from('experiences')
          .update({ is_current: false })
          .neq('id', editingId || '00000000-0000-0000-0000-000000000000') // Placeholder for new row
      }

      if (editingId) {
        const { error } = await supabase
          .from('experiences')
          .update(formData)
          .eq('id', editingId)
        
        if (error) throw error
        setExperiences(prev => {
          const updated = prev.map(exp => {
            if (exp.id === editingId) return { ...exp, ...formData };
            if (formData.is_current) return { ...exp, is_current: false };
            return exp;
          });
          return updated.sort((a, b) => (b.is_current ? 1 : 0) - (a.is_current ? 1 : 0));
        })
      } else {
        const { data, error } = await supabase
          .from('experiences')
          .insert([formData])
          .select()
        
        if (error) throw error
        setExperiences(prev => {
          const others = formData.is_current ? prev.map(e => ({ ...e, is_current: false })) : prev;
          return [data[0], ...others].sort((a, b) => (b.is_current ? 1 : 0) - (a.is_current ? 1 : 0));
        })
      }
      
      setFormData({ company: '', position: '', duration: '', description: '', is_current: false })
      setEditingId(null)
      setErrors({})
    } catch (error) {
      console.error('Error saving experience:', error.message)
      alert('Failed to save: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this experience?')) return

    try {
      const { error } = await supabase
        .from('experiences')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      setExperiences(prev => prev.filter(exp => exp.id !== id))
    } catch (error) {
      console.error('Error deleting experience:', error.message)
      alert('Failed to delete: ' + error.message)
    }
  }

  const startEdit = (exp) => {
    setEditingId(exp.id)
    setFormData({
      company: exp.company,
      position: exp.position,
      duration: exp.duration || '',
      description: exp.description || '',
      is_current: exp.is_current || false
    })
    setErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
              <h1 className="text-lg sm:text-2xl font-serif font-bold text-on-background tracking-tight">Professional Journey</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto w-full p-6 lg:p-14 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <div className="card-terra p-8 sticky top-28">
            <h2 className="text-xl font-serif font-bold text-on-background mb-6">
              {editingId ? 'Refining Record' : 'Log New Milestone'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Organization / Enterprise</label>
                <input
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-white border ${errors.company ? 'border-error/40' : 'border-outline-variant/20'} rounded-terra text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm`}
                  placeholder="e.g. Terra Analytics"
                />
                {errors.company && <p className="text-[10px] text-error font-bold mt-1 px-1">{errors.company}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Designation</label>
                <input
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-white border ${errors.position ? 'border-error/40' : 'border-outline-variant/20'} rounded-terra text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm`}
                  placeholder="e.g. Lead Consultant"
                />
                {errors.position && <p className="text-[10px] text-error font-bold mt-1 px-1">{errors.position}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Active Duration</label>
                <input
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-white border ${errors.duration ? 'border-error/40' : 'border-outline-variant/20'} rounded-terra text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm`}
                  placeholder="e.g. 2022 - Present"
                />
                {errors.duration && <p className="text-[10px] text-error font-bold mt-1 px-1">{errors.duration}</p>}
              </div>

              <div className="flex items-center gap-3 p-3 bg-surface-container/30 rounded-terra-lg border border-outline-variant/10">
                <input
                  type="checkbox"
                  name="is_current"
                  id="is_current"
                  checked={formData.is_current}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/20 cursor-pointer"
                />
                <label htmlFor="is_current" className="text-xs font-bold text-on-surface-variant cursor-pointer select-none">
                  Currently engaged in this position
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Impact Summary</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={6}
                  className={`w-full px-4 py-3 bg-white border ${errors.description ? 'border-error/40' : 'border-outline-variant/20'} rounded-terra text-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-none shadow-sm`}
                  placeholder="Summarize your key technical contributions..."
                />
                {errors.description && <p className="text-[10px] text-error font-bold mt-1 px-1">{errors.description}</p>}
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary w-full py-4 text-sm"
                >
                  {saving ? 'Synchronizing...' : editingId ? 'Update Record' : 'Commit Milestone'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                        setEditingId(null)
                        setFormData({ company: '', position: '', duration: '', description: '', is_current: false })
                        setErrors({})
                    }}
                    className="w-full py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/40 hover:text-on-background transition-all"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-8">
          <div className="flex justify-between items-end px-2">
            <div>
              <h2 className="text-3xl font-serif font-bold text-on-background tracking-tight">Timeline History</h2>
              <p className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-[0.2em] mt-1">Professional Record Log</p>
            </div>
            <div className="text-right">
                <p className="text-[24px] font-serif font-bold text-primary">{experiences.length}</p>
                <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Entries</p>
            </div>
          </div>

          {loading ? (
             <div className="flex flex-col items-center justify-center py-32 gap-6 bg-surface-container/20 rounded-terra-xl border border-outline-variant/10">
               <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
               <p className="text-[10px] font-bold text-primary/40 uppercase tracking-[0.2em]">Reconstructing timeline...</p>
             </div>
          ) : experiences.length === 0 ? (
            <div className="text-center py-32 bg-white border border-dashed border-outline-variant/30 rounded-terra-xl">
               <p className="text-sm font-serif italic text-on-surface-variant/40">The historical record is currently empty.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {experiences.map((exp) => (
                <div key={exp.id} className={`bg-surface rounded-terra-lg border border-outline-variant/20 shadow-terra overflow-visible p-8 group relative transition-all duration-300 ${exp.is_current ? 'border-primary/30 ring-1 ring-primary/5' : ''}`}>
                  {exp.is_current && (
                    <div className="absolute -top-3 left-8 bg-primary text-on-primary text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-1 rounded-full shadow-terra">
                      Current Job
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-6">
                    <div className="max-w-[80%]">
                      <h3 className="text-xl font-bold text-on-background group-hover:text-primary transition-colors leading-tight">{exp.position}</h3>
                      <p className="text-base font-serif italic text-primary/70 mt-1">{exp.company}</p>
                      <div className="flex items-center gap-2 mt-3 text-on-surface-variant/60">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-[11px] font-bold uppercase tracking-widest">{exp.duration}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-10 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => startEdit(exp)}
                        className="p-2.5 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-full transition-all bg-surface-container/50"
                        title="Edit Entry"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(exp.id)}
                        className="p-2.5 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-full transition-all bg-surface-container/50"
                        title="Destroy Record"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-[13px] text-on-surface-variant/80 border-t border-outline-variant/10 pt-6 leading-relaxed-terra whitespace-pre-wrap font-medium">
                    {exp.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
