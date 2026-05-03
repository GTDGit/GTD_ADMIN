import Layout from '@/components/Layout';
import { Send, Building2, Zap, ShieldCheck } from 'lucide-react';

export default function Transfers() {
  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Transfers</h1>
        <p className="text-gray-500 mt-1 text-sm">Disbursement monitoring</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-10">
        <div className="flex items-start gap-5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Send className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Coming soon</h2>
            <p className="text-sm text-gray-500 mt-1">
              Transfer monitoring (PakaiLink) sedang disiapkan.
            </p>

            <div className="grid sm:grid-cols-3 gap-3 mt-6">
              <Feature icon={Building2} label="Semua bank" />
              <Feature icon={Zap} label="Real-time status" />
              <Feature icon={ShieldCheck} label="ASPI compliant" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Feature({ icon: Icon, label }: { icon: typeof Send; label: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
      <Icon className="w-4 h-4 text-gray-500" />
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </div>
  );
}
