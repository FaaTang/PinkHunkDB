import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(frontendDir, 'src');

const walkTests = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTests(full, out);
    else if (/\.(test|spec)\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
};

const memorySettingsSnippet = `memorySettings: {
      lowMemoryMode: false,
      advanced: {
        destroyInactiveTabs: false,
        sidebarDbCacheLimit: 12,
        runtimeSqlLogLimit: 200,
        sidebarIdleReleaseMinutes: 0,
        goGCPercent: 100,
      },
    },
`;

let changed = 0;
for (const file of walkTests(srcDir)) {
  let text = readFileSync(file, 'utf8');
  const original = text;
  if (!text.includes("vi.mock('../store'") && !text.includes('vi.mock("../store"') && !text.includes("vi.mock('../../store'")) {
    continue;
  }

  if (!text.includes('clearTabResultsClearedFlag')) {
    text = text.replace(
      /(addSqlLog:\s*vi\.fn\(\),?\n\s*sqlLogs:)/,
      '$1\n    clearTabResultsClearedFlag: vi.fn(),',
    );
  }

  if (text.includes('useStore:') && !text.includes('memorySettings')) {
    text = text.replace(
      /(appearance:\s*mocks\.state\.appearance,?\n)/,
      `$1    ${memorySettingsSnippet}`,
    );
    text = text.replace(
      /(appearance:\s*mocks\.state\.appearance,?\n\s*activeContext:)/,
      `appearance: mocks.state.appearance,\n    ${memorySettingsSnippet}    activeContext:`,
    );
  }

  if (text !== original) {
    writeFileSync(file, text);
    changed += 1;
    console.log('patched', path.relative(frontendDir, file));
  }
}

console.log('store mock files patched', changed);
