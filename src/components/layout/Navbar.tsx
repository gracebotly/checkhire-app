"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Menu, X, LogOut, Briefcase, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type AuthState = "loading" | "anon" | "seeker" | "employer";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [userEmail, setUserEmail] = useState<string | null>(null);
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

        setUserEmail(user.email || null);

        // Try to get user_type from user_profiles
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("user_type")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.user_type === "employer") {
          setAuthState("employer");
        } else if (profile?.user_type === "job_seeker") {
          setAuthState("seeker");
        } else {
          // Profile row missing or user_type not set — fallback to user metadata
          const metaType = user.user_metadata?.user_type;
          if (metaType === "employer") {
            setAuthState("employer");
          } else if (metaType === "job_seeker") {
            setAuthState("seeker");
          } else {
            // User is authenticated but we can't determine type.
            // Default to seeker (most common) rather than showing anon UI.
            setAuthState("seeker");
          }

          // Auto-repair: create missing user_profiles row in the background
          if (!profile) {
            const userType = metaType === "employer" ? "employer" : "job_seeker";
            supabase
              .from("user_profiles")
              .upsert(
                {
                  id: user.id,
                  user_type: userType,
                  full_name:
                    user.user_metadata?.name || user.user_metadata?.full_name || null,
                },
                { onConflict: "id" }
              )
              .then(({ error }) => {
                if (error) {
                  console.warn(
                    "[Navbar] Failed to auto-repair user_profiles:",
                    error.message
                  );
                }
              });
          }
        }
      } catch (err) {
        // If anything fails, default to anon — don't crash the navbar
        console.warn("[Navbar] Auth check failed:", err);
        setAuthState("anon");
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setAuthState("anon");
    setUserEmail(null);
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
          <Link
            href="/jobs"
            className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
          >
            Browse Jobs
          </Link>
          {authState === "seeker" && (
            <>
              <Link
                href="/seeker/applications"
                className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
              >
                My Applications
              </Link>
              <Link
                href="/seeker/profile"
                className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
              >
                My Profile
              </Link>
            </>
          )}
          {authState === "employer" && (
            <Link
              href="/employer/dashboard"
              className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
            >
              Employer Dashboard
            </Link>
          )}
          {authState === "anon" && (
            <Link
              href="/for-employers"
              className="cursor-pointer text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900"
            >
              For Employers
            </Link>
          )}
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
                href="/signup"
                className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
              >
                Post a Job
              </Link>
            </>
          )}
          {(authState === "seeker" || authState === "employer") && (
            <div className="flex items-center gap-2">
              {userEmail && (
                <span className="text-xs text-slate-600">{userEmail}</span>
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
              <Link
                href="/jobs"
                onClick={closeMobile}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50"
              >
                Browse Jobs
              </Link>

              {authState === "seeker" && (
                <>
                  <Link
                    href="/seeker/applications"
                    onClick={closeMobile}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50"
                  >
                    <Briefcase className="h-4 w-4" />
                    My Applications
                  </Link>
                  <Link
                    href="/seeker/profile"
                    onClick={closeMobile}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50"
                  >
                    <FileText className="h-4 w-4" />
                    My Profile
                  </Link>
                </>
              )}

              {authState === "employer" && (
                <Link
                  href="/employer/dashboard"
                  onClick={closeMobile}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50"
                >
                  <Briefcase className="h-4 w-4" />
                  Employer Dashboard
                </Link>
              )}

              {authState === "anon" && (
                <Link
                  href="/for-employers"
                  onClick={closeMobile}
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-900 transition-colors duration-200 hover:bg-gray-50"
                >
                  For Employers
                </Link>
              )}

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
                    href="/signup"
                    onClick={closeMobile}
                    className="cursor-pointer rounded-lg bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-hover"
                  >
                    Post a Job
                  </Link>
                </>
              )}

              {(authState === "seeker" || authState === "employer") && (
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
