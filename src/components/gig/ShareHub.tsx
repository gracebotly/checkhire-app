"use client";

import { useState } from "react";
import { Link as LinkIcon, Share2, Mail, MessageSquare, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  RedditIcon,
  WhatsAppIcon,
  TwitterXIcon,
  FacebookIcon,
  DiscordIcon,
} from "@/components/icons/SocialIcons";
import {
  getRedditPost,
  getTweet,
  getWhatsAppMessage,
  getDiscordMessage,
  getEmailSubject,
  getEmailBody,
  getSMSMessage,
  getGenericCopy,
} from "@/lib/deals/shareTemplates";

type Props = {
  dealSlug: string;
  dealTitle: string;
  amountCents: number;
  deadline: string | null;
  category: string | null;
  description: string;
  clientName: string;
  escrowFunded: boolean;
};

const formatAmount = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);

export function ShareHub({
  dealSlug,
  dealTitle,
  amountCents,
  deadline,
  category,
  description,
  clientName,
  escrowFunded,
}: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const dealUrl = `https://checkhire.co/deal/${dealSlug}`;
  const amount = formatAmount(amountCents);

  const shareData = {
    title: dealTitle,
    amount,
    slug: dealSlug,
    description,
    deadline: deadline
      ? new Date(deadline).toLocaleDateString()
      : null,
    category,
    clientName,
    funded: escrowFunded,
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(dealUrl);
    setCopied(true);
    toast("Link copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const isMobile =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: dealTitle, url: dealUrl });
      } catch {
        // user cancelled
      }
    } else {
      copyLink();
    }
  };

  const openUrl = (url: string) => window.open(url, "_blank", "noopener");

  const shareButtons = [
    {
      icon: <LinkIcon className="h-5 w-5" />,
      label: "Copy",
      onClick: copyLink,
    },
    {
      icon: <Share2 className="h-5 w-5" />,
      label: "Share",
      onClick: handleNativeShare,
    },
    {
      icon: <RedditIcon className="h-5 w-5" />,
      label: "Reddit",
      onClick: () =>
        openUrl(
          `https://www.reddit.com/submit?selftext=true&title=${encodeURIComponent(dealTitle + " — " + amount)}&text=${encodeURIComponent(getRedditPost(shareData))}`
        ),
    },
    {
      icon: <WhatsAppIcon className="h-5 w-5" />,
      label: "WhatsApp",
      onClick: () =>
        openUrl(
          `https://wa.me/?text=${encodeURIComponent(getWhatsAppMessage(shareData))}`
        ),
    },
    {
      icon: <TwitterXIcon className="h-5 w-5" />,
      label: "X",
      onClick: () =>
        openUrl(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(getTweet(shareData))}`
        ),
    },
    {
      icon: <FacebookIcon className="h-5 w-5" />,
      label: "Facebook",
      onClick: () =>
        openUrl(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(dealUrl)}`
        ),
    },
    {
      icon: <DiscordIcon className="h-5 w-5" />,
      label: "Discord",
      onClick: async () => {
        await navigator.clipboard.writeText(getDiscordMessage(shareData));
        toast("Discord message copied!", "success");
      },
    },
    {
      icon: <Mail className="h-5 w-5" />,
      label: "Email",
      onClick: () =>
        openUrl(
          `mailto:?subject=${encodeURIComponent(getEmailSubject(shareData))}&body=${encodeURIComponent(getEmailBody(shareData))}`
        ),
    },
    ...(isMobile
      ? [
          {
            icon: <MessageSquare className="h-5 w-5" />,
            label: "Text",
            onClick: () => {
              window.location.href = `sms:?body=${encodeURIComponent(getSMSMessage(shareData))}`;
            },
          },
        ]
      : []),
  ];

  const truncatedTitle =
    dealTitle.length > 60 ? dealTitle.slice(0, 57) + "..." : dealTitle;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      {/* Section 1 — The Link */}
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        Your payment link
      </p>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 select-all rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-slate-900">
          checkhire.co/deal/{dealSlug}
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={copyLink}
          className="cursor-pointer shrink-0"
        >
          {copied ? (
            <>
              <Check className="mr-1 h-3.5 w-3.5" />
              Copied!
            </>
          ) : (
            <>
              <LinkIcon className="mr-1 h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>

      {escrowFunded ? (
        <Badge variant="success" className="mt-3">
          Payment Secured — {amount}
        </Badge>
      ) : (
        <div className="mt-3">
          <Badge variant="warning">
            Fund escrow to show &ldquo;Payment Secured&rdquo; on your link
          </Badge>
          <a
            href="#fund"
            className="ml-2 cursor-pointer text-xs font-medium text-brand transition-colors duration-200 hover:text-brand-hover"
          >
            Fund Now
          </a>
        </div>
      )}

      {/* Section 2 — Share buttons */}
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Share anywhere
      </p>
      <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
        {shareButtons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.onClick}
            className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-3 transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50"
          >
            <span className="text-slate-600">{btn.icon}</span>
            <span className="text-xs text-slate-600">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Section 3 — Link preview */}
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Link preview
      </p>
      <div className="mt-2 max-w-sm rounded-lg border border-gray-200 bg-gray-50 p-3">
        <Shield className="h-4 w-4 text-slate-600" />
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {truncatedTitle}
        </p>
        <p className="text-xs text-slate-600">
          Escrow-protected gig — {amount}
        </p>
        <p className="text-xs text-slate-600">checkhire.co</p>
      </div>
      <p className="mt-2 text-xs text-slate-600">
        This is how your link appears when shared on social platforms
      </p>
    </div>
  );
}
