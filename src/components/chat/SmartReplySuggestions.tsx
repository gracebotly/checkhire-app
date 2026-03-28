"use client";

import type { ApplicationStatus, DisclosureLevel } from "@/types/database";

interface SmartReplySuggestionsProps {
  otherPartyName: string; // pseudonym, first name, or company name
  applicationStatus: ApplicationStatus;
  disclosureLevel: DisclosureLevel;
  isEmployer: boolean;
  messageCount: number;
  onSelect: (text: string) => void;
}

type Suggestion = {
  label: string;
  text: string;
};

/**
 * Context-aware reply suggestions shown as clickable chips above the chat input.
 * Different suggestions based on:
 * - Who the user is (employer vs candidate)
 * - What stage the application is at
 * - How many messages have been exchanged (first message vs follow-up)
 *
 * Design system: lucide-react icons only, cursor-pointer, transition-colors, no hover:scale.
 */
export function SmartReplySuggestions({
  otherPartyName,
  applicationStatus,
  disclosureLevel,
  isEmployer,
  messageCount,
  onSelect,
}: SmartReplySuggestionsProps) {
  const suggestions = getSuggestions({
    otherPartyName,
    applicationStatus,
    disclosureLevel,
    isEmployer,
    messageCount,
  });

  if (suggestions.length === 0) return null;

  return (
    <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2">
      <p className="mb-1.5 text-[10px] font-medium text-slate-600">Quick replies</p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onSelect(s.text)}
            className="cursor-pointer rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-slate-900 transition-colors duration-200 hover:border-brand hover:text-brand"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function getSuggestions(ctx: {
  otherPartyName: string;
  applicationStatus: ApplicationStatus;
  disclosureLevel: DisclosureLevel;
  isEmployer: boolean;
  messageCount: number;
}): Suggestion[] {
  const { otherPartyName, applicationStatus, isEmployer, messageCount } = ctx;

  if (isEmployer) {
    // Employer suggestions
    if (messageCount === 0) {
      // First message — introduction
      return [
        {
          label: "Introduce yourself",
          text: `Hi ${otherPartyName}, thank you for applying. I'd like to learn more about your experience. Could you tell me about your most relevant project?`,
        },
        {
          label: "Ask about availability",
          text: `Hi ${otherPartyName}, thanks for your interest in this role. What is your availability for a brief conversation this week?`,
        },
        {
          label: "Screening follow-up",
          text: `Hi ${otherPartyName}, thanks for applying. I reviewed your screening answers and have a few follow-up questions. Do you have time for a quick chat?`,
        },
      ];
    }

    if (applicationStatus === "interview_accepted") {
      return [
        {
          label: "Propose interview times",
          text: `Great, I'd love to schedule an interview. I'll send you some time slots — please pick the one that works best for you.`,
        },
        {
          label: "Share prep info",
          text: `Looking forward to meeting you. The interview will be about 30 minutes. Please come prepared to discuss your experience with the key skills listed in the job description.`,
        },
      ];
    }

    if (applicationStatus === "offered") {
      return [
        {
          label: "Discuss next steps",
          text: `Congratulations! We'd like to move forward with an offer. I'll share the details shortly — please let me know if you have any questions.`,
        },
      ];
    }

    // Generic follow-up
    return [
      {
        label: "Follow up",
        text: `Hi ${otherPartyName}, just following up — do you have any questions about the role or next steps?`,
      },
      {
        label: "Thank you",
        text: `Thanks for getting back to me, ${otherPartyName}. I appreciate the detail.`,
      },
    ];
  } else {
    // Candidate suggestions
    if (messageCount === 0) {
      return [
        {
          label: "Express interest",
          text: `Thank you for reaching out! I'm very interested in this role and happy to discuss my experience in more detail.`,
        },
        {
          label: "Ask about the role",
          text: `Thanks for the message. I'd love to learn more about the day-to-day responsibilities and team structure for this role.`,
        },
      ];
    }

    if (applicationStatus === "interview_accepted") {
      return [
        {
          label: "Confirm readiness",
          text: `I'm looking forward to the interview. Please let me know the time and I'll make sure to be prepared.`,
        },
        {
          label: "Ask about format",
          text: `Thanks! Could you let me know what the interview format will be and who I'll be speaking with?`,
        },
      ];
    }

    // Generic follow-up
    return [
      {
        label: "Thank you",
        text: `Thank you for the update — I appreciate you keeping me informed.`,
      },
      {
        label: "Ask a question",
        text: `Thanks for getting back to me. I have a quick question about the role — would now be a good time?`,
      },
    ];
  }
}
