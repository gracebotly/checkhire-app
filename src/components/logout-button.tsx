"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={onLogout}
      className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
    >
      Sign out
    </button>
  );
}
