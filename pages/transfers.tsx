import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Send, Search, RefreshCw, X, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { getStatusStyle } from '@/lib/status';

interface Transfer {
  id: number;
  transferId: string;
  referenceId: string;
  clientId: number;
  isSandbox: boolean;
  transferType: string;
  provider: string;
  bankCode: string;
  bankName?: string;
  accountNumber: string;
  accountName?: string;
  sourceBankCode: string;
  sourceAccountNumber: string;
  amount: number;
  fee: number;
  totalAmount: number;
  status: string;
  failedReason?: string;
  failedCode?: string;
  remark?: string;
  providerRef?: string;
  providerData?: any;
  callbackSent: boolean;
  callbackSentAt?: string;
  createdAt: string;
  completedAt?: string;
  failedAt?: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  totalSuccess: number;
  totalProcessing: number;
  totalPending: number;
  totalFailed: number;
  totalVolume: number;
}



export default function Transfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [provider, setProvider] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Transfer | null>(null);
  const [callbacks, setCallbacks] = useState<any[]>([]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (status) params.status = status;
      if (type) params.type = type;
      if (provider) params.provider = provider;
      if (search) params.search = search;
      const { data } = await api.get('/v1/admin/transfers', { params });
      setTransfers(data.data?.transfers || []);
      setTotal(data.data?.pagination?.totalItems || 0);
    } catch (err) {
      console.error('Failed to fetch transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/v1/admin/transfers/stats');
      setStats(data.data || null);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [page, status, type, provider]);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (t: Transfer) => {
    setSelected(t);
    setCallbacks([]);
    try {
      const { data } = await api.get(`/v1/admin/transfers/${t.id}/callbacks`);
      setCallbacks(data.data || []);
    } catch (err) {
      console.error('Failed to load callbacks:', err);
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Total', value: stats.total, color: 'text-gray-900' },
      { label: 'Success', value: stats.totalSuccess, color: 'text-emerald-600' },
      { label: 'Processing', value: stats.totalProcessing, color: 'text-blue-600' },
      { label: 'Failed', value: stats.totalFailed, color: 'text-red-600' },
      { label: 'Success Volume', value: `Rp ${(stats.totalVolume || 0).toLocaleString('id-ID')}`, color: 'text-blue-600' },
    ];
  }, [stats]);

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transfers</h1>
          <p className="text-gray-500 mt-1 text-sm">Disbursement monitoring across all providers.</p>
        </div>
        <button onClick={() => { fetchTransfers(); fetchStats(); }} className="btn-secondary flex items-center gap-2">
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
              placeholder="Search transferId / reference / account"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchTransfers())}
              className="input-field pl-9"
            />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input-field">
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
          </select>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="input-field">
            <option value="">All types</option>
            <option value="INTRABANK">Intrabank</option>
            <option value="INTERBANK">Interbank</option>
          </select>
          <select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} className="input-field">
            <option value="">All providers</option>
            <option value="pakailink">Pakailink</option>
            <option value="bnc_direct">BNC Direct</option>
            <option value="bri_direct">BRI Direct</option>
            <option value="bca_direct">BCA Direct</option>
            <option value="bni_direct">BNI Direct</option>
            <option value="mandiri_direct">Mandiri Direct</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      ) : transfers.length === 0 ? (
        <div className="card p-12 text-center">
          <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No transfers found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Transfer ID</th>
                <th className="px-4 py-3">Beneficiary</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transfers.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(t)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {t.transferId}
                    {t.isSandbox && <span className="ml-1 text-[10px] px-1 bg-amber-100 text-amber-700 rounded">SB</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-800 font-medium">{t.accountName || '—'}</div>
                    <div className="text-xs text-gray-500 font-mono">{t.bankCode} · {t.accountNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{t.transferType}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{t.provider}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    Rp {t.totalAmount.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${getStatusStyle(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.createdAt}</td>
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
                <h2 className="text-lg font-semibold text-gray-900">{selected.transferId}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selected.transferType} · {selected.provider}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              <div className="rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{selected.accountName || '—'}</p>
                  <p className="text-xs text-gray-500 font-mono">{selected.bankName || selected.bankCode} · {selected.accountNumber}</p>
                </div>
                <span className={`badge ${getStatusStyle(selected.status)}`}>
                  {selected.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Info label="Reference" value={selected.referenceId} mono />
                <Info label="Client ID" value={String(selected.clientId)} />
                <Info label="Source" value={`${selected.sourceBankCode} · ${selected.sourceAccountNumber}`} mono />
                <Info label="Provider Ref" value={selected.providerRef || '—'} mono />
                <Info label="Amount" value={`Rp ${selected.amount.toLocaleString('id-ID')}`} />
                <Info label="Fee" value={`Rp ${selected.fee.toLocaleString('id-ID')}`} />
                <Info label="Total" value={`Rp ${selected.totalAmount.toLocaleString('id-ID')}`} />
                <Info label="Remark" value={selected.remark || '—'} />
                <Info label="Created" value={selected.createdAt} />
                <Info label="Completed" value={selected.completedAt || '—'} />
                <Info label="Failed At" value={selected.failedAt || '—'} />
                <Info label="Callback Sent" value={selected.callbackSent ? (selected.callbackSentAt || 'yes') : 'no'} />
              </div>

              {selected.failedReason && (
                <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Failure</p>
                  <p className="text-sm text-red-800">{selected.failedReason}</p>
                  {selected.failedCode && <p className="text-xs text-red-600 mt-1 font-mono">{selected.failedCode}</p>}
                </div>
              )}

              {selected.providerData && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Provider Data</h3>
                  <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-x-auto">{JSON.stringify(selected.providerData, null, 2)}</pre>
                </div>
              )}

              {callbacks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Provider Callbacks ({callbacks.length})</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {callbacks.map((cb, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 text-xs">
                        <div className="flex justify-between text-gray-500 mb-1">
                          <span className="font-medium">{cb.provider} {cb.status ? `· ${cb.status}` : ''}</span>
                          <span>{cb.createdAt}</span>
                        </div>
                        <div className="flex gap-2 text-[11px]">
                          <span className={cb.isValidSignature ? 'text-emerald-600' : 'text-red-600'}>
                            {cb.isValidSignature ? '✓ signature' : '✗ signature'}
                          </span>
                          <span className={cb.isProcessed ? 'text-emerald-600' : 'text-gray-500'}>
                            {cb.isProcessed ? '✓ processed' : 'pending'}
                          </span>
                        </div>
                        {cb.processError && <p className="text-red-600 mt-1">{cb.processError}</p>}
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
