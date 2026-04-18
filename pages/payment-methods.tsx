import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Wallet, Edit, X, Check, AlertCircle } from 'lucide-react';

interface PaymentMethod {
  id: number;
  type: string;
  code: string;
  name: string;
  provider: string;
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

const PROVIDERS = ['pakailink', 'dana_direct', 'midtrans', 'xendit', 'bca_direct', 'bni_direct', 'mandiri_direct', 'bri_direct'];

export default function PaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [instructionText, setInstructionText] = useState('');
  const [instructionError, setInstructionError] = useState('');
  const [saving, setSaving] = useState(false);

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

  const grouped = methods.reduce<Record<string, PaymentMethod[]>>((acc, m) => {
    (acc[m.type] = acc[m.type] || []).push(m);
    return acc;
  }, {});

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
        <p className="text-gray-500 mt-1 text-sm">Configure provider, fees, and availability per method.</p>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="card p-12 text-center">
          <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No payment methods configured.</p>
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
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                          {m.provider}
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
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
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
    </Layout>
  );
}
