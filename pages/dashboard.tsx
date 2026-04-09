import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Activity, Clock, Cpu, GitBranch, Server, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const { data } = await api.get('/v1/health');
      setHealth(data.data);
    } catch (error) {
      console.error('Failed to fetch health:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHealth();
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  const isHealthy = health?.status === 'ok' || health?.status === 'healthy';

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">PPOB Gateway overview</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isHealthy ? 'bg-emerald-50' : 'bg-red-50'}`}>
              {isHealthy ? (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <p className="text-sm text-gray-500">Status</p>
          </div>
          <p className={`text-xl font-bold capitalize ${isHealthy ? 'text-emerald-600' : 'text-red-600'}`}>
            {health?.status || 'Unknown'}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-sm text-gray-500">Uptime</p>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {health?.uptime ? formatUptime(health.uptime) : '-'}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-sm text-gray-500">Version</p>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {health?.version || '-'}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Server className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-sm text-gray-500">Providers</p>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {health?.providers ? Object.keys(health.providers).length : '-'}
          </p>
        </div>
      </div>

      {/* System info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-gray-400" />
            System Information
          </h2>
          <div className="space-y-0 divide-y divide-gray-100">
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-500">Service Status</span>
              <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                isHealthy
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {health?.status || 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-500">API Version</span>
              <span className="text-sm font-medium text-gray-900">{health?.version || '-'}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-500">Uptime</span>
              <span className="text-sm font-medium text-gray-900">
                {health?.uptime ? formatUptime(health.uptime) : '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            Provider Status
          </h2>
          <div className="space-y-0 divide-y divide-gray-100">
            {health?.digiflazz && (
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-gray-500">Digiflazz</span>
                <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                  health.digiflazz.status === 'connected'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {health.digiflazz.status || 'Disabled'}
                </span>
              </div>
            )}
            {health?.providers && Object.entries(health.providers).map(([name, info]: [string, any]) => (
              <div key={name} className="flex justify-between items-center py-3">
                <span className="text-sm text-gray-500 capitalize">{name}</span>
                <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                  info?.status === 'connected' || info?.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {info?.status || 'Unknown'}
                </span>
              </div>
            ))}
            {!health?.digiflazz && (!health?.providers || Object.keys(health.providers).length === 0) && (
              <div className="py-6 text-center text-gray-400 text-sm">
                No provider status available
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
