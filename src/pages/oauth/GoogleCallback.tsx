import { useEffect } from 'react'

export default function GoogleCallback() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const error = params.get('error')

      if (window.opener && !window.opener.closed) {
        if (code) {
          window.opener.postMessage({ type: 'OAUTH_SUCCESS', code }, window.location.origin)
        } else {
          window.opener.postMessage({ type: 'OAUTH_ERROR', error: error || 'No code returned' }, window.location.origin)
        }
      }
    } catch (e) {
      console.error('Callback postMessage error:', e)
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'Callback error' }, window.location.origin)
      }
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Authentification en cours...</h2>
        <p className="text-sm text-gray-500 mt-2">Vous pouvez fermer cette fenêtre si elle ne se ferme pas automatiquement.</p>
      </div>
    </div>
  )
}
