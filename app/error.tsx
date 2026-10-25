'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="error-page">
      <h1>We couldn’t load this page.</h1>
      <p>Your saved records haven’t been changed. Check your connection and try again.</p>
      <button className="btn primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
