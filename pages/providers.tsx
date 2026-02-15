import { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import {
  Plus,
  Edit,
  Trash,
  RefreshCw,
  Search,
  Server,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Zap,
  Clock,
  TrendingUp,
  Shield,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface Provider {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  isBackup: boolean;
  priority: number;
  updatedAt: string;
}

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
  stock: number | null;
  lastSyncAt: string | null;
  syncError: string | null;
  providerCode: string;
  providerName: string;
  productName: string;
  skuCode: string;
  isBackup: boolean;
  updatedAt: string;
}

interface ProviderHealth {
  providerId: number;
  providerCode: string;
  providerName: string;
  totalRequests: number;
  successCount: number;
  failedCount: number;
  healthScore: number;
  avgResponseTimeMs: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailureReason: string | null;
}

export default function Providers() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [health, setHealth] = useState<ProviderHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [providerSKUs, setProviderSKUs] = useState<ProviderSKU[]>([]);
  const [loadingSKUs, setLoadingSKUs] = useState(false);
  const [skuSearch, setSkuSearch] = useState('');

  // SKU Modal
  const [showSKUModal, setShowSKUModal] = useState(false);
  const [editingSKU, setEditingSKU] = useState<ProviderSKU | null>(null);
  const [skuForm, setSkuForm] = useState({
    providerId: 0,
    productId: 0,
    providerSkuCode: '',
    providerProductName: '',
    price: 0,
    admin: 0,
    commission: 0,
    isActive: true,
    isAvailable: true,
  });

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const [providerRes, healthRes] = await Promise.all([
        api.get('/v1/admin/ppob/providers'),
        api.get('/v1/admin/ppob/health').catch(() => ({ data: { data: [] } })),
      ]);
      const providerList = providerRes.data.data || [];
      setProviders(providerList);
      setHealth(healthRes.data.data || []);

      // Auto-select first provider
      if (providerList.length > 0 && !selectedProvider) {
        setSelectedProvider(providerList[0]);
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProvider]);

  const fetchSKUs = useCallback(async (providerId: number) => {
    setLoadingSKUs(true);
    try {
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '100');
      if (skuSearch) params.append('search', skuSearch);

      const { data } = await api.get(`/v1/admin/ppob/providers/${providerId}/skus?${params.toString()}`);
      setProviderSKUs(data.data || []);
    } catch (error) {
      console.error('Failed to fetch SKUs:', error);
      setProviderSKUs([]);
    } finally {
      setLoadingSKUs(false);
    }
  }, [skuSearch]);

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (selectedProvider) {
      fetchSKUs(selectedProvider.id);
    }
  }, [selectedProvider, fetchSKUs]);

  const searchProducts = async (query: string) => {
    setProductSearch(query);
    if (query.length < 2) {
      setProductResults([]);
      return;
    }
    setSearchingProducts(true);
    try {
      const { data } = await api.get(`/v1/admin/products?search=${encodeURIComponent(query)}&limit=10`);
      setProductResults(data.data || []);
    } catch (error) {
      console.error('Failed to search products:', error);
    } finally {
      setSearchingProducts(false);
    }
  };

  const toggleProviderStatus = async (provider: Provider) => {
    try {
      await api.put(`/v1/admin/ppob/providers/${provider.id}/status`, {
        isActive: !provider.isActive,
      });
      fetchProviders();
    } catch (error: any) {
      console.error('Failed to toggle provider:', error);
      alert(error.response?.data?.message || 'Failed to update provider status');
    }
  };

  const handleAddSKU = () => {
    if (!selectedProvider) return;
    setEditingSKU(null);
    setProductSearch('');
    setProductResults([]);
    setSkuForm({
      providerId: selectedProvider.id,
      productId: 0,
      providerSkuCode: '',
      providerProductName: '',
      price: 0,
      admin: 0,
      commission: 0,
      isActive: true,
      isAvailable: true,
    });
    setShowSKUModal(true);
  };

  const handleEditSKU = (sku: ProviderSKU) => {
    setEditingSKU(sku);
    setSkuForm({
      providerId: sku.providerId,
      productId: sku.productId,
      providerSkuCode: sku.providerSkuCode,
      providerProductName: sku.providerProductName,
      price: sku.price,
      admin: sku.admin,
      commission: sku.commission,
      isActive: sku.isActive,
      isAvailable: sku.isAvailable,
    });
    setShowSKUModal(true);
  };

  const handleSKUSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSKU) {
        await api.put(`/v1/admin/ppob/skus/${editingSKU.id}`, {
          providerSkuCode: skuForm.providerSkuCode,
          providerProductName: skuForm.providerProductName,
          price: skuForm.price,
          admin: skuForm.admin,
          commission: skuForm.commission,
          isActive: skuForm.isActive,
          isAvailable: skuForm.isAvailable,
        });
      } else if (selectedProvider) {
        await api.post(`/v1/admin/ppob/providers/${selectedProvider.id}/skus`, skuForm);
      }
      setShowSKUModal(false);
      setEditingSKU(null);
      if (selectedProvider) {
        fetchSKUs(selectedProvider.id);
      }
    } catch (error: any) {
      console.error('Failed to save SKU:', error);
      alert(error.response?.data?.message || 'Failed to save SKU');
    }
  };

  const handleDeleteSKU = async (skuId: number) => {
    if (!confirm('Hapus mapping SKU ini?')) return;
    try {
      await api.delete(`/v1/admin/ppob/skus/${skuId}`);
      if (selectedProvider) {
        fetchSKUs(selectedProvider.id);
      }
    } catch (error: any) {
      console.error('Failed to delete SKU:', error);
      alert(error.response?.data?.message || 'Failed to delete SKU');
    }
  };

  const getHealthForProvider = (providerId: number): ProviderHealth | undefined => {
    return health.find((h) => h.providerId === providerId);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getProviderColor = (code: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
      kiosbank: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: 'bg-indigo-500' },
      alterra: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'bg-emerald-500' },
      digiflazz: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'bg-amber-500' },
    };
    return colors[code] || { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: 'bg-gray-500' };
  };

  const getHealthStatus = (score: number) => {
    if (score >= 95) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 80) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 60) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Poor', color: 'text-red-600', bg: 'bg-red-100' };
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
            <p className="text-gray-500 mt-1">Kelola multi-provider PPOB dan SKU mapping</p>
          </div>
          <button
            onClick={fetchProviders}
            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      ) : providers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Server className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Tidak ada provider</p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Provider Cards - Left Side */}
          <div className="col-span-4 space-y-4">
            {providers.map((provider) => {
              const providerHealth = getHealthForProvider(provider.id);
              const colors = getProviderColor(provider.code);
              const isSelected = selectedProvider?.id === provider.id;
              const healthStatus = providerHealth ? getHealthStatus(providerHealth.healthScore) : null;

              return (
                <div
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider)}
                  className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    isSelected
                      ? `${colors.border} shadow-md`
                      : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  {/* Provider Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${colors.icon} rounded-lg flex items-center justify-center`}>
                        <Server className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                        <p className="text-xs font-mono text-gray-500">{provider.code}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProviderStatus(provider);
                      }}
                      className={`p-1.5 rounded-lg transition ${
                        provider.isActive
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title={provider.isActive ? 'Disable' : 'Enable'}
                    >
                      {provider.isActive ? (
                        <ToggleRight className="w-6 h-6" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-2 mb-3">
                    {provider.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-700">
                        <XCircle className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                    {provider.isBackup && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-orange-50 text-orange-700">
                        <Shield className="w-3 h-3" />
                        Backup
                      </span>
                    )}
                    <span className="text-xs text-gray-500">Priority: {provider.priority}</span>
                  </div>

                  {/* Health Stats */}
                  {providerHealth && (
                    <div className={`rounded-lg p-3 ${colors.bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Activity className={`w-4 h-4 ${colors.text}`} />
                          <span className={`text-sm font-medium ${colors.text}`}>Health</span>
                        </div>
                        <span className={`text-lg font-bold ${healthStatus?.color}`}>
                          {providerHealth.healthScore.toFixed(1)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-gray-500">Success</p>
                          <p className="text-sm font-semibold text-green-600">{providerHealth.successCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Failed</p>
                          <p className="text-sm font-semibold text-red-600">{providerHealth.failedCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Avg Time</p>
                          <p className="text-sm font-semibold text-gray-700">{providerHealth.avgResponseTimeMs}ms</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* SKU Mappings - Right Side */}
          <div className="col-span-8">
            {selectedProvider ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="font-semibold text-gray-900">
                        SKU Mappings - {selectedProvider.name}
                      </h2>
                      <p className="text-sm text-gray-500">{providerSKUs.length} SKU terdaftar</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={skuSearch}
                          onChange={(e) => setSkuSearch(e.target.value)}
                          placeholder="Cari SKU..."
                          className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-48"
                        />
                      </div>
                      <button
                        onClick={handleAddSKU}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Add Mapping
                      </button>
                    </div>
                  </div>
                </div>

                {/* SKU Table */}
                {loadingSKUs ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                  </div>
                ) : providerSKUs.length === 0 ? (
                  <div className="text-center py-12">
                    <Server className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">Belum ada SKU mapping</p>
                    <button
                      onClick={handleAddSKU}
                      className="text-blue-600 text-sm hover:underline mt-2"
                    >
                      Tambah mapping pertama
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                            Product
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                            Provider SKU
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                            Price
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                            Admin
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                            Komisi
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                            Eff. Admin
                          </th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                            Status
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {providerSKUs.map((sku) => {
                          const effectiveAdmin = sku.admin - sku.commission;
                          return (
                            <tr key={sku.id} className="hover:bg-gray-50 transition">
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900 text-sm">{sku.productName}</p>
                                <p className="text-xs text-gray-500 font-mono">{sku.skuCode}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-mono text-sm text-gray-700">{sku.providerSkuCode}</p>
                                {sku.providerProductName && (
                                  <p className="text-xs text-gray-400 truncate max-w-[150px]">
                                    {sku.providerProductName}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium">
                                {formatPrice(sku.price)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-600">
                                {formatPrice(sku.admin)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                                {formatPrice(sku.commission)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span
                                  className={`text-sm font-bold ${
                                    effectiveAdmin <= 0 ? 'text-green-700' : 'text-orange-600'
                                  }`}
                                >
                                  {formatPrice(effectiveAdmin)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  {sku.isActive ? (
                                    <span className="w-2 h-2 rounded-full bg-green-500" title="Active"></span>
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-red-500" title="Inactive"></span>
                                  )}
                                  {!sku.isAvailable && (
                                    <span title="Unavailable">
                                      <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                                    </span>
                                  )}
                                  {sku.syncError && (
                                    <span title={sku.syncError}>
                                      <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => handleEditSKU(sku)}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSKU(sku.id)}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                                    title="Delete"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Server className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">Pilih provider di sebelah kiri</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SKU Modal */}
      {showSKUModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {editingSKU ? 'Edit SKU Mapping' : 'Add SKU Mapping'}
              </h2>
              <button
                onClick={() => setShowSKUModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSKUSubmit} className="p-5 space-y-4">
              {/* Product Selection */}
              {!editingSKU && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => searchProducts(e.target.value)}
                    placeholder="Cari product berdasarkan nama atau SKU..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  {searchingProducts && (
                    <p className="text-xs text-gray-400 mt-1">Mencari...</p>
                  )}
                  {productResults.length > 0 && (
                    <div className="border border-gray-200 rounded-lg mt-2 max-h-40 overflow-y-auto">
                      {productResults.map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSkuForm({ ...skuForm, productId: p.id });
                            setProductSearch(`${p.skuCode} - ${p.name}`);
                            setProductResults([]);
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0 ${
                            skuForm.productId === p.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                            {p.skuCode}
                          </span>
                          {p.name}
                          <span className="text-xs text-gray-400 ml-2">{p.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {skuForm.productId > 0 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Product selected (ID: {skuForm.productId})
                    </p>
                  )}
                </div>
              )}

              {editingSKU && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Product</p>
                  <p className="font-medium">{editingSKU.productName}</p>
                  <p className="text-xs text-gray-400 font-mono">{editingSKU.skuCode}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider SKU Code *
                  </label>
                  <input
                    type="text"
                    value={skuForm.providerSkuCode}
                    onChange={(e) => setSkuForm({ ...skuForm, providerSkuCode: e.target.value })}
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
                    value={skuForm.providerProductName}
                    onChange={(e) => setSkuForm({ ...skuForm, providerProductName: e.target.value })}
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
                  value={skuForm.price}
                  onChange={(e) => setSkuForm({ ...skuForm, price: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  min={0}
                />
                <p className="text-xs text-gray-400 mt-1">Harga beli dari provider</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin (Rp)</label>
                  <input
                    type="number"
                    value={skuForm.admin}
                    onChange={(e) => setSkuForm({ ...skuForm, admin: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Komisi (Rp)</label>
                  <input
                    type="number"
                    value={skuForm.commission}
                    onChange={(e) => setSkuForm({ ...skuForm, commission: Number(e.target.value) })}
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
                    {formatPrice(skuForm.admin - skuForm.commission)}
                  </span>
                </div>
                <p className="text-xs text-blue-500 mt-1">= Admin - Komisi (untuk sorting postpaid)</p>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={skuForm.isActive}
                    onChange={(e) => setSkuForm({ ...skuForm, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={skuForm.isAvailable}
                    onChange={(e) => setSkuForm({ ...skuForm, isAvailable: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="text-sm">Available</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!editingSKU && skuForm.productId === 0}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingSKU ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSKUModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 font-medium text-sm"
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
