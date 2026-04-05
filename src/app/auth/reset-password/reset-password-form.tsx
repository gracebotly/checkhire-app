"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Logo } from "@/components/icons/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw new Error(updateError.message);
      setSuccess(true);

      setTimeout(() => {
        router.push("/settings");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-xl border border-gray-200 bg-white p-6"
      >
        <div className="mb-4">
          <Logo size={40} />
        </div>

        <h1 className="font-display text-xl font-bold text-slate-900">
          Set a new password
        </h1>
        <p className="mt-1 text-sm text-slate-600">Enter your new password below.</p>

        {success ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="mt-6 flex items-center gap-2"
          >
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-green-700">Password updated!</p>
              <p className="text-xs text-slate-600">Redirecting to settings...</p>
            </div>
          </motion.div>
        ) : (
          <div className="mt-6 space-y-3">
            <Input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError("");
              }}
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
            />
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600">
                <AlertTriangle className="h-3 w-3" />
                {error}
              </div>
            )}
            <Button
              onClick={handleResetPassword}
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full"
            >
              {loading ? "Updating..." : "Set New Password"}
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
