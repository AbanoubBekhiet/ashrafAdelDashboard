import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function CategoryManager() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddCategory(e) {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName.trim() }])
        .select()
      
      if (error) throw error
      setCategories(prev => [...prev, ...data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCategoryName('')
    } catch (error) {
      console.error('Error adding category:', error.message)
      alert('Failed to add category: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateCategory(id) {
    if (!editingName.trim()) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editingName.trim() })
        .eq('id', id)
      
      if (error) throw error
      setCategories(prev => prev.map(cat => cat.id === id ? { ...cat, name: editingName.trim() } : cat))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating category:', error.message)
      alert('Failed to update category: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCategory(id) {
    if (!window.confirm('Are you sure? This might affect projects using this category.')) return

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      setCategories(prev => prev.filter(cat => cat.id !== id))
    } catch (error) {
      console.error('Error deleting category:', error.message)
      alert('Failed to delete category: ' + error.message)
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
              <h1 className="text-lg sm:text-2xl font-serif font-bold text-on-background tracking-tight">Category Taxonomy</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto w-full p-6 lg:p-14 space-y-12">
        <div className="card-terra p-8">
          <h2 className="text-xl font-serif font-bold text-on-background mb-6">Create New Classification</h2>
          <form onSubmit={handleAddCategory} className="flex gap-4">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Data Visualization, Machine Learning..."
              className="flex-1 px-4 py-3 bg-surface-container border border-outline-variant/20 rounded-terra text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={saving || !newCategoryName.trim()}
              className="btn-primary py-3 px-8 text-sm shadow-terra whitespace-nowrap min-w-[140px]"
            >
              {saving ? 'Saving...' : 'Add Category'}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-end px-2">
            <div>
              <h2 className="text-2xl font-serif font-bold text-on-background tracking-tight">Existing Categories</h2>
              <p className="text-xs text-on-surface-variant/60 font-bold uppercase tracking-widest mt-1">Management Registry</p>
            </div>
            <p className="text-xs font-bold text-primary bg-primary/5 px-3 py-1 rounded-full">{categories.length} Total</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary"></div>
                <p className="text-xs font-bold text-primary/40 uppercase tracking-widest">Hydrating table...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-16 bg-surface-container/20 rounded-terra-lg border border-dashed border-outline-variant/30">
                 <p className="text-sm font-medium text-on-surface-variant">No categories found.</p>
              </div>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="bg-surface p-5 rounded-terra-lg border border-outline-variant/10 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
                  {editingId === cat.id ? (
                    <div className="flex-1 flex gap-3 mr-4">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 px-4 py-2 bg-surface-container border border-outline-variant/20 rounded-terra text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                        autoFocus
                      />
                      <button 
                        onClick={() => handleUpdateCategory(cat.id)}
                        disabled={saving}
                        className="text-xs font-bold text-primary px-3 uppercase tracking-wider"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="text-xs font-bold text-on-surface-variant/40 px-2 uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <span className="text-base font-bold text-on-background group-hover:text-primary transition-colors">{cat.name}</span>
                        <p className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-tighter mt-0.5">
                          UID: {cat.id.split('-')[0]}...
                        </p>
                      </div>
                      <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingId(cat.id)
                            setEditingName(cat.name)
                          }}
                          className="p-2 text-on-surface-variant/50 hover:text-primary transition-all rounded-full hover:bg-primary/5"
                          title="Edit Title"
                        >
                          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-2 text-on-surface-variant/50 hover:text-error transition-all rounded-full hover:bg-error/5"
                          title="Delete Classification"
                        >
                          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
