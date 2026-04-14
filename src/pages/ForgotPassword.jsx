import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-20">
      <div className="w-full max-w-[440px] space-y-12 bg-surface p-12 rounded-terra-xl shadow-terra border border-outline-variant/10 text-center">
        <div className="space-y-4">
          <div className="mx-auto h-16 w-16 bg-tertiary-container rounded-full flex items-center justify-center shadow-inner">
            <svg className="h-8 w-8 text-on-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-serif font-bold text-on-background tracking-tight">
              Access Recovery
            </h2>
            <p className="text-on-surface-variant font-medium text-sm">
              We'll send a secure link to your inbox
            </p>
          </div>
        </div>
        
        {success ? (
          <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="bg-primary/5 border border-primary/10 text-on-background text-sm px-6 py-10 rounded-terra-lg">
              <p className="font-serif font-bold text-lg mb-2">Check your email</p>
              <p className="text-on-surface-variant leading-relaxed">
                Instructions to reset your password have been sent to <span className="text-primary font-bold">{email}</span>
              </p>
            </div>
            <div className="pt-2">
              <Link to="/login" className="btn-secondary w-full inline-block">
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form className="space-y-8 text-left" onSubmit={handleReset}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email-address" className="input-label">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  className="block w-full px-5 py-4 rounded-terra border-outline-variant/30 text-base"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-error/5 border border-error/20 text-error text-xs p-4 rounded-terra flex items-start gap-3">
                 <svg className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col space-y-6 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full h-[60px]"
              >
                {loading ? 'Sending link...' : 'Send Recovery Link'}
              </button>
              
              <div className="text-center">
                <Link to="/login" className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors py-2 inline-block">
                  Cancel and return
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
