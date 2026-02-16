import React, { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import {
  Plus,
  Edit,
  Trash,
  Package,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Server,
  X,
  Check,
  Link as LinkIcon,
} from 'lucide-react';

interface ProviderSKU {
  id: number;
  providerId: number;
  productId: number;
  providerSkuCode: string;
  providerProductName: string;
  price: number;
  admin: number;
  commission: number;
  isActive: boolean;
  isAvailable: boolean;
  providerCode: string;
  providerName: string;
}

interface Product {
  id: number;
  skuCode: string;
  name: string;
  category: string;
  brand: string;
  type: string;
  admin: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  providerCount?: number;
  minPrice?: number;
}

interface Provider {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  isBackup: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

interface Filters {
  type: string;
  category: string;
  brand: string;
  search: string;
  isActive: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    totalItems: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<Filters>({
    type: '',
    category: '',
    brand: '',
    search: '',
    isActive: '',
  });

  // Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    skuCode: '',
    name: '',
    category: '',
    brand: '',
    type: 'prepaid',
    admin: 0,
    description: '',
    isActive: true,
  });

  // Provider Mapping Modal
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingProduct, setMappingProduct] = useState<Product | null>(null);
  const [productProviderSKUs, setProductProviderSKUs] = useState<ProviderSKU[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [mappingForm, setMappingForm] = useState({
    providerId: 0,
    providerSkuCode: '',
    providerProductName: '',
    price: 0,
    admin: 0,
    commission: 0,
    isActive: true,
    isAvailable: true,
  });
  const [editingMapping, setEditingMapping] = useState<ProviderSKU | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(pagination.page));
      params.append('limit', String(pagination.limit));

      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.search) params.append('search', filters.search);
      if (filters.isActive) params.append('isActive', filters.isActive);

      const { data } = await api.get(`/v1/admin/products?${params.toString()}`);

      const productList = (data.data || []).map((p: any) => ({
        id: p.id,
        skuCode: p.skuCode,
        name: p.productName || p.name,
        category: p.category,
        brand: p.brand,
        type: p.type,
        admin: p.admin || 0,
        description: p.description || '',
        isActive: p.productStatus ?? p.isActive,
        createdAt: p.createdAt || '',
        updatedAt: p.updatedAt || '',
        providerCount: p.providerCount || 0,
        minPrice: p.minPrice || null,
      }));

      setProducts(productList);

      if (data.meta?.pagination) {
        setPagination((prev) => ({
          ...prev,
          totalItems: data.meta.pagination.totalItems,
          totalPages: data.meta.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const fetchProviders = useCallback(async () => {
    try {
      const { data } = await api.get('/v1/admin/ppob/providers');
      setProviders(data.data || []);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    }
  }, []);

  const [types, setTypes] = useState<{ code: string; name: string }[]>([]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/v1/admin/products/categories');
      setCategories(data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  const fetchBrands = useCallback(async () => {
    try {
      const { data } = await api.get('/v1/admin/products/brands');
      setBrands(data.data || []);
    } catch (error) {
      console.error('Failed to fetch brands:', error);
    }
  }, []);

  const fetchTypes = useCallback(async () => {
    try {
      const { data } = await api.get('/v1/admin/products/types');
      setTypes(data.data || []);
    } catch (error) {
      console.error('Failed to fetch types:', error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchProviders();
    fetchCategories();
    fetchBrands();
    fetchTypes();
  }, [fetchProducts, fetchProviders, fetchCategories, fetchBrands, fetchTypes]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    // If changing category, reset brand
    if (key === 'category') {
      setFilters((prev) => ({ ...prev, category: value, brand: '' }));
    } else {
      setFilters((prev) => ({ ...prev, [key]: value }));
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ type: '', category: '', brand: '', search: '', isActive: '' });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.put(`/v1/admin/products/${editingProduct.id}`, productForm);
      } else {
        await api.post('/v1/admin/products', productForm);
      }
      setShowProductModal(false);
      setEditingProduct(null);
      resetProductForm();
      fetchProducts();
    } catch (error: any) {
      console.error('Failed to save product:', error);
      alert(error.response?.data?.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Hapus produk ini? Semua mapping provider akan ikut terhapus.')) return;
    try {
      await api.delete(`/v1/admin/products/${id}`);
      fetchProducts();
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      alert(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      skuCode: product.skuCode,
      name: product.name,
      category: product.category,
      brand: product.brand,
      type: product.type,
      admin: product.admin,
      description: product.description,
      isActive: product.isActive,
    });
    setShowProductModal(true);
  };

  const resetProductForm = () => {
    setProductForm({
      skuCode: '',
      name: '',
      category: '',
      brand: '',
      type: types.length > 0 ? types[0].code : 'prepaid',
      admin: 0,
      description: '',
      isActive: true,
    });
  };

  // Provider Mapping Functions
  const openMappingModal = async (product: Product) => {
    setMappingProduct(product);
    setShowMappingModal(true);
    setLoadingMappings(true);
    setShowAddMapping(false);
    setEditingMapping(null);

    try {
      const { data } = await api.get(`/v1/admin/ppob/products/${product.id}/provider-skus`);
      setProductProviderSKUs(data.data || []);
    } catch (error) {
      console.error('Failed to fetch provider SKUs:', error);
      setProductProviderSKUs([]);
    } finally {
      setLoadingMappings(false);
    }
  };

  const resetMappingForm = () => {
    setMappingForm({
      providerId: providers.filter((p) => p.isActive)[0]?.id || 0,
      providerSkuCode: '',
      providerProductName: '',
      price: 0,
      admin: 0,
      commission: 0,
      isActive: true,
      isAvailable: true,
    });
  };

  const handleAddMappingClick = () => {
    resetMappingForm();
    setEditingMapping(null);
    setShowAddMapping(true);
  };

  const handleEditMapping = (sku: ProviderSKU) => {
    setEditingMapping(sku);
    setMappingForm({
      providerId: sku.providerId,
      providerSkuCode: sku.providerSkuCode,
      providerProductName: sku.providerProductName,
      price: sku.price,
      admin: sku.admin,
      commission: sku.commission,
      isActive: sku.isActive,
      isAvailable: sku.isAvailable,
    });
    setShowAddMapping(true);
  };

  const handleMappingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappingProduct) return;

    try {
      if (editingMapping) {
        await api.put(`/v1/admin/ppob/skus/${editingMapping.id}`, {
          providerSkuCode: mappingForm.providerSkuCode,
          providerProductName: mappingForm.providerProductName,
          price: mappingForm.price,
          admin: mappingForm.admin,
          commission: mappingForm.commission,
          isActive: mappingForm.isActive,
          isAvailable: mappingForm.isAvailable,
        });
      } else {
        await api.post(`/v1/admin/ppob/providers/${mappingForm.providerId}/skus`, {
          ...mappingForm,
          productId: mappingProduct.id,
        });
      }

      // Refresh mappings
      const { data } = await api.get(`/v1/admin/ppob/products/${mappingProduct.id}/provider-skus`);
      setProductProviderSKUs(data.data || []);
      setShowAddMapping(false);
      setEditingMapping(null);
      fetchProducts(); // Refresh provider count
    } catch (error: any) {
      console.error('Failed to save mapping:', error);
      alert(error.response?.data?.message || 'Failed to save mapping');
    }
  };

  const handleDeleteMapping = async (skuId: number) => {
    if (!confirm('Hapus mapping provider ini?')) return;
    if (!mappingProduct) return;

    try {
      await api.delete(`/v1/admin/ppob/skus/${skuId}`);
      const { data } = await api.get(`/v1/admin/ppob/products/${mappingProduct.id}/provider-skus`);
      setProductProviderSKUs(data.data || []);
      fetchProducts();
    } catch (error: any) {
      console.error('Failed to delete mapping:', error);
      alert(error.response?.data?.message || 'Failed to delete mapping');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  };

  const getProviderLabel = (code: string) => {
    const colors: Record<string, string> = {
      kiosbank: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      alterra: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      digiflazz: 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return colors[code] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-500 mt-1">Kelola produk PPOB dan mapping ke provider</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filter
              {hasActiveFilters && (
                <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {Object.values(filters).filter((v) => v !== '').length}
                </span>
              )}
            </button>
            <button
              onClick={fetchProducts}
              className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => {
                setEditingProduct(null);
                resetProductForm();
                setShowProductModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 space-y-4">
            {/* Search and Quick Filters Row */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Cari produk..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  <option value="">Semua Type</option>
                  {types.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.isActive}
                  onChange={(e) => handleFilterChange('isActive', e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  <option value="">Semua Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Category Tabs */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="border-b border-gray-200 overflow-x-auto">
                <div className="flex">
                  <button
                    onClick={() => handleFilterChange('category', '')}
                    className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                      filters.category === ''
                        ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Semua
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleFilterChange('category', cat)}
                      className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                        filters.category === cat
                          ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Pills */}
              {brands.length > 0 && (
                <div className="p-3 bg-gray-50/50 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleFilterChange('brand', '')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${
                      filters.brand === ''
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    Semua Brand
                  </button>
                  {brands.map((brand) => (
                    <button
                      key={brand}
                      onClick={() => handleFilterChange('brand', brand)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition ${
                        filters.brand === brand
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Product List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Tidak ada produk</p>
          <p className="text-sm text-gray-400 mt-1">Tambah produk untuk memulai</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Product
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Category / Brand
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Type
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Min Price
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Providers
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((product, index) => {
                    // Check if this is first product in a new category group
                    const prevProduct = index > 0 ? products[index - 1] : null;
                    const isNewCategory = !prevProduct || prevProduct.category !== product.category;
                    const isNewBrand = !prevProduct || prevProduct.brand !== product.brand || prevProduct.category !== product.category;

                    return (
                      <React.Fragment key={product.id}>
                        {isNewCategory && (
                          <tr className="bg-blue-50">
                            <td colSpan={7} className="px-4 py-2">
                              <span className="text-sm font-semibold text-blue-800">{product.category}</span>
                            </td>
                          </tr>
                        )}
                        {isNewBrand && (
                          <tr className="bg-gray-50">
                            <td colSpan={7} className="px-4 py-1.5 pl-8">
                              <span className="text-xs font-medium text-gray-600">{product.brand}</span>
                            </td>
                          </tr>
                        )}
                        <tr className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 pl-12">
                            <div>
                              <p className="font-medium text-gray-900">{product.name}</p>
                              <p className="text-xs text-gray-500 font-mono">{product.skuCode}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-400">{product.brand} / {product.category}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                product.type === 'prepaid'
                                  ? 'bg-blue-50 text-blue-700'
                                  : product.type === 'postpaid'
                                    ? 'bg-purple-50 text-purple-700'
                                    : product.type === 'reguler'
                                      ? 'bg-amber-50 text-amber-700'
                                      : product.type === 'pulsa_transfer'
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-gray-50 text-gray-700'
                              }`}
                            >
                              {product.type === 'pulsa_transfer' ? 'Pulsa Transfer' : product.type.charAt(0).toUpperCase() + product.type.slice(1).replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {product.minPrice ? (
                              <span className="text-sm font-medium text-green-600">{formatPrice(product.minPrice)}</span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => openMappingModal(product)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition ${
                                (product.providerCount || 0) > 0
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              <Server className="w-3 h-3" />
                              {product.providerCount || 0}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {product.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-50 text-green-700">
                                <Check className="w-3 h-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700">
                                <X className="w-3 h-3" />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => openMappingModal(product)}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                                title="Manage Providers"
                              >
                                <LinkIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                                title="Delete"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {(pagination.page - 1) * pagination.limit + 1} -{' '}
                {Math.min(pagination.page * pagination.limit, pagination.totalItems)} dari{' '}
                {pagination.totalItems} produk
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 px-2">
                  Page {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
            </div>
            <form onSubmit={handleProductSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU Code *</label>
                  <input
                    type="text"
                    value={productForm.skuCode}
                    onChange={(e) =>
                      setProductForm({ ...productForm, skuCode: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    required
                    placeholder="PLN-POSTPAID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={productForm.type}
                    onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    required
                  >
                    <option value="">Pilih Type</option>
                    {types.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  required
                  placeholder="PLN Pascabayar"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand *</label>
                  <select
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    required
                  >
                    <option value="">Pilih Brand</option>
                    {brands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    required
                  >
                    <option value="">Pilih Category</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {productForm.type === 'postpaid' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Fee (Rp)</label>
                  <input
                    type="number"
                    value={productForm.admin}
                    onChange={(e) => setProductForm({ ...productForm, admin: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    min={0}
                    placeholder="2500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Admin yang dibebankan ke customer (jika ada)
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  rows={2}
                  placeholder="Deskripsi produk..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="productActive"
                  checked={productForm.isActive}
                  onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="productActive" className="text-sm text-gray-700">
                  Active (dapat digunakan untuk transaksi)
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  {editingProduct ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provider Mapping Modal */}
      {showMappingModal && mappingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold">Provider Mapping</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                      {mappingProduct.skuCode}
                    </span>
                    <span className="mx-2">•</span>
                    {mappingProduct.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowMappingModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {loadingMappings ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              ) : showAddMapping ? (
                // Add/Edit Mapping Form
                <form onSubmit={handleMappingSubmit} className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">
                      {editingMapping ? 'Edit Mapping' : 'Add Provider Mapping'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddMapping(false);
                        setEditingMapping(null);
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>

                  {!editingMapping && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provider *
                      </label>
                      <select
                        value={mappingForm.providerId}
                        onChange={(e) =>
                          setMappingForm({ ...mappingForm, providerId: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        required
                      >
                        <option value={0}>Pilih Provider</option>
                        {providers
                          .filter((p) => p.isActive)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.code}) {p.isBackup && '- Backup'}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provider SKU Code *
                      </label>
                      <input
                        type="text"
                        value={mappingForm.providerSkuCode}
                        onChange={(e) =>
                          setMappingForm({ ...mappingForm, providerSkuCode: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        required
                        placeholder="PLNPOST"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provider Product Name
                      </label>
                      <input
                        type="text"
                        value={mappingForm.providerProductName}
                        onChange={(e) =>
                          setMappingForm({ ...mappingForm, providerProductName: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="PLN Pascabayar"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (Rp) - untuk Prepaid
                    </label>
                    <input
                      type="number"
                      value={mappingForm.price}
                      onChange={(e) =>
                        setMappingForm({ ...mappingForm, price: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      min={0}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Harga beli dari provider (digunakan untuk sorting prepaid)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Admin (Rp)
                      </label>
                      <input
                        type="number"
                        value={mappingForm.admin}
                        onChange={(e) =>
                          setMappingForm({ ...mappingForm, admin: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Komisi (Rp)
                      </label>
                      <input
                        type="number"
                        value={mappingForm.commission}
                        onChange={(e) =>
                          setMappingForm({ ...mappingForm, commission: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        min={0}
                      />
                    </div>
                  </div>

                  {/* Effective Admin Preview */}
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Effective Admin</span>
                      <span className="text-lg font-bold text-blue-800">
                        {formatPrice(mappingForm.admin - mappingForm.commission)}
                      </span>
                    </div>
                    <p className="text-xs text-blue-500 mt-1">
                      = Admin - Komisi (untuk sorting postpaid)
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={mappingForm.isActive}
                        onChange={(e) =>
                          setMappingForm({ ...mappingForm, isActive: e.target.checked })
                        }
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={mappingForm.isAvailable}
                        onChange={(e) =>
                          setMappingForm({ ...mappingForm, isAvailable: e.target.checked })
                        }
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="text-sm">Available</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={!editingMapping && mappingForm.providerId === 0}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingMapping ? 'Update Mapping' : 'Add Mapping'}
                  </button>
                </form>
              ) : (
                // Mapping List
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-gray-600">
                      {productProviderSKUs.length} provider mapping
                    </p>
                    <button
                      onClick={handleAddMappingClick}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add Mapping
                    </button>
                  </div>

                  {productProviderSKUs.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                      <Server className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-500 text-sm">Belum ada provider mapping</p>
                      <button
                        onClick={handleAddMappingClick}
                        className="text-blue-600 text-sm hover:underline mt-2"
                      >
                        Tambah mapping pertama
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {productProviderSKUs.map((sku) => {
                        const effectiveAdmin = sku.admin - sku.commission;
                        return (
                          <div
                            key={sku.id}
                            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex items-start gap-3">
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded border ${getProviderLabel(
                                    sku.providerCode
                                  )}`}
                                >
                                  {sku.providerName || sku.providerCode}
                                </span>
                                <div>
                                  <p className="font-mono text-sm">{sku.providerSkuCode}</p>
                                  {sku.providerProductName && (
                                    <p className="text-xs text-gray-500">{sku.providerProductName}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleEditMapping(sku)}
                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMapping(sku.id)}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-gray-500">Price</p>
                                <p className="font-medium">{formatPrice(sku.price)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Admin</p>
                                <p className="font-medium">{formatPrice(sku.admin)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Komisi</p>
                                <p className="font-medium text-green-600">{formatPrice(sku.commission)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Eff. Admin</p>
                                <p
                                  className={`font-bold ${
                                    effectiveAdmin <= 0 ? 'text-green-700' : 'text-orange-600'
                                  }`}
                                >
                                  {formatPrice(effectiveAdmin)}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex gap-2">
                              {sku.isActive ? (
                                <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700">
                                  Active
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-700">
                                  Inactive
                                </span>
                              )}
                              {!sku.isAvailable && (
                                <span className="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-700">
                                  Unavailable
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
