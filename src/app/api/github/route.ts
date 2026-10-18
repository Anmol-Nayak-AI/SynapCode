import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeGitHubRepository } from "@/lib/github/analyze-repository";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestContext, isAuthenticationRequired } from "@/lib/auth/context";

export const maxDuration = 60;

const inputSchema = z.object({
  repository: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/),
  ref: z.string().trim().min(1).max(120).default("main"),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!checkRateLimit(`github:${ip}`, 4).allowed) return NextResponse.json({ error: "GitHub analysis rate limit reached." }, { status: 429 });

  try {
    const context = await getRequestContext();
    if (isAuthenticationRequired() && (!context || context.mode !== "authenticated")) return NextResponse.json({ error: "Sign in and select an organization first." }, { status: 401 });
    const { repository, ref } = inputSchema.parse(await request.json());
    const result = await analyzeGitHubRepository(repository, ref);
    return NextResponse.json({ ...result.snapshot, truncated: result.truncated });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Use an owner/repository value and a valid branch or commit." }, { status: 400 });
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    const status = message.includes("404") ? 404 : message.includes("403") ? 403 : 502;
    return NextResponse.json({ error: status === 404 ? "Repository or ref not found." : status === 403 ? "GitHub rate limit reached. Add GITHUB_TOKEN for higher limits." : "GitHub analysis failed.", detail: message }, { status });
  }
}
