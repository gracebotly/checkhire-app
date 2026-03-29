import Link from "next/link";
import { Shield } from "lucide-react";

const LINKS = {
  Product: [
    { label: "Browse Jobs", href: "/jobs" },
    { label: "For Employers", href: "/for-employers" },
    { label: "Pricing", href: "/pricing" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
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
              The trust-first job board. Every employer verified. Every salary
              shown.
            </p>
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
                    <Link
                      href={link.href}
                      className="cursor-pointer text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900"
                    >
                      {link.label}
                    </Link>
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
