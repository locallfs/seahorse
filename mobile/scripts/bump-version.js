const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const raw = fs.readFileSync(appJsonPath, 'utf8');
const config = JSON.parse(raw);

const current = config.expo.version || '0.0.0';
const parts = current.split('.').map((n) => Number.parseInt(n, 10));
while (parts.length < 3) parts.push(0);
parts[2] = (parts[2] || 0) + 1;
const next = parts.join('.');

config.expo.version = next;
fs.writeFileSync(appJsonPath, JSON.stringify(config, null, 2) + '\n');

console.log(`version: ${current} -> ${next}`);
