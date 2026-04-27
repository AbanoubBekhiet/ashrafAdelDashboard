import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ProfileImage({ onUpdate }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchProfileImage()
  }, [])

  async function fetchProfileImage() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('portfolio_images')
        .select('*')
        .eq('folder_name', 'profile')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      // Take the most recent one if multiples exist
      setProfile(data && data.length > 0 ? data[0] : null)
    } catch (error) {
      console.error('Error fetching profile image:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const timestamp = Date.now()
      const extension = file.name.split('.').pop()
      const fileName = `profile/${timestamp}_profile.${extension}`
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('portfolio-assets')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio-assets')
        .getPublicUrl(fileName)

      // Get ALL existing profile records for cleanup
      const { data: existingRecords } = await supabase
        .from('portfolio_images')
        .select('*')
        .eq('folder_name', 'profile')

      // Insert new record
      const { data: newRecord, error: insertError } = await supabase
        .from('portfolio_images')
        .insert({
          file_name: file.name,
          storage_path: fileName,
          full_url: publicUrl,
          folder_name: 'profile',
          user_id: user.id
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Cleanup: Delete all OLD files and DB records
      if (existingRecords && existingRecords.length > 0) {
        const oldPaths = existingRecords.map(r => r.storage_path)
        const oldIds = existingRecords.map(r => r.id)
        
        // Remove old files from storage
        await supabase.storage.from('portfolio-assets').remove(oldPaths)
        // Remove old records from DB
        await supabase.from('portfolio_images').delete().in('id', oldIds)
      }

      setProfile(newRecord)
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error uploading profile image:', error.message)
      alert('Upload failed: ' + error.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete your profile image?')) return
    if (!profile) return

    try {
      await supabase.storage.from('portfolio-assets').remove([profile.storage_path])
      await supabase.from('portfolio_images').delete().eq('id', profile.id)
      
      setProfile(null)
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error deleting profile image:', error.message)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-surface-container/30 rounded-terra-xl border border-dashed border-outline-variant/30 max-w-2xl mx-auto my-12">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-serif font-bold text-on-background">Identity Image</h3>
        <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mt-2">Manage your professional representation</p>
      </div>

      <div className="relative group">
        <div className="h-48 w-48 rounded-full overflow-hidden border-4 border-white shadow-terra relative bg-surface-container flex items-center justify-center">
          {loading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary" />
          ) : profile?.full_url ? (
            <img src={profile.full_url} alt="Profile" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <svg className="w-16 h-16 text-on-surface-variant/20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          )}
          
          {uploading && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white" />
            </div>
          )}
        </div>

        <div className="absolute -bottom-2 -right-2 flex gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-10 w-10 bg-primary text-on-primary rounded-full shadow-terra flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95"
            title="Upload Photo"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          
          {profile && (
            <button 
              onClick={handleDelete}
              disabled={uploading}
              className="h-10 w-10 bg-error text-on-error rounded-full shadow-terra flex items-center justify-center hover:bg-error/90 transition-all active:scale-95"
              title="Delete Photo"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        accept="image/*"
        className="hidden"
      />

      <div className="mt-8 text-center max-w-xs">
        <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em] leading-relaxed">
          {profile ? 'Your official profile asset' : 'No profile image assigned yet'}
        </p>
      </div>
    </div>
  )
}
