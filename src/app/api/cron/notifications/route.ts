import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/config";
import { matchesSecret, readBearerToken } from "@/lib/security/secrets";
import { runScheduledNotifications } from "@/features/telegram/reminders";

/**
 * Scheduled-notifications endpoint, driven by an EXTERNAL cron (cron-job.org /
 * GitHub Actions) every ~15 min. Fires due lesson reminders (24h / 2h) and
 * homework-deadline nudges. Idempotent (each send is deduped), so an extra ping
 * is harmless. Authenticated by CRON_SECRET via `Authorization: Bearer <secret>`
 * only. GET and POST both work for cron providers that support request headers.
 */
async function run(request: NextRequest): Promise<NextResponse> {
  const secret = env.cronSecret;
  const provided = readBearerToken(request.headers.get("authorization"));
  if (!matchesSecret(provided, secret)) {
    return new NextResponse("forbidden", { status: 401 });
  }

  const result = await runScheduledNotifications();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
