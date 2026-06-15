import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Banknote, Edit, X, Check, Search } from 'lucide-react';

interface PayoutMethod {
  id: number;
  methodType: 'BANK' | 'EWALLET';
  code: string;
  name: string;
  feeType: string;
  feeFlat: number;
  feePercent: number;
  feeMin: number;
  feeMax: number;
  minAmount: number;
  maxAmount: number;
  logoUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
  isMaintenance: boolean;
  maintenanceMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

type TypeFilter = 'all' | 'BANK' | 'EWALLET';

export default function PayoutMethods() {
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TypeFilter>('all');
  const [editing, setEditing] = useState<PayoutMethod | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/v1/admin/payout-methods');
      const list = data?.data?.methods;
      setMethods(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch payout methods:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/v1/admin/payout-methods/${editing.id}`, {
        name: editing.name,
        feeType: editing.feeType,
        feeFlat: editing.feeFlat,
        feePercent: editing.feePercent,
        feeMin: editing.feeMin,
        feeMax: editing.feeMax,
        minAmount: editing.minAmount,
        maxAmount: editing.maxAmount,
        logoUrl: editing.logoUrl || '',
        displayOrder: editing.displayOrder,
        isActive: editing.isActive,
        isMaintenance: editing.isMaintenance,
        maintenanceMessage: editing.maintenanceMessage || '',
      });
      setEditing(null);
      fetchMethods();
    } catch (err) {
      console.error('Failed to update payout method:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleField = async (m: PayoutMethod, field: 'isActive' | 'isMaintenance') => {
    const next = !m[field];
    setMethods((prev) => prev.map((x) => (x.id === m.id ? { ...x, [field]: next } : x)));
    try {
      const payload: any = {};
      payload[field] = next;
      await api.put(`/v1/admin/payout-methods/${m.id}`, payload);
    } catch (err) {
      console.error('Toggle failed:', err);
      setMethods((prev) => prev.map((x) => (x.id === m.id ? { ...x, [field]: !next } : x)));
    }
  };

  const filtered = useMemo(() => {
    return methods.filter((m) => {
      if (filter !== 'all' && m.methodType !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [methods, search, filter]);

  const stats = useMemo(() => {
    return {
      total: methods.length,
      bank: methods.filter((m) => m.methodType === 'BANK').length,
      ewallet: methods.filter((m) => m.methodType === 'EWALLET').length,
      active: methods.filter((m) => m.isActive).length,
    };
  }, [methods]);

  return (
    <>
      <Head><title>Payout Fees — GTD Admin</title></Head>
      <Layout>
      <div className="page-content">
      <div className="mb-6">
        <h1 className="page-title">Payout Fees</h1>
        <p className="text-gray-500 mt-1 text-sm">Konfigurasi fee dan batas amount per channel payout (BANK pakai baris DEFAULT, e-wallet per channel).</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Channels" value={stats.total} color="text-gray-900" />
        <StatCard label="Bank" value={stats.bank} color="text-blue-600" />
        <StatCard label="E-Wallet" value={stats.ewallet} color="text-purple-600" />
        <StatCard label="Active" value={stats.active} color="text-emerald-600" />
      </div>

      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search code / name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value as TypeFilter)} className="input-field md:col-span-2">
            <option value="all">All types</option>
            <option value="BANK">Bank only</option>
            <option value="EWALLET">E-Wallet only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Banknote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No payout methods match your filter.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3 text-right">Fee</th>
                <th className="px-4 py-3 text-right">Min Amount</th>
                <th className="px-4 py-3 text-right">Max Amount</th>
                <th className="px-4 py-3 text-center">Maintenance</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      m.methodType === 'BANK' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                    }`}>{m.methodType}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-700">{m.code}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{m.name}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatFee(m)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">{formatRupiah(m.minAmount)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-500">{m.maxAmount > 0 ? formatRupiah(m.maxAmount) : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Toggle checked={m.isMaintenance} onClick={() => toggleField(m, 'isMaintenance')} danger />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge active={m.isActive} onClick={() => toggleField(m, 'isActive')} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing({ ...m })}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Edit {editing.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{editing.methodType} / {editing.code}</p>
              </div>
              <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Fee Type</label>
                  <select
                    value={editing.feeType}
                    onChange={(e) => setEditing({ ...editing, feeType: e.target.value })}
                    className="input-field"
                  >
                    <option value="flat">flat</option>
                    <option value="percent">percent</option>
                    <option value="mixed">mixed</option>
                  </select>
                </div>
                <NumberField label="Fee Flat (Rp)" value={editing.feeFlat} onChange={(v) => setEditing({ ...editing, feeFlat: v })} />
                <NumberField label="Fee Percent (%)" value={editing.feePercent} onChange={(v) => setEditing({ ...editing, feePercent: v })} step="0.01" />
                <NumberField label="Display Order" value={editing.displayOrder} onChange={(v) => setEditing({ ...editing, displayOrder: v })} />
                <NumberField label="Fee Min (Rp)" value={editing.feeMin} onChange={(v) => setEditing({ ...editing, feeMin: v })} />
                <NumberField label="Fee Max (Rp)" value={editing.feeMax} onChange={(v) => setEditing({ ...editing, feeMax: v })} />
                <NumberField label="Min Amount (Rp)" value={editing.minAmount} onChange={(v) => setEditing({ ...editing, minAmount: v })} />
                <NumberField label="Max Amount (Rp)" value={editing.maxAmount} onChange={(v) => setEditing({ ...editing, maxAmount: v })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo URL</label>
                <input
                  type="text"
                  value={editing.logoUrl || ''}
                  onChange={(e) => setEditing({ ...editing, logoUrl: e.target.value })}
                  className="input-field font-mono text-xs"
                  placeholder="optional"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <CheckboxRow
                  label="Active"
                  checked={editing.isActive}
                  onChange={(v) => setEditing({ ...editing, isActive: v })}
                />
                <CheckboxRow
                  label="Maintenance"
                  checked={editing.isMaintenance}
                  onChange={(v) => setEditing({ ...editing, isMaintenance: v })}
                />
              </div>
              {editing.isMaintenance && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Maintenance Message</label>
                  <input
                    type="text"
                    value={editing.maintenanceMessage || ''}
                    onChange={(e) => setEditing({ ...editing, maintenanceMessage: e.target.value })}
                    className="input-field"
                    placeholder="Shown to clients while disabled"
                  />
                </div>
              )}
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
              <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2">
                {saving ? 'Saving...' : (<><Check className="w-4 h-4" /> Save</>)}
              </button>
              <button onClick={() => setEditing(null)} className="flex-1 btn-secondary py-2.5">
                Cancel
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

function formatRupiah(v: number): string {
  return 'Rp' + (v || 0).toLocaleString('id-ID');
}

function formatFee(m: PayoutMethod): string {
  const parts: string[] = [];
  if (m.feeFlat > 0) parts.push(formatRupiah(m.feeFlat));
  if (m.feePercent > 0) parts.push(`${m.feePercent}%`);
  return parts.length ? parts.join(' + ') : '—';
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function NumberField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type="number"
        step={step || '1'}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input-field font-mono"
      />
    </div>
  );
}

function Toggle({ checked, onClick, danger }: { checked: boolean; onClick: () => void; danger?: boolean }) {
  const onColor = danger ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? onColor : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function StatusBadge({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </button>
  );
}

function CheckboxRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
      checked ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-white'
    }`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded"
      />
      <span className={`text-sm font-medium ${checked ? 'text-emerald-700' : 'text-gray-700'}`}>{label}</span>
    </label>
  );
}
