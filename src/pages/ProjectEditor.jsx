import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function ProjectEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(!!id)
  const [error, setError] = useState(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    github: '',
    tags: '',
    visibility: 'public',
  })

  const [mainImage, setMainImage] = useState({ file: null, preview: null, currentUrl: '' })
  const [galleryImages, setGalleryImages] = useState([])
  
  const mainImageInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  useEffect(() => {
    if (id) {
      fetchProject()
    }
  }, [id])

  async function fetchProject() {
    try {
      setFetching(true)
      const { data: project, error: pError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      if (pError) throw pError
      
      const { data: images, error: iError } = await supabase
        .from('project_images')
        .select('*')
        .eq('project_id', id)

      if (iError) throw iError

      if (project) {
        setFormData({
          title: project.title || '',
          description: project.description || '',
          github: project.github || '',
          tags: project.tags ? project.tags.join(', ') : '',
          visibility: project.visibility || 'public',
        })
        setMainImage({ file: null, preview: null, currentUrl: project.main_image_url || '' })
      }

      if (images) {
        setGalleryImages(images.map(img => ({
          id: img.id,
          file: null,
          preview: null,
          currentUrl: img.image_url,
          explanation: img.explanation || '',
        })))
      }
    } catch (error) {
      console.error('Error fetching project:', error.message)
      setError('Could not fetch project record.')
    } finally {
      setFetching(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleMainImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const preview = URL.createObjectURL(file)
      setMainImage(prev => ({ ...prev, file, preview }))
    }
  }

  const handleGalleryImageAdd = (e) => {
    const files = Array.from(e.target.files)
    const newImages = files.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      currentUrl: '',
      explanation: '',
    }))
    setGalleryImages(prev => [...prev, ...newImages])
  }

  const removeGalleryImage = (id) => {
    setGalleryImages(prev => prev.filter(img => img.id !== id))
  }

  const updateGalleryExplanation = (id, text) => {
    setGalleryImages(prev => prev.map(img => img.id === id ? { ...img, explanation: text } : img))
  }

  const uploadToStorage = async (file) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `projects/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('portfolio-assets')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('portfolio-assets')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let mainImageUrl = mainImage.currentUrl
      if (mainImage.file) {
        mainImageUrl = await uploadToStorage(mainImage.file)
      }

      const projectData = {
        title: formData.title,
        description: formData.description,
        github: formData.github,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        main_image_url: mainImageUrl,
        visibility: formData.visibility,
      }

      let projectId = id
      if (id) {
        const { error: updateError } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', id)
        if (updateError) throw updateError
      } else {
        const { data: newProject, error: insertError } = await supabase
          .from('projects')
          .insert([projectData])
          .select()
          .single()
        if (insertError) throw insertError
        projectId = newProject.id
      }

      if (id) {
        const { error: deleteError } = await supabase
          .from('project_images')
          .delete()
          .eq('project_id', projectId)
        if (deleteError) throw deleteError
      }

      const imagesToInsert = []
      for (const img of galleryImages) {
        let url = img.currentUrl
        if (img.file) {
          url = await uploadToStorage(img.file)
        }
        imagesToInsert.push({
          project_id: projectId,
          image_url: url,
          explanation: img.explanation,
        })
      }

      if (imagesToInsert.length > 0) {
        const { error: imagesError } = await supabase
          .from('project_images')
          .insert(imagesToInsert)
        if (imagesError) throw imagesError
      }

      navigate('/')
    } catch (err) {
      console.error('Error saving project:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary/20 border-t-primary"></div>
        <p className="text-xs font-bold text-primary/40 uppercase tracking-widest">Hydrating editor...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <nav className="bg-surface-container/60 backdrop-blur-xl border-b border-outline-variant/20 sticky top-0 z-30 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-6">
              <Link to="/" className="text-on-surface-variant hover:text-primary transition-all p-2 rounded-full hover:bg-primary/5">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div className="h-6 w-[1px] bg-outline-variant/40"></div>
              <h1 className="text-xl font-serif font-bold text-on-background tracking-tight">
                {id ? 'Refining Record' : 'Initial Composition'}
              </h1>
            </div>
            <div className="flex items-center gap-4">
               <Link to="/" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-background transition-all px-4 py-2">
                Discard
               </Link>
               <button
                type="submit"
                form="project-form"
                disabled={loading}
                className="btn-primary shadow-terra-md px-10"
              >
                {loading ? 'Publishing...' : 'Commit Changes'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 lg:px-12 mt-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <form id="project-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          <div className="lg:col-span-2 space-y-12">
            <div className="card-terra p-10 space-y-12">
              <div className="space-y-4">
                <label className="input-label">Project Identity</label>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Define the title..."
                  className="block w-full text-5xl font-serif font-bold  bg-surface-container border border-outline-variant/20 rounded-terra-lg text-on-background  focus:ring-0 placeholder-on-surface-variant/20 p-0 tracking-tight"
                />
              </div>

              <div className="space-y-4">
                 <label className="input-label">Narrative Context</label>
                 <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={12}
                  placeholder="Elaborate on the vision, technical challenges, and final impact..."
                  className="block w-full px-6 py-5 bg-surface-container border border-outline-variant/20 rounded-terra-lg text-on-background focus:ring-2 focus:ring-primary/10 focus:border-primary/30 focus:outline-none transition-all resize-none text-base leading-relaxed-terra shadow-inner"
                />
              </div>

              <div className="space-y-8 pt-4">
                <div className="flex justify-between items-center px-1">
                   <label className="input-label">Media Evidence (Gallery)</label>
                   <button 
                    type="button"
                    onClick={() => galleryInputRef.current.click()}
                    className="text-xs font-bold text-primary px-3 py-1.5 rounded-terra hover:bg-primary/5 transition-all"
                   >
                    Add Media
                   </button>
                </div>
                
                <input 
                  type="file" multiple accept="image/*" className="hidden" ref={galleryInputRef} onChange={handleGalleryImageAdd} 
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {galleryImages.map((img) => (
                    <div key={img.id} className="relative bg-surface rounded-terra-lg border border-outline-variant/20 group animate-in fade-in zoom-in duration-500 overflow-hidden shadow-sm hover:shadow-terra transition-all flex flex-col">
                       <div className="aspect-[4/3] bg-surface-container relative w-full overflow-hidden">
                          <img src={img.preview || img.currentUrl} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                          <button 
                             type="button"
                             onClick={() => removeGalleryImage(img.id)}
                             className="absolute top-2 right-2 bg-background/80 backdrop-blur-md text-on-background/70 hover:text-error p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                          >
                             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                             </svg>
                          </button>
                       </div>
                       <div className="p-4 flex-grow bg-surface/50 border-t border-outline-variant/10">
                          <textarea 
                             placeholder="Annotate this visual..."
                             value={img.explanation}
                             onChange={(e) => updateGalleryExplanation(img.id, e.target.value)}
                             className="w-full bg-transparent border-none outline-none focus:ring-0 p-0 text-xs italic text-on-surface-variant/90 placeholder-on-surface-variant/40 resize-none h-16 leading-relaxed"
                          />
                       </div>
                    </div>
                 ))}

                 <div 
                   onClick={() => galleryInputRef.current.click()}
                   className="aspect-[4/3] min-h-[200px] border-2 border-dashed border-outline-variant/30 rounded-terra-lg text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all group flex flex-col items-center justify-center gap-3"
                 >
                    <div className="h-12 w-12 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant/40 group-hover:text-primary/70 group-hover:bg-primary/10 transition-all group-hover:scale-110 shadow-sm">
                       <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                       </svg>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/50 group-hover:text-primary/70">Upload Media</p>
                 </div>
              </div>
              </div>
            </div>
          </div>

          <div className="space-y-12">
             <div className="card-terra p-8 space-y-6">
                <label className="input-label">Cover Representation</label>
                <div 
                  onClick={() => mainImageInputRef.current.click()}
                  className="aspect-[4/3] bg-surface-container rounded-terra border border-outline-variant/20 overflow-hidden group cursor-pointer relative shadow-inner"
                >
                  {mainImage.preview || mainImage.currentUrl ? (
                    <>
                      <img src={mainImage.preview || mainImage.currentUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-surface px-6 py-2.5 rounded-full text-xs font-bold text-primary shadow-terra uppercase tracking-wider">Update Asset</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center gap-3">
                       <svg className="h-10 w-10 text-on-surface-variant/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                       </svg>
                       <span className="text-xs font-bold text-on-surface-variant/30 uppercase tracking-widest">Select Cover</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" ref={mainImageInputRef} onChange={handleMainImageChange} />
                </div>
                <p className="text-[10px] text-on-surface-variant/30 font-bold uppercase tracking-tighter text-center pt-2">
                  Optimization: 4:3 Aspect Ratio (WebP Recommended)
                </p>
             </div>

              <div className="card-terra p-8 space-y-8">
                <div className="space-y-2">
                   <label className="input-label">Project Visibility</label>
                   <select
                      name="visibility"
                      value={formData.visibility}
                      onChange={handleChange}
                      className="block w-full px-4 py-3 bg-surface-container border border-outline-variant/10 rounded-terra text-sm text-on-background focus:ring-1 focus:ring-primary/40 focus:outline-none transition-all shadow-inner"
                   >
                     <option value="public">Public</option>
                     <option value="private">Private</option>
                   </select>
                </div>

                <div className="space-y-2">
                   <label className="input-label">Core Technologies</label>
                   <input
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      placeholder="sql, tabula, power BI..."
                      className="block w-full px-4 py-3 bg-surface-container border border-outline-variant/10 rounded-terra text-sm text-on-background focus:ring-1 focus:ring-primary/40 focus:outline-none transition-all placeholder-on-surface-variant/20 shadow-inner"
                   />
                </div>

                <div className="space-y-2">
                   <label className="input-label">Source Link (GitHub)</label>
                   <input
                      name="github"
                      value={formData.github}
                      onChange={handleChange}
                      placeholder="https://github.com/archive"
                      className="block w-full px-4 py-3 bg-surface-container border border-outline-variant/10 rounded-terra text-sm text-on-background focus:ring-1 focus:ring-primary/40 focus:outline-none transition-all placeholder-on-surface-variant/20 shadow-inner"
                   />
                </div>
             </div>

             {error && (
                <div className="bg-error/5 border border-error/20 text-error text-[10px] p-5 rounded-terra font-bold uppercase tracking-widest leading-relaxed animate-in shake duration-500">
                  <span className="text-error mr-2 opacity-50 underline">System Fault:</span> {error}
                </div>
             )}

             <div className="text-center space-y-1">
                <p className="text-[10px] text-on-surface-variant/20 uppercase tracking-widest font-bold">
                  Document Persistence Layer
                </p>
                <div className="flex justify-center gap-1">
                   <span className="h-1 w-1 bg-primary/20 rounded-full"></span>
                   <span className="h-1 w-1 bg-primary/20 rounded-full"></span>
                   <span className="h-1 w-1 bg-primary/20 rounded-full"></span>
                </div>
             </div>
          </div>
        </form>
      </main>
    </div>
  )
}
