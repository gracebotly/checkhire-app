import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft, Shield } from "lucide-react";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ProductCallout } from "@/components/gig/ProductCallout";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: `${post.title} | CheckHire Blog`,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `https://checkhire.co/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const allPosts = getAllPosts();
  const related = allPosts
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 2);

  // JSON-LD structured data
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    author: {
      "@type": "Organization",
      name: "CheckHire",
      url: "https://checkhire.co",
    },
    publisher: {
      "@type": "Organization",
      name: "CheckHire",
      url: "https://checkhire.co",
    },
  };

  const faqJsonLd =
    post.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
            },
          })),
        }
      : null;

  const components = {
    ProductCallout,
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
        {faqJsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
          />
        )}

        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        {/* Category + Read time */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold text-brand uppercase tracking-wider">
            {post.category}
          </span>
          {post.readTime && (
            <>
              <span className="text-xs text-slate-400">&middot;</span>
              <span className="text-xs text-slate-600">{post.readTime}</span>
            </>
          )}
        </div>

        {/* Title */}
        <h1 className="font-display text-3xl font-bold text-slate-900 leading-tight">
          {post.title}
        </h1>

        {/* Author bar */}
        <div className="mt-6 mb-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-muted">
            <Shield className="h-4 w-4 text-brand" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{post.author}</p>
            <p className="text-xs text-slate-600">
              {formatDate(post.publishedAt)}
            </p>
          </div>
        </div>

        {/* MDX Content */}
        <article className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-slate-900 prose-a:text-brand prose-a:no-underline hover:prose-a:underline prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-900">
          <MDXRemote source={post.content} components={components} />
        </article>

        {/* Newsletter */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <NewsletterSignup
            variant="inline"
            utmCampaign="blog_post"
            heading="Protect your next gig"
            description="Get weekly scam teardowns and safety tips. Free, no spam, unsubscribe anytime."
          />
        </div>

        {/* Related Posts */}
        {related.length > 0 && (
          <>
            <hr className="my-12 border-gray-200" />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 mb-4">
                Related Articles
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/blog/${r.slug}`}
                    className="group block cursor-pointer rounded-xl border border-gray-200 p-4 transition-colors duration-200 hover:border-gray-300"
                  >
                    <span className="text-xs font-semibold text-brand uppercase tracking-wider">
                      {r.category}
                    </span>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900 transition-colors duration-200 group-hover:text-brand line-clamp-2">
                      {r.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                      {r.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/blog"
            className="text-sm font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
          >
            View all articles &rarr;
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
