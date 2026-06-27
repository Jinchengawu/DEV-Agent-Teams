#!/usr/bin/env node
import { existsSync, cpSync, readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const confirm = args.includes('--confirm');
const backupArg = args.find((arg) => !arg.startsWith('--'));

if (!backupArg) {
  console.error('Usage: node scripts/runtime-restore.mjs <backup-dir> [--dry-run|--confirm]');
  process.exit(2);
}

if (!dryRun && !confirm) {
  console.error('Refusing to restore without --confirm. Use --dry-run to inspect first.');
  process.exit(2);
}

const backupDir = resolve(backupArg);
const dataSource = join(backupDir, 'data');
const logSource = join(backupDir, 'logs');
const manifestPath = join(backupDir, 'backup-manifest.json');
const dataTarget = resolve(process.env.DEV_AGENT_DATA_DIR || join(homedir(), '.dev-agent/data'));
const logTarget = resolve(process.env.DEV_AGENT_LOG_DIR || join(homedir(), '.dev-agent/logs'));

if (!existsSync(backupDir)) {
  console.error(`Backup directory not found: ${backupDir}`);
  process.exit(1);
}

const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : null;

const plan = {
  product: 'dev-agent-teams',
  dryRun,
  backupDir,
  manifestFound: Boolean(manifest),
  source: {
    data: existsSync(dataSource) ? dataSource : null,
    logs: existsSync(logSource) ? logSource : null,
  },
  target: {
    data: dataTarget,
    logs: logTarget,
  },
};

if (!dryRun) {
  if (existsSync(dataSource)) {
    mkdirSync(dataTarget, { recursive: true });
    cpSync(dataSource, dataTarget, { recursive: true });
  }
  if (existsSync(logSource)) {
    mkdirSync(logTarget, { recursive: true });
    cpSync(logSource, logTarget, { recursive: true });
  }
}

console.log(JSON.stringify(plan, null, 2));
