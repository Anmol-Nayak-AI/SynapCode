import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeFiles } from "@/lib/parser/analyze-files";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestContext, isAuthenticationRequired } from "@/lib/auth/context";

const requestSchema = z.object({
  repository: z.string().trim().min(1).max(160).default("uploaded/source"),
  branch: z.string().trim().min(1).max(120).default("main"),
  commit: z.string().trim().min(1).max(80).default("local"),
  files: z.array(z.object({
    path: z.string().min(1).max(500).regex(/\.[jt]sx?$/),
    content: z.string().max(250_000),
  })).min(1).max(350),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const rate = checkRateLimit(`analyze:${ip}`);
  if (!rate.allowed) return NextResponse.json({ error: "Analysis rate limit reached. Try again in one minute." }, { status: 429 });

  try {
    const context = await getRequestContext();
    if (isAuthenticationRequired() && (!context || context.mode !== "authenticated")) return NextResponse.json({ error: "Sign in and select an organization first." }, { status: 401 });
    const payload = requestSchema.parse(await request.json());
    const totalBytes = payload.files.reduce((sum, file) => sum + Buffer.byteLength(file.content), 0);
    if (totalBytes > 2_000_000) return NextResponse.json({ error: "Source payload exceeds the 2 MB analysis limit." }, { status: 413 });
    const snapshot = analyzeFiles(payload.files, payload);
    return NextResponse.json(snapshot, { headers: { "x-ratelimit-remaining": String(rate.remaining) } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid analysis payload", details: z.treeifyError(error) }, { status: 400 });
    console.error("Analysis failed", error);
    return NextResponse.json({ error: "Analysis failed safely. No repository data was stored." }, { status: 500 });
  }
}
