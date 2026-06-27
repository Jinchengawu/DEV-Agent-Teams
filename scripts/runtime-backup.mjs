#!/usr/bin/env node
import { existsSync, cpSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const dataDir = resolve(process.env.DEV_AGENT_DATA_DIR || join(homedir(), '.dev-agent/data'));
const logDir = resolve(process.env.DEV_AGENT_LOG_DIR || join(homedir(), '.dev-agent/logs'));
const backupRoot = resolve(process.env.DEV_AGENT_BACKUP_DIR || join(root, 'runtime-backups'));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = join(backupRoot, `dev-agent-runtime-${stamp}`);

function git(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function summarizeDir(path) {
  if (!existsSync(path)) return { exists: false, files: 0, bytes: 0 };
  let files = 0;
  let bytes = 0;
  const visit = (dir) => {
    for (const name of readdirSync(dir)) {
      const next = join(dir, name);
      const stat = statSync(next);
      if (stat.isDirectory()) visit(next);
      else {
        files += 1;
        bytes += stat.size;
      }
    }
  };
  visit(path);
  return { exists: true, files, bytes };
}

const manifest = {
  product: 'dev-agent-teams',
  generatedAt: new Date().toISOString(),
  dryRun,
  git: {
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD']),
    commit: git(['rev-parse', 'HEAD']),
    dirty: git(['status', '--porcelain=v1']) !== '',
  },
  source: {
    dataDir,
    logDir,
    data: summarizeDir(dataDir),
    logs: summarizeDir(logDir),
  },
  target,
};

if (!dryRun) {
  mkdirSync(target, { recursive: true });
  if (existsSync(dataDir)) cpSync(dataDir, join(target, 'data'), { recursive: true });
  if (existsSync(logDir)) cpSync(logDir, join(target, 'logs'), { recursive: true });
  writeFileSync(join(target, 'backup-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(JSON.stringify(manifest, null, 2));
