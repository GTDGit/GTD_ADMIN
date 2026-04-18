import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Plus, Edit, Key, Copy, Check, X, Users, Globe, Shield, CreditCard as CreditCardIcon } from 'lucide-react';

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState('');
  const [formData, setFormData] = useState({
    clientId: '',
    name: '',
    callbackUrl: '',
    paymentCallbackUrl: '',
    ipWhitelist: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data } = await api.get('/v1/admin/clients');
      setClients(data.data.clients || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        ipWhitelist: formData.ipWhitelist.split(',').map(ip => ip.trim()).filter(Boolean),
      };

      if (editingClient) {
        await api.put(`/v1/admin/clients/${editingClient.id}`, payload);
      } else {
        await api.post('/v1/admin/clients', payload);
      }

      setShowModal(false);
      setEditingClient(null);
      setFormData({ clientId: '', name: '', callbackUrl: '', paymentCallbackUrl: '', ipWhitelist: '' });
      fetchClients();
    } catch (error) {
      console.error('Failed to save client:', error);
    }
  };

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setFormData({
      clientId: client.clientId,
      name: client.name,
      callbackUrl: client.callbackUrl,
      paymentCallbackUrl: client.paymentCallbackUrl || '',
      ipWhitelist: client.ipWhitelist?.join(', ') || '',
    });
    setShowModal(true);
  };

  const handleRegenerate = async (clientId: number, keyType: string) => {
    if (!confirm(`Regenerate ${keyType} key? The old key will stop working immediately.`)) return;
    try {
      await api.post(`/v1/admin/clients/${clientId}/regenerate`, { key_type: keyType });
      fetchClients();
    } catch (error) {
      console.error('Failed to regenerate key:', error);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(''), 2000);
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

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage API clients and keys</p>
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setFormData({ clientId: '', name: '', callbackUrl: '', paymentCallbackUrl: '', ipWhitelist: '' });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No clients yet. Create your first API client.</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {clients.map((client) => (
            <div key={client.id} className="card p-6">
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{client.name}</h3>
                    <p className="text-sm text-gray-400 font-mono">{client.clientId}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(client)}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Live key */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Live API Key</p>
                    <p className="font-mono text-sm text-gray-700 truncate">{client.apiKey?.substring(0, 36)}...</p>
                  </div>
                  <div className="flex gap-1 ml-3">
                    <button
                      onClick={() => copyToClipboard(client.apiKey, `live-${client.id}`)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Copy"
                    >
                      {copiedKey === `live-${client.id}` ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRegenerate(client.id, 'live')}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Regenerate"
                    >
                      <Key className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Sandbox key */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Sandbox Key</p>
                    <p className="font-mono text-sm text-gray-700 truncate">{client.sandboxKey?.substring(0, 36)}...</p>
                  </div>
                  <div className="flex gap-1 ml-3">
                    <button
                      onClick={() => copyToClipboard(client.sandboxKey, `sandbox-${client.id}`)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Copy"
                    >
                      {copiedKey === `sandbox-${client.id}` ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRegenerate(client.id, 'sandbox')}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Regenerate"
                    >
                      <Key className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Payment webhook secret */}
                {(client.paymentCallbackSecret || client.paymentCallbackUrl) && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Payment Webhook Secret</p>
                      <p className="font-mono text-sm text-gray-700 truncate">
                        {client.paymentCallbackSecret ? `${client.paymentCallbackSecret.substring(0, 36)}...` : 'Not generated'}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-3">
                      {client.paymentCallbackSecret && (
                        <button
                          onClick={() => copyToClipboard(client.paymentCallbackSecret, `paysec-${client.id}`)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Copy"
                        >
                          {copiedKey === `paysec-${client.id}` ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleRegenerate(client.id, 'payment_webhook')}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Regenerate payment webhook secret"
                      >
                        <Key className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Callback & IP info */}
                <div className="flex flex-wrap gap-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{client.callbackUrl || 'No callback URL'}</span>
                  </div>
                  {client.paymentCallbackUrl && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <CreditCardIcon className="w-3.5 h-3.5" />
                      <span>{client.paymentCallbackUrl}</span>
                    </div>
                  )}
                  {client.ipWhitelist?.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Shield className="w-3.5 h-3.5" />
                      <span>{client.ipWhitelist.length} whitelisted IP{client.ipWhitelist.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingClient ? 'Edit Client' : 'Add Client'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Client ID</label>
                <input
                  type="text"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="input-field"
                  required
                  disabled={!!editingClient}
                  placeholder="e.g. my-app"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  required
                  placeholder="e.g. My Application"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Callback URL</label>
                <input
                  type="url"
                  value={formData.callbackUrl}
                  onChange={(e) => setFormData({ ...formData, callbackUrl: e.target.value })}
                  className="input-field"
                  required
                  placeholder="https://example.com/webhook"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Payment Callback URL (optional)</label>
                <input
                  type="url"
                  value={formData.paymentCallbackUrl}
                  onChange={(e) => setFormData({ ...formData, paymentCallbackUrl: e.target.value })}
                  className="input-field"
                  placeholder="https://example.com/payment-webhook"
                />
                <p className="text-xs text-gray-400 mt-1">Leave empty to reuse the general callback URL for payment events.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">IP Whitelist</label>
                <input
                  type="text"
                  value={formData.ipWhitelist}
                  onChange={(e) => setFormData({ ...formData, ipWhitelist: e.target.value })}
                  className="input-field"
                  placeholder="Comma separated, e.g. 103.x.x.x, 103.y.y.y"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 btn-primary py-2.5">
                  {editingClient ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary py-2.5"
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
