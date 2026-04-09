import React, { useCallback, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { MasterItem, normalizeMasterItems } from '@/lib/product-master';
import { Plus, Edit, Trash, Tags, X } from 'lucide-react';

type Tab = 'categories' | 'brands' | 'variants';

export default function ProductMasterPage() {
  const [tab, setTab] = useState<Tab>('categories');
  const [categories, setCategories] = useState<MasterItem[]>([]);
  const [brands, setBrands] = useState<MasterItem[]>([]);
  const [variants, setVariants] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MasterItem | null>(null);
  const [form, setForm] = useState({ name: '', displayOrder: 0 });

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/v1/admin/product-master/categories');
      setCategories(normalizeMasterItems(data.data));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchBrands = useCallback(async () => {
    try {
      const { data } = await api.get('/v1/admin/product-master/brands');
      setBrands(normalizeMasterItems(data.data));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchVariants = useCallback(async () => {
    try {
      const { data } = await api.get('/v1/admin/product-master/variants');
      setVariants(normalizeMasterItems(data.data));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchBrands();
    fetchVariants();
  }, [fetchCategories, fetchBrands, fetchVariants]);

  const refresh = () => {
    fetchCategories();
    fetchBrands();
    fetchVariants();
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', displayOrder: 0 });
    setShowModal(true);
  };

  const openEdit = (item: MasterItem) => {
    setEditing(item);
    setForm({ name: item.name, displayOrder: item.displayOrder || 0 });
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
        if (editing) {
          await api.put(`${base}/variants/${editing.id}`, {
            name: form.name,
            displayOrder: form.displayOrder,
          });
        } else {
          await api.post(`${base}/variants`, {
            name: form.name,
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

  const handleDelete = async (item: MasterItem) => {
    if (!confirm(`Hapus "${item.name}"?`)) return;
    setLoading(true);
    try {
      const base = '/v1/admin/product-master';
      if (tab === 'categories') {
        await api.delete(`${base}/categories/${item.id}`);
      } else if (tab === 'brands') {
        await api.delete(`${base}/brands/${item.id}`);
      } else {
        await api.delete(`${base}/variants/${item.id}`);
      }
      refresh();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Gagal menghapus. Pastikan tidak ada produk yang menggunakan item ini.');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'categories', label: 'Kategori', count: categories.length },
    { key: 'brands', label: 'Brand', count: brands.length },
    { key: 'variants', label: 'Variants', count: variants.length },
  ];

  const list = tab === 'categories' ? categories : tab === 'brands' ? brands : variants;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kategori, Brand & Variants</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Kelola data master untuk produk. Type (Prepaid/Postpaid) tetap enum.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              tab === t.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              tab === t.key ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content card */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900">{tabs.find((t) => t.key === tab)?.label}</h2>
          <button
            onClick={openAdd}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {list.length === 0 ? (
            <div className="p-12 text-center">
              <Tags className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">Belum ada data. Klik Tambah untuk menambah.</p>
            </div>
          ) : (
            list.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm text-gray-900">{item.name}</span>
                  {item.displayOrder != null && item.displayOrder > 0 && (
                    <span className="text-xs text-gray-400">#{item.displayOrder}</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(item)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">
                {editing ? 'Edit' : 'Tambah'} {tabs.find((t) => t.key === tab)?.label}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  required
                  placeholder={tab === 'variants' ? 'e.g. Pulsa Transfer' : 'e.g. Listrik'}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary py-2.5 disabled:opacity-50"
                >
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary py-2.5"
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
