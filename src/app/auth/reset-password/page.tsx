import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password — CheckHire",
  description: "Set a new password for your CheckHire account.",
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <ResetPasswordForm />
      </main>
    </div>
  );
}
