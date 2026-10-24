export const FREE_REPOSITORY_LIMIT = 1;
export const FREE_MONTHLY_ANALYSIS_LIMIT = 3;

export interface AnalysisUsage {
  repositories: number;
  analysesThisMonth: number;
  repositoryExists: boolean;
}

export type AnalysisAccess =
  | { allowed: true }
  | { allowed: false; reason: string; upgradeUrl: "/pricing?from=console" };

export function evaluateAnalysisAccess(unlimitedAnalyses: boolean, usage: AnalysisUsage): AnalysisAccess {
  if (unlimitedAnalyses) return { allowed: true };
  if (!usage.repositoryExists && usage.repositories >= FREE_REPOSITORY_LIMIT) {
    return { allowed: false, reason: "The Free plan includes one repository. Upgrade to Pro or Business to add another.", upgradeUrl: "/pricing?from=console" };
  }
  if (usage.analysesThisMonth >= FREE_MONTHLY_ANALYSIS_LIMIT) {
    return { allowed: false, reason: "The Free plan's three monthly analyses have been used. Upgrade to continue.", upgradeUrl: "/pricing?from=console" };
  }
  return { allowed: true };
}
