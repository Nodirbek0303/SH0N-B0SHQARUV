import { BarChart3, Headphones, Home, Menu, Monitor, Package, X } from 'lucide-react';

type AppPage = 'dashboard' | 'reports' | 'computers' | 'products';
interface SidebarProps { mobileOpen: boolean; onMobileToggle: () => void; activePage: AppPage; onNavigate: (page: AppPage) => void }

export function Sidebar({ mobileOpen, onMobileToggle, activePage, onNavigate }: SidebarProps) {
  const navClass = (page: AppPage): string => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${activePage === page ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-slate-300 hover:bg-surface-700'}`;
  const navigate = (page: AppPage) => {
    onNavigate(page);
    if (mobileOpen) onMobileToggle();
  };
  return <>
    <button type="button" onClick={onMobileToggle} aria-label={mobileOpen ? 'Menyuni yopish' : 'Menyuni ochish'} className="fixed left-4 top-4 z-40 rounded-xl border border-surface-600 bg-surface-800 p-2.5 text-slate-100 shadow-lg lg:hidden">
      {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
    {mobileOpen && <button type="button" aria-label="Menyuni yopish" onClick={onMobileToggle} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-surface-700/70 bg-surface-900 px-4 py-6 transition-transform duration-200 lg:static lg:w-64 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex flex-col items-center px-1 pb-6 pt-8 text-center lg:pt-0">
        <img src="/shon-game-club-logo.jpg" alt="SHON Game Club" className="h-auto w-full max-w-[232px] rounded-xl object-contain" />
        <p className="mt-1 text-[11px] font-medium tracking-[0.2em] text-slate-400">OYIN KLUBI BOSHQARUVI</p>
      </div>
      <nav className="flex flex-col gap-2" aria-label="Asosiy menyu">
        <button type="button" onClick={() => navigate('dashboard')} aria-current={activePage === 'dashboard' ? 'page' : undefined} className={navClass('dashboard')}><Home className="h-5 w-5" />Bosh sahifa</button>
        <button type="button" onClick={() => navigate('reports')} aria-current={activePage === 'reports' ? 'page' : undefined} className={navClass('reports')}><BarChart3 className="h-5 w-5" />Hisobotlar</button>
        <button type="button" onClick={() => navigate('computers')} aria-current={activePage === 'computers' ? 'page' : undefined} className={navClass('computers')}><Monitor className="h-5 w-5" />Kompyuterlar</button>
        <button type="button" onClick={() => navigate('products')} aria-current={activePage === 'products' ? 'page' : undefined} className={navClass('products')}><Package className="h-5 w-5" />Mahsulotlar</button>
      </nav>
      <div className="mt-auto rounded-2xl border border-brand-400/20 bg-brand-500/10 p-4 text-center"><Headphones className="mx-auto h-7 w-7 text-brand-300" /><p className="mt-2 text-sm font-semibold text-amber-300">Shon Club</p><p className="mt-1 text-xs leading-relaxed text-slate-300">Biz bilan oyin yanada qiziqarli!</p></div>
    </aside>
  </>;
}
