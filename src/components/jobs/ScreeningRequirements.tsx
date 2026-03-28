import { Video, FileQuestion, Clock } from "lucide-react";

interface ScreeningRequirementsProps {
  requiresVideo: boolean;
  requiresQuiz: boolean;
  questionCount?: number;
}

export function ScreeningRequirements({
  requiresVideo,
  requiresQuiz,
  questionCount = 0,
}: ScreeningRequirementsProps) {
  if (!requiresVideo && !requiresQuiz) return null;

  const items: { icon: typeof Video; label: string }[] = [];
  if (requiresVideo) {
    items.push({
      icon: Video,
      label: "60-second video introduction required",
    });
  }
  if (requiresQuiz) {
    items.push({
      icon: FileQuestion,
      label: questionCount > 0
        ? `${questionCount}-question screening quiz`
        : "Screening quiz included",
    });
  }

  // Rough time estimate
  const minutes = (requiresVideo ? 5 : 0) + (requiresQuiz ? questionCount * 1.5 : 0);
  const timeEstimate = minutes > 0 ? `~${Math.ceil(minutes)} min to complete` : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">
        Application requirements
      </h3>
      <div className="mt-3 space-y-2">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
              <Icon className="h-4 w-4 text-slate-600" />
              {item.label}
            </div>
          );
        })}
        {timeEstimate && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="h-4 w-4" />
            {timeEstimate}
          </div>
        )}
      </div>
    </div>
  );
}
