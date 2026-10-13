import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('artifacts/pokemmo-damage-calc/public');

// Base SVG with sharp details, Pokéball shape, battle swords in the core, and PokéMMO red
const createSvg = (isMaskable = false) => {
  const size = 512;
  const cx = 256;
  const cy = 256;
  // If maskable, scale the ball slightly smaller to guarantee the safe zone (80% circle)
  const scale = isMaskable ? 0.72 : 0.90;
  const radius = 240 * scale;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="redHalf" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ef4444" />
      <stop offset="60%" stop-color="#dc2626" />
      <stop offset="100%" stop-color="#b91c1c" />
    </linearGradient>
    <linearGradient id="whiteHalf" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="50%" stop-color="#f1f5f9" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </linearGradient>
    <linearGradient id="bandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="glowBtn" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.5" />
    </filter>
    <clipPath id="ballClip">
      <circle cx="${cx}" cy="${cy}" r="${radius}" />
    </clipPath>
  </defs>

  ${isMaskable ? `<rect width="${size}" height="${size}" fill="url(#bgGrad)" />` : ''}

  <!-- Main Ball -->
  <g filter="${isMaskable ? 'none' : 'url(#shadow)'}">
    <!-- Outer rim -->
    <circle cx="${cx}" cy="${cy}" r="${radius + 4}" fill="#0f172a" stroke="#334155" stroke-width="3" />

    <!-- Upper Red Half -->
    <path d="M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy} Z" fill="url(#redHalf)" />
    <!-- Lower White Half -->
    <path d="M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 0 ${cx + radius} ${cy} Z" fill="url(#whiteHalf)" />

    <!-- Gloss Highlight Upper Left -->
    <ellipse cx="${cx - radius * 0.4}" cy="${cy - radius * 0.45}" rx="${radius * 0.35}" ry="${radius * 0.18}" transform="rotate(-30, ${cx - radius * 0.4}, ${cy - radius * 0.45})" fill="#ffffff" opacity="0.35" />

    <!-- Center Black Horizontal Band -->
    <rect x="${cx - radius}" y="${cy - radius * 0.14}" width="${radius * 2}" height="${radius * 0.28}" fill="url(#bandGrad)" clip-path="url(#ballClip)" />

    <!-- Center Outer Circle -->
    <circle cx="${cx}" cy="${cy}" r="${radius * 0.36}" fill="#0f172a" stroke="#334155" stroke-width="2" />
    <circle cx="${cx}" cy="${cy}" r="${radius * 0.28}" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <circle cx="${cx}" cy="${cy}" r="${radius * 0.18}" fill="url(#glowBtn)" />

    <!-- Combat Damage Swords / Lightning Spark Icon in center button -->
    <!-- Left sword -->
    <path d="M ${cx - 16 * scale} ${cy - 16 * scale} L ${cx + 16 * scale} ${cy + 16 * scale}" stroke="#ffffff" stroke-width="${4 * scale}" stroke-linecap="round" />
    <path d="M ${cx - 19 * scale} ${cy - 9 * scale} L ${cx - 9 * scale} ${cy - 19 * scale}" stroke="#ffffff" stroke-width="${3 * scale}" stroke-linecap="round" />
    <!-- Right sword -->
    <path d="M ${cx + 16 * scale} ${cy - 16 * scale} L ${cx - 16 * scale} ${cy + 16 * scale}" stroke="#ffffff" stroke-width="${4 * scale}" stroke-linecap="round" />
    <path d="M ${cx + 19 * scale} ${cy - 9 * scale} L ${cx + 9 * scale} ${cy - 19 * scale}" stroke="#ffffff" stroke-width="${3 * scale}" stroke-linecap="round" />
    <!-- Center power gem -->
    <circle cx="${cx}" cy="${cy}" r="${5 * scale}" fill="#ffffff" />
  </g>
</svg>`;
};

async function generate() {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const standardSvg = createSvg(false);
  const maskableSvg = createSvg(true);

  // Write vector SVG icons
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), standardSvg);

  // Generate PNGs using sharp
  console.log('Generating 192x192 PNG...');
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  console.log('Generating 512x512 PNG...');
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  console.log('Generating 512x512 Maskable PNG for Android Launcher...');
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  console.log('Generating 180x180 Apple Touch Icon...');
  await sharp(Buffer.from(maskableSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('Icons successfully created in', publicDir);
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
