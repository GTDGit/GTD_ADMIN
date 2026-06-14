import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { useToast } from '@/components/Toast';
import {
  fetchQRISPayments,
  type QRISPayment,
} from '@/lib/api';
import {
  CreditCard,
  Search,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getStatusStyle } from '@/lib/status';

function amount(v?: number): string {
  if (v === undefined || v === null) return '—';
  return `Rp ${v.toLocaleString('id-ID')}`;
}

export default function QRISPaymentsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<QRISPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [provider, setProvider] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selected, setSelected] = useState<QRISPayment | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (provider) params.provider = provider;
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await fetchQRISPayments(params);
      setRows(res.items);
      setTotal(res.pagination.totalItems);
    } catch (err) {
      console.error('Failed to fetch QRIS payments:', err);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, provider, startDate, endDate]);

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <Head><title>QRIS Payments — GTD Admin</title></Head>
      <Layout>
        <div className="page-content">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="page-title">QRIS Payments</h1>
              <p className="text-gray-500 mt-1 text-sm">
                Successful static-QRIS payments received via provider webhooks (Pakailink &amp; Nobu).
              </p>
            </div>
            <button onClick={() => load()} className="btn-secondary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          <div className="card p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ref / RRN / payer"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
                  className="input-field pl-9"
                />
              </div>
              <select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(1); }} className="input-field">
                <option value="">All providers</option>
                <option value="pakailink">Pakailink</option>
                <option value="nobu">Nobu</option>
              </select>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="input-field"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="input-field"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : rows.length === 0 ? (
            <div className="card p-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No payments found.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Reference No</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Store ID</th>
                    <th className="px-4 py-3">Payer</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Paid At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(p)}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{p.referenceNo}</td>
                      <td className="px-4 py-3">
                        <span className="badge bg-gray-100 text-gray-700 capitalize">{p.provider}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.storeId}</td>
                      <td className="px-4 py-3 text-gray-700">{p.payerName || '—'}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{amount(p.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${getStatusStyle(p.status)}`}>{p.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.paidAt || p.createdAt}</td>
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
              <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{selected.referenceNo}</h2>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">{selected.provider}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <Info label="Amount" value={amount(selected.amount)} />
                    <Info label="Status" value={selected.status} />
                    <Info label="Fee" value={amount(selected.feeAmount)} />
                    <Info label="Nett" value={amount(selected.nettAmount)} />
                    <Info label="Store ID" value={selected.storeId} mono />
                    <Info label="Terminal ID" value={selected.terminalId || '—'} mono />
                    <Info label="RRN" value={selected.rrn || '—'} mono />
                    <Info label="Payment Ref No" value={selected.paymentReferenceNo || '—'} mono />
                    <Info label="Partner Ref No" value={selected.partnerReferenceNo || '—'} mono />
                    <Info label="Issuer ID" value={selected.issuerId || '—'} mono />
                    <Info label="Payer Name" value={selected.payerName || '—'} />
                    <Info label="Payer Phone" value={selected.payerPhone || '—'} />
                    <Info label="Paid At" value={selected.paidAt || '—'} />
                    <Info label="Created" value={selected.createdAt} />
                  </div>
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
