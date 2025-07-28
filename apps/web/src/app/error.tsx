'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Something went wrong!</h1>
      <p>An error occurred. Please try again.</p>
      <button onClick={reset} style={{ marginRight: '1rem' }}>
        Try again
      </button>
      <a href="/">Go back to home</a>
      {error.digest && (
        <p style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
          Error ID: {error.digest}
        </p>
      )}
    </div>
  )
}