# CheckHire Cron Jobs

CheckHire has 6 scheduled jobs that handle money flow, email reminders, and cleanup.
They are not run by Vercel cron (the free tier is limited and we removed `vercel.json`).
Instead, they run via a GitHub Actions scheduled workflow at `.github/workflows/cron-jobs.yml`.

## What runs and when

| Job | Schedule | Purpose |
|---|---|---|
| `auto-release` | every 15 min | Release escrow to freelancer 72hr after work submission. **Critical** — this is the core "freelancer auto-pay" promise of CheckHire |
| `expire-cancellation-requests` | every 15 min | Auto-escalate mutual cancellation requests that weren't responded to within 72 hours into formal disputes |
| `auto-release-warnings` | every 30 min | Send 24-hour and 6-hour warning emails to clients before auto-release fires |
| `auto-expire` | hourly | Refund unfunded deals after 30 days, ghost-refund unaccepted gigs, handle dispute non-responses |
| `expiration-warnings` | hourly | Send 14-day and 27-day warning emails for funded gigs that nobody has accepted yet |
| `rating-reminders` | every 2 hours | Nudge users to leave a rating 24 hours after a deal completes |

All endpoints use the same auth pattern: `Authorization: Bearer ${CRON_SECRET}`.

## One-time setup

You only need to do this once. After this, the workflow runs forever on its own.

### Step 1 — Add two GitHub Actions secrets

1. Open the repo on GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add:

   - **Name:** `CRON_SECRET`
     **Value:** the same value as the `CRON_SECRET` env var in your Vercel project. If you don't remember it, you can find it at: Vercel dashboard → your project → Settings → Environment Variables → `CRON_SECRET`. Copy the exact value.

3. Click **New repository secret** again and add:

   - **Name:** `CRON_BASE_URL`
     **Value:** `https://checkhire.co` (no trailing slash, no `/api` suffix — the workflow appends the path itself)

### Step 2 — Verify the workflow runs

After adding the secrets, you can manually trigger the workflow to confirm it works without waiting for the next schedule.

1. Open the repo on GitHub → **Actions** tab
2. Click **Scheduled Cron Jobs** in the left sidebar
3. Click **Run workflow** in the top right
4. Pick **all** from the dropdown and click **Run workflow**
5. Wait ~30 seconds, then refresh. You should see a new run at the top of the list.
6. Click into the run. All 4 jobs should be green.
7. Expand any job and click into a step like "Hit auto-release" — you should see logged output like `HTTP 200` and a JSON response body.

If a job is red, the most common causes are:
- The secret name is misspelled (must be exactly `CRON_SECRET` and `CRON_BASE_URL` — case-sensitive)
- The `CRON_SECRET` value doesn't match what's in Vercel — every cron will return 401
- The `CRON_BASE_URL` has a trailing slash or includes `/api` — the workflow already appends the full path

## How the schedules work

GitHub Actions runs the workflow every time any cron schedule matches the current minute. The
workflow file has 4 schedules (`*/15`, `*/30`, `5 * * * *`, `10 */2 * * *`), and each job has
an `if:` filter that only runs when the matching schedule fires it. This is why you'll see
different jobs running at different times in the Actions tab — that's the intended behavior.

GitHub Actions schedules are **best-effort** and may run a few minutes late during peak load
on GitHub's infrastructure. This is fine for all 6 jobs in this workflow because:

- `auto-release` checks for deals where `auto_release_at` is in the past — even if the cron
  fires 5 minutes late, the deal is still eligible to be released
- `expire-cancellation-requests` checks for requests where `expires_at` is in the past — same
  pattern, late firing is harmless
- The warning, cleanup, and reminder jobs all use windowed time queries that tolerate jitter

## Costs

GitHub Actions on free public repos: **unlimited minutes**.
GitHub Actions on free private repos: **2,000 minutes/month**.

This workflow uses approximately **30 minutes/month total**:
- 96 runs/day × 30 days × ~10 seconds per run ≈ 8 hours of compute, but GitHub Actions
  charges per-minute (rounded up) and most jobs finish in under 30 seconds, so the
  effective billed time is much lower.

You will not run out of free minutes from this workflow.

## How to add a new cron job

1. Create the route handler at `src/app/api/cron/your-job-name/route.ts`. Mirror the auth
   pattern from the existing files: check for `Authorization: Bearer ${CRON_SECRET}`, return
   401 if missing, do the work, return `{ok: true, ...}`.

2. Edit `.github/workflows/cron-jobs.yml`:
   - If the job fits an existing schedule (15min, 30min, hourly, 2hr), add a new step inside
     the matching job. Mirror the existing curl-based steps.
   - If the job needs a new schedule, add a new entry to `on.schedule` at the top, add a new
     job at the bottom, and add the matching `if:` filter to the new job.

3. Push and merge. The workflow picks up the new schedule on the next matching tick.

## Manually triggering a single job

The workflow supports manual triggering for testing or one-off runs:

1. Go to the **Actions** tab on GitHub
2. Click **Scheduled Cron Jobs**
3. Click **Run workflow**
4. Pick the specific job from the dropdown (or **all** to run everything)
5. Click **Run workflow**

This is useful for:
- Testing after a deploy without waiting for the next scheduled tick
- Manually firing `auto-release` if you know there are deals stuck past their release time
- Verifying a new cron endpoint works end-to-end after adding it
