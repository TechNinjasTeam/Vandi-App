#!/usr/bin/env node
// Guarda PreToolUse: bloqueia qualquer referência explícita a arquivos .env.
// ponytail: só pega referência explícita; `grep -r X .` no Bash ainda atravessa .env (spec 4.3).
import assert from 'node:assert/strict';

const ALLOWED = new Set(['.env.example', '.env.sample', '.env.template']);
const FIELDS = ['file_path', 'path', 'pattern', 'glob', 'command'];
const TOKEN = /(?:^|[\s"'`=:(\/\\|;&<>,*])(\.env[\w.*-]*)/gi; // NTFS ignora caixa: .ENV lê o .env

export function blockedReason(toolInput = {}) {
  for (const field of FIELDS) {
    const value = toolInput?.[field];
    if (typeof value !== 'string') continue;
    for (const [, name] of value.matchAll(TOKEN)) {
      if (!ALLOWED.has(name.toLowerCase())) return `${field} referencia ${name}`;
    }
  }
  return null;
}

function selfCheck() {
  const blocked = [
    { file_path: 'C:\\repo\\.env' },
    { file_path: '/c/repo/.env.local' },
    { file_path: 'backend/.env.development' },
    { command: 'cat .env' },
    { command: 'grep TOKEN backend/.env.production' },
    { command: 'type .env' },
    { command: 'cat ./config/.env && echo ok' },
    { command: 'grep -r KEY --include=*.env .' },
    { pattern: '**/.env*' },
    { path: './.env' },
    { glob: '.env*' },
    { file_path: '/c/repo/.env.example.bak' },
    { file_path: 'C:\\repo\\.ENV' },
    { command: 'cat .Env.Local' },
  ];
  const allowed = [
    { file_path: '/c/repo/.env.example' },
    { command: 'cat .env.sample' },
    { file_path: 'C:\\repo\\.env.template' },
    { command: 'npm test -- src/a.test.ts' },
    { file_path: 'src/environment.ts' },
    { command: 'node -e "console.log(process.env.HOME)"' },
    { pattern: 'API_URL', path: 'src' },
    { file_path: '/c/repo/.ENV.EXAMPLE' },
    {},
  ];
  for (const input of blocked) assert.ok(blockedReason(input), `deveria bloquear ${JSON.stringify(input)}`);
  for (const input of allowed) assert.equal(blockedReason(input), null, `deveria liberar ${JSON.stringify(input)}`);
  console.log(`ok: ${blocked.length} bloqueados, ${allowed.length} liberados`);
}

function main() {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => (raw += chunk));
  process.stdin.on('end', () => {
    let reason;
    try {
      reason = blockedReason(JSON.parse(raw || '{}').tool_input);
    } catch {
      reason = 'entrada do hook ilegível'; // falha fechada: guarda de segurança
    }
    if (reason) {
      process.stderr.write(`Bloqueado pela guarda de .env (${reason}). Use .env.example ou o arquivo de settings.\n`);
      process.exit(2);
    }
  });
}

if (process.argv[2] === '--test') selfCheck();
else main();
