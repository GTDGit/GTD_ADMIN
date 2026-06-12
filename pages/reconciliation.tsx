import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { useToast } from '@/components/Toast';
import {
  fetchReconciliations,
  resolveReconciliation,
  type Reconciliation,
} from '@/lib/api';
import { Scale, Search, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getStatusStyle } from '@/lib/status';

const FINAL_STATUSES = ['Success', 'Failed', 'Expired', 'Cancelled'];

const REASON_LABEL: Record<string, string> = {
  status_mismatch: 'Status mismatch',
  amount_mismatch: 'Amount mismatch',
  status_amount_mismatch: 'Status & amount mismatch',
};

function amount(v?: number): string {
  if (v === undefined || v === null) return '—';
  return `Rp ${v.toLocaleString('id-ID')}`;
}

export default function ReconciliationPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Reconciliation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState('open');
  const [provider, setProvider] = useState('');
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<Reconciliation | null>(null);
  const [resolveStatus, setResolveStatus] = useState('Success');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (status) params.status = status;
      if (provider) params.provider = provider;
      if (search) params.search = search;
      const res = await fetchReconciliations(params);
      setRows(res.reconciliations);
      setTotal(res.totalItems);
    } catch (err) {
      console.error('Failed to fetch reconciliations:', err);
      toast.error('Failed to load reconciliations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, provider]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    const base = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '');
    const es = new EventSource(`${base}/v1/admin/sse?token=${token}`);
    const refresh = () => load();
    es.addEventListener('payment.status_changed', refresh);
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = (r: Reconciliation) => {
    setSelected(r);
    setResolveStatus(r.resolvedStatus || 'Success');
    setNote('');
  };

  const handleResolve = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await resolveReconciliation(selected.id, { status: resolveStatus, note: note.trim() });
      toast.success('Reconciliation resolved');
      setSelected(null);
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to resolve reconciliation';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <Head><title>Reconciliation — GTD Admin</title></Head>
      <Layout>
      <div className="page-content">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="page-title">Reconciliation</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Payments where an inbound webhook disagreed with the provider inquiry. Open rows are frozen until resolved.
          </p>
        </div>
        <button onClick={() => load()} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search paymentId"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
              className="input-field pl-9"
            />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input-field">
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} className="input-field">
            <option value="">All providers</option>
            <option value="pakailink">Pakailink</option>
            <option value="dana_direct">DANA</option>
            <option value="midtrans">Midtrans</option>
            <option value="xendit">Xendit</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <Scale className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No reconciliations found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Payment ID</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Webhook → Inquiry</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(r)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.paymentId}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{r.provider}</td>
                  <td className="px-4 py-3 text-gray-700">{REASON_LABEL[r.reason] || r.reason}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <span className="font-medium">{r.webhookStatus || '—'}</span>
                    <span className="text-gray-400"> → </span>
                    <span className="font-medium">{r.inquiryStatus || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${getStatusStyle(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500">Page {page} of {pages} · {total} total</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary py-1.5 px-3 flex items-center gap-1 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary py-1.5 px-3 flex items-center gap-1 disabled:opacity-40">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selected.paymentId}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selected.provider} · {REASON_LABEL[selected.reason] || selected.reason}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Info label="Status" value={selected.status} />
                <Info label="Reason" value={REASON_LABEL[selected.reason] || selected.reason} />
                <Info label="Webhook Status" value={selected.webhookStatus || '—'} />
                <Info label="Inquiry Status" value={selected.inquiryStatus || '—'} />
                <Info label="Webhook Amount" value={amount(selected.webhookAmount)} />
                <Info label="Inquiry Amount" value={amount(selected.inquiryAmount)} />
                <Info label="Expected Amount" value={amount(selected.expectedAmount)} />
                <Info label="Created" value={selected.createdAt} />
                {selected.status === 'resolved' && (
                  <>
                    <Info label="Resolved Status" value={selected.resolvedStatus || '—'} />
                    <Info label="Resolved By" value={selected.resolvedBy || '—'} />
                    <Info label="Resolved At" value={selected.resolvedAt || '—'} />
                    <Info label="Note" value={selected.resolutionNote || '—'} />
                  </>
                )}
              </div>

              {selected.webhookPayload && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Webhook Payload</h3>
                  <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-x-auto max-h-48">{JSON.stringify(selected.webhookPayload, null, 2)}</pre>
                </div>
              )}

              {selected.inquiryPayload && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Inquiry Payload (authoritative)</h3>
                  <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-x-auto max-h-48">{JSON.stringify(selected.inquiryPayload, null, 2)}</pre>
                </div>
              )}

              {selected.status === 'open' && (
                <div className="border-t border-gray-100 pt-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Resolve</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Applying a final status will update the payment and forward the outcome to the client. This cannot be undone.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">Final Status</label>
                      <select value={resolveStatus} onChange={(e) => setResolveStatus(e.target.value)} className="input-field">
                        {FINAL_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">Note (optional)</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder="Reason for this resolution"
                      className="input-field"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setSelected(null)} className="btn-secondary">Cancel</button>
                    <button onClick={handleResolve} disabled={saving} className="btn-primary disabled:opacity-50">
                      {saving ? 'Applying…' : 'Apply'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
    </>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}
