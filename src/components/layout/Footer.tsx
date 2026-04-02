import Link from "next/link";
import { Shield } from "lucide-react";
import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";

const LINKS = {
  Product: [
    { label: "How It Works", href: "/how-it-works" },
    { label: "For Freelancers", href: "/for-freelancers" },
    { label: "For Clients", href: "/for-clients" },
    { label: "FAQ", href: "/faq" },
  ],
  Community: [
    {
      label: "Reddit",
      href: "https://reddit.com/r/checkhire",
      external: true,
    },
    {
      label: "Facebook Group",
      href: "https://facebook.com/groups/checkhire",
      external: true,
    },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand" />
              <span className="font-display text-lg font-bold text-slate-900">
                CheckHire
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              The safe way to work with anyone online.
            </p>
            <div className="mt-4">
              <NewsletterSignup
                variant="compact"
                utmCampaign="footer"
                placeholder="your@email.com"
              />
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                {heading}
              </h4>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="cursor-pointer text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6">
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} CheckHire. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
