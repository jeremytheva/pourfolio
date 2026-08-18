import React, { useState } from 'react'
import AuthForm from '../components/AuthForm.jsx'
import PublicDocumentLinks from '../components/PublicDocumentLinks.jsx'

function LoginPage() {
  const [mode, setMode] = useState('signin')

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <div className="w-full max-w-md">
        <header className="mb-8 text-center">
          <div className="mb-2 text-5xl" aria-hidden="true">🍺</div>
          <p className="text-4xl font-bold text-gray-900">Pourfolio</p>
          <p className="mt-2 text-gray-600">Your beer discoveries, ratings and cellar.</p>
        </header>
        <AuthForm
          mode={mode}
          onToggleMode={() => setMode((current) => current === 'signin' ? 'signup' : 'signin')}
        />
        <PublicDocumentLinks className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-gray-700" />
      </div>
    </main>
  )
}

export default LoginPage