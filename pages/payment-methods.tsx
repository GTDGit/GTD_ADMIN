import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Wallet, Edit, X, Check, AlertCircle, Search } from 'lucide-react';

interface PaymentMethod {
  id: number;
  type: string;
  code: string;
  name: string;
  provider: string;
  providerDisplayName?: string;
  feeType: 'flat' | 'percent';
  feeFlat: number;
  feePercent: number;
  feeMin: number;
  feeMax: number;
  minAmount: number;
  maxAmount: number;
  expiredDuration: number;
  displayOrder: number;
  isActive: boolean;
  isMaintenance: boolean;
  maintenanceMessage?: string;
  paymentInstruction?: any;
}

// Canonical provider list — pulled dynamically from the DB via usedProviders.
// The display name shown in the dropdown uses providerDisplayName from the DB row.
const PROVIDER_VALUES = ['pakailink', 'dana_direct', 'midtrans', 'xendit', 'ovo_direct', 'bca_direct', 'bni_direct', 'mandiri_direct', 'bri_direct', 'bnc_direct'];

function providerLabel(provider: string): string {
  const map: Record<string, string> = {
    pakailink: 'Pakailink',
    dana_direct: 'Dana',
    midtrans: 'Midtrans',
    xendit: 'Xendit',
    ovo_direct: 'OVO',
    bca_direct: 'BCA Direct',
    bni_direct: 'BNI Direct',
    mandiri_direct: 'Mandiri Direct',
    bri_direct: 'BRI Direct',
    bnc_direct: 'BNC Direct',
  };
  return map[provider] ?? provider;
}

export default function PaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [instructionText, setInstructionText] = useState('');
  const [instructionError, setInstructionError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'maintenance'>('all');

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    try {
      const { data } = await api.get('/v1/admin/payment-methods');
      setMethods(data.data?.methods || data.data || []);
    } catch (err) {
      console.error('Failed to fetch payment methods:', err);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (m: PaymentMethod) => {
    setEditing({ ...m });
    setInstructionText(
      m.paymentInstruction ? JSON.stringify(m.paymentInstruction, null, 2) : ''
    );
    setInstructionError('');
  };

  const handleSave = async () => {
    if (!editing) return;
    let instructionPayload: any = null;
    if (instructionText.trim()) {
      try {
        instructionPayload = JSON.parse(instructionText);
      } catch (err) {
        setInstructionError('Invalid JSON');
        return;
      }
    }
    setSaving(true);
    try {
      await api.put(`/v1/admin/payment-methods/${editing.id}`, {
        provider: editing.provider,
        feeType: editing.feeType,
        feeFlat: editing.feeFlat,
        feePercent: editing.feePercent,
        feeMin: editing.feeMin,
        feeMax: editing.feeMax,
        minAmount: editing.minAmount,
        maxAmount: editing.maxAmount,
        expiredDuration: editing.expiredDuration,
        displayOrder: editing.displayOrder,
        isActive: editing.isActive,
        isMaintenance: editing.isMaintenance,
        maintenanceMessage: editing.maintenanceMessage,
        paymentInstruction: instructionPayload,
      });
      setEditing(null);
      fetchMethods();
    } catch (err) {
      console.error('Failed to update method:', err);
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => ({
    total: methods.length,
    active: methods.filter((m) => m.isActive && !m.isMaintenance).length,
    maintenance: methods.filter((m) => m.isMaintenance).length,
    inactive: methods.filter((m) => !m.isActive).length,
  }), [methods]);

  const filtered = useMemo(() => {
    return methods.filter((m) => {
      if (providerFilter !== 'all' && m.provider !== providerFilter) return false;
      if (statusFilter === 'active' && (!m.isActive || m.isMaintenance)) return false;
      if (statusFilter === 'inactive' && m.isActive) return false;
      if (statusFilter === 'maintenance' && !m.isMaintenance) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          m.code.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.type.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [methods, search, providerFilter, statusFilter]);

  const grouped = filtered.reduce<Record<string, PaymentMethod[]>>((acc, m) => {
    (acc[m.type] = acc[m.type] || []).push(m);
    return acc;
  }, {});

  const usedProviders = useMemo(() => {
    const set = new Set(methods.map((m) => m.provider));
    return Array.from(set).sort();
  }, [methods]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head><title>Payment Methods — GTD Admin</title></Head>
      <Layout>
      <div className="page-content">
      <div className="mb-6">
        <h1 className="page-title">Payment Methods</h1>
        <p className="text-gray-500 mt-1 text-sm">Configure provider, fees, and availability per method.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={stats.total} color="text-gray-900" />
        <StatCard label="Active" value={stats.active} color="text-emerald-600" />
        <StatCard label="Maintenance" value={stats.maintenance} color="text-amber-600" />
        <StatCard label="Inactive" value={stats.inactive} color="text-gray-500" />
      </div>

      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search code / name / type"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All providers</option>
            {usedProviders.map((p) => (
              <option key={p} value={p}>{providerLabel(p)}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="input-field"
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="card p-12 text-center">
          <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No payment methods match your filter.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([type, items]) => (
          <div key={type} className="mb-8">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">{type}</h2>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Fee</th>
                    <th className="px-4 py-3">Amount Range</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-gray-700">{m.code}</td>
                      <td className="px-4 py-3 text-gray-900">{m.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          {m.providerDisplayName || providerLabel(m.provider)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {m.feeType === 'flat'
                          ? `Rp ${m.feeFlat.toLocaleString('id-ID')}`
                          : `${m.feePercent}%${m.feeMin ? ` (min ${m.feeMin})` : ''}${m.feeMax ? ` (max ${m.feeMax})` : ''}`}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {m.minAmount.toLocaleString('id-ID')} – {m.maxAmount.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3">
                        {m.isMaintenance ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs">
                            <AlertCircle className="w-3 h-3" /> Maintenance
                          </span>
                        ) : m.isActive ? (
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs">Active</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(m)}
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
          </div>
        ))
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Edit {editing.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{editing.type} · {editing.code}</p>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Provider</label>
                <select
                  value={editing.provider}
                  onChange={(e) => setEditing({ ...editing, provider: e.target.value })}
                  className="input-field"
                >
                  {PROVIDER_VALUES.map((p) => (
                    <option key={p} value={p}>{providerLabel(p)}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Fee Type</label>
                  <select
                    value={editing.feeType}
                    onChange={(e) => setEditing({ ...editing, feeType: e.target.value as 'flat' | 'percent' })}
                    className="input-field"
                  >
                    <option value="flat">Flat</option>
                    <option value="percent">Percent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {editing.feeType === 'flat' ? 'Fee (Rp)' : 'Fee (%)'}
                  </label>
                  <input
                    type="number"
                    value={editing.feeType === 'flat' ? editing.feeFlat : editing.feePercent}
                    onChange={(e) =>
                      editing.feeType === 'flat'
                        ? setEditing({ ...editing, feeFlat: Number(e.target.value) })
                        : setEditing({ ...editing, feePercent: Number(e.target.value) })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Fee Min (Rp)</label>
                  <input
                    type="number"
                    value={editing.feeMin}
                    onChange={(e) => setEditing({ ...editing, feeMin: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Fee Max (Rp)</label>
                  <input
                    type="number"
                    value={editing.feeMax}
                    onChange={(e) => setEditing({ ...editing, feeMax: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Min Amount (Rp)</label>
                  <input
                    type="number"
                    value={editing.minAmount}
                    onChange={(e) => setEditing({ ...editing, minAmount: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Amount (Rp)</label>
                  <input
                    type="number"
                    value={editing.maxAmount}
                    onChange={(e) => setEditing({ ...editing, maxAmount: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Expired Duration (sec)</label>
                  <input
                    type="number"
                    value={editing.expiredDuration}
                    onChange={(e) => setEditing({ ...editing, expiredDuration: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Order</label>
                  <input
                    type="number"
                    value={editing.displayOrder}
                    onChange={(e) => setEditing({ ...editing, displayOrder: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editing.isActive}
                    onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editing.isMaintenance}
                    onChange={(e) => setEditing({ ...editing, isMaintenance: e.target.checked })}
                  />
                  <span className="text-sm text-gray-700">Maintenance</span>
                </label>
              </div>

              {editing.isMaintenance && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Maintenance Message</label>
                  <input
                    type="text"
                    value={editing.maintenanceMessage || ''}
                    onChange={(e) => setEditing({ ...editing, maintenanceMessage: e.target.value })}
                    className="input-field"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Instruction (JSON)</label>
                <textarea
                  rows={6}
                  value={instructionText}
                  onChange={(e) => {
                    setInstructionText(e.target.value);
                    setInstructionError('');
                  }}
                  className="input-field font-mono text-xs"
                  placeholder='{"steps": ["Open app", "Enter code {VA_NUMBER}"]}'
                />
                {instructionError && (
                  <p className="text-xs text-red-500 mt-1">{instructionError}</p>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
