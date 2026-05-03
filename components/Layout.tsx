import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Home,
  Users,
  Package,
  Activity,
  LogOut,
  Server,
  Tags,
  Shield,
  CreditCard,
  Wallet,
  Send,
  Building2,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

type NavItem = {
  href: string;
  icon: typeof Home;
  label: string;
};

type NavGroup = {
  title?: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', icon: Home, label: 'Dashboard' },
      { href: '/clients', icon: Users, label: 'Clients' },
    ],
  },
  {
    title: 'PPOB',
    items: [
      { href: '/products', icon: Package, label: 'Products' },
      { href: '/product-master', icon: Tags, label: 'Catalog' },
      { href: '/providers', icon: Server, label: 'Providers' },
      { href: '/transactions', icon: Activity, label: 'Transactions' },
    ],
  },
  {
    title: 'Payment',
    items: [
      { href: '/payments', icon: CreditCard, label: 'Payments' },
      { href: '/payment-methods', icon: Wallet, label: 'Methods' },
      { href: '/va-banks', icon: Building2, label: 'VA Banks' },
    ],
  },
  {
    title: 'Disbursement',
    items: [
      { href: '/transfers', icon: Send, label: 'Transfers' },
      { href: '/disbursement-methods', icon: Building2, label: 'Methods' },
    ],
  },
];

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-60 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white flex flex-col fixed inset-y-0 left-0 z-30">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Gerbang</h1>
              <p className="text-[11px] text-slate-400 -mt-0.5">Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          {NAV_GROUPS.map((group, idx) => (
            <div key={idx} className={idx > 0 ? 'mt-5' : ''}>
              {group.title && (
                <div className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase text-slate-500">
                  {group.title}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = router.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                        isActive
                          ? 'bg-indigo-600/20 text-indigo-200'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <Icon
                        className={`w-[17px] h-[17px] flex-shrink-0 ${
                          isActive ? 'text-indigo-300' : 'text-slate-500'
                        }`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
          >
            <LogOut className="w-[17px] h-[17px]" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-60 p-8 min-h-screen">{children}</main>
    </div>
  );
}
