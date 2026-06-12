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
  Scale,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  title?: string;
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
      { href: '/reconciliation', icon: Scale, label: 'Reconciliation' },
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
    <div className="min-h-screen flex bg-gray-50/70">
      {/* Sidebar */}
      <aside className="w-[232px] bg-white border-r border-gray-100 flex flex-col fixed inset-y-0 left-0 z-30 shadow-sm">
        {/* Logo area — logo only, no text */}
        <div className="flex items-center justify-center py-6 border-b border-gray-100">
          <Link href="/dashboard" aria-label="Dashboard">
            <Image
              src="/logo_gtd.png"
              alt="GTD"
              width={44}
              height={44}
              priority
              className="select-none"
            />
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-6">
          {NAV_GROUPS.map((group, idx) => (
            <div key={idx}>
              {group.title && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = router.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
                      />
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 pt-3 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-[232px] min-h-screen">
        {children}
      </main>
    </div>
  );
}
