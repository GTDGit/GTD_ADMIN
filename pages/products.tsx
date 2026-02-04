import { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Plus, Edit, Trash, ChevronDown, ChevronRight, Package, Settings, Search, Filter, ChevronLeft, RefreshCw } from 'lucide-react';

interface SKU {
  id: number;
  productId: number;
  digiSkuCode: string;
  sellerName: string;
  priority: number;
  price: number;
  isActive: boolean;
  supportMulti: boolean;
  unlimitedStock: boolean;
  stock: number;
  cutOffStart: string;
  cutOffEnd: string;
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: number;
  skuCode: string;
  name: string;
  category: string;
  brand: string;
  type: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  skus?: SKU[];
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
  const [loading, setLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [productSKUs, setProductSKUs] = useState<{ [key: number]: SKU[] }>({});
  const [loadingSKUs, setLoadingSKUs] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
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
    description: '',
    isActive: true,
  });

  // SKU Modal
  const [showSKUModal, setShowSKUModal] = useState(false);
  const [editingSKU, setEditingSKU] = useState<SKU | null>(null);
  const [skuProductId, setSkuProductId] = useState<number | null>(null);
  const [skuForm, setSkuForm] = useState({
    digiSkuCode: '',
    sellerName: '',
    priority: 1,
    price: 0,
    isActive: true,
    supportMulti: true,
    unlimitedStock: true,
    stock: 0,
    cutOffStart: '00:00:00',
    cutOffEnd: '00:00:00',
  });

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
      
      // Map response to Product interface
      const productList = (data.data || []).map((p: any) => ({
        id: p.id,
        skuCode: p.skuCode,
        name: p.name,
        category: p.category,
        brand: p.brand,
        type: p.type,
        description: p.description || '',
        isActive: p.isActive,
        createdAt: p.createdAt || '',
        updatedAt: p.updatedAt || '',
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

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      category: '',
      brand: '',
      search: '',
      isActive: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const fetchSKUs = async (productId: number) => {
    if (productSKUs[productId]) {
      setExpandedProduct(expandedProduct === productId ? null : productId);
      return;
    }

    setLoadingSKUs(productId);
    try {
      const { data } = await api.get(`/v1/admin/products/${productId}/skus`);
      setProductSKUs((prev) => ({ ...prev, [productId]: data.data?.skus || [] }));
      setExpandedProduct(productId);
    } catch (error) {
      console.error('Failed to fetch SKUs:', error);
    } finally {
      setLoadingSKUs(null);
    }
  };

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
    if (!confirm('Are you sure you want to delete this product?')) return;
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
      type: 'prepaid',
      description: '',
      isActive: true,
    });
  };

  const handleSKUSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSKU) {
        await api.put(`/v1/admin/skus/${editingSKU.id}`, skuForm);
      } else if (skuProductId) {
        await api.post(`/v1/admin/products/${skuProductId}/skus`, skuForm);
      }
      setShowSKUModal(false);
      setEditingSKU(null);
      resetSKUForm();
      // Refresh SKUs for the product
      if (skuProductId) {
        setProductSKUs((prev) => {
          const updated = { ...prev };
          delete updated[skuProductId];
          return updated;
        });
        fetchSKUs(skuProductId);
      }
    } catch (error: any) {
      console.error('Failed to save SKU:', error);
      alert(error.response?.data?.message || 'Failed to save SKU');
    }
  };

  const handleDeleteSKU = async (skuId: number, productId: number) => {
    if (!confirm('Are you sure you want to delete this SKU?')) return;
    try {
      await api.delete(`/v1/admin/skus/${skuId}`);
      setProductSKUs((prev) => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
      fetchSKUs(productId);
    } catch (error: any) {
      console.error('Failed to delete SKU:', error);
      alert(error.response?.data?.message || 'Failed to delete SKU');
    }
  };

  const handleEditSKU = (sku: SKU) => {
    setEditingSKU(sku);
    setSkuProductId(sku.productId);
    setSkuForm({
      digiSkuCode: sku.digiSkuCode,
      sellerName: sku.sellerName,
      priority: sku.priority,
      price: sku.price,
      isActive: sku.isActive,
      supportMulti: sku.supportMulti,
      unlimitedStock: sku.unlimitedStock,
      stock: sku.stock,
      cutOffStart: sku.cutOffStart,
      cutOffEnd: sku.cutOffEnd,
    });
    setShowSKUModal(true);
  };

  const handleAddSKU = (productId: number) => {
    setSkuProductId(productId);
    setEditingSKU(null);
    resetSKUForm();
    setShowSKUModal(true);
  };

  const resetSKUForm = () => {
    setSkuForm({
      digiSkuCode: '',
      sellerName: '',
      priority: 1,
      price: 0,
      isActive: true,
      supportMulti: true,
      unlimitedStock: true,
      stock: 0,
      cutOffStart: '00:00:00',
      cutOffEnd: '00:00:00',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return { label: 'Primary', color: 'bg-green-100 text-green-800' };
      case 2:
        return { label: 'Backup 1', color: 'bg-yellow-100 text-yellow-800' };
      case 3:
        return { label: 'Backup 2', color: 'bg-orange-100 text-orange-800' };
      default:
        return { label: `Priority ${priority}`, color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-2">Manage PPOB products and SKUs</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              showFilters || hasActiveFilters
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters
            {hasActiveFilters && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                {Object.values(filters).filter((v) => v !== '').length}
              </span>
            )}
          </button>
          <button
            onClick={() => fetchProducts()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-200"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              resetProductForm();
              setShowProductModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Name or SKU..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Types</option>
                <option value="prepaid">Prepaid</option>
                <option value="postpaid">Postpaid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <input
                type="text"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                placeholder="Pulsa, Data..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Brand</label>
              <input
                type="text"
                value={filters.brand}
                onChange={(e) => handleFilterChange('brand', e.target.value)}
                placeholder="TELKOMSEL..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={filters.isActive}
                onChange={(e) => handleFilterChange('isActive', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
      <div className="space-y-4">
        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No products found</p>
            <p className="text-sm text-gray-400 mt-2">Create a product to get started</p>
          </div>
        ) : (
          products.map((product) => (
            <div key={product.id || product.skuCode} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => product.id && fetchSKUs(product.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                    disabled={!product.id}
                  >
                    {loadingSKUs === product.id ? (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : expandedProduct === product.id ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {product.skuCode}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          product.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          product.type === 'prepaid'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {product.type}
                      </span>
                    </div>
                    <p className="font-medium mt-1">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      {product.brand} • {product.category}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {product.id && (
                    <button
                      onClick={() => handleAddSKU(product.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                      title="Add SKU"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit Product"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  {product.id && (
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete Product"
                    >
                      <Trash className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* SKU List */}
              {expandedProduct === product.id && productSKUs[product.id] && (
                <div className="border-t bg-gray-50">
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-700">SKUs ({productSKUs[product.id].length})</h4>
                      <button
                        onClick={() => handleAddSKU(product.id)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add SKU
                      </button>
                    </div>
                    {productSKUs[product.id].length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No SKUs configured</p>
                    ) : (
                      <div className="space-y-2">
                        {productSKUs[product.id]
                          .sort((a, b) => a.priority - b.priority)
                          .map((sku) => {
                            const priorityInfo = getPriorityLabel(sku.priority);
                            return (
                              <div
                                key={sku.id}
                                className="bg-white p-3 rounded border flex items-center justify-between"
                              >
                                <div className="flex items-center gap-4">
                                  <span className={`px-2 py-1 text-xs rounded-full ${priorityInfo.color}`}>
                                    {priorityInfo.label}
                                  </span>
                                  <div>
                                    <p className="font-mono text-sm">{sku.digiSkuCode}</p>
                                    <p className="text-xs text-gray-500">{sku.sellerName}</p>
                                  </div>
                                  <div className="text-sm">
                                    <p className="font-medium">{formatPrice(sku.price)}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-1 text-xs rounded-full ${
                                        sku.isActive
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}
                                    >
                                      {sku.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    {sku.unlimitedStock ? (
                                      <span className="text-xs text-gray-500">Unlimited</span>
                                    ) : (
                                      <span className="text-xs text-gray-500">Stock: {sku.stock}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditSKU(sku)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSKU(sku.id, product.id)}
                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.totalItems)} of{' '}
            {pagination.totalItems} products
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page <= 1}
              className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
        </>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h2>
            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">SKU Code *</label>
                  <input
                    type="text"
                    value={productForm.skuCode}
                    onChange={(e) => setProductForm({ ...productForm, skuCode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                    disabled={!!editingProduct}
                    placeholder="TSEL10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type *</label>
                  <select
                    value={productForm.type}
                    onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="prepaid">Prepaid</option>
                    <option value="postpaid">Postpaid</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  placeholder="Telkomsel Pulsa 10.000"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <input
                    type="text"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                    placeholder="Pulsa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Brand *</label>
                  <input
                    type="text"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                    placeholder="TELKOMSEL"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                  placeholder="Product description..."
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="productActive"
                  checked={productForm.isActive}
                  onChange={(e) => setProductForm({ ...productForm, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="productActive" className="ml-2 text-sm">
                  Active
                </label>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingProduct ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SKU Modal */}
      {showSKUModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{editingSKU ? 'Edit SKU' : 'Add SKU'}</h2>
            <form onSubmit={handleSKUSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Digiflazz SKU Code *</label>
                  <input
                    type="text"
                    value={skuForm.digiSkuCode}
                    onChange={(e) => setSkuForm({ ...skuForm, digiSkuCode: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                    placeholder="TSEL5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority *</label>
                  <select
                    value={skuForm.priority}
                    onChange={(e) => setSkuForm({ ...skuForm, priority: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value={1}>1 - Primary (Main)</option>
                    <option value={2}>2 - Backup 1 (Fallback)</option>
                    <option value={3}>3 - Backup 2 (Last Resort)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Seller Name *</label>
                <input
                  type="text"
                  value={skuForm.sellerName}
                  onChange={(e) => setSkuForm({ ...skuForm, sellerName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  placeholder="PT Digital Indonesia"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price (Rp) *</label>
                <input
                  type="number"
                  value={skuForm.price}
                  onChange={(e) => setSkuForm({ ...skuForm, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  min={0}
                  placeholder="5200"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cut-off Start</label>
                  <input
                    type="time"
                    value={skuForm.cutOffStart.substring(0, 5)}
                    onChange={(e) => setSkuForm({ ...skuForm, cutOffStart: e.target.value + ':00' })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cut-off End</label>
                  <input
                    type="time"
                    value={skuForm.cutOffEnd.substring(0, 5)}
                    onChange={(e) => setSkuForm({ ...skuForm, cutOffEnd: e.target.value + ':00' })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="skuActive"
                    checked={skuForm.isActive}
                    onChange={(e) => setSkuForm({ ...skuForm, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="skuActive" className="ml-2 text-sm">
                    Active
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="supportMulti"
                    checked={skuForm.supportMulti}
                    onChange={(e) => setSkuForm({ ...skuForm, supportMulti: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="supportMulti" className="ml-2 text-sm">
                    Support Multiple Purchase
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="unlimitedStock"
                    checked={skuForm.unlimitedStock}
                    onChange={(e) => setSkuForm({ ...skuForm, unlimitedStock: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="unlimitedStock" className="ml-2 text-sm">
                    Unlimited Stock
                  </label>
                </div>
              </div>
              {!skuForm.unlimitedStock && (
                <div>
                  <label className="block text-sm font-medium mb-1">Stock</label>
                  <input
                    type="number"
                    value={skuForm.stock}
                    onChange={(e) => setSkuForm({ ...skuForm, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min={0}
                  />
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingSKU ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSKUModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
