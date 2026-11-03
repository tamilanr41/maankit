import { spawnSync } from 'node:child_process';

const [app, ...args] = process.argv.slice(2);
if (!['frontend', 'backend'].includes(app) || args.length === 0) {
  throw new Error('Usage: node scripts/run-npm.js <frontend|backend> <npm command and arguments>');
}

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this helper through an npm script so npm can provide its CLI path.');

const result = spawnSync(process.execPath, [npmCli, '--prefix', app, ...args], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
