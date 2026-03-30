import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BookOpen, Shield } from "lucide-react";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Safety Guides & Resources | CheckHire",
  description:
    "Scam teardowns, escrow guides, and everything you need to hire and get hired safely online.",
  alternates: { canonical: "https://checkhire.com/blog" },
};

function PostImagePlaceholder({ category }: { category: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-brand-muted rounded-xl">
      <div className="text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/80">
          <Shield className="h-5 w-5 text-brand" />
        </div>
        <span className="text-xs font-medium text-brand">{category}</span>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <span className="text-xs font-semibold text-brand uppercase tracking-widest">
            Blog
          </span>
          <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">
            Safety Guides &amp; Resources
          </h1>
          <p className="mt-3 max-w-lg text-sm text-slate-600">
            Scam teardowns, escrow guides, and everything you need to hire and
            get hired safely online.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="mx-auto h-8 w-8 text-slate-400 mb-3" />
            <p className="text-sm text-slate-600">Articles coming soon.</p>
          </div>
        ) : (
          <>
            {/* Featured Post */}
            <div className="mb-12">
              <Link
                href={`/blog/${posts[0].slug}`}
                className="group block cursor-pointer"
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="aspect-[4/3] overflow-hidden rounded-xl">
                    <PostImagePlaceholder category={posts[0].category} />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-xs font-semibold text-brand uppercase tracking-wider">
                      {posts[0].category}
                    </span>
                    <h2 className="mt-2 font-display text-xl font-bold text-slate-900 transition-colors duration-200 group-hover:text-brand">
                      {posts[0].title}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 line-clamp-3">
                      {posts[0].description}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                      <span>{formatDate(posts[0].publishedAt)}</span>
                      {posts[0].readTime && (
                        <>
                          <span>&middot;</span>
                          <span>{posts[0].readTime}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {/* Rest of posts */}
            {posts.length > 1 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.slice(1).map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group block cursor-pointer"
                  >
                    <div className="aspect-[4/3] mb-3 overflow-hidden rounded-xl">
                      <PostImagePlaceholder category={post.category} />
                    </div>
                    <span className="text-xs font-semibold text-brand uppercase tracking-wider">
                      {post.category}
                    </span>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900 transition-colors duration-200 group-hover:text-brand line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                      {post.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                      <span>{formatDate(post.publishedAt)}</span>
                      {post.readTime && (
                        <>
                          <span>&middot;</span>
                          <span>{post.readTime}</span>
                        </>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
