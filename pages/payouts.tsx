import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Send, Search, RefreshCw, X, ChevronLeft, ChevronRight, Building2, Wallet, Route as RouteIcon, Check } from 'lucide-react';
import { getStatusStyle } from '@/lib/status';

interface Payout {
  id: number;
  payoutId: string;
  referenceId: string;
  clientId: number;
  isSandbox: boolean;
  methodType: string;
  channelCode: string;
  transferType?: string;
  provider: string;
  bankCode: string;
  bankName?: string;
  accountNumber: string;
  accountName?: string;
  sourceBankCode?: string;
  sourceAccountNumber?: string;
  amount: number;
  fee: number;
  sendAmount: number;
  totalAmount: number;
  feePaidBy: string;
  status: string;
  failedReason?: string;
  failedCode?: string;
  remark?: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  providerRef?: string;
  providerData?: any;
  callbackUrl?: string;
  callbackSent: boolean;
  callbackSentAt?: string;
  callbackAttempts: number;
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

interface PayoutRoute {
  id: number;
  methodType: string;
  provider: string;
  priority: number;
  isActive: boolean;
  isMaintenance: boolean;
  maintenanceMessage?: string;
  createdAt: string;
  updatedAt: string;
}

type Tab = 'payouts' | 'routing';

export default function Payouts() {
  const [tab, setTab] = useState<Tab>('payouts');
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState('');
  const [methodType, setMethodType] = useState('');
  const [provider, setProvider] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Payout | null>(null);
  const [callbacks, setCallbacks] = useState<any[]>([]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (status) params.status = status;
      if (methodType) params.methodType = methodType;
      if (provider) params.provider = provider;
      if (search) params.search = search;
      const { data } = await api.get('/v1/admin/payouts', { params });
      setPayouts(data.data?.payouts || []);
      setTotal(data.data?.pagination?.totalItems || 0);
    } catch (err) {
      console.error('Failed to fetch payouts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/v1/admin/payouts/stats');
      setStats(data.data || null);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    if (tab === 'payouts') fetchPayouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, methodType, provider, tab]);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (p: Payout) => {
    setSelected(p);
    setCallbacks([]);
    try {
      const { data } = await api.get(`/v1/admin/payouts/${p.id}/callbacks`);
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
    <>
      <Head><title>Payouts — GTD Admin</title></Head>
      <Layout>
      <div className="page-content">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="page-title">Payouts</h1>
          <p className="text-gray-500 mt-1 text-sm">Disbursement monitoring & provider routing across all providers.</p>
        </div>
        <button onClick={() => { fetchPayouts(); fetchStats(); }} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-100">
        <TabButton active={tab === 'payouts'} onClick={() => setTab('payouts')} icon={<Send className="w-4 h-4" />} label="Payouts" />
        <TabButton active={tab === 'routing'} onClick={() => setTab('routing')} icon={<RouteIcon className="w-4 h-4" />} label="Routing" />
      </div>

      {tab === 'routing' ? (
        <RoutingPanel />
      ) : (
      <>
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
              placeholder="Search payoutId / reference / account"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchPayouts())}
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
          <select value={methodType} onChange={(e) => { setMethodType(e.target.value); setPage(1); }} className="input-field">
            <option value="">All methods</option>
            <option value="BANK">Bank</option>
            <option value="EWALLET">E-Wallet</option>
          </select>
          <select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} className="input-field">
            <option value="">All providers</option>
            <option value="pakailink">Pakailink</option>
            <option value="dana_direct">DANA Direct</option>
            <option value="bnc_direct">BNC Direct</option>
            <option value="bri_direct">BRI Direct</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      ) : payouts.length === 0 ? (
        <div className="card p-12 text-center">
          <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No payouts found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Payout ID</th>
                <th className="px-4 py-3">Beneficiary</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(p)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {p.payoutId}
                    {p.isSandbox && <span className="ml-1 text-[10px] px-1 bg-amber-100 text-amber-700 rounded">SB</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-800 font-medium">{p.accountName || '—'}</div>
                    <div className="text-xs text-gray-500 font-mono">{p.channelCode} · {p.accountNumber}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${p.methodType === 'EWALLET' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                      {p.methodType === 'EWALLET' ? 'E-Wallet' : 'Bank'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.provider}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    Rp {p.totalAmount.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${getStatusStyle(p.status)}`}>
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
      </>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selected.payoutId}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selected.methodType} · {selected.provider}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              <div className="rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  {selected.methodType === 'EWALLET'
                    ? <Wallet className="w-5 h-5 text-purple-600" />
                    : <Building2 className="w-5 h-5 text-blue-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{selected.accountName || '—'}</p>
                  <p className="text-xs text-gray-500 font-mono">{selected.bankName || selected.channelCode} · {selected.accountNumber}</p>
                </div>
                <span className={`badge ${getStatusStyle(selected.status)}`}>
                  {selected.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Info label="Reference" value={selected.referenceId} mono />
                <Info label="Client ID" value={String(selected.clientId)} />
                <Info label="Fee Paid By" value={selected.feePaidBy} />
                <Info label="Provider Ref" value={selected.providerRef || '—'} mono />
                <Info label="Amount" value={`Rp ${selected.amount.toLocaleString('id-ID')}`} />
                <Info label="Fee" value={`Rp ${selected.fee.toLocaleString('id-ID')}`} />
                <Info label="Sent to Provider" value={`Rp ${selected.sendAmount.toLocaleString('id-ID')}`} />
                <Info label="Total Debited" value={`Rp ${selected.totalAmount.toLocaleString('id-ID')}`} />
                <Info label="Description" value={selected.description || '—'} />
                <Info label="Customer" value={selected.customerName || '—'} />
                <Info label="Created" value={selected.createdAt} />
                <Info label="Completed" value={selected.completedAt || '—'} />
                <Info label="Failed At" value={selected.failedAt || '—'} />
                <Info label="Callbacks" value={`${selected.callbackSent ? (selected.callbackSentAt || 'sent') : 'not sent'} (${selected.callbackAttempts})`} />
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
      </div>
    </Layout>
    </>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon} {label}
    </button>
  );
}

function RoutingPanel() {
  const [routes, setRoutes] = useState<PayoutRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PayoutRoute | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/v1/admin/payouts/routes');
      setRoutes(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error('Failed to fetch routes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutes(); }, []);

  const toggleField = async (route: PayoutRoute, field: 'isActive' | 'isMaintenance') => {
    const next = !route[field];
    setRoutes((prev) => prev.map((r) => (r.id === route.id ? { ...r, [field]: next } : r)));
    try {
      await api.put(`/v1/admin/payouts/routes/${route.id}`, { [field]: next });
    } catch (err) {
      console.error('Toggle failed:', err);
      setRoutes((prev) => prev.map((r) => (r.id === route.id ? { ...r, [field]: !next } : r)));
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/v1/admin/payouts/routes/${editing.id}`, {
        priority: editing.priority,
        isActive: editing.isActive,
        isMaintenance: editing.isMaintenance,
        maintenanceMessage: editing.maintenanceMessage || '',
      });
      setEditing(null);
      fetchRoutes();
    } catch (err) {
      console.error('Failed to update route:', err);
    } finally {
      setSaving(false);
    }
  };

  const grouped = useMemo(() => {
    const m: Record<string, PayoutRoute[]> = {};
    for (const r of routes) {
      (m[r.methodType] ||= []).push(r);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.priority - b.priority);
    return m;
  }, [routes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Provider routing per method type. Lower priority is tried first; the next active provider is used on failover.
      </p>
      {Object.keys(grouped).length === 0 ? (
        <div className="card p-12 text-center">
          <RouteIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No routes configured.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([mt, rs]) => (
          <div key={mt} className="card overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              {mt === 'EWALLET' ? <Wallet className="w-4 h-4 text-purple-600" /> : <Building2 className="w-4 h-4 text-blue-600" />}
              <span className="text-sm font-semibold text-gray-700">{mt === 'EWALLET' ? 'E-Wallet' : 'Bank'} Routing</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-4 py-2.5">Priority</th>
                  <th className="px-4 py-2.5">Provider</th>
                  <th className="px-4 py-2.5 text-center">Active</th>
                  <th className="px-4 py-2.5 text-center">Maintenance</th>
                  <th className="px-4 py-2.5">Note</th>
                  <th className="px-4 py-2.5 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rs.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-700">{r.priority}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.provider}</td>
                    <td className="px-4 py-3 text-center">
                      <Toggle checked={r.isActive} onClick={() => toggleField(r, 'isActive')} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Toggle checked={r.isMaintenance} onClick={() => toggleField(r, 'isMaintenance')} amber />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.maintenanceMessage || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditing({ ...r })}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{editing.provider}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{editing.methodType} routing</p>
              </div>
              <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority (lower = preferred)</label>
                <input
                  type="number"
                  value={editing.priority}
                  onChange={(e) => setEditing({ ...editing, priority: parseInt(e.target.value || '0', 10) })}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <CheckboxRow label="Active" checked={editing.isActive} onChange={(v) => setEditing({ ...editing, isActive: v })} />
                <CheckboxRow label="Maintenance" checked={editing.isMaintenance} onChange={(v) => setEditing({ ...editing, isMaintenance: v })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Maintenance Message</label>
                <input
                  type="text"
                  value={editing.maintenanceMessage || ''}
                  onChange={(e) => setEditing({ ...editing, maintenanceMessage: e.target.value })}
                  className="input-field"
                  placeholder="optional"
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2">
                {saving ? 'Saving...' : (<><Check className="w-4 h-4" /> Save</>)}
              </button>
              <button onClick={() => setEditing(null)} className="flex-1 btn-secondary py-2.5">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onClick, amber = false }: { checked: boolean; onClick: () => void; amber?: boolean }) {
  const onColor = amber ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? onColor : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  );
}

function CheckboxRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
      checked ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
    }`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded" />
      <span className={`text-sm font-medium ${checked ? 'text-emerald-700' : 'text-gray-700'}`}>{label}</span>
    </label>
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
