import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { useToast } from '@/components/Toast';
import {
  fetchPaymentMethods,
  updatePaymentMethod,
  updateMethodProviders,
  type AdminPaymentMethod,
  type ProviderBinding,
  type BindingUpdate,
} from '@/lib/api';
import {
  Wallet,
  Edit,
  X,
  Check,
  AlertCircle,
  Search,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Canonical provider display names. The set of providers shown per method comes
// from the method's `providers` bindings (the Method_Provider_Mapping).
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

// A single draggable provider binding row. Drag handle on the left reorders the
// list (priority). The order badge reflects the live list position (1-based).
function SortableBindingRow({
  binding,
  index,
  updateBinding,
}: {
  binding: BindingUpdate;
  index: number;
  updateBinding: (provider: string, patch: Partial<BindingUpdate>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: binding.provider });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-200 rounded-lg p-3 bg-white ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1 text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-500 rounded text-xs font-semibold">
            {index + 1}
          </span>
          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
            {providerLabel(binding.provider)}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mt-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={binding.isActive}
            onChange={(e) => updateBinding(binding.provider, { isActive: e.target.checked })}
          />
          <span className="text-sm text-gray-700">Active</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={binding.isMaintenance}
            onChange={(e) => updateBinding(binding.provider, { isMaintenance: e.target.checked })}
          />
          <span className="text-sm text-gray-700">Maintenance</span>
        </label>
      </div>
      {binding.isMaintenance && (
        <input
          type="text"
          value={binding.maintenanceMessage || ''}
          onChange={(e) => updateBinding(binding.provider, { maintenanceMessage: e.target.value })}
          className="input-field mt-2 text-sm"
          placeholder="Maintenance message (optional)"
        />
      )}
    </div>
  );
}

export default function PaymentMethods() {
  const toast = useToast();
  const [methods, setMethods] = useState<AdminPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminPaymentMethod | null>(null);
  const [bindings, setBindings] = useState<BindingUpdate[]>([]);
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
      const data = await fetchPaymentMethods();
      setMethods(data);
    } catch (err) {
      console.error('Failed to fetch payment methods:', err);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (m: AdminPaymentMethod) => {
    setEditing({ ...m });
    // Seed editable bindings from the method's providers, ordered by priority.
    const ordered = [...(m.providers || [])].sort((a, b) => a.priority - b.priority);
    setBindings(
      ordered.map((p) => ({
        provider: p.provider,
        priority: p.priority,
        isActive: p.isActive,
        isMaintenance: p.isMaintenance,
        maintenanceMessage: p.maintenanceMessage,
      }))
    );
    setInstructionText(
      m.paymentInstruction ? JSON.stringify(m.paymentInstruction, null, 2) : ''
    );
    setInstructionError('');
  };

  const updateBinding = (provider: string, patch: Partial<BindingUpdate>) => {
    setBindings((prev) =>
      prev.map((b) => (b.provider === provider ? { ...b, ...patch } : b))
    );
  };

  // Drag-and-drop reorder: list order = priority order (top is preferred).
  // Priorities are re-sequenced (10, 20, 30...) on save in handleSave.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setBindings((prev) => {
      const oldIndex = prev.findIndex((b) => b.provider === active.id);
      const newIndex = prev.findIndex((b) => b.provider === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
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
      // 1. Update canonical method fields.
      await updatePaymentMethod(editing.id, {
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

      // 2. Update the ordered provider bindings. Priority follows list order
      //    (lower = preferred), re-sequenced as 10, 20, 30...
      if (bindings.length > 0) {
        const payload: BindingUpdate[] = bindings.map((b, i) => ({
          provider: b.provider,
          priority: (i + 1) * 10,
          isActive: b.isActive,
          isMaintenance: b.isMaintenance,
          maintenanceMessage: b.isMaintenance ? b.maintenanceMessage : undefined,
        }));
        await updateMethodProviders(editing.type, editing.code, payload);
      }

      toast.success('Payment method updated');
      setEditing(null);
      fetchMethods();
    } catch (err) {
      console.error('Failed to update method:', err);
      toast.error('Failed to update payment method');
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

  const usedProviders = useMemo(() => {
    const set = new Set<string>();
    methods.forEach((m) => (m.providers || []).forEach((p) => set.add(p.provider)));
    return Array.from(set).sort();
  }, [methods]);

  const filtered = useMemo(() => {
    return methods.filter((m) => {
      if (providerFilter !== 'all' && !(m.providers || []).some((p) => p.provider === providerFilter)) {
        return false;
      }
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

  const grouped = filtered.reduce<Record<string, AdminPaymentMethod[]>>((acc, m) => {
    (acc[m.type] = acc[m.type] || []).push(m);
    return acc;
  }, {});

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
        <p className="text-gray-500 mt-1 text-sm">Configure fees, availability, and the ordered provider list per method.</p>
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
                    <th className="px-4 py-3">Providers</th>
                    <th className="px-4 py-3">Fee</th>
                    <th className="px-4 py-3">Amount Range</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((m) => (
                    <tr key={`${m.type}-${m.code}-${m.id}`} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-3 font-mono text-gray-700">{m.code}</td>
                      <td className="px-4 py-3 text-gray-900">{m.name}</td>
                      <td className="px-4 py-3">
                        <ProviderSubList providers={m.providers} />
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
              {/* Providers — ordered binding list (priority + per-provider toggles) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Providers <span className="text-gray-400 font-normal">(priority order — top is preferred)</span>
                </label>
                {bindings.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No providers bound to this method.</p>
                ) : (
                  <>
                    <p className="text-xs text-gray-400 mb-2">Geser baris untuk mengatur urutan — provider teratas dipakai duluan.</p>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={bindings.map((b) => b.provider)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {bindings.map((b, i) => (
                            <SortableBindingRow
                              key={b.provider}
                              binding={b}
                              index={i}
                              updateBinding={updateBinding}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </>
                )}
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

// ProviderSubList renders the ordered provider bindings for a method with a
// compact per-provider active/maintenance indicator.
function ProviderSubList({ providers }: { providers: ProviderBinding[] }) {
  const ordered = [...(providers || [])].sort((a, b) => a.priority - b.priority);
  if (ordered.length === 0) {
    return <span className="text-xs text-gray-400">No providers</span>;
  }
  return (
    <ul className="space-y-1">
      {ordered.map((p, i) => (
        <li key={p.id ?? `${p.provider}-${i}`} className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-mono w-4">{i + 1}.</span>
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
            {providerLabel(p.provider)}
          </span>
          {p.isMaintenance ? (
            <span className="inline-flex items-center gap-1 text-amber-600 text-[11px]">
              <AlertCircle className="w-3 h-3" /> Maintenance
            </span>
          ) : p.isActive ? (
            <span className="text-emerald-600 text-[11px]">Active</span>
          ) : (
            <span className="text-gray-400 text-[11px]">Inactive</span>
          )}
        </li>
      ))}
    </ul>
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
