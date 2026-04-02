"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  Menu,
  X,
  LogOut,
  Settings,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AuthState = "loading" | "anon" | "authenticated";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setAuthState("anon");
          return;
        }

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("display_name, is_platform_admin")
          .eq("id", user.id)
          .maybeSingle();

        setDisplayName(profile?.display_name || user.email || null);
        setIsAdmin(profile?.is_platform_admin === true);
        setAuthState("authenticated");
      } catch {
        setAuthState("anon");
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setAuthState("anon");
    setDisplayName(null);
    setIsAdmin(false);
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  };

  const closeMobile = () => setMobileOpen(false);

  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex cursor-pointer items-center gap-2 transition-colors duration-200"
        >
          <Shield className="h-5 w-5 text-brand" />
          <span className="font-display text-lg font-bold text-slate-900">
            CheckHire
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {authState === "authenticated" && (
            <Link
              href="/dashboard"
              prefetch={false}
              className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
            >
              My Gigs
            </Link>
          )}
          <Link
            href="/gigs"
            className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
          >
            Browse Gigs
          </Link>
          <Link
            href="/how-it-works"
            className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
          >
            How It Works
          </Link>
          <Link
            href="/about"
            className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
          >
            About
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              prefetch={false}
              className="cursor-pointer text-sm font-medium text-red-600 transition-colors duration-200 hover:text-red-700"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {authState === "loading" && (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-100" />
          )}
          {authState === "anon" && (
            <>
              <Link
                href="/login"
                className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-slate-900 transition-colors duration-200 hover:bg-gray-50"
              >
                Sign In
              </Link>
              <Link
                href="/create"
                className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
              >
                Create Deal
              </Link>
            </>
          )}
          {authState === "authenticated" && (
            <div className="flex items-center gap-3">
              <Link
                href="/deal/new"
                prefetch={false}
                className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
              >
                Create Deal
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-gray-50">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-muted text-xs font-semibold text-brand">
                      {initials}
                    </div>
                    <span className="text-sm font-medium text-slate-900">
                      {displayName}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => router.push("/settings")}>
                    <Settings className="h-4 w-4 text-slate-600" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => router.push("/contact")}>
                    <HelpCircle className="h-4 w-4 text-slate-600" />
                    Help
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleLogout}
                    className="text-red-600 hover:bg-red-50 focus:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="cursor-pointer rounded-lg p-2 text-slate-600 transition-colors duration-200 hover:bg-gray-50 md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="border-t border-gray-200 bg-white px-6 py-4 md:hidden"
          >
            <nav className="flex flex-col gap-1">
              {authState === "authenticated" && (
                <>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-muted text-xs font-semibold text-brand">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {displayName}
                      </p>
                    </div>
                  </div>
                  <div className="my-1 h-px bg-gray-100" />
                  <Link
                    href="/dashboard"
                    prefetch={false}
                    onClick={closeMobile}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50"
                  >
                    My Gigs
                  </Link>
                  <Link
                    href="/deal/new"
                    prefetch={false}
                    onClick={closeMobile}
                    className="cursor-pointer rounded-lg bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
                  >
                    Create Deal
                  </Link>
                </>
              )}
              <Link
                href="/gigs"
                onClick={closeMobile}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50"
              >
                Browse Gigs
              </Link>
              <Link
                href="/how-it-works"
                onClick={closeMobile}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50"
              >
                How It Works
              </Link>
              <Link
                href="/about"
                onClick={closeMobile}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50"
              >
                About
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  prefetch={false}
                  onClick={closeMobile}
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors duration-200 hover:bg-red-50"
                >
                  Admin
                </Link>
              )}

              <div className="my-1 h-px bg-gray-100" />

              {authState === "authenticated" && (
                <>
                  <Link
                    href="/settings"
                    prefetch={false}
                    onClick={closeMobile}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <Link
                    href="/contact"
                    onClick={closeMobile}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50"
                  >
                    <HelpCircle className="h-4 w-4" />
                    Help
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors duration-200 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </>
              )}

              {authState === "anon" && (
                <>
                  <Link
                    href="/login"
                    onClick={closeMobile}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/create"
                    onClick={closeMobile}
                    className="cursor-pointer rounded-lg bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
                  >
                    Create Deal
                  </Link>
                </>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
