import { useEffect, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { Cloud, HardDrive, LogOut } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ComputersPage } from '@/components/dashboard/ComputersPage';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { ProductsPage } from '@/components/dashboard/ProductsPage';
import { ReportsPage } from '@/components/dashboard/ReportsPage';
import { isSupabaseConfigured, supabase, supabaseConfigurationError } from '@/lib/supabase';

type AppPage = 'dashboard' | 'reports' | 'computers' | 'products';
type AuthState = { ready: boolean; user: User | null; error: string | null };

const pageFromHash = (hash: string): AppPage => {
  if (hash === '#reports') return 'reports';
  if (hash === '#computers') return 'computers';
  if (hash === '#products') return 'products';
  return 'dashboard';
};

function AuthPage({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setError('Supabase sozlanmagan. Vercel Environment Variables qiymatlarini tekshiring.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) setError(signInError.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Tizimga kirishda noma’lum xatolik yuz berdi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-950 via-surface-900 to-surface-800 px-4 text-slate-100">
    <form onSubmit={signIn} className="w-full max-w-md rounded-3xl border border-surface-600 bg-surface-800/90 p-8 shadow-2xl">
      <img src="/shon-game-club-logo.jpg" alt="SHON Game Club" className="mx-auto mb-6 h-auto w-full max-w-[220px] rounded-xl object-contain" />
      <h1 className="mb-6 text-center text-xl font-bold">Boshqaruvga kirish</h1>
      <label className="mb-4 block text-sm text-slate-300">Email
        <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-surface-600 bg-surface-900 px-4 py-3 text-white outline-none focus:border-brand-400" />
      </label>
      <label className="mb-5 block text-sm text-slate-300">Parol
        <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-surface-600 bg-surface-900 px-4 py-3 text-white outline-none focus:border-brand-400" />
      </label>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-brand-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-brand-400 disabled:cursor-wait disabled:opacity-60">
        {isSubmitting ? 'Tekshirilmoqda...' : 'Kirish'}
      </button>
      <p className="mt-4 text-center text-xs text-slate-400">Kirish ma’lumotlarini klub Supabase administratori beradi.</p>
    </form>
  </main>;
}

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activePage, setActivePage] = useState<AppPage>(() => pageFromHash(window.location.hash));
  const [auth, setAuth] = useState<AuthState>({ ready: !isSupabaseConfigured, user: null, error: null });
  const [signOutError, setSignOutError] = useState('');

  useEffect(() => {
    const syncPageWithHash = () => setActivePage(pageFromHash(window.location.hash));
    window.addEventListener('hashchange', syncPageWithHash);
    return () => window.removeEventListener('hashchange', syncPageWithHash);
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAuth({ ready: true, user: session?.user ?? null, error: null });
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (active) setAuth({ ready: true, user: data.session?.user ?? null, error: error?.message ?? null });
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const navigate = (page: AppPage) => {
    const hash = page === 'dashboard' ? '' : `#${page}`;
    if (window.location.hash !== hash) window.location.hash = hash;
    setActivePage(page);
  };

  if (supabaseConfigurationError) return <AuthPage initialError={supabaseConfigurationError} />;
  if (isSupabaseConfigured && !auth.ready) return <main className="flex min-h-screen items-center justify-center bg-surface-950 text-slate-200">Hisob tekshirilmoqda...</main>;
  if (isSupabaseConfigured && auth.error) return <AuthPage initialError={`Hisob holatini tekshirib bo‘lmadi: ${auth.error}`} />;
  if (isSupabaseConfigured && !auth.user) return <AuthPage />;
  if (isSupabaseConfigured && auth.user?.app_metadata.club_role !== 'staff') {
    return <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-950 px-4 text-center text-slate-100">
      <h1 className="text-xl font-bold">Bu hisobga xodim ruxsati berilmagan</h1>
      <p className="max-w-lg text-sm text-slate-400">Supabase administratori app_metadata.club_role qiymatini staff qilib o‘rnatishi kerak.</p>
      <button type="button" onClick={async () => { if (!supabase) return; const { error } = await supabase.auth.signOut(); setSignOutError(error?.message ?? ''); }} className="rounded-xl bg-surface-700 px-4 py-2 text-sm hover:bg-surface-600">Hisobdan chiqish</button>
      {signOutError && <p role="alert" className="text-sm text-red-300">{signOutError}</p>}
    </main>;
  }

  return <div className="flex min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-800 font-sans text-slate-100">
    <Sidebar mobileOpen={mobileOpen} onMobileToggle={() => setMobileOpen((open) => !open)} activePage={activePage} onNavigate={navigate} />
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center justify-end gap-3 px-4 pt-3 lg:px-8">
        <span className="flex items-center gap-2 rounded-full border border-surface-600 bg-surface-800/70 px-3 py-1.5 text-xs text-slate-400">
          {isSupabaseConfigured ? <Cloud className="h-3.5 w-3.5 text-success-400" /> : <HardDrive className="h-3.5 w-3.5 text-success-400" />}
          {isSupabaseConfigured ? 'Supabase bulut rejimi' : 'Lokal rejim'}
        </span>
        {auth.user && <button type="button" onClick={async () => {
          if (!supabase) return;
          setSignOutError('');
          const { error } = await supabase.auth.signOut();
          if (error) setSignOutError(error.message);
        }} className="flex items-center gap-2 rounded-full border border-surface-600 bg-surface-800/70 px-3 py-1.5 text-xs text-slate-300 hover:bg-surface-700">
          <LogOut className="h-3.5 w-3.5" />Chiqish
        </button>}
      </div>
      {signOutError && <p role="alert" className="mx-4 mt-2 text-right text-sm text-red-300 lg:mx-8">{signOutError}</p>}
      {activePage === 'dashboard' && <DashboardPage />}
      {activePage === 'reports' && <ReportsPage />}
      {activePage === 'computers' && <ComputersPage />}
      {activePage === 'products' && <ProductsPage />}
    </div>
  </div>;
}

export default App;
