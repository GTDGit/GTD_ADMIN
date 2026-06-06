import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Building2, Edit, X, Check, Search } from 'lucide-react';

interface BankCode {
  id: number;
  code: string;
  shortName: string;
  name: string;
  swiftCode?: string | null;
  support_va: boolean;
  support_disbursement: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'enabled' | 'disabled';

export default function DisbursementMethods() {
  const [banks, setBanks] = useState<BankCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<BankCode | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/v1/admin/bank-codes');
      setBanks(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error('Failed to fetch banks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.put(`/v1/admin/bank-codes/${editing.id}`, {
        shortName: editing.shortName,
        name: editing.name,
        swiftCode: editing.swiftCode || '',
        supportDisbursement: editing.support_disbursement,
        isActive: editing.is_active,
      });
      setEditing(null);
      fetchBanks();
    } catch (err) {
      console.error('Failed to update bank:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleField = async (bank: BankCode, field: 'support_disbursement' | 'is_active') => {
    const next = !bank[field];
    setBanks((prev) => prev.map((b) => (b.id === bank.id ? { ...b, [field]: next } : b)));
    try {
      const payload: any = {};
      if (field === 'support_disbursement') payload.supportDisbursement = next;
      if (field === 'is_active') payload.isActive = next;
      await api.put(`/v1/admin/bank-codes/${bank.id}`, payload);
    } catch (err) {
      console.error('Toggle failed:', err);
      setBanks((prev) => prev.map((b) => (b.id === bank.id ? { ...b, [field]: !next } : b)));
    }
  };

  const filtered = useMemo(() => {
    return banks.filter((b) => {
      if (filter === 'active' && !b.is_active) return false;
      if (filter === 'inactive' && b.is_active) return false;
      if (filter === 'enabled' && !b.support_disbursement) return false;
      if (filter === 'disabled' && b.support_disbursement) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          b.code.toLowerCase().includes(q) ||
          b.shortName.toLowerCase().includes(q) ||
          b.name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [banks, search, filter]);

  const stats = useMemo(() => {
    const enabled = banks.filter((b) => b.support_disbursement && b.is_active).length;
    return {
      total: banks.length,
      active: banks.filter((b) => b.is_active).length,
      enabled,
      inactive: banks.filter((b) => !b.is_active).length,
    };
  }, [banks]);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Disbursement Methods</h1>
        <p className="text-gray-500 mt-1 text-sm">Daftar bank yang melayani disbursement (transfer keluar).</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Banks" value={stats.total} color="text-gray-900" />
        <StatCard label="Active" value={stats.active} color="text-emerald-600" />
        <StatCard label="Disbursement Enabled" value={stats.enabled} color="text-blue-600" />
        <StatCard label="Inactive" value={stats.inactive} color="text-gray-500" />
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
          <select value={filter} onChange={(e) => setFilter(e.target.value as StatusFilter)} className="input-field md:col-span-2">
            <option value="all">All banks</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
            <option value="enabled">Disbursement enabled</option>
            <option value="disabled">Disbursement disabled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No banks match your filter.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SWIFT</th>
                <th className="px-4 py-3 text-center">Disbursement</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-700">{b.code}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900 font-medium">{b.shortName}</div>
                    <div className="text-xs text-gray-500">{b.name}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.swiftCode || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Toggle checked={b.support_disbursement} onClick={() => toggleField(b, 'support_disbursement')} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge active={b.is_active} onClick={() => toggleField(b, 'is_active')} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing({ ...b })}
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
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Edit {editing.shortName}</h2>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{editing.code}</p>
              </div>
              <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Short Name</label>
                <input
                  type="text"
                  value={editing.shortName}
                  onChange={(e) => setEditing({ ...editing, shortName: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">SWIFT Code</label>
                <input
                  type="text"
                  value={editing.swiftCode || ''}
                  onChange={(e) => setEditing({ ...editing, swiftCode: e.target.value })}
                  className="input-field font-mono"
                  placeholder="optional"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <CheckboxRow
                  label="Disbursement"
                  checked={editing.support_disbursement}
                  onChange={(v) => setEditing({ ...editing, support_disbursement: v })}
                />
                <CheckboxRow
                  label="Active"
                  checked={editing.is_active}
                  onChange={(v) => setEditing({ ...editing, is_active: v })}
                />
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function Toggle({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-emerald-500' : 'bg-gray-200'
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
