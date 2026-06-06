import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import {
  Home,
  Users,
  Package,
  Activity,
  LogOut,
  Server,
  Tags,
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
  const [logoError, setLogoError] = useState(false);

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
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-30">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              {logoError ? (
                <span className="text-white font-bold text-sm">GTD</span>
              ) : (
                <Image
                  src="/logo_gtd.png"
                  alt="GTD Logo"
                  width={32}
                  height={32}
                  onError={() => setLogoError(true)}
                />
              )}
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-gray-900">Gerbang</h1>
              <p className="text-[11px] text-gray-500 -mt-0.5">Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          {NAV_GROUPS.map((group, idx) => (
            <div key={idx} className={idx > 0 ? 'mt-5' : ''}>
              {group.title && (
                <div className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase text-gray-400">
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
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                    >
                      <Icon
                        className={`w-[17px] h-[17px] flex-shrink-0 ${
                          isActive ? 'text-blue-600' : 'text-gray-400'
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

        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors w-full"
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
