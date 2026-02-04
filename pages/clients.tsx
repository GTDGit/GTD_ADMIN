import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import api from '@/lib/api';
import { Plus, Edit, Key, Copy, Check } from 'lucide-react';

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
      setFormData({ clientId: '', name: '', callbackUrl: '', ipWhitelist: '' });
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
      ipWhitelist: client.ipWhitelist?.join(', ') || '',
    });
    setShowModal(true);
  };

  const handleRegenerate = async (clientId: number, keyType: string) => {
    if (!confirm(`Regenerate ${keyType} key?`)) return;
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600 mt-2">Manage API clients</p>
        </div>
        <button
          onClick={() => {
            setEditingClient(null);
            setFormData({ clientId: '', name: '', callbackUrl: '', ipWhitelist: '' });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Client
        </button>
      </div>

      <div className="grid gap-6">
        {clients.map((client) => (
          <div key={client.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{client.name}</h3>
                <p className="text-gray-600">ID: {client.clientId}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(client)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Live API Key</p>
                  <p className="font-mono text-sm">{client.apiKey?.substring(0, 30)}...</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(client.apiKey, `live-${client.id}`)}
                    className="p-2 hover:bg-gray-200 rounded"
                  >
                    {copiedKey === `live-${client.id}` ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleRegenerate(client.id, 'live')}
                    className="p-2 hover:bg-gray-200 rounded"
                  >
                    <Key className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Sandbox Key</p>
                  <p className="font-mono text-sm">{client.sandboxKey?.substring(0, 30)}...</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(client.sandboxKey, `sandbox-${client.id}`)}
                    className="p-2 hover:bg-gray-200 rounded"
                  >
                    {copiedKey === `sandbox-${client.id}` ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleRegenerate(client.id, 'sandbox')}
                    className="p-2 hover:bg-gray-200 rounded"
                  >
                    <Key className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t">
                <p className="text-sm text-gray-600">Callback URL</p>
                <p className="text-sm">{client.callbackUrl}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingClient ? 'Edit Client' : 'Add Client'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client ID</label>
                <input
                  type="text"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                  disabled={!!editingClient}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Callback URL</label>
                <input
                  type="url"
                  value={formData.callbackUrl}
                  onChange={(e) => setFormData({ ...formData, callbackUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">IP Whitelist (comma separated)</label>
                <input
                  type="text"
                  value={formData.ipWhitelist}
                  onChange={(e) => setFormData({ ...formData, ipWhitelist: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="103.xxx.xxx.xxx, 103.yyy.yyy.yyy"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingClient ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
