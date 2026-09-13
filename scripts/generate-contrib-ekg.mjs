import fs from 'node:fs';
import path from 'node:path';

const [inputPath, darkOutputPath, lightOutputPath] = process.argv.slice(2);

if (!inputPath || !darkOutputPath || !lightOutputPath) {
  console.error('Usage: node scripts/generate-contrib-ekg.mjs <input.json> <dark.svg> <light.svg>');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const total = Number(raw.totalContributions || 0);
const flatDays = (raw.weeks || [])
  .flatMap((week) => week.contributionDays || [])
  .map((day) => ({
    date: day.date,
    count: Number(day.contributionCount || 0),
  }));

const days = flatDays.slice(-84);
if (!days.length) {
  days.push({ date: new Date().toISOString().slice(0, 10), count: 0 });
}

const maxCount = Math.max(...days.map((d) => d.count), 1);
const width = 1200;
const height = 280;
const padX = 42;
const padY = 34;
const innerW = width - padX * 2;
const innerH = height - padY * 2;

const point = (index, count) => {
  const x = padX + (index / Math.max(days.length - 1, 1)) * innerW;
  const y = padY + innerH - (count / maxCount) * innerH;
  return [x, y];
};

const points = days.map((day, index) => point(index, day.count));
const polyline = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

const areaPoints = [
  `${padX},${padY + innerH}`,
  ...points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`),
  `${padX + innerW},${padY + innerH}`,
].join(' ');

const latest = days[days.length - 1];
const startDate = days[0].date;
const endDate = latest.date;

const render = ({ bg, panel, text, axis, accent, area, subtitle }) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="280" viewBox="0 0 1200 280" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Contribution EKG graph">
  <rect width="1200" height="280" rx="14" fill="${bg}"/>
  <rect x="12" y="12" width="1176" height="256" rx="10" fill="${panel}"/>
  <text x="34" y="44" fill="${text}" font-family="'JetBrains Mono', 'Fira Code', monospace" font-size="18"># stage: test</text>
  <text x="34" y="66" fill="${subtitle}" font-family="'JetBrains Mono', 'Fira Code', monospace" font-size="13">live contributions (${startDate} → ${endDate})</text>
  <line x1="42" y1="246" x2="1158" y2="246" stroke="${axis}" stroke-width="1"/>
  <line x1="42" y1="34" x2="42" y2="246" stroke="${axis}" stroke-width="1"/>
  <polygon points="${areaPoints}" fill="${area}"/>
  <polyline points="${polyline}" fill="none" stroke="${accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${points[points.length - 1][0].toFixed(2)}" cy="${points[points.length - 1][1].toFixed(2)}" r="4" fill="${accent}">
    <animate attributeName="r" values="4;6;4" dur="1.4s" repeatCount="indefinite"/>
  </circle>
  <text x="850" y="44" fill="${text}" font-family="'JetBrains Mono', 'Fira Code', monospace" font-size="13">total=${total}</text>
  <text x="850" y="64" fill="${text}" font-family="'JetBrains Mono', 'Fira Code', monospace" font-size="13">latest_day=${latest.count}</text>
</svg>`;

const darkSvg = render({
  bg: '#0A0A0A',
  panel: '#111111',
  text: '#E7E5E4',
  subtitle: '#A8A29E',
  axis: '#2F2F2F',
  accent: '#FFB454',
  area: 'rgba(255, 180, 84, 0.14)',
});

const lightSvg = render({
  bg: '#F5F5F4',
  panel: '#FFFFFF',
  text: '#292524',
  subtitle: '#57534E',
  axis: '#D6D3D1',
  accent: '#B45309',
  area: 'rgba(180, 83, 9, 0.14)',
});

for (const output of [darkOutputPath, lightOutputPath]) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
}

fs.writeFileSync(darkOutputPath, darkSvg);
fs.writeFileSync(lightOutputPath, lightSvg);

console.log(`Wrote ${darkOutputPath} and ${lightOutputPath}`);
