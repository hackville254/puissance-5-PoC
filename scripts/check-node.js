const fs = require('node:fs');
const path = require('node:path');

const [major, minor] = process.versions.node.split('.').map(n => Number.parseInt(n, 10));

const minMajor = 20;
const minMinor = 19;
const maxMajorExclusive = 21;

function readPinnedVersion() {
  const candidates = ['.nvmrc', '.node-version'];
  for (const file of candidates) {
    try {
      const value = fs.readFileSync(path.join(process.cwd(), file), 'utf8').trim();
      if (value) return value;
    } catch {}
  }
  return null;
}

const ok =
  Number.isFinite(major) &&
  Number.isFinite(minor) &&
  (major > minMajor || (major === minMajor && minor >= minMinor)) &&
  major < maxMajorExclusive;

if (!ok) {
  const pinned = readPinnedVersion();
  const target = pinned || '20.19.4';
  process.stderr.write(
    `Node.js ${process.versions.node} n'est pas supporte.\n` +
      `Utilise Node ${target} pour eviter des erreurs Metro/Expo.\n` +
      `\n` +
      `Solutions:\n` +
      `- nvm: nvm install ${target} && nvm use ${target}\n` +
      `- fnm: fnm install ${target} && fnm use ${target}\n` +
      `- volta (recommande si installe): volta install node@${target}\n`
  );
  process.exit(1);
}
