/**
 * Detect whether an account is a funded account or an evaluation/challenge account
 * based on the account name returned by the prop firm API.
 */
export function detectAccountType(name: string): "funded" | "evaluation" | "unknown" {
  const n = name.toLowerCase();
  // Evaluation / challenge / demo patterns
  if (/eval|challeng|combine|express|demo|paper|practice|sim|test|stage|step|trial/.test(n)) {
    return "evaluation";
  }
  // Funded / live / performance account patterns
  if (/funded|live|pa\b|performance|payout|profit.?split/.test(n)) {
    return "funded";
  }
  return "unknown";
}
