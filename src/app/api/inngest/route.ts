import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { analyzeRepository } from "@/inngest/functions/analyze-repository";

export const maxDuration = 60;
export const { GET, POST, PUT } = serve({ client: inngest, functions: [analyzeRepository] });
