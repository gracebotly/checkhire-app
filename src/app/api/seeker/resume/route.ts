import { withApiHandler } from "@/lib/api/withApiHandler";
import { parseResume } from "@/lib/seeker/parseResume";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const POST = withApiHandler(async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Not authenticated." },
      { status: 401 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { ok: false, code: "NO_FILE", message: "No file provided." },
      { status: 400 }
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_TYPE",
        message: "Only PDF files are accepted.",
      },
      { status: 400 }
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      {
        ok: false,
        code: "TOO_LARGE",
        message: "File must be under 5MB.",
      },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const storagePath = `${user.id}/resume.pdf`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("resumes")
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("[api/seeker/resume] Upload error:", uploadError.message);
    return NextResponse.json(
      { ok: false, code: "UPLOAD_FAILED", message: "Failed to upload resume." },
      { status: 500 }
    );
  }

  await supabaseAdmin
    .from("seeker_profiles")
    .upsert(
      {
        id: user.id,
        resume_file_url: storagePath,
        parse_status: "pending",
      },
      { onConflict: "id" }
    );

  const parseResult = await parseResume(buffer);

  if (parseResult.success) {
    const { error: updateError } = await supabaseAdmin
      .from("seeker_profiles")
      .update({
        parsed_work_history: parseResult.publicFields.work_history,
        parsed_education: parseResult.publicFields.education,
        parsed_certifications: parseResult.publicFields.certifications,
        parsed_summary: parseResult.publicFields.summary,
        skills: parseResult.publicFields.skills,
        years_experience: parseResult.publicFields.years_experience,
        parse_status: "parsed",
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[api/seeker/resume] Profile update error:", updateError.message);
    }

    if (parseResult.piiFields.full_name) {
      const { data: existingProfile } = await supabaseAdmin
        .from("user_profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (!existingProfile?.full_name) {
        await supabaseAdmin
          .from("user_profiles")
          .update({ full_name: parseResult.piiFields.full_name })
          .eq("id", user.id);
      }
    }

    return NextResponse.json({
      ok: true,
      parse_status: "parsed",
      parsed_summary: parseResult.publicFields.summary,
      skills_count: parseResult.publicFields.skills.length,
      work_history_count: parseResult.publicFields.work_history.length,
    });
  }

  await supabaseAdmin
    .from("seeker_profiles")
    .update({ parse_status: "failed" })
    .eq("id", user.id);

  return NextResponse.json({
    ok: true,
    parse_status: "failed",
    error: parseResult.error,
  });
});
