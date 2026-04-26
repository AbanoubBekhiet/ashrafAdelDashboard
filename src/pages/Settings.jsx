import { Link } from 'react-router-dom'
import ProfileImage from '../components/ProfileImage'

export default function Settings() {
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
              <h1 className="text-lg sm:text-2xl font-serif font-bold text-on-background tracking-tight">Identity Settings</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="w-full flex-1 p-6 lg:p-14 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <ProfileImage onUpdate={() => {}} />
        </div>
      </main>
    </div>
  )
}
