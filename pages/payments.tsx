import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { CreditCard, Search, RefreshCw, X, ChevronLeft, ChevronRight, Repeat2 } from 'lucide-react';

interface Payment {
  id: number;
  paymentId: string;
  referenceId: string;
  clientId: number;
  type: string;
  code: string;
  status: string;
  provider: string;
  providerRef?: string;
  amount: number;
  fee: number;
  totalAmount: number;
  paidAmount?: number;
  isSandbox: boolean;
  expiredAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  paymentDetail?: any;
  paymentInstruction?: any;
  providerData?: any;
}

interface Stats {
  total: number;
  paid: number;
  pending: number;
  expired: number;
  cancelled: number;
  failed: number;
  refunded: number;
  volume: number;
  paidVolume: number;
}

const STATUS_STYLES: Record<string, string> = {
  Paid: 'bg-emerald-50 text-emerald-700',
  Pending: 'bg-amber-50 text-amber-700',
  Expired: 'bg-gray-100 text-gray-600',
  Cancelled: 'bg-gray-100 text-gray-600',
  Failed: 'bg-red-50 text-red-700',
  Refunded: 'bg-purple-50 text-purple-700',
  Partial_Refund: 'bg-purple-50 text-purple-700',
};

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [provider, setProvider] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Payment | null>(null);
  const [detailLogs, setDetailLogs] = useState<any[]>([]);
  const [detailCallbacks, setDetailCallbacks] = useState<any[]>([]);
  const [detailRefunds, setDetailRefunds] = useState<any[]>([]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (status) params.status = status;
      if (type) params.type = type;
      if (provider) params.provider = provider;
      if (search) params.search = search;
      const { data } = await api.get('/v1/admin/payments', { params });
      setPayments(data.data?.payments || []);
      setTotal(data.data?.total || 0);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/v1/admin/payments/stats');
      setStats(data.data || null);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, status, type, provider]);

  useEffect(() => {
    fetchStats();
    // SSE subscription for real-time updates
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    const base = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '');
    const es = new EventSource(`${base}/v1/admin/sse?token=${token}`);
    const refresh = () => {
      fetchPayments();
      fetchStats();
    };
    es.addEventListener('payment.created', refresh);
    es.addEventListener('payment.status_changed', refresh);
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (p: Payment) => {
    setSelected(p);
    setDetailLogs([]);
    setDetailCallbacks([]);
    setDetailRefunds([]);
    try {
      const [logsRes, cbRes, refundsRes] = await Promise.all([
        api.get(`/v1/admin/payments/${p.id}/logs`),
        api.get(`/v1/admin/payments/${p.id}/callbacks`),
        api.get(`/v1/admin/payments/${p.id}/refunds`),
      ]);
      setDetailLogs(logsRes.data.data?.logs || []);
      setDetailCallbacks(cbRes.data.data?.callbacks || []);
      setDetailRefunds(refundsRes.data.data?.refunds || []);
    } catch (err) {
      console.error('Failed to load detail:', err);
    }
  };

  const handleRetryCallback = async (paymentId: number) => {
    try {
      await api.post(`/v1/admin/payments/${paymentId}/retry-callback`);
      if (selected?.id === paymentId) openDetail(selected);
    } catch (err) {
      console.error('Retry callback failed:', err);
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Total', value: stats.total, color: 'text-gray-900' },
      { label: 'Paid', value: stats.paid, color: 'text-emerald-600' },
      { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
      { label: 'Failed', value: stats.failed, color: 'text-red-600' },
      { label: 'Paid Volume', value: `Rp ${stats.paidVolume.toLocaleString('id-ID')}`, color: 'text-indigo-600' },
    ];
  }, [stats]);

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-1 text-sm">Monitor and manage all payment transactions.</p>
        </div>
        <button onClick={() => { fetchPayments(); fetchStats(); }} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {statCards.map((s) => (
            <div key={s.label} className="card p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search paymentId / referenceId"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchPayments())}
              className="input-field pl-9"
            />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input-field">
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Expired">Expired</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Failed">Failed</option>
            <option value="Refunded">Refunded</option>
            <option value="Partial_Refund">Partial Refund</option>
          </select>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="input-field">
            <option value="">All types</option>
            <option value="VA">VA</option>
            <option value="EWALLET">E-Wallet</option>
            <option value="QRIS">QRIS</option>
            <option value="RETAIL">Retail</option>
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
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent"></div>
        </div>
      ) : payments.length === 0 ? (
        <div className="card p-12 text-center">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No payments found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Payment ID</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(p)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {p.paymentId}
                    {p.isSandbox && <span className="ml-1 text-[10px] px-1 bg-amber-100 text-amber-700 rounded">SB</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.referenceId}</td>
                  <td className="px-4 py-3 text-gray-700">{p.type} · {p.code}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.provider}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    Rp {p.totalAmount.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${STATUS_STYLES[p.status] || 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.createdAt}</td>
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
                <p className="text-xs text-gray-500 mt-0.5">{selected.type} · {selected.code} · {selected.provider}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Info label="Reference" value={selected.referenceId} mono />
                <Info label="Client ID" value={String(selected.clientId)} />
                <Info label="Status" value={selected.status} />
                <Info label="Provider Ref" value={selected.providerRef || '—'} mono />
                <Info label="Amount" value={`Rp ${selected.amount.toLocaleString('id-ID')}`} />
                <Info label="Fee" value={`Rp ${selected.fee.toLocaleString('id-ID')}`} />
                <Info label="Total" value={`Rp ${selected.totalAmount.toLocaleString('id-ID')}`} />
                <Info label="Paid Amount" value={selected.paidAmount ? `Rp ${selected.paidAmount.toLocaleString('id-ID')}` : '—'} />
                <Info label="Created" value={selected.createdAt} />
                <Info label="Expired" value={selected.expiredAt || '—'} />
                <Info label="Paid At" value={selected.paidAt || '—'} />
                <Info label="Cancelled At" value={selected.cancelledAt || '—'} />
              </div>

              {selected.paymentDetail && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Payment Detail</h3>
                  <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-x-auto">{JSON.stringify(selected.paymentDetail, null, 2)}</pre>
                </div>
              )}

              {detailRefunds.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Refunds ({detailRefunds.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr className="text-left">
                          <th className="px-3 py-2">Refund ID</th>
                          <th className="px-3 py-2">Amount</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Reason</th>
                          <th className="px-3 py-2">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {detailRefunds.map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-mono">{r.refundId}</td>
                            <td className="px-3 py-2">Rp {Number(r.amount).toLocaleString('id-ID')}</td>
                            <td className="px-3 py-2">{r.status}</td>
                            <td className="px-3 py-2 text-gray-500">{r.reason || '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{r.createdAt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {detailLogs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Provider Logs ({detailLogs.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {detailLogs.map((l, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 text-xs">
                        <div className="flex justify-between text-gray-500 mb-1">
                          <span className="font-medium">{l.action}</span>
                          <span>{l.createdAt}</span>
                        </div>
                        {l.errorMessage && <p className="text-red-600">{l.errorMessage}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailCallbacks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex justify-between">
                    <span>Client Callback Log ({detailCallbacks.length})</span>
                    <button onClick={() => handleRetryCallback(selected.id)} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                      <Repeat2 className="w-3 h-3" /> Force retry
                    </button>
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {detailCallbacks.map((cb, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 text-xs">
                        <div className="flex justify-between text-gray-500 mb-1">
                          <span className="font-medium">{cb.event}</span>
                          <span>Attempt {cb.attempt}/{cb.maxAttempts} {cb.isDelivered ? '✓' : (cb.httpStatus ? `HTTP ${cb.httpStatus}` : 'pending')}</span>
                        </div>
                        {cb.errorMessage && <p className="text-red-600">{cb.errorMessage}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
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
