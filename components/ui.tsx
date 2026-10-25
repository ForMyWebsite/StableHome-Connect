import Link from 'next/link';
import { Home, ArrowUpRight, Info, ArrowRight, ShieldCheck, Leaf } from 'lucide-react';
import type { ReactNode } from 'react';
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={'brand ' + (light ? 'brand-light' : '')}
      aria-label="StableHome Connect home"
    >
      <span className="brand-icon">
        <Home size={22} />
        <Leaf className="brand-leaf" size={12} />
      </span>
      <span>
        StableHome<span className="brand-sub">CONNECT</span>
      </span>
    </Link>
  );
}
export function Neighborhood({ small = false }: { small?: boolean }) {
  return (
    <svg
      viewBox="0 0 640 400"
      role="img"
      aria-label="An illustrated neighborhood with welcoming homes and leafy trees"
      className={small ? 'neighborhood small' : 'neighborhood'}
    >
      <defs>
        <pattern id="windows" width="20" height="28" patternUnits="userSpaceOnUse">
          <rect width="9" height="15" x="5" y="5" rx="1" fill="#edc477" />
        </pattern>
      </defs>
      <circle cx="470" cy="98" r="49" fill="#e8bc6e" opacity=".85" />
      <path d="M20 330 Q140 270 320 320 T640 300 V400 H0Z" fill="#345d59" />
      <path d="M0 370 Q200 300 390 358 T660 340V400H0Z" fill="#49746a" />
      <g stroke="#acbfb4" strokeWidth="2">
        <path d="M80 318V157l105-71 104 71v163" fill="#e8e5d6" />
        <path d="M60 161 185 70l124 91" fill="none" stroke="#d2af70" strokeWidth="14" />
        <path d="M147 320V224h73v96" fill="#21433f" />
        <rect x="111" y="168" width="40" height="47" rx="2" fill="#eecb87" />
        <rect x="218" y="168" width="40" height="47" rx="2" fill="#eecb87" />
        <path d="M317 329V207l89-57 89 57v122" fill="#acbfb4" />
        <path d="m300 210 106-75 107 75" fill="none" stroke="#718d80" strokeWidth="12" />
        <rect x="347" y="224" width="35" height="41" fill="#f1ce8e" />
        <rect x="430" y="224" width="35" height="41" fill="#f1ce8e" />
        <path d="M389 329v-53h34v53" fill="#315e57" />
      </g>
      <path d="M185 322q-12 36 52 78h80q-87-67-103-78" fill="#c6c6ad" />
      <g fill="#587e6a">
        <ellipse cx="51" cy="230" rx="38" ry="62" />
        <ellipse cx="557" cy="237" rx="46" ry="78" />
        <ellipse cx="593" cy="278" rx="29" ry="47" />
      </g>
      <g stroke="#c4c8ab" strokeWidth="4">
        <path d="M51 337V230m506 115V219m36 128v-76" />
      </g>
      <g fill="#9cb38e">
        <circle cx="285" cy="327" r="17" />
        <circle cx="310" cy="322" r="24" />
        <circle cx="334" cy="330" r="17" />
      </g>
      <path d="M0 377H640" stroke="#91a590" opacity=".5" />
      <g fill="#d6b565">
        <circle cx="465" cy="348" r="3" />
        <circle cx="478" cy="341" r="3" />
        <circle cx="106" cy="350" r="3" />
      </g>
    </svg>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow ?? 'YOUR HOUSING WORKSPACE'}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'warning' | 'success' | 'error';
}) {
  return (
    <div className={'notice ' + tone} role={tone === 'error' ? 'alert' : 'status'}>
      <Info size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Home size={25} />
      </div>
      <h2>{title}</h2>
      <p className="muted">{children}</p>
      {action}
    </div>
  );
}
export function ExternalLink({
  href,
  children,
  className = '',
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <ArrowUpRight size={15} aria-hidden="true" />
      <span className="sr-only"> (external website, opens a new tab)</span>
    </a>
  );
}
export function SectionTitle({
  title,
  href,
  link = 'View all',
}: {
  title: string;
  href?: string;
  link?: string;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {href && (
        <Link className="text-link" href={href}>
          {link}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function SafetyFooter() {
  return (
    <footer className="safety-footer">
      <ShieldCheck size={15} />
      <span>Your information is private. You choose what to share.</span>
      <Link href="/privacy">Privacy & your data</Link>
    </footer>
  );
}
export function downloadText(filename: string, text: string, type = 'text/plain') {
  const u = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = u;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
