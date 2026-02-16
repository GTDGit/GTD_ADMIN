import React, { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Plus, Edit, Trash, Tags, X } from 'lucide-react';

interface MasterItem {
  id: number;
  name: string;
  displayOrder?: number;
}

interface TypeItem {
  id: number;
  name: string;
  code: string;
  displayOrder?: number;
}

type Tab = 'categories' | 'brands' | 'types';

export default function ProductMasterPage() {
  const [tab, setTab] = useState<Tab>('categories');
  const [categories, setCategories] = useState<MasterItem[]>([]);
  const [brands, setBrands] = useState<MasterItem[]>([]);
  const [types, setTypes] = useState<TypeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MasterItem | TypeItem | null>(null);
  const [form, setForm] = useState({ name: '', code: '', displayOrder: 0 });

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/v1/admin/product-master/categories');
      setCategories(data.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchBrands = useCallback(async () => {
    try {
      const { data } = await api.get('/v1/admin/product-master/brands');
      setBrands(data.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchTypes = useCallback(async () => {
    try {
      const { data } = await api.get('/v1/admin/product-master/types');
      setTypes(data.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchBrands();
    fetchTypes();
  }, [fetchCategories, fetchBrands, fetchTypes]);

  const refresh = () => {
    fetchCategories();
    fetchBrands();
    fetchTypes();
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', code: '', displayOrder: 0 });
    setShowModal(true);
  };

  const openEdit = (item: MasterItem | TypeItem) => {
    setEditing(item);
    if ('code' in item) {
      setForm({ name: item.name, code: item.code, displayOrder: item.displayOrder || 0 });
    } else {
      setForm({ name: item.name, code: '', displayOrder: item.displayOrder || 0 });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const base = '/v1/admin/product-master';
      if (tab === 'categories') {
        if (editing) {
          await api.put(`${base}/categories/${editing.id}`, {
            name: form.name,
            displayOrder: form.displayOrder,
          });
        } else {
          await api.post(`${base}/categories`, {
            name: form.name,
            displayOrder: form.displayOrder,
          });
        }
      } else if (tab === 'brands') {
        if (editing) {
          await api.put(`${base}/brands/${editing.id}`, {
            name: form.name,
            displayOrder: form.displayOrder,
          });
        } else {
          await api.post(`${base}/brands`, {
            name: form.name,
            displayOrder: form.displayOrder,
          });
        }
      } else {
        const code = form.code || form.name.toLowerCase().replace(/\s+/g, '_');
        if (editing && 'code' in editing) {
          await api.put(`${base}/types/${editing.id}`, {
            name: form.name,
            code,
            displayOrder: form.displayOrder,
          });
        } else {
          await api.post(`${base}/types`, {
            name: form.name,
            code,
            displayOrder: form.displayOrder,
          });
        }
      }
      setShowModal(false);
      refresh();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: MasterItem | TypeItem) => {
    if (!confirm(`Hapus "${'name' in item ? item.name : ''}"?`)) return;
    setLoading(true);
    try {
      const base = '/v1/admin/product-master';
      if (tab === 'categories') {
        await api.delete(`${base}/categories/${item.id}`);
      } else if (tab === 'brands') {
        await api.delete(`${base}/brands/${item.id}`);
      } else {
        await api.delete(`${base}/types/${item.id}`);
      }
      refresh();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Gagal menghapus. Pastikan tidak ada produk yang menggunakan item ini.');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'categories', label: 'Kategori' },
    { key: 'brands', label: 'Brand' },
    { key: 'types', label: 'Type' },
  ];

  const list = tab === 'categories' ? categories : tab === 'brands' ? brands : types;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kategori, Brand & Type</h1>
        <p className="text-gray-500 mt-1">Kelola data master untuk produk (dropdown di form Add Product)</p>
      </div>

      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              tab === t.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold">{tabs.find((t) => t.key === tab)?.label}</h2>
          <button
            onClick={openAdd}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {list.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Tags className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              Belum ada data. Klik Tambah untuk menambah.
            </div>
          ) : (
            list.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center px-4 py-3 hover:bg-gray-50"
              >
                <div>
                  <span className="font-medium">{item.name}</span>
                  {'code' in item && (
                    <span className="ml-2 text-xs text-gray-500 font-mono">
                      {(item as TypeItem).code}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(item)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold">
                {editing ? 'Edit' : 'Tambah'} {tabs.find((t) => t.key === tab)?.label}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  required
                  placeholder={tab === 'types' ? 'e.g. Pulsa Transfer' : 'e.g. Listrik'}
                />
              </div>
              {tab === 'types' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                    required
                    placeholder="e.g. pulsa_transfer"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: lowercase, underscore untuk spasi</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 font-medium text-sm"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
