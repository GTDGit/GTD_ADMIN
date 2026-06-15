import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { useToast } from '@/components/Toast';
import {
  fetchQRISRegistrations,
  activateQRISRegistration,
  type QRISRegistration,
  type QRISActivateBody,
} from '@/lib/api';
import {
  ClipboardList,
  RefreshCw,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getStatusStyle } from '@/lib/status';

const EMPTY_ACTIVATE: QRISActivateBody = {
  subMerchantId: '',
  storeId: '',
  terminalId: 'GERBANG01',
  qrisString: '',
};

export default function QRISRegistrationsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<QRISRegistration[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [status, setStatus] = useState('');

  const [selected, setSelected] = useState<QRISRegistration | null>(null);
  const [form, setForm] = useState<QRISActivateBody>(EMPTY_ACTIVATE);
  const [activating, setActivating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (status) params.status = status;
      const res = await fetchQRISRegistrations(params);
      setRows(res.items);
      setTotal(res.pagination.totalItems);
    } catch (err) {
      console.error('Failed to fetch QRIS registrations:', err);
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const openActivate = (r: QRISRegistration) => {
    setSelected(r);
    setForm(EMPTY_ACTIVATE);
  };

  const handleActivate = async () => {
    if (!selected) return;
    if (!form.storeId.trim()) {
      toast.error('Store ID (NMID) dari Nobu wajib diisi');
      return;
    }
    setActivating(true);
    try {
      const body: QRISActivateBody = {
        subMerchantId: form.subMerchantId?.trim() || undefined,
        storeId: form.storeId.trim(),
        terminalId: form.terminalId?.trim() || undefined,
        qrisString: form.qrisString?.trim() || undefined,
      };
      await activateQRISRegistration(selected.id, body);
      toast.success('Merchant diaktifkan & webhook dikirim ke client');
      setSelected(null);
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Gagal mengaktifkan merchant';
      toast.error(msg);
    } finally {
      setActivating(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <Head><title>QRIS Registrations — GTD Admin</title></Head>
      <Layout>
        <div className="page-content">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="page-title">QRIS Registrations</h1>
              <p className="text-gray-500 mt-1 text-sm">
                Pendaftaran merchant statis dari client. Setelah Nobu membalas dengan NMID/MID/TID, aktivasi merchant di sini.
              </p>
            </div>
            <button onClick={() => load()} className="btn-secondary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          <div className="card p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input-field">
                <option value="">All statuses</option>
                <option value="pending_batch">Pending batch</option>
                <option value="submitted">Submitted</option>
                <option value="activated">Activated</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : rows.length === 0 ? (
            <div className="card p-12 text-center">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No registrations found.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Ref</th>
                    <th className="px-4 py-3">Business</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(r)}>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.registrationRef}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{r.businessName}</td>
                      <td className="px-4 py-3 text-gray-700">{r.ownerFullName}</td>
                      <td className="px-4 py-3 text-gray-600">{r.city}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${getStatusStyle(r.status)}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{r.createdAt}</td>
                      <td className="px-4 py-3 text-right">
                        {r.status !== 'activated' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openActivate(r); }}
                            className="btn-primary py-1.5 px-3 flex items-center gap-1 ml-auto"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Activate
                          </button>
                        )}
                      </td>
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
                    <h2 className="text-lg font-semibold text-gray-900">{selected.businessName}</h2>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">{selected.registrationRef}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-5">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <Info label="Owner" value={selected.ownerFullName} />
                    <Info label="NIK" value={selected.ownerNik} mono />
                    <Info label="Phone" value={selected.ownerPhone} />
                    <Info label="Email" value={selected.email} />
                    <Info label="MCC" value={selected.mcc} mono />
                    <Info label="QRIS Type" value={selected.qrisType} />
                    <Info label="Address" value={selected.addressStreet} />
                    <Info label="City" value={selected.city} />
                    <Info label="Omzet" value={selected.omzetCategory} />
                    <Info label="Risk" value={selected.riskCategory} />
                    <Info label="Status" value={selected.status} />
                    {selected.note && <Info label="Note" value={selected.note} />}
                  </div>

                  {selected.status !== 'activated' && (
                    <div className="border-t border-gray-100 pt-4 space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">Aktivasi Merchant</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Masukkan data balasan Nobu. QR string di-generate otomatis via Nobu API; isi manual hanya bila generate gagal.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Store ID / NMID">
                          <input
                            type="text"
                            value={form.storeId}
                            onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                            placeholder="Webhook key (NMID)"
                            className="input-field font-mono"
                          />
                        </Field>
                        <Field label="Sub Merchant ID / MID">
                          <input
                            type="text"
                            value={form.subMerchantId}
                            onChange={(e) => setForm({ ...form, subMerchantId: e.target.value })}
                            placeholder="MID Nobu"
                            className="input-field font-mono"
                          />
                        </Field>
                        <Field label="Terminal ID">
                          <input
                            type="text"
                            value={form.terminalId}
                            onChange={(e) => setForm({ ...form, terminalId: e.target.value })}
                            placeholder="GERBANG01"
                            className="input-field font-mono"
                          />
                        </Field>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">
                          QRIS String (fallback manual)
                        </label>
                        <textarea
                          value={form.qrisString}
                          onChange={(e) => setForm({ ...form, qrisString: e.target.value })}
                          rows={3}
                          placeholder="Kosongkan agar di-generate via Nobu API. Isi hanya bila generate gagal."
                          className="input-field font-mono text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
                  <button onClick={() => setSelected(null)} className="btn-secondary">Close</button>
                  {selected.status !== 'activated' && (
                    <button onClick={handleActivate} disabled={activating} className="btn-primary disabled:opacity-50 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      {activating ? 'Activating…' : 'Activate Merchant'}
                    </button>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 block">{label}</label>
      {children}
    </div>
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
