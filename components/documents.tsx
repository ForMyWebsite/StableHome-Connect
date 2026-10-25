'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import {
  Upload,
  FolderLock,
  FileText,
  Download,
  Trash2,
  Eye,
  LockKeyhole,
  Share2,
  X,
  Search,
} from 'lucide-react';
import { useWorkspace } from './workspace-context';
import { PageHeading, Notice, Empty } from './ui';
import { deleteDemoFile, fictionalPDF, readDemoFile, storeDemoFile } from '@/lib/demo-files';
import { formatDate, isAllowedDocument } from '@/lib/algorithms';
import type { DocumentRecord } from '@/lib/types';
const CATEGORIES = [
  'Lease',
  'Landlord correspondence',
  'Rent payment records',
  'Court-related documents',
  'Financial assistance documents',
  'Mediation notes',
  'Other',
];
export function DocumentsPage() {
  const { state, demo, run, reload, replaceDemo, busy } = useWorkspace();
  const [error, setError] = useState(''),
    [uploading, setUploading] = useState(false),
    [category, setCategory] = useState('Lease'),
    [filter, setFilter] = useState('All documents'),
    [search, setSearch] = useState(''),
    [selected, setSelected] = useState<DocumentRecord | null>(null),
    [preview, setPreview] = useState('');
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null);
  const uid = state.profile.id;
  const docs = state.documents.filter(
    (d) =>
      (d.owner_id === uid || d.shared_with.includes(uid)) &&
      (filter === 'All documents' || d.category === filter) &&
      d.filename.toLowerCase().includes(search.toLowerCase()),
  );
  useEffect(
    () => () => {
      if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setUploading(true);
    try {
      const file = input.current?.files?.[0];
      if (!file || !file.size || file.size > 10 * 1024 * 1024)
        throw new Error('Choose a file up to 10 MB.');
      if (!isAllowedDocument(new Uint8Array(await file.arrayBuffer()), file.type))
        throw new Error('Choose a genuine PDF, JPG, or PNG file.');
      if (demo) {
        const id = crypto.randomUUID();
        await storeDemoFile(id, file);
        const doc: DocumentRecord = {
          id,
          owner_id: uid,
          filename: file.name.slice(0, 200),
          category,
          storage_path: 'demo/' + id,
          size_bytes: file.size,
          mime_type: file.type,
          shared_with: [],
          uploaded_at: new Date().toISOString(),
          demo: true,
        };
        replaceDemo({ ...state, documents: [...state.documents, doc] });
      } else {
        const f = new FormData();
        f.set('file', file);
        f.set('category', category);
        const r = await fetch('/api/documents', { method: 'POST', body: f });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        await reload();
      }
      if (input.current) input.current.value = '';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }
  async function open(doc: DocumentRecord, download = false) {
    setError('');
    try {
      let url = '/api/documents/' + doc.id + (download ? '?download=1' : '');
      if (demo) {
        const blob =
          (await readDemoFile(doc.id)) ??
          (doc.id === 'demo-document-1' ? fictionalPDF() : undefined);
        if (!blob)
          throw new Error('This demo file is no longer in browser storage. Upload it again.');
        url = URL.createObjectURL(blob);
      }
      if (download) {
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.filename;
        a.click();
        if (demo) setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        setSelected(doc);
        setPreview(url);
        dialog.current?.showModal();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the document.');
    }
  }
  async function remove(doc: DocumentRecord) {
    if (!window.confirm(`Delete ${doc.filename} and revoke all shared access?`)) return;
    setError('');
    try {
      if (demo) {
        await deleteDemoFile(doc.id);
        replaceDemo({ ...state, documents: state.documents.filter((d) => d.id !== doc.id) });
      } else {
        const r = await fetch('/api/documents/' + doc.id, { method: 'DELETE' });
        if (!r.ok) throw new Error((await r.json()).error);
        await reload();
      }
      dialog.current?.close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  }
  const availableRecipients = state.participants
    .filter(
      (p) =>
        p.user_id !== uid &&
        p.accepted_at &&
        !p.blocked &&
        state.participants.some(
          (me) => me.case_id === p.case_id && me.user_id === uid && !me.blocked,
        ),
    )
    .filter((p, i, all) => all.findIndex((x) => x.user_id === p.user_id) === i);
  return (
    <>
      <PageHeading
        eyebrow="A SAFE PLACE FOR THE IMPORTANT THINGS"
        title="Your documents. Your control."
        description="Keep housing records organized and private. Share only with people you explicitly choose."
      />
      <div className="vault-privacy">
        <span className="icon-tile">
          <FolderLock size={27} />
        </span>
        <div>
          <h2>Private by default. Always your choice.</h2>
          <p>
            {demo
              ? 'Fictional demo files stay in this browser. Use synthetic documents only.'
              : 'Files are stored in a private Supabase bucket. Authorized download links expire after 60 seconds.'}
          </p>
        </div>
        <span className="pill">
          <LockKeyhole size={13} />
          Private vault
        </span>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <form className="panel upload-panel" onSubmit={upload}>
        <div className="upload-heading">
          <Upload size={24} />
          <div>
            <h2>Add a document</h2>
            <p>
              PDF, JPG, or PNG · Up to 10 MB · No bank credentials or unnecessary sensitive
              information
            </p>
          </div>
        </div>
        <div className="upload-fields">
          <label>
            Choose a file
            <input ref={input} type="file" accept="application/pdf,image/png,image/jpeg" required />
          </label>
          <label>
            Document category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <button className="btn primary" type="submit" disabled={busy || uploading}>
            <Upload size={16} />
            {uploading ? 'Uploading…' : 'Upload privately'}
          </button>
        </div>
      </form>
      <div className="document-controls">
        <label className="search-field">
          <Search size={17} />
          <span className="sr-only">Search documents</span>
          <input
            placeholder="Find a document…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Filter documents</span>
          <select
            aria-label="Filter document category"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All documents</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      {docs.length ? (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Category</th>
                <th>Added</th>
                <th>Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span className="file-cell">
                      <span className="file-icon">
                        <FileText size={22} />
                      </span>
                      <span>
                        <strong>{d.filename}</strong>
                        <small>
                          {Math.max(1, Math.round(d.size_bytes / 1024))} KB{d.demo ? ' · Demo' : ''}
                        </small>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className="pill neutral">{d.category}</span>
                  </td>
                  <td>{formatDate(d.uploaded_at)}</td>
                  <td>
                    <span className="small access-label">
                      {d.shared_with.length ? (
                        <>
                          <Share2 size={13} />
                          {d.owner_id === uid
                            ? `Shared with ${d.shared_with.length}`
                            : 'Shared with you'}
                        </>
                      ) : (
                        <>
                          <LockKeyhole size={13} />
                          Only you
                        </>
                      )}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        aria-label={'View ' + d.filename}
                        onClick={() => open(d)}
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={'Download ' + d.filename}
                        onClick={() => open(d, true)}
                      >
                        <Download size={18} />
                      </button>
                      {d.owner_id === uid && (
                        <button
                          className="icon-btn danger"
                          aria-label={'Delete ' + d.filename}
                          onClick={() => remove(d)}
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="A little organization goes a long way">
          Add a lease, rent record, or relevant correspondence. Documents aren’t shared with anyone
          automatically.
        </Empty>
      )}
      <dialog ref={dialog} className="document-dialog" onClose={() => setSelected(null)}>
        <div className="dialog-header">
          <h2>{selected?.filename}</h2>
          <button
            className="icon-btn"
            aria-label="Close document preview"
            onClick={() => dialog.current?.close()}
          >
            <X />
          </button>
        </div>
        {selected && (
          <div className="document-dialog-body">
            <div className="document-preview">
              {selected.mime_type.startsWith('image/') ? (
                <Image src={preview} alt={selected.filename} width={700} height={800} unoptimized />
              ) : (
                <iframe
                  src={preview}
                  title={'Preview of ' + selected.filename}
                  sandbox="allow-same-origin"
                />
              )}
              <button className="btn secondary" onClick={() => open(selected, true)}>
                <Download size={15} />
                Download document
              </button>
            </div>
            <div className="document-details">
              <span className="pill">
                <LockKeyhole size={13} />
                You choose access
              </span>
              {selected.owner_id === uid ? (
                <>
                  <form
                    className="form-stack"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      const r = await run('document_rename', {
                        id: selected.id,
                        filename: f.get('filename'),
                        category: f.get('category'),
                      });
                      if (r) dialog.current?.close();
                    }}
                  >
                    <label>
                      File name
                      <input
                        name="filename"
                        defaultValue={selected.filename}
                        maxLength={200}
                        required
                      />
                    </label>
                    <label>
                      Category
                      <select name="category" defaultValue={selected.category}>
                        {CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <button className="btn secondary" disabled={busy}>
                      Save details
                    </button>
                  </form>
                  <hr />
                  <h3>Share with accepted participants</h3>
                  <p className="small muted">
                    Sharing gives this person access to this file only. Revoke it at any time. A
                    downloaded copy cannot be recalled.
                  </p>
                  {availableRecipients.map((p) => {
                    const current = state.documents.find((d) => d.id === selected.id);
                    return (
                      <label className="checkbox-row" key={p.user_id}>
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={current?.shared_with.includes(p.user_id) ?? false}
                          onChange={(e) =>
                            run('share_document', {
                              id: selected.id,
                              user_id: p.user_id,
                              shared: e.target.checked,
                            })
                          }
                        />
                        <span>
                          {p.display_name}
                          <small>{p.participant_role}</small>
                        </span>
                      </label>
                    );
                  })}
                  {!availableRecipients.length && (
                    <p className="small muted">
                      No accepted discussion participants to share with.
                    </p>
                  )}
                </>
              ) : (
                <p className="muted">
                  The owner shared this document with your account. Only the owner can edit details
                  or change access.
                </p>
              )}
            </div>
          </div>
        )}
      </dialog>
      <Notice>
        Useful for a consultation: a lease, rent payment records, relevant notices, and your own
        list of questions. The app does not interpret uploaded legal documents.
      </Notice>
    </>
  );
}
