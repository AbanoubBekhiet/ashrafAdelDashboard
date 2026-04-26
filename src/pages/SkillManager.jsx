import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function SkillManager() {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    fetchSkills()
  }, [])

  async function fetchSkills() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('name')
      
      if (error) throw error
      setSkills(data || [])
    } catch (error) {
      console.error('Error fetching skills:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.name.trim()) return

    setSaving(true)
    try {
      if (editingId) {
        const { error } = await supabase
          .from('skills')
          .update(formData)
          .eq('id', editingId)
        
        if (error) throw error
        setSkills(prev => prev.map(s => s.id === editingId ? { ...s, ...formData } : s).sort((a,b) => a.name.localeCompare(b.name)))
      } else {
        const { data, error } = await supabase
          .from('skills')
          .insert([formData])
          .select()
        
        if (error) throw error
        setSkills(prev => [...prev, data[0]].sort((a,b) => a.name.localeCompare(b.name)))
      }
      
      setFormData({ name: '', description: '' })
      setEditingId(null)
    } catch (error) {
      console.error('Error saving skill:', error.message)
      alert('Failed to save skill')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this skill?')) return

    try {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      setSkills(prev => prev.filter(s => s.id !== id))
    } catch (error) {
      console.error('Error deleting skill:', error.message)
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
              <h1 className="text-lg sm:text-2xl font-serif font-bold text-on-background tracking-tight">Technical Arsenal</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto w-full p-6 lg:p-14 space-y-12">
        <div className="card-terra p-8">
          <h2 className="text-xl font-serif font-bold text-on-background mb-6">
            {editingId ? 'Refine Skillset' : 'Acquire New Skill'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-4 space-y-1">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Skill Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g. React, SQL, Python..."
                className="w-full px-4 py-3 bg-surface-container border border-outline-variant/10 rounded-terra text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-6 space-y-1">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">Short Description</label>
              <input
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Briefly explain your proficiency..."
                className="w-full px-4 py-3 bg-surface-container border border-outline-variant/10 rounded-terra text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full py-3 text-sm shadow-terra"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add Skill'}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-end px-2">
            <div>
              <h2 className="text-2xl font-serif font-bold text-on-background tracking-tight">Proficiency Grid</h2>
              <p className="text-xs text-on-surface-variant/60 font-bold uppercase tracking-widest mt-1">Skill Inventory</p>
            </div>
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">{skills.length} Loaded</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full flex flex-col items-center py-20 gap-4 opacity-40">
                <div className="h-8 w-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="text-[10px] font-bold uppercase tracking-widest">Inventorying assets...</p>
              </div>
            ) : skills.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-surface-container/20 border border-dashed border-outline-variant/30 rounded-terra-lg">
                <p className="text-sm font-medium text-on-surface-variant">No skills registered in the arsenal.</p>
              </div>
            ) : (
              skills.map((skill) => (
                <div key={skill.id} className="bg-surface p-6 rounded-terra-lg border border-outline-variant/10 shadow-sm hover:shadow-terra-md hover:border-primary/30 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-on-background group-hover:text-primary transition-colors">{skill.name}</h3>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                       <button 
                        onClick={() => {
                          setEditingId(skill.id)
                          setFormData({ name: skill.name, description: skill.description || '' })
                        }}
                        className="text-on-surface-variant/40 hover:text-primary p-1"
                       >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                       </button>
                       <button 
                        onClick={() => handleDelete(skill.id)}
                        className="text-on-surface-variant/40 hover:text-error p-1"
                       >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant/70 leading-relaxed font-medium">
                    {skill.description || 'No detailed description provided.'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
