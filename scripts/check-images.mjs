import { readdirSync, readFileSync } from 'node:fs';

const issuesDir = new URL('../src/data/issues/', import.meta.url);
const maxConcurrency = 8;
const timeoutMs = 12_000;

function collectEntries() {
  const entries = [];

  for (const name of readdirSync(issuesDir).sort()) {
    const match = name.match(/^([0-9]{4}-[0-9]{2})\.txt$/);

    if (!match) {
      continue;
    }

    const lines = readFileSync(new URL(name, issuesDir), 'utf8').split(/\r?\n/);

    lines.forEach((rawLine, index) => {
      const value = rawLine.trim();

      if (!value || value.startsWith('#')) {
        return;
      }

      const url = value.split('|')[0].trim();

      try {
        const parsed = new URL(url);

        if (parsed.protocol !== 'https:') {
          return;
        }

        entries.push({ issue: match[1], line: index + 1, url: parsed.href });
      } catch {
        console.warn(`[${match[1]}:${index + 1}] invalid URL: ${url}`);
      }
    });
  }

  return entries;
}

async function isReachable(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  };

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (response.status === 405 || response.status === 501) {
      const ranged = await fetch(url, {
        headers: { ...headers, Range: 'bytes=0-0' },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
      return ranged.status === 200 || ranged.status === 206;
    }

    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

const entries = collectEntries();
const results = await mapWithConcurrency(entries, maxConcurrency, async (entry) => ({
  ...entry,
  ok: await isReachable(entry.url),
}));

const broken = results.filter((result) => !result.ok);

for (const result of broken) {
  console.error(`[${result.issue}:${result.line}] UNREACHABLE ${result.url}`);
}

console.log(`Checked ${results.length} image URLs; ${broken.length} unreachable.`);
process.exitCode = broken.length === 0 ? 0 : 1;