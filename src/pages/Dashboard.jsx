import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Link, useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [cvUrl, setCvUrl] = useState(null)
  const [cvLoading, setCvLoading] = useState(true)
  const [cvUploading, setCvUploading] = useState(false)
  const [profileUrl, setProfileUrl] = useState(null)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProjects()
    fetchUserCv()
    fetchProfileImage()
  }, [])

  async function fetchProfileImage() {
    try {
      const { data, error } = await supabase
        .from('portfolio_images')
        .select('full_url')
        .eq('folder_name', 'profile')
        .maybeSingle()
      
      if (data) setProfileUrl(data.full_url)
    } catch (err) {
      console.error('Error fetching profile image:', err)
    }
  }

  async function fetchUserCv() {
    try {
      setCvLoading(true)
      const { data, error } = await supabase
        .from('user_cv')
        .select('*')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - table is empty
          setCvUrl(null)
        } else {
          console.error('Error fetching CV:', error.message)
        }
      } else if (data) {
        setCvUrl(data.cv_url)
      }
    } catch (err) {
      console.error('Error fetching CV:', err.message)
    } finally {
      setCvLoading(false)
    }
  }

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

  const extractPath = (url) => {
    if (!url) return null
    try {
      const urlObj = new URL(url)
      const parts = urlObj.pathname.split('/portfolio-assets/')
      if (parts.length > 1) return decodeURIComponent(parts[1])
    } catch {
      if (url.includes('/portfolio-assets/')) {
        return decodeURIComponent(url.split('/portfolio-assets/')[1])
      }
    }
    return null
  }

  const handleDelete = async (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    
    try {
      const { data: project } = await supabase.from('projects').select('main_image_url').eq('id', id).single()
      const { data: gallery } = await supabase.from('project_images').select('image_url').eq('project_id', id)

      const pathsToRemove = []

      const mainPath = extractPath(project?.main_image_url)
      if (mainPath) pathsToRemove.push(mainPath)

      if (gallery) {
        gallery.forEach(img => {
          const path = extractPath(img.image_url)
          if (path) pathsToRemove.push(path)
        })
      }

      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      
      setProjects(prev => prev.filter(p => p.id !== id))

      if (pathsToRemove.length > 0) {
        const { error: storageError } = await supabase.storage.from('portfolio-assets').remove(pathsToRemove)
        if (storageError) console.error('Error removing images from storage:', storageError.message)
      }
    } catch (err) {
      console.error('Error deleting project:', err.message)
    }
  }

  const handleCvUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['application/pdf']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF file')
      return
    }

    setCvUploading(true)
    try {
      // Get existing CV record
      const { data: existingRow } = await supabase
        .from('user_cv')
        .select('id, cv_url')
        .single()

      // Delete old file if exists
      if (existingRow?.cv_url) {
        const oldPath = extractPath(existingRow.cv_url)
        if (oldPath) {
          await supabase.storage.from('portfolio-assets').remove([oldPath])
        }
      }

      // Upload with unique filename
      const timestamp = Date.now()
      const fileName = `cv/${timestamp}_cv.pdf`

      const { error: uploadError } = await supabase.storage
        .from('portfolio-assets')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Upload error:', uploadError.message)
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-assets')
        .getPublicUrl(fileName)

      // Update or insert in DB
      if (existingRow?.id) {
        const { error: updateError } = await supabase
          .from('user_cv')
          .update({
            cv_url: publicUrl,
            file_name: file.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRow.id)
        
        if (updateError) throw updateError
        setCvUrl(publicUrl)
      } else {
        // Insert new row
        const { error: insertError } = await supabase
          .from('user_cv')
          .insert({
            cv_url: publicUrl,
            file_name: file.name,
          })
        
        if (insertError) throw insertError
        await fetchUserCv()
      }
    } catch (err) {
      console.error('Error uploading CV:', err.message)
      alert('Error uploading CV: ' + err.message)
    } finally {
      setCvUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleCvDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your CV?')) return

    setCvUploading(true)
    try {
      // Get existing CV
      const { data: currentCv } = await supabase
        .from('user_cv')
        .select('id, cv_url')
        .single()

      if (!currentCv) {
        console.log('No CV to delete')
        setCvUploading(false)
        return
      }

      // Delete from storage
      if (currentCv?.cv_url) {
        const path = extractPath(currentCv.cv_url)
        if (path) {
          await supabase.storage.from('portfolio-assets').remove([path])
        }
      }

      // Delete from DB
      if (currentCv?.id) {
        await supabase.from('user_cv').delete().eq('id', currentCv.id)
      }

      setCvUrl(null)
    } catch (err) {
      console.error('Error deleting CV:', err.message)
    } finally {
      setCvUploading(false)
    }
  }

  const totalViews = "124.8k"
  const topProject = projects.length > 0 ? projects[0].title : "N/A"
  const activeDrafts = projects.filter(p => p.visibility === 'private').length

  const formatDate = (dateStr) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(dateStr))
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans mb-10">
      
      <nav className="bg-surface/80 backdrop-blur-md border-b border-outline-variant/20 sticky top-0 z-20 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex justify-between h-16 sm:h-20 items-center ">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-primary rounded-terra flex items-center justify-center shadow-terra overflow-hidden">
                {profileUrl ? (
                  <img src={profileUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-on-primary font-serif font-bold text-base sm:text-lg">A</span>
                )}
              </div>
              <h1 className="text-lg sm:text-2xl font-serif font-bold text-on-background tracking-tight hidden sm:block">Ashraf Admin</h1>
            </div>
            <div className="flex items-center gap-3 sm:gap-6">
              <Link
                to="/edit-project"
                className="btn-primary py-2 px-3 sm:py-2.5 sm:px-4 flex items-center gap-2 group shadow-terra"
              >
                <svg className="h-4 w-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Compose Project</span>
              </Link>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCvUpload}
                accept="application/pdf"
                className="hidden"
              />
              {!cvLoading && (
                cvUrl ? (
                  <div className="flex items-center gap-1 sm:gap-3">
                    <a
                      href={cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      disabled={cvUploading}
                      className="text-primary hover:text-primary/80 p-2 sm:p-0 text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2"
                      title="View CV"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="hidden sm:inline">View CV</span>
                    </a>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={cvUploading}
                      className="text-xs font-bold uppercase tracking-widest transition-all p-2 flex items-center gap-2 text-on-surface-variant hover:text-primary disabled:opacity-50"
                      title="Re-upload CV"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </button>
                    <button
                      onClick={handleCvDelete}
                      disabled={cvUploading}
                      className="text-on-surface-variant hover:text-error text-xs font-bold uppercase tracking-widest transition-all p-2 flex items-center gap-2 disabled:opacity-50"
                      title="Delete CV"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={cvUploading}
                    className="text-on-surface-variant hover:text-primary text-xs font-bold uppercase tracking-widest transition-all p-2 flex items-center gap-2 disabled:opacity-50"
                  >
                    {cvUploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary/20 border-t-primary" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                    <span className="hidden sm:inline">{cvUploading ? 'Uploading...' : 'Upload CV'}</span>
                  </button>
                )
              )}
              <button
                onClick={handleLogout}
                className="text-on-surface-variant hover:text-error text-xs font-bold uppercase tracking-widest transition-all p-2 flex items-center gap-2"
                title="Logout"
              >
                <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Management Toolbar */}
      <div className="bg-surface-container/30 border-b border-outline-variant/10 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex flex-wrap items-center gap-4 sm:gap-10 justify-center sm:justify-start">
            <Link to="/settings" className="flex items-center gap-2 group transition-all">
              <div className="p-2 bg-surface rounded-terra-sm border border-outline-variant/10 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all shadow-sm">
                <svg className="w-5 h-5 text-on-surface-variant group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 group-hover:text-on-background transition-colors">profile image</span>
            </Link>

            <Link to="/categories" className="flex items-center gap-2 group transition-all">
              <div className="p-2 bg-surface rounded-terra-sm border border-outline-variant/10 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all shadow-sm">
                <svg className="w-5 h-5 text-on-surface-variant group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 group-hover:text-on-background transition-colors">Categories</span>
            </Link>

            <Link to="/experiences" className="flex items-center gap-2 group transition-all">
              <div className="p-2 bg-surface rounded-terra-sm border border-outline-variant/10 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all shadow-sm">
                <svg className="w-5 h-5 text-on-surface-variant group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 group-hover:text-on-background transition-colors">Experiences</span>
            </Link>

            <Link to="/education" className="flex items-center gap-2 group transition-all">
              <div className="p-2 bg-surface rounded-terra-sm border border-outline-variant/10 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all shadow-sm">
                <svg className="w-5 h-5 text-on-surface-variant group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 group-hover:text-on-background transition-colors">Education</span>
            </Link>

            <Link to="/skills" className="flex items-center gap-2 group transition-all">
              <div className="p-2 bg-surface rounded-terra-sm border border-outline-variant/10 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all shadow-sm">
                <svg className="w-5 h-5 text-on-surface-variant group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 group-hover:text-on-background transition-colors">Skills</span>
            </Link>

            <Link to="/location" className="flex items-center gap-2 group transition-all">
              <div className="p-2 bg-surface rounded-terra-sm border border-outline-variant/10 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all shadow-sm">
                <svg className="w-5 h-5 text-on-surface-variant group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 group-hover:text-on-background transition-colors">Location</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="w-full flex-1 p-6 mt-6 lg:p-14 bg-background">
        
        <div className="flex justify-between items-end mb-10 max-w-5xl mx-auto">
          <div>
            <h2 className="text-4xl font-serif font-bold text-on-background tracking-tight">Projects Inventory</h2>
            <p className="text-on-surface-variant mt-2 text-sm tracking-wide">Manage and monitor your organic data initiatives.</p>
          </div>
        </div>

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

        <div className="bg-[#fcfaf7] rounded-terra-xl shadow-sm border border-outline-variant/20 overflow-x-auto max-w-5xl mx-auto">
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