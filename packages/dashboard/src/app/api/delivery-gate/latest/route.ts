import { readdirSync, readFileSync, statSync } from 'fs';
import { basename, join, resolve } from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROOT = resolve(process.cwd(), '../..');
const REPORT_DIR = join(ROOT, 'scripts', 'test-reports');
const REPORT_PATTERN = /^e2e-delivery-gate-\d{8}_\d{6}\.md$/;

function parseCount(content: string, label: 'PASS' | 'FAIL' | 'WARN') {
  const match = content.match(new RegExp(`- ${label}:\\s*(\\d+)`));
  return match ? Number(match[1]) : 0;
}

function parseCompletedReport(path: string) {
  const content = readFileSync(path, 'utf8');
  if (!content.includes('## Summary')) return null;
  const pass = parseCount(content, 'PASS');
  const fail = parseCount(content, 'FAIL');
  const warn = parseCount(content, 'WARN');
  const total = pass + fail + warn;
  if (total === 0) return null;
  return { pass, fail, warn, total };
}

function parseReportTime(name: string) {
  const match = name.match(/^e2e-delivery-gate-(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.md$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

export async function GET() {
  try {
    const reports = readdirSync(REPORT_DIR)
      .filter((name) => REPORT_PATTERN.test(name))
      .map((name) => {
        const path = join(REPORT_DIR, name);
        return { name, path, mtimeMs: statSync(path).mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    const latest = reports
      .map((report) => ({ report, summary: parseCompletedReport(report.path) }))
      .find((item) => item.summary);

    if (!latest) {
      return NextResponse.json({
        ok: false,
        error: 'No completed E2E delivery gate reports found',
        reportDir: REPORT_DIR,
      }, { status: 404 });
    }

    const { pass, fail, warn, total } = latest.summary!;

    return NextResponse.json({
      ok: fail === 0 && warn === 0 && pass > 0,
      report: basename(latest.report.path),
      reportPath: latest.report.path,
      reportTime: parseReportTime(latest.report.name),
      checkedAt: Date.now(),
      pass,
      fail,
      warn,
      total,
      summary: `PASS=${pass} FAIL=${fail} WARN=${warn}`,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to read E2E delivery gate report',
      reportDir: REPORT_DIR,
    }, { status: 503 });
  }
}
