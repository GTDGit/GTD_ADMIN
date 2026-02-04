import { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  BarChart3,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Loader,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: number;
  transactionId: string;
  referenceId: string;
  clientId: number;
  skuCode: string;
  customerNo: string;
  customerName?: string;
  type: string;
  status: string;
  serialNumber?: string;
  price?: number;
  admin?: number;
  period?: string;
  digiSkuUsed?: string;
  providerRef?: string;
  retryCount: number;
  failedReason?: string;
  failedCode?: string;
  callbackSent: boolean;
  callbackSentAt?: string;
  isSandbox: boolean;
  createdAt: string;
  processedAt?: string;
}

interface Stats {
  summary: {
    totalTransactions: number;
    successTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    successRate: number;
    totalAmount: number;
    totalProfit: number;
  };
  byStatus: {
    Success: number;
    Failed: number;
    Pending: number;
    Processing: number;
  };
  byType: {
    prepaid: number;
    inquiry: number;
    payment: number;
  };
  dailyTrend: Array<{
    date: string;
    total: number;
    success: number;
    failed: number;
    amount: number;
  }>;
}

interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

interface Filters {
  clientId: string;
  status: string;
  type: string;
  skuCode: string;
  customerNo: string;
  referenceId: string;
  transactionId: string;
  startDate: string;
  endDate: string;
  isSandbox: string;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<Filters>({
    clientId: '',
    status: '',
    type: '',
    skuCode: '',
    customerNo: '',
    referenceId: '',
    transactionId: '',
    startDate: '',
    endDate: '',
    isSandbox: '',
  });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(pagination.page));
      params.append('limit', String(pagination.limit));

      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.skuCode) params.append('skuCode', filters.skuCode);
      if (filters.customerNo) params.append('customerNo', filters.customerNo);
      if (filters.referenceId) params.append('referenceId', filters.referenceId);
      if (filters.transactionId) params.append('transactionId', filters.transactionId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.isSandbox) params.append('isSandbox', filters.isSandbox);

      const { data } = await api.get(`/v1/admin/transactions?${params.toString()}`);
      setTransactions(data.data || []);
      if (data.meta?.pagination) {
        setPagination((prev) => ({
          ...prev,
          totalItems: data.meta.pagination.totalItems,
          totalPages: data.meta.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const params = new URLSearchParams();
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const { data } = await api.get(`/v1/admin/transactions/stats?${params.toString()}`);
      setStats(data.data || null);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [filters.clientId, filters.startDate, filters.endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRetry = async (transactionId: string, id: number) => {
    if (!confirm('Are you sure you want to retry this transaction?')) return;
    setRetrying(id);
    try {
      await api.post(`/v1/admin/transactions/${transactionId}/retry`);
      fetchTransactions();
      fetchStats();
    } catch (error: any) {
      console.error('Failed to retry transaction:', error);
      alert(error.response?.data?.message || 'Failed to retry transaction');
    } finally {
      setRetrying(null);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      clientId: '',
      status: '',
      type: '',
      skuCode: '',
      customerNo: '',
      referenceId: '',
      transactionId: '',
      startDate: '',
      endDate: '',
      isSandbox: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const formatPrice = (price?: number) => {
    if (!price) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Loader className="w-4 h-4 animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-2">Monitor and manage PPOB transactions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              showStats ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Stats
          </button>
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
            onClick={() => {
              fetchTransactions();
              fetchStats();
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-200"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Section */}
      {showStats && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Transactions</p>
                <p className="text-2xl font-bold">{formatNumber(stats.summary.totalTransactions)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.summary.successRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-green-600">{formatNumber(stats.summary.successTransactions)} success</span>
              <span className="text-red-600">{formatNumber(stats.summary.failedTransactions)} failed</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold">{formatPrice(stats.summary.totalAmount)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">By Type</p>
                <div className="flex gap-2 mt-1 text-sm">
                  <span className="text-blue-600">{formatNumber(stats.byType.prepaid)} prepaid</span>
                  <span className="text-purple-600">{formatNumber(stats.byType.inquiry)} inquiry</span>
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {formatNumber(stats.byType.payment)} payment
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Transaction ID</label>
              <input
                type="text"
                value={filters.transactionId}
                onChange={(e) => handleFilterChange('transactionId', e.target.value)}
                placeholder="GRB-..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Reference ID</label>
              <input
                type="text"
                value={filters.referenceId}
                onChange={(e) => handleFilterChange('referenceId', e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Customer No</label>
              <input
                type="text"
                value={filters.customerNo}
                onChange={(e) => handleFilterChange('customerNo', e.target.value)}
                placeholder="08xxx..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">SKU Code</label>
              <input
                type="text"
                value={filters.skuCode}
                onChange={(e) => handleFilterChange('skuCode', e.target.value)}
                placeholder="TSEL10..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Client ID</label>
              <input
                type="text"
                value={filters.clientId}
                onChange={(e) => handleFilterChange('clientId', e.target.value)}
                placeholder="Client ID"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="Processing">Processing</option>
                <option value="Success">Success</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
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
                <option value="inquiry">Inquiry</option>
                <option value="payment">Payment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Environment</label>
              <select
                value={filters.isSandbox}
                onChange={(e) => handleFilterChange('isSandbox', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All</option>
                <option value="false">Production</option>
                <option value="true">Sandbox</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No transactions found</p>
            <p className="text-sm text-gray-400 mt-2">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Transactions will appear here once they are created'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Transaction
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((trx) => (
                    <tr key={trx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-mono">{trx.transactionId}</div>
                        <div className="text-xs text-gray-500">{trx.referenceId}</div>
                        {trx.isSandbox && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                            Sandbox
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm">{trx.customerNo}</div>
                        {trx.customerName && (
                          <div className="text-xs text-gray-500">{trx.customerName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-mono">{trx.skuCode}</div>
                        {trx.digiSkuUsed && trx.digiSkuUsed !== trx.skuCode && (
                          <div className="text-xs text-gray-500">SKU: {trx.digiSkuUsed}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            trx.type === 'prepaid'
                              ? 'bg-blue-100 text-blue-800'
                              : trx.type === 'inquiry'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {trx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {formatPrice(trx.price)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStatusColor(
                            trx.status
                          )}`}
                        >
                          {getStatusIcon(trx.status)}
                          {trx.status}
                        </span>
                        {trx.retryCount > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Retry: {trx.retryCount}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(trx.createdAt), 'dd MMM yyyy')}
                        <div className="text-xs">
                          {format(new Date(trx.createdAt), 'HH:mm:ss')}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedTransaction(trx)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(trx.status === 'Failed' || trx.status === 'Pending') && (
                            <button
                              onClick={() => handleRetry(trx.transactionId, trx.id)}
                              disabled={retrying === trx.id}
                              className="p-1 text-orange-600 hover:bg-orange-50 rounded disabled:opacity-50"
                              title="Retry Transaction"
                            >
                              {retrying === trx.id ? (
                                <Loader className="w-4 h-4 animate-spin" />
                              ) : (
                                <RotateCcw className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.totalItems)} of{' '}
                {formatNumber(pagination.totalItems)} transactions
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
          </>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Transaction Details</h2>
                <p className="text-sm text-gray-500 font-mono">{selectedTransaction.transactionId}</p>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Status</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 text-sm rounded-full ${getStatusColor(
                      selectedTransaction.status
                    )}`}
                  >
                    {getStatusIcon(selectedTransaction.status)}
                    {selectedTransaction.status}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="text-sm font-medium capitalize">{selectedTransaction.type}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Reference ID</p>
                  <p className="text-sm font-mono">{selectedTransaction.referenceId}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Customer No</p>
                  <p className="text-sm">{selectedTransaction.customerNo}</p>
                  {selectedTransaction.customerName && (
                    <p className="text-xs text-gray-500">{selectedTransaction.customerName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Product SKU</p>
                  <p className="text-sm font-mono">{selectedTransaction.skuCode}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Digiflazz SKU Used</p>
                  <p className="text-sm font-mono">{selectedTransaction.digiSkuUsed || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="text-sm font-medium">{formatPrice(selectedTransaction.price)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Provider Ref</p>
                  <p className="text-sm font-mono">{selectedTransaction.providerRef || '-'}</p>
                </div>
              </div>

              {selectedTransaction.serialNumber && (
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-xs text-green-600">Serial Number</p>
                  <p className="text-sm font-mono font-medium">{selectedTransaction.serialNumber}</p>
                </div>
              )}

              {selectedTransaction.failedReason && (
                <div className="bg-red-50 p-3 rounded">
                  <p className="text-xs text-red-600">Failed Reason</p>
                  <p className="text-sm">{selectedTransaction.failedReason}</p>
                  {selectedTransaction.failedCode && (
                    <p className="text-xs text-red-500 mt-1">Code: {selectedTransaction.failedCode}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Retry Count</p>
                  <p className="text-sm">{selectedTransaction.retryCount}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Callback Sent</p>
                  <p className="text-sm">
                    {selectedTransaction.callbackSent ? (
                      <span className="text-green-600">Yes</span>
                    ) : (
                      <span className="text-gray-400">No</span>
                    )}
                    {selectedTransaction.callbackSentAt && (
                      <span className="text-xs text-gray-500 ml-2">
                        {format(new Date(selectedTransaction.callbackSentAt), 'dd MMM HH:mm')}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Created At</p>
                  <p className="text-sm">
                    {format(new Date(selectedTransaction.createdAt), 'dd MMM yyyy HH:mm:ss')}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-xs text-gray-500">Processed At</p>
                  <p className="text-sm">
                    {selectedTransaction.processedAt
                      ? format(new Date(selectedTransaction.processedAt), 'dd MMM yyyy HH:mm:ss')
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                {(selectedTransaction.status === 'Failed' ||
                  selectedTransaction.status === 'Pending') && (
                  <button
                    onClick={() => {
                      handleRetry(selectedTransaction.transactionId, selectedTransaction.id);
                      setSelectedTransaction(null);
                    }}
                    className="flex-1 bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Retry Transaction
                  </button>
                )}
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
