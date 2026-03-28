/**
 * LLM-powered resume parsing using Claude API.
 *
 * Flow:
 * 1. Extract raw text from PDF using unpdf
 * 2. Send text to Claude with a structured JSON schema
 * 3. Return parsed fields (public) and PII fields (private) separately
 *
 * This runs server-side only (API routes).
 */

import { extractText, getDocumentProxy } from "unpdf";

export type ResumeParseResult = {
  success: boolean;
  publicFields: {
    work_history: Array<{
      title: string;
      company: string;
      start_date: string | null;
      end_date: string | null;
      description: string | null;
    }>;
    education: Array<{
      degree: string;
      school: string;
      field: string | null;
      graduation_year: number | null;
    }>;
    skills: string[];
    certifications: string[];
    summary: string;
    years_experience: number | null;
  };
  piiFields: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
  rawText: string;
  error?: string;
};

const PARSE_SYSTEM_PROMPT = `You are a resume parser. Extract structured data from the resume text provided.

Return ONLY valid JSON with this exact structure (no markdown, no backticks, no explanation):

{
  "full_name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "summary": "A 2-3 sentence professional summary of the candidate",
  "years_experience": "number or null - estimate total years of professional experience",
  "skills": ["array", "of", "skill", "strings"],
  "certifications": ["array", "of", "certification", "strings"],
  "work_history": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "start_date": "YYYY-MM or null",
      "end_date": "YYYY-MM or null (null if current)",
      "description": "Brief description of role responsibilities"
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "school": "School Name",
      "field": "Field of Study or null",
      "graduation_year": "number or null"
    }
  ]
}

Rules:
- Return ONLY the JSON object, nothing else
- If a field cannot be determined, use null
- For skills, extract individual skills as separate array items
- For work_history, list in reverse chronological order (most recent first)
- Estimate years_experience from the work history dates
- The summary should be written in third person`;

/**
 * Extracts text from a PDF buffer using unpdf (serverless-compatible pdf.js wrapper).
 */
async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  const uint8 = new Uint8Array(pdfBuffer);
  const doc = await getDocumentProxy(uint8);
  const { text } = await extractText(doc);
  return text;
}

/**
 * Sends extracted resume text to Claude API for structured extraction.
 */
async function callClaudeForParsing(resumeText: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }

  // Truncate very long resumes to avoid token limits (keep first ~8000 chars)
  const truncatedText =
    resumeText.length > 8000
      ? resumeText.substring(0, 8000) + "\n\n[Resume truncated for processing]"
      : resumeText;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: PARSE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Parse this resume:\n\n${truncatedText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const textContent = data.content?.find(
    (block: { type: string }) => block.type === "text"
  );

  if (!textContent?.text) {
    throw new Error("No text content in Claude response");
  }

  // Parse the JSON response — strip any markdown fences if present
  const cleanJson = textContent.text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  return JSON.parse(cleanJson);
}

/**
 * Main entry point: parse a resume PDF buffer into structured data.
 */
export async function parseResume(pdfBuffer: Buffer): Promise<ResumeParseResult> {
  let rawText = "";

  try {
    // Step 1: Extract text from PDF
    rawText = await extractPdfText(pdfBuffer);

    if (!rawText || rawText.trim().length < 50) {
      return {
        success: false,
        publicFields: emptyPublicFields(),
        piiFields: { full_name: null, email: null, phone: null },
        rawText,
        error:
          "Could not extract sufficient text from PDF. The file may be image-based or corrupted.",
      };
    }

    // Step 2: Send to Claude for structured extraction
    const parsed = await callClaudeForParsing(rawText);

    // Step 3: Separate public fields from PII
    const publicFields = {
      work_history: Array.isArray(parsed.work_history) ? parsed.work_history : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      years_experience:
        typeof parsed.years_experience === "number" ? parsed.years_experience : null,
    };

    const piiFields = {
      full_name: typeof parsed.full_name === "string" ? parsed.full_name : null,
      email: typeof parsed.email === "string" ? parsed.email : null,
      phone: typeof parsed.phone === "string" ? parsed.phone : null,
    };

    return {
      success: true,
      publicFields,
      piiFields,
      rawText,
    };
  } catch (err) {
    console.error("[parseResume] Error:", err);
    return {
      success: false,
      publicFields: emptyPublicFields(),
      piiFields: { full_name: null, email: null, phone: null },
      rawText,
      error: err instanceof Error ? err.message : "Resume parsing failed",
    };
  }
}

function emptyPublicFields(): ResumeParseResult["publicFields"] {
  return {
    work_history: [],
    education: [],
    skills: [],
    certifications: [],
    summary: "",
    years_experience: null,
  };
}
