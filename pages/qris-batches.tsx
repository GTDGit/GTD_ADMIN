import { useEffect, useState } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { useToast } from '@/components/Toast';
import {
  fetchQRISBatches,
  downloadQRISBatch,
  markQRISBatchSent,
  type QRISBatch,
} from '@/lib/api';
import {
  FileSpreadsheet,
  RefreshCw,
  Download,
  Send,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function QRISBatchesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<QRISBatch[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchQRISBatches({ page, limit });
      setRows(res.items);
      setTotal(res.pagination.totalItems);
    } catch (err) {
      console.error('Failed to fetch QRIS batches:', err);
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleDownload = async (b: QRISBatch) => {
    setBusyId(b.id);
    try {
      const { blob, fileName } = await downloadQRISBatch(b.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Gagal mengunduh batch';
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkSent = async (b: QRISBatch) => {
    setBusyId(b.id);
    try {
      await markQRISBatchSent(b.id);
      toast.success('Batch ditandai terkirim');
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Gagal menandai batch';
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <Head><title>QRIS Batches — GTD Admin</title></Head>
      <Layout>
        <div className="page-content">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="page-title">QRIS Batches</h1>
              <p className="text-gray-500 mt-1 text-sm">
                File Excel pendaftaran Nobu (2 batch/hari, 10:00 &amp; 15:00 WIB). Unduh, kirim manual ke WAG Nobu, lalu tandai terkirim.
              </p>
            </div>
            <button onClick={() => load()} className="btn-secondary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : rows.length === 0 ? (
            <div className="card p-12 text-center">
              <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No batches generated yet.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Seq</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Count</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{b.batchDate}</td>
                      <td className="px-4 py-3 text-gray-600">#{b.batchSeq}</td>
                      <td className="px-4 py-3 text-gray-600">{b.periodLabel || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.fileName}</td>
                      <td className="px-4 py-3 text-gray-700">{b.registrationCount}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${b.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button
                            disabled={busyId === b.id}
                            onClick={() => handleDownload(b)}
                            className="btn-secondary py-1.5 px-3 flex items-center gap-1 disabled:opacity-40"
                          >
                            <Download className="w-4 h-4" /> Download
                          </button>
                          {b.status !== 'sent' && (
                            <button
                              disabled={busyId === b.id}
                              onClick={() => handleMarkSent(b)}
                              className="btn-primary py-1.5 px-3 flex items-center gap-1 disabled:opacity-40"
                            >
                              <Send className="w-4 h-4" /> Mark Sent
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100 text-sm">
                <span className="text-gray-500">Page {page} of {pages} · {total} total</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary py-1.5 px-3 flex items-center gap-1 disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary py-1.5 px-3 flex items-center gap-1 disabled:opacity-40">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
