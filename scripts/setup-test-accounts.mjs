import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomBytes, scryptSync } from 'node:crypto';
import { createSeed, upgradeStore } from '../packages/core/model.mjs';
let state;
try { state = upgradeStore(JSON.parse(await readFile(new URL('../apps/api/data/demo.json', import.meta.url), 'utf8'))); }
catch (error) { if (error.code !== 'ENOENT') throw error; state = createSeed(); }
const accounts = [['pai', 'family'], ['secretaria', 'secretary'], ['professor', 'teacher']].map(([name, role]) => {
  const actor = state.actors.find(a => a.role === role && a.active !== false);
  if (!actor) throw Error(`Perfil ${role} não encontrado.`);
  const salt = randomBytes(24).toString('hex');
  return { email: `${name}@thinksystems.com.br`, actorId: actor.id, salt,
    passwordHash: scryptSync('password', salt, 64).toString('hex') };
});
const output = new URL('../apps/api/data/test-accounts.json', import.meta.url);
await mkdir(new URL('../apps/api/data/', import.meta.url), { recursive: true });
await writeFile(output, JSON.stringify(accounts, null, 2), { mode: 0o600 });
console.log('Contas de teste criadas: ' + output.pathname);
