import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ToastProvider } from "@/components/ui/toast";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="pb-20 md:pb-0">{children}</main>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
