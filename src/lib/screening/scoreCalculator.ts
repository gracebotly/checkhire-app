import type { ScreeningQuestion } from "@/types/database";

/**
 * Calculates a candidate's screening score based on their responses
 * and the question scoring rubric.
 *
 * Scoring rules:
 * - multiple_choice: if response matches an option and point_value > 0, award points
 * - yes_no: if response matches the "positive" answer (not the knockout_answer), award points
 * - numerical: if point_value > 0 and response >= 2, award points (threshold-based)
 * - short_answer: no auto-scoring (point_value always 0 for these)
 *
 * Returns total score (0–N where N = sum of all point_values).
 */
export function calculateScreeningScore(
  questions: ScreeningQuestion[],
  responses: Record<string, unknown>
): number {
  let score = 0;

  for (const q of questions) {
    if (q.point_value <= 0) continue;

    const response = responses[q.id];
    if (response === undefined || response === null || response === "") continue;

    switch (q.question_type) {
      case "yes_no": {
        const answer = String(response);
        // Award points if the answer is NOT the knockout answer
        // If no knockout_answer is set, award points for "Yes"
        if (q.knockout_answer) {
          if (answer !== q.knockout_answer) {
            score += q.point_value;
          }
        } else if (answer === "Yes") {
          score += q.point_value;
        }
        break;
      }

      case "numerical": {
        const num = Number(response);
        // Award points if the numerical answer meets a basic threshold (>= 2)
        // This is a simple heuristic; employers set point_value to weight importance
        if (!isNaN(num) && num >= 2) {
          score += q.point_value;
        }
        break;
      }

      case "multiple_choice": {
        // For multiple choice, any valid response earns the points
        // (More sophisticated scoring would require a "correct answer" field — future enhancement)
        const answer = String(response);
        if (q.options && q.options.includes(answer)) {
          score += q.point_value;
        }
        break;
      }

      // short_answer: no auto-scoring
      default:
        break;
    }
  }

  return score;
}

/**
 * Checks if any knockout questions were answered with the knockout answer.
 *
 * Returns:
 * - knocked_out: true if the candidate should be auto-rejected
 * - failed_questions: array of question IDs that triggered knockout
 */
export function checkKnockouts(
  questions: ScreeningQuestion[],
  responses: Record<string, unknown>
): { knocked_out: boolean; failed_questions: string[] } {
  const failed: string[] = [];

  for (const q of questions) {
    if (!q.is_knockout || !q.knockout_answer) continue;

    const response = responses[q.id];
    if (response === undefined || response === null) continue;

    if (String(response) === q.knockout_answer) {
      failed.push(q.id);
    }
  }

  return {
    knocked_out: failed.length > 0,
    failed_questions: failed,
  };
}

/**
 * Returns the maximum possible score for a set of questions.
 * Useful for displaying "Score: 85/100" in the UI.
 */
export function getMaxScore(questions: ScreeningQuestion[]): number {
  return questions.reduce((sum, q) => sum + (q.point_value || 0), 0);
}
