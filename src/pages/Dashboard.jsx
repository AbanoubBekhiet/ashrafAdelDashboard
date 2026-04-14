import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Link, useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const toggleVisibility = async (e, id, currentVisibility) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const newVis = currentVisibility === 'public' ? 'private' : 'public'
      const { error } = await supabase
        .from('projects')
        .update({ visibility: newVis })
        .eq('id', id)
      
      if (error) throw error
      
      setProjects(prev => prev.map(p => p.id === id ? { ...p, visibility: newVis } : p))
    } catch (err) {
      console.error('Error toggling visibility:', err.message)
    }
  }

  const handleDelete = async (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (err) {
       console.error('Error deleting project:', err.message)
    }
  }

  // Calculate some mock or derived stats
  const totalViews = "124.8k"
  const topProject = projects.length > 0 ? projects[0].title : "N/A"
  const activeDrafts = projects.filter(p => p.visibility === 'private').length

  const formatDate = (dateStr) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(dateStr))
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans mb-10">
      
      {/* Navigation */}
      <nav className="bg-surface/80 backdrop-blur-md border-b border-outline-variant/20 sticky top-0 z-20 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-primary rounded-terra flex items-center justify-center shadow-terra rotate-3">
                <span className="text-on-primary font-serif font-bold text-lg">A</span>
              </div>
              <h1 className="text-2xl font-serif font-bold text-on-background tracking-tight">Studio Admin</h1>
            </div>
            <div className="flex items-center gap-6">
              <Link
                to="/edit-project"
                className="btn-primary py-2.5 flex items-center gap-2 group shadow-terra"
              >
                <svg className="h-4 w-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Compose Project</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-on-surface-variant hover:text-error text-xs font-bold uppercase tracking-widest transition-all p-2 flex items-center gap-2"
              >
                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="w-full flex-1 p-6 mt-6 lg:p-14 bg-background">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-10 max-w-5xl mx-auto">
          <div>
            <h2 className="text-4xl font-serif font-bold text-on-background tracking-tight">Project Inventory</h2>
            <p className="text-on-surface-variant mt-2 text-sm tracking-wide">Manage and monitor your organic data initiatives.</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 max-w-5xl mx-auto">
          <div className="bg-surface-container rounded-terra-xl p-6 flex items-center gap-5 border border-outline-variant/10 shadow-sm">
            <div className="h-14 w-14 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
               <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5 5 5zM12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Total Views</p>
              <p className="text-2xl font-serif font-bold mt-0.5 text-on-background">{totalViews}</p>
            </div>
          </div>
          
          <div className="bg-surface-container rounded-terra-xl p-6 flex items-center gap-5 border border-outline-variant/10 shadow-sm">
            <div className="h-14 w-14 rounded-full bg-tertiary-container text-tertiary flex items-center justify-center shrink-0">
               <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Top Project</p>
              <p className="text-xl font-serif font-bold mt-0.5 text-on-background truncate w-[140px]" title={topProject}>{topProject}</p>
            </div>
          </div>

          <div className="bg-surface-container rounded-terra-xl p-6 flex items-center gap-5 border border-outline-variant/10 shadow-sm">
            <div className="h-14 w-14 rounded-full bg-outline-variant/30 text-on-surface-variant flex items-center justify-center shrink-0">
               <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Active Drafts</p>
              <p className="text-2xl font-serif font-bold mt-0.5 text-on-background">{activeDrafts}</p>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#fcfaf7] rounded-terra-xl shadow-sm border border-outline-variant/20 overflow-hidden max-w-5xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
               <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary"></div>
               <p className="text-xs font-bold text-primary/40 uppercase tracking-widest">Fetching inventory...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-24 px-6 bg-white">
              <div className="mx-auto h-16 w-16 bg-surface-container/50 rounded-full flex items-center justify-center mb-4">
                 <svg className="h-8 w-8 text-on-surface-variant/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                 </svg>
              </div>
              <h3 className="text-xl font-serif font-bold text-on-background">No projects found</h3>
              <p className="text-sm text-on-surface-variant mt-2 max-w-md mx-auto">
                Your inventory is currently empty. Start by adding a new project using the button above.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="border-b border-outline-variant/10 bg-[#fcfaf7]">
                  <th className="py-5 px-8 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Thumbnail</th>
                  <th className="py-5 px-8 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Title</th>
                  <th className="py-5 px-8 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Date Created</th>
                  <th className="py-5 px-8 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Visibility</th>
                  <th className="py-5 px-8 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-outline-variant/10 hover:bg-surface-container/20 transition-colors group bg-white">
                    <td className="py-4 px-8 w-28">
                      <div className="w-[72px] h-[48px] rounded-[6px] overflow-hidden bg-surface-container relative shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
                        {project.main_image_url ? (
                          <img src={project.main_image_url} alt={project.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center opacity-20">
                            <svg className="w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-8 max-w-sm">
                      <p className="text-sm font-bold text-on-background group-hover:text-primary transition-colors truncate">{project.title}</p>
                      <p className="text-[13px] text-on-surface-variant/80 mt-0.5 truncate">{project.description || 'No description provided'}</p>
                    </td>
                    <td className="py-4 px-8 text-[13px] text-on-surface-variant/80 whitespace-nowrap tracking-wide">
                      {formatDate(project.created_at)}
                    </td>
                    <td className="py-4 px-8">
                      <button
                        onClick={(e) => toggleVisibility(e, project.id, project.visibility || 'public')}
                        className={`text-[11px] font-bold px-4 py-1.5 rounded-full border transition-all inline-block ${
                          project.visibility === 'private'
                            ? 'bg-outline-variant/20 text-on-surface-variant/80 border-transparent hover:bg-outline-variant/40'
                            : 'bg-primary/20 text-primary border-transparent hover:bg-primary/30'
                        }`}
                      >
                       {project.visibility === 'private' ? 'Private' : 'Public'}
                      </button>
                    </td>
                    <td className="py-4 px-8">
                      <div className="flex gap-4 justify-end text-on-surface-variant/40 group-hover:text-on-surface-variant/80 transition-colors">
                        <Link to={`/edit-project/${project.id}`} className="hover:text-primary hover:bg-primary/5 p-2 -m-2 rounded-full transition-all" title="Edit text">
                          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </Link>
                        <button onClick={(e) => handleDelete(e, project.id)} className="hover:text-error hover:bg-error/5 p-2 -m-2 rounded-full transition-all" title="Delete record">
                          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {/* Pagination Footer */}
          <div className="bg-white border-t border-outline-variant/10 px-8 py-5 flex items-center justify-between">
            <span className="text-[13px] text-on-surface-variant/70 tracking-wide">
              Showing 1-{projects.length} of {projects.length} projects
            </span>
            <div className="flex items-center gap-2">
              <button disabled className="px-3.5 py-1.5 border border-outline-variant/30 rounded-lg bg-white text-on-surface-variant/40 text-[13px] transition-colors">Previous</button>
              <button className="px-3.5 py-1.5 border border-outline-variant/30 rounded-lg bg-white text-primary text-[13px] font-bold shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors">1</button>
              <button disabled className="px-3.5 py-1.5 border border-outline-variant/30 rounded-lg bg-white text-on-surface-variant/40 text-[13px] transition-colors">2</button>
              <button disabled className="px-3.5 py-1.5 border border-outline-variant/30 rounded-lg bg-white text-on-surface-variant/40 text-[13px] transition-colors">3</button>
              <button disabled className="px-3.5 py-1.5 border border-outline-variant/30 rounded-lg bg-white text-on-surface-variant/40 text-[13px] transition-colors">Next</button>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
