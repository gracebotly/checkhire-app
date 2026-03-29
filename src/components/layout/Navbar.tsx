"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Menu, X, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type AuthState = "loading" | "anon" | "authenticated";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [displayName, setDisplayName] = useState<string | null>(null);
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
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();

        setDisplayName(profile?.display_name || user.email || null);
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
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex cursor-pointer items-center gap-2 transition-colors duration-200"
        >
          <Shield className="h-5 w-5 text-brand" />
          <span className="font-display text-lg font-bold text-slate-900">
            CheckHire
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {authState === "authenticated" && (
            <Link
              href="/dashboard"
              className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
            >
              My Deals
            </Link>
          )}
          <Link
            href="/about"
            className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
          >
            About
          </Link>
        </nav>

        {/* Desktop CTAs */}
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
                href="/login?mode=signup"
                className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
              >
                Get Started
              </Link>
            </>
          )}
          {authState === "authenticated" && (
            <div className="flex items-center gap-3">
              <Link
                href="/deal/new"
                className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
              >
                Create Deal
              </Link>
              {displayName && (
                <span className="text-xs text-slate-600">{displayName}</span>
              )}
              <button
                onClick={handleLogout}
                className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-gray-50 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="cursor-pointer rounded-lg p-2 text-slate-600 transition-colors duration-200 hover:bg-gray-50 md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="border-t border-gray-200 bg-white px-6 py-4 md:hidden"
          >
            <nav className="flex flex-col gap-3">
              {authState === "authenticated" && (
                <>
                  <Link
                    href="/dashboard"
                    onClick={closeMobile}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50"
                  >
                    My Deals
                  </Link>
                  <Link
                    href="/deal/new"
                    onClick={closeMobile}
                    className="cursor-pointer rounded-lg bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
                  >
                    Create Deal
                  </Link>
                </>
              )}
              <Link
                href="/about"
                onClick={closeMobile}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50"
              >
                About
              </Link>

              <div className="my-1 h-px bg-gray-100" />

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
                    href="/login?mode=signup"
                    onClick={closeMobile}
                    className="cursor-pointer rounded-lg bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
                  >
                    Get Started
                  </Link>
                </>
              )}

              {authState === "authenticated" && (
                <button
                  onClick={handleLogout}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
