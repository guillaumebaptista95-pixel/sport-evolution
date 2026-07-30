// Coquille des ecrans connectes : fond degrade, navigation basse.
import BottomNav from '@/components/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[380px] mesh opacity-70" />
      <div className="app-shell relative z-10 px-5">{children}</div>
      <BottomNav />
    </>
  );
}
