export type DiagnosticSeverity = "error" | "warning" | "security" | "suggestion";

export type DiagnosticIssue = {
  id: string;
  rule: string;
  file: string;
  line?: number;
  severity: DiagnosticSeverity;
  title: string;
  description: string;
  suggestion: string;
  codeSnippet?: string;
  fixAvailable: boolean;
};

/** Runs static analysis on SQL schema and architecture deliverables */
export function analyzeDeliverables(
  files: { name: string; content: string }[],
): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  for (const file of files) {
    const isSql =
      file.name.toLowerCase().endsWith(".sql") ||
      file.name.toLowerCase().includes("schema");
    const isArch = file.name.toLowerCase().includes("architecture");
    const isPrd = file.name.toLowerCase().includes("prd");

    if (isSql) {
      issues.push(...analyzeSqlFile(file.name, file.content));
    }

    if (isArch || isPrd) {
      issues.push(...analyzeDocsFile(file.name, file.content));
    }
  }

  return issues;
}

function analyzeSqlFile(fileName: string, content: string): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  const lines = content.split("\n");

  // 1. Check for tables without Row-Level Security (RLS)
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_."]+)/gi;
  let match: RegExpExecArray | null;
  const tables: { name: string; line: number }[] = [];

  while ((match = createTableRegex.exec(content)) !== null) {
    const rawTableName = match[1] ?? "";
    const tableName = rawTableName.replace(/["']/g, "");
    const beforeContent = content.substring(0, match.index);
    const lineNum = beforeContent.split("\n").length;
    tables.push({ name: tableName, line: lineNum });
  }

  for (const table of tables) {
    const rlsRegex = new RegExp(
      `ALTER\\s+TABLE\\s+(?:IF\\s+EXISTS\\s+)?(?:${table.name}|"${table.name}")\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
      "i",
    );

    if (!rlsRegex.test(content)) {
      issues.push({
        id: `rls-missing-${table.name}`,
        rule: "SECURITY-RLS-001",
        file: fileName,
        line: table.line,
        severity: "security",
        title: `Row-Level Security (RLS) Disabled on '${table.name}'`,
        description: `Table '${table.name}' is defined without enabling Row-Level Security. In production Supabase/PostgreSQL, all public tables should enforce RLS policies.`,
        suggestion: `Add: ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY; and define SELECT/INSERT policies.`,
        codeSnippet: `ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY;`,
        fixAvailable: true,
      });
    }
  }

  // 2. Check for Foreign Keys without Indexes
  const fkRegex = /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([a-zA-Z0-9_."]+)\s*\(([^)]+)\)/gi;
  while ((match = fkRegex.exec(content)) !== null) {
    const column = (match[1] ?? "").trim().replace(/["']/g, "");
    const targetTable = (match[2] ?? "").trim().replace(/["']/g, "");
    const beforeContent = content.substring(0, match.index);
    const lineNum = beforeContent.split("\n").length;

    // Check if an index exists for this column
    const indexRegex = new RegExp(
      `CREATE\\s+INDEX\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?([a-zA-Z0-9_]+)\\s+ON\\s+[a-zA-Z0-9_."]+\\s*\\([^)]*\\b${column}\\b[^)]*\\)`,
      "i",
    );

    if (!indexRegex.test(content)) {
      issues.push({
        id: `unindexed-fk-${column}-${lineNum}`,
        rule: "PERF-INDEX-002",
        file: fileName,
        line: lineNum,
        severity: "warning",
        title: `Unindexed Foreign Key Column '${column}'`,
        description: `Foreign key referencing '${targetTable}' on column '${column}' lacks an explicit B-tree index. This will cause slow JOIN and CASCADE queries.`,
        suggestion: `Add: CREATE INDEX idx_fk_${column} ON <table>(${column});`,
        codeSnippet: `CREATE INDEX idx_fk_${column} ON <table>(${column});`,
        fixAvailable: true,
      });
    }
  }

  // 3. Check for Primary Key format (prefer UUID)
  const serialPkRegex = /\bid\s+(?:BIG)?SERIAL\s+PRIMARY\s+KEY/gi;
  while ((match = serialPkRegex.exec(content)) !== null) {
    const beforeContent = content.substring(0, match.index);
    const lineNum = beforeContent.split("\n").length;
    issues.push({
      id: `serial-pk-${lineNum}`,
      rule: "ARCH-SCHEMA-003",
      file: fileName,
      line: lineNum,
      severity: "suggestion",
      title: "Sequential Integer Primary Key Used",
      description: `Sequential serial IDs are vulnerable to enumeration attacks and multi-region replication clashes. UUIDv4 or UUIDv7 is recommended.`,
      suggestion: `Replace with: id UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
      codeSnippet: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
      fixAvailable: true,
    });
  }

  // 4. Check for Foreign Keys missing ON DELETE clause
  const missingCascadeRegex = /REFERENCES\s+[a-zA-Z0-9_."]+\s*\([^)]+\)(?!\s*ON\s+DELETE)/gi;
  while ((match = missingCascadeRegex.exec(content)) !== null) {
    const beforeContent = content.substring(0, match.index);
    const lineNum = beforeContent.split("\n").length;
    issues.push({
      id: `missing-on-delete-${lineNum}`,
      rule: "DATA-INTEGRITY-004",
      file: fileName,
      line: lineNum,
      severity: "warning",
      title: "Foreign Key Missing 'ON DELETE' Strategy",
      description: `Foreign key definition does not specify ON DELETE CASCADE or ON DELETE SET NULL, potentially causing orphaned rows or unexpected delete errors.`,
      suggestion: `Add 'ON DELETE CASCADE' or 'ON DELETE SET NULL'.`,
      codeSnippet: `ON DELETE CASCADE`,
      fixAvailable: true,
    });
  }

  return issues;
}

function analyzeDocsFile(fileName: string, content: string): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  // Check for rate-limiting considerations in architecture
  if (!/rate[\s-]limit/i.test(content)) {
    issues.push({
      id: "sec-rate-limit",
      rule: "SECURITY-API-005",
      file: fileName,
      severity: "warning",
      title: "API Rate-Limiting Strategy Missing",
      description: "Architecture document lacks mention of API rate-limiting or DDoS protection mechanisms for public and authenticated routes.",
      suggestion: "Document a rate-limiting strategy (e.g. Upstash Redis / Cloudflare Turnstile).",
      fixAvailable: true,
    });
  }

  // Check for audit trail in architecture/PRD
  if (!/audit\s*log|activity\s*log/i.test(content)) {
    issues.push({
      id: "sec-audit-logging",
      rule: "COMPLIANCE-006",
      file: fileName,
      severity: "suggestion",
      title: "Audit Logging & Activity Tracking Not Specified",
      description: "Enterprise SaaS applications require immutable audit logs for security, compliance, and user action accountability.",
      suggestion: "Include an audit_logs table and activity stream specification.",
      fixAvailable: true,
    });
  }

  return issues;
}
