import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { useToast } from '@/components/Toast';
import {
  fetchQRISMerchants,
  createQRISMerchant,
  updateQRISMerchant,
  requestPakailinkQR,
  type QRISMerchant,
  type QRISMerchantUpsertBody,
} from '@/lib/api';
import {
  QrCode,
  Search,
  RefreshCw,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { getStatusStyle } from '@/lib/status';

const EMPTY_FORM: QRISMerchantUpsertBody = {
  provider: 'pakailink',
  storeId: '',
  terminalId: 'GERBANG01',
  qrisString: '',
  status: 'active',
  merchantName: '',
  merchantCity: '',
};

export default function QRISMerchantsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<QRISMerchant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QRISMerchant | null>(null);
  const [form, setForm] = useState<QRISMerchantUpsertBody>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (provider) params.provider = provider;
      if (status) params.status = status;
      if (search) params.search = search;
      const res = await fetchQRISMerchants(params);
      setRows(res.items);
      setTotal(res.pagination.totalItems);
    } catch (err) {
      console.error('Failed to fetch QRIS merchants:', err);
      toast.error('Failed to load merchants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, provider, status]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (m: QRISMerchant) => {
    setEditing(m);
    setForm({
      clientId: m.clientId ?? null,
      provider: m.provider,
      storeId: m.storeId,
      terminalId: m.terminalId ?? '',
      qrisString: m.qrisString ?? '',
      status: m.status,
      merchantName: m.merchantName ?? '',
      merchantCity: m.merchantCity ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.storeId.trim()) {
      toast.error('Store ID is required');
      return;
    }
    setSaving(true);
    try {
      const body: QRISMerchantUpsertBody = { ...form, storeId: form.storeId.trim() };
      const saved = editing
        ? await updateQRISMerchant(editing.id, body)
        : await createQRISMerchant(body);
      toast.success(editing ? 'Merchant updated' : 'Merchant created');
      setEditing(saved);
      setForm((f) => ({
        ...f,
        qrisString: saved.qrisString ?? f.qrisString,
        merchantName: saved.merchantName ?? f.merchantName,
        merchantCity: saved.merchantCity ?? f.merchantCity,
        terminalId: saved.terminalId ?? f.terminalId,
      }));
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to save merchant';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Pakailink-only: request the static QR string from the provider via the api
  // proxy. Requires the merchant to already exist (it persists onto the row).
  const handleGenerate = async () => {
    if (!editing) {
      toast.error('Save the merchant first, then request the QR');
      return;
    }
    setGenerating(true);
    try {
      const updated = await requestPakailinkQR(editing.id);
      setEditing(updated);
      setForm((f) => ({
        ...f,
        qrisString: updated.qrisString ?? '',
        merchantName: updated.merchantName ?? f.merchantName,
        merchantCity: updated.merchantCity ?? f.merchantCity,
        terminalId: updated.terminalId ?? f.terminalId,
      }));
      toast.success('QRIS string generated from Pakailink');
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to request QRIS from Pakailink';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <Head><title>QRIS Merchants — GTD Admin</title></Head>
      <Layout>
        <div className="page-content">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="page-title">QRIS Merchants</h1>
              <p className="text-gray-500 mt-1 text-sm">
                Static QRIS merchant registry. Store ID is entered manually; NMID, terminal, name, and city are parsed from the QR string.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => load()} className="btn-secondary flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> New Merchant
              </button>
            </div>
          </div>

          <div className="card p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search name / store ID / NMID"
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
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input-field">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : rows.length === 0 ? (
            <div className="card p-12 text-center">
              <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No merchants found.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Merchant</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Store ID</th>
                    <th className="px-4 py-3">NMID</th>
                    <th className="px-4 py-3">Terminal</th>
                    <th className="px-4 py-3">QR</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(m)}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{m.merchantName || '—'}</div>
                        <div className="text-xs text-gray-400">{m.merchantCity || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge bg-gray-100 text-gray-700 capitalize">{m.provider}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{m.storeId}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.nmid || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.terminalId || '—'}</td>
                      <td className="px-4 py-3">
                        {m.qrisString ? (
                          <span className="badge bg-green-100 text-green-700">Set</span>
                        ) : (
                          <span className="badge bg-amber-100 text-amber-700">Empty</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${getStatusStyle(m.status)}`}>{m.status}</span>
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

          {modalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editing ? 'Edit Merchant' : 'New Merchant'}
                  </h2>
                  <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Provider">
                      <select
                        value={form.provider}
                        onChange={(e) => setForm({ ...form, provider: e.target.value })}
                        disabled={!!editing}
                        className="input-field disabled:bg-gray-50"
                      >
                        <option value="pakailink">Pakailink</option>
                        <option value="nobu">Nobu</option>
                      </select>
                    </Field>
                    <Field label="Status">
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="input-field"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </Field>
                    <Field label="Store ID (manual)">
                      <input
                        type="text"
                        value={form.storeId}
                        onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                        placeholder="Webhook identification key"
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
                    <Field label="Client ID (optional)">
                      <input
                        type="number"
                        value={form.clientId ?? ''}
                        onChange={(e) =>
                          setForm({ ...form, clientId: e.target.value ? Number(e.target.value) : null })
                        }
                        placeholder="Brand owner"
                        className="input-field"
                      />
                    </Field>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                        QRIS String
                      </label>
                      {form.provider === 'pakailink' && (
                        <button
                          onClick={handleGenerate}
                          disabled={generating || !editing}
                          title={editing ? '' : 'Save the merchant first'}
                          className="btn-secondary py-1 px-2.5 flex items-center gap-1.5 text-xs disabled:opacity-40"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          {generating ? 'Requesting…' : 'Request QRIS ke Pakailink'}
                        </button>
                      )}
                    </div>
                    <textarea
                      value={form.qrisString}
                      onChange={(e) => setForm({ ...form, qrisString: e.target.value })}
                      rows={4}
                      placeholder={
                        form.provider === 'nobu'
                          ? 'Paste the QR string from the Nobu Excel onboarding form'
                          : 'Use the button above to generate, or paste manually'
                      }
                      className="input-field font-mono text-xs"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      NMID, terminal, merchant name, and city are parsed from this string on save. Store ID is never in the QR — keep it manual.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Merchant Name (override)">
                      <input
                        type="text"
                        value={form.merchantName}
                        onChange={(e) => setForm({ ...form, merchantName: e.target.value })}
                        placeholder="Auto-parsed if blank"
                        className="input-field"
                      />
                    </Field>
                    <Field label="Merchant City (override)">
                      <input
                        type="text"
                        value={form.merchantCity}
                        onChange={(e) => setForm({ ...form, merchantCity: e.target.value })}
                        placeholder="Auto-parsed if blank"
                        className="input-field"
                      />
                    </Field>
                  </div>

                  {editing && (
                    <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 rounded-lg p-3">
                      <Info label="NMID" value={editing.nmid || '—'} />
                      <Info label="MCC" value={editing.merchantCategoryCode || '—'} />
                    </div>
                  )}
                </div>

                <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
                  <button onClick={() => setModalOpen(false)} className="btn-secondary">Close</button>
                  <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                    {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
                  </button>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-gray-800 font-mono text-xs">{value}</p>
    </div>
  );
}
