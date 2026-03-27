import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <main className="min-h-screen flex-1 bg-[hsl(var(--main-bg))]">
        {children}
      </main>
    </div>
  );
}
