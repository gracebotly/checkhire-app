import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description: "CheckHire blog — insights on hiring, job search, and platform trust.",
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted">
            <BookOpen className="h-5 w-5 text-brand" />
          </div>
          <h1 className="font-display text-3xl font-bold text-slate-900">Blog</h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-slate-600">
            We&apos;re working on our first posts about hiring trust, job search
            safety, and how CheckHire protects both sides of the hiring process.
            Check back soon.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
