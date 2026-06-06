import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Activity, Clock, Cpu, GitBranch, Server, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchHealth(); }, []);

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

  const handleRefresh = () => { setRefreshing(true); fetchHealth(); };

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
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  const isHealthy = health?.status === 'ok' || health?.status === 'healthy';

  return (
    <>
      <Head><title>Dashboard — GTD Admin</title></Head>
      <Layout>
        <div className="page-content">
          {/* Header */}
          <div className="page-header">
            <div>
              <h1 className="page-title">Dashboard</h1>
              <p className="page-desc">System health overview</p>
            </div>
            <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="stat-card">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isHealthy ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {isHealthy
                    ? <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
                    : <XCircle className="w-4.5 h-4.5 text-red-600" />}
                </div>
                <p className="text-xs text-gray-400 font-medium">Status</p>
              </div>
              <p className={`text-lg font-semibold capitalize ${isHealthy ? 'text-emerald-600' : 'text-red-600'}`}>
                {health?.status || 'Unknown'}
              </p>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Clock className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <p className="text-xs text-gray-400 font-medium">Uptime</p>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {health?.uptime ? formatUptime(health.uptime) : '—'}
              </p>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                  <GitBranch className="w-4.5 h-4.5 text-violet-600" />
                </div>
                <p className="text-xs text-gray-400 font-medium">Version</p>
              </div>
              <p className="text-lg font-semibold text-gray-900">{health?.version || '—'}</p>
            </div>

            <div className="stat-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Server className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <p className="text-xs text-gray-400 font-medium">Providers</p>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {health?.providers ? Object.keys(health.providers).length : '—'}
              </p>
            </div>
          </div>

          {/* Info panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-gray-400" />
                System Information
              </h2>
              <div className="divide-y divide-gray-50">
                <Row label="Service Status">
                  <span className={`badge ${isHealthy ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {health?.status || 'Unknown'}
                  </span>
                </Row>
                <Row label="API Version">
                  <span className="font-mono text-xs text-gray-700">{health?.version || '—'}</span>
                </Row>
                <Row label="Uptime">
                  <span className="text-gray-700 text-sm">{health?.uptime ? formatUptime(health.uptime) : '—'}</span>
                </Row>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400" />
                Provider Status
              </h2>
              <div className="divide-y divide-gray-50">
                {health?.digiflazz && (
                  <Row label="Digiflazz">
                    <span className={`badge ${health.digiflazz.status === 'connected' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {health.digiflazz.status || 'Disabled'}
                    </span>
                  </Row>
                )}
                {health?.providers && Object.entries(health.providers).map(([name, info]: [string, any]) => (
                  <Row key={name} label={<span className="capitalize">{name}</span>}>
                    <span className={`badge ${info?.status === 'connected' || info?.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {info?.status || 'Unknown'}
                    </span>
                  </Row>
                ))}
                {!health?.digiflazz && (!health?.providers || Object.keys(health.providers).length === 0) && (
                  <div className="py-8 text-center text-gray-400 text-sm">No provider data</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2.5">
      <span className="text-sm text-gray-500">{label}</span>
      {children}
    </div>
  );
}
