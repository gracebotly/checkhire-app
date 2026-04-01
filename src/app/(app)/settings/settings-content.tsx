"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  CheckCircle,
  Mail,
  Shield,
  Key,
  LogOut,
  Loader2,
  User,
  Link as LinkIcon,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { ReferralDashboard } from "@/components/referral/ReferralDashboard";

type AuthProvider = "email" | "google" | "unknown";

export function SettingsContent() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Account info
  const [userEmail, setUserEmail] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [authProvider, setAuthProvider] = useState<AuthProvider>("unknown");
  const [memberSince, setMemberSince] = useState("");

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileSlug, setProfileSlug] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Security
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Profile save
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Stripe Connect state
  const [stripeStatus, setStripeStatus] = useState<
    "loading" | "not_connected" | "pending" | "connected"
  >("loading");
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Account info
      setUserEmail(user.email || "");
      setEmailConfirmed(!!user.email_confirmed_at);
      setMemberSince(
        user.created_at
          ? new Date(user.created_at).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })
          : ""
      );

      // Determine auth provider
      const provider = user.app_metadata?.provider;
      if (provider === "google") {
        setAuthProvider("google");
      } else if (provider === "email" || user.email) {
        setAuthProvider("email");
      }

      // Profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name, bio, profile_slug, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setDisplayName(profile.display_name || "");
        setBio(profile.bio || "");
        setProfileSlug(profile.profile_slug || "");
        setAvatarUrl(profile.avatar_url || "");
      }
      setLoading(false);

      // Check Stripe Connect status
      try {
        const stripeRes = await fetch("/api/stripe/connect");
        const stripeData = await stripeRes.json();
        if (stripeData.ok) {
          if (stripeData.connected) setStripeStatus("connected");
          else if (stripeData.details_submitted === false)
            setStripeStatus("pending");
          else setStripeStatus("not_connected");
        } else {
          setStripeStatus("not_connected");
        }
      } catch {
        setStripeStatus("not_connected");
      }
    }
    load();
  }, []);

  // Handle ?stripe=complete/refresh
  useEffect(() => {
    const stripeParam = searchParams.get("stripe");
    if (stripeParam === "complete") {
      fetch("/api/stripe/connect")
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && data.connected) {
            setStripeStatus("connected");
            toast("Stripe connected successfully!", "success");
          } else {
            setStripeStatus("pending");
            toast("Stripe setup incomplete — please finish onboarding.", "info");
          }
        })
        .catch(() => {});
      window.history.replaceState(null, "", "/settings");
    } else if (stripeParam === "refresh") {
      setStripeStatus("pending");
      window.history.replaceState(null, "", "/settings");
    }
  }, [searchParams, toast]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30);
  };

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (!profileSlug) {
      setProfileSlug(generateSlug(value));
    }
  };

  const handleSaveProfile = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim() || undefined,
          bio: bio.trim() || undefined,
          profile_slug: profileSlug.trim() || undefined,
          avatar_url: avatarUrl.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast("Profile saved!", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }

    setPasswordSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw new Error(error.message);
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      toast("Password updated!", "success");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to update password"
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      if (data.already_connected) {
        setStripeStatus("connected");
        toast("Stripe already connected!", "success");
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to connect", "error");
    } finally {
      setConnectingStripe(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="space-y-4">
          <div className="h-8 w-32 animate-pulse rounded bg-gray-100" />
          <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your account, profile, and payment settings.
        </p>

        <div className="mt-8 space-y-8">
          {/* ═══════════════ ACCOUNT ═══════════════ */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-4 w-4 text-slate-600" />
              <h2 className="text-base font-semibold text-slate-900">Account</h2>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              {/* Email */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-600">Email address</p>
                  <p className="text-sm font-semibold text-slate-900">{userEmail}</p>
                </div>
                <div className="flex items-center gap-2">
                  {emailConfirmed ? (
                    <Badge variant="success">Verified</Badge>
                  ) : (
                    <Badge variant="warning">Unverified</Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Sign-in method */}
              <div>
                <p className="text-xs text-slate-600">Sign-in method</p>
                <div className="mt-1 flex items-center gap-2">
                  {authProvider === "google" ? (
                    <>
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span className="text-sm text-slate-900">Google</span>
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 text-slate-600" />
                      <span className="text-sm text-slate-900">Email & password</span>
                    </>
                  )}
                </div>
              </div>

              {/* Member since */}
              {memberSince && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-slate-600">Member since</p>
                    <p className="text-sm text-slate-900">{memberSince}</p>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ═══════════════ PROFILE ═══════════════ */}
          <section>
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-600" />
                <h2 className="text-base font-semibold text-slate-900">Profile</h2>
              </div>
              <p className="mt-1 ml-6 text-xs text-slate-600">
                This info appears on your public profile and next to your name on every gig.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  Display name
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  placeholder="Your name"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short bio about yourself"
                  maxLength={200}
                  rows={3}
                  className="flex w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-brand resize-none"
                />
                <p className="mt-1 text-xs text-slate-600">
                  {bio.length}/200 characters
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  Profile URL
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-600">checkhire.com/u/</span>
                  <Input
                    value={profileSlug}
                    onChange={(e) =>
                      setProfileSlug(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                      )
                    }
                    placeholder="your-name"
                    maxLength={30}
                    className="w-48"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Lowercase letters, numbers, and hyphens only. 3-30 characters.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">
                  Profile photo
                </label>
                <AvatarUpload
                  currentUrl={avatarUrl || null}
                  displayName={displayName}
                  onUploaded={(url) => setAvatarUrl(url)}
                  onRemoved={() => setAvatarUrl("")}
                />
              </div>

              {error && <Alert variant="danger">{error}</Alert>}

              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </section>

          {/* ═══════════════ SECURITY ═══════════════ */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-slate-600" />
              <h2 className="text-base font-semibold text-slate-900">Security</h2>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              {/* Change password — only for email/password users */}
              {authProvider === "email" ? (
                <div>
                  <p className="text-sm font-medium text-slate-900">Change password</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Update your password to keep your account secure.
                  </p>
                  <div className="mt-3 space-y-3 max-w-sm">
                    <Input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordError("");
                        setPasswordSuccess(false);
                      }}
                    />
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setPasswordError("");
                        setPasswordSuccess(false);
                      }}
                    />
                    {passwordError && (
                      <p className="text-xs text-red-600">{passwordError}</p>
                    )}
                    {passwordSuccess && (
                      <p className="text-xs text-green-700 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Password updated successfully
                      </p>
                    )}
                    <Button
                      size="sm"
                      onClick={handleChangePassword}
                      disabled={passwordSaving || !newPassword || !confirmPassword}
                    >
                      {passwordSaving ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-900">Password</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    You signed in with Google. Your password is managed by Google.
                  </p>
                </div>
              )}

              <Separator />

              {/* Sign out */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">Sign out</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Sign out of CheckHire on this device.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? (
                    <>
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-1.5 h-3 w-3" />
                      Sign Out
                    </>
                  )}
                </Button>
              </div>
            </div>
          </section>

          {/* ═══════════════ PAYOUTS ═══════════════ */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-4 w-4 text-slate-600" />
              <h2 className="text-base font-semibold text-slate-900">Payouts</h2>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-slate-600">
                Connect your bank account to receive payments from gig work.
              </p>

              <div className="mt-4">
                {stripeStatus === "loading" && (
                  <div className="h-10 w-48 animate-pulse rounded bg-gray-100" />
                )}

                {stripeStatus === "connected" && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Stripe Connected
                      </p>
                      <p className="text-xs text-slate-600">
                        Your bank account is linked. You can receive payouts.
                      </p>
                    </div>
                  </div>
                )}

                {stripeStatus === "not_connected" && (
                  <div>
                    <p className="text-sm text-slate-600 mb-3">
                      You haven&apos;t connected a bank account yet. This is required to receive payments.
                    </p>
                    <Button
                      onClick={handleConnectStripe}
                      disabled={connectingStripe}
                      size="sm"
                    >
                      {connectingStripe ? "Connecting..." : "Connect with Stripe"}
                    </Button>
                  </div>
                )}

                {stripeStatus === "pending" && (
                  <div>
                    <p className="text-sm text-slate-600 mb-3">
                      Your Stripe onboarding is incomplete. Please finish setting up your account.
                    </p>
                    <Button
                      onClick={handleConnectStripe}
                      disabled={connectingStripe}
                      size="sm"
                    >
                      {connectingStripe ? "Connecting..." : "Complete Setup"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ═══════════════ REFERRALS ═══════════════ */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon className="h-4 w-4 text-slate-600" />
              <h2 className="text-base font-semibold text-slate-900">Referral Program</h2>
            </div>
            <ReferralDashboard />
          </section>
        </div>
      </motion.div>
    </div>
  );
}
