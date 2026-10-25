import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="main-content" className="error-page">
      <h1>Let’s get you back on track.</h1>
      <p>This page couldn’t be found.</p>
      <Link className="btn primary" href="/">
        Open my workspace
      </Link>
    </main>
  );
}
