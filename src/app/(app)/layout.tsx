import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ToastProvider } from "@/components/ui/toast";
import { EmailConfirmBanner } from "@/components/layout/EmailConfirmBanner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let emailConfirmed = true; // default to true so banner doesn't flash
  let userEmail: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    emailConfirmed = !!user?.email_confirmed_at;
    userEmail = user?.email || null;
  } catch {
    // If auth check fails, don't show the banner
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-white">
        <Navbar />
        <EmailConfirmBanner emailConfirmed={emailConfirmed} userEmail={userEmail} />
        <main className="pb-20 md:pb-0">{children}</main>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
