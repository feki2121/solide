const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Standard icon SVG (Full flame & dance emblem with gradient)
const standardSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF6B4A"/>
      <stop offset="100%" stop-color="#E63946"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#700b14" flood-opacity="0.35"/>
    </filter>
  </defs>
  <!-- Background with slight rounded corners -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  
  <!-- Subtle inner glow ring -->
  <rect x="12" y="12" width="488" height="488" rx="100" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="6"/>

  <!-- Stylized Flame & Trophy Silhouette in pure white -->
  <g filter="url(#shadow)" fill="#FFFFFF">
    <!-- Flame / Battle energy body -->
    <path d="M256 80 C270 140 330 180 340 240 C352 310 305 380 240 395 C175 410 115 350 125 280 C130 245 155 220 180 200 C182 230 205 255 235 250 C240 210 215 170 210 130 C225 115 242 98 256 80 Z" />
    <path d="M260 210 C290 250 310 290 295 335 C280 370 240 380 220 350 C205 330 210 300 225 280 C235 265 248 245 260 210 Z" fill="#FFE3DD"/>
    <!-- Small star accent -->
    <path d="M360 120 L368 142 L390 150 L368 158 L360 180 L352 158 L330 150 L352 142 Z" fill="#FFF"/>
  </g>

  <!-- Typography badge at bottom -->
  <text x="256" y="445" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="34" letter-spacing="4" fill="#FFFFFF" text-anchor="middle" opacity="0.95">JUDGEMENT</text>
</svg>
`;

// 2. Maskable SVG (Extra safe area - icon confined to central 60%)
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF6B4A"/>
      <stop offset="100%" stop-color="#E63946"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#700b14" flood-opacity="0.3"/>
    </filter>
  </defs>
  <!-- Full bleed background for maskable -->
  <rect width="512" height="512" fill="url(#bgGrad)"/>
  
  <!-- Scaled center icon inside safe zone (radius < 200px) -->
  <g transform="translate(64, 45) scale(0.75)" filter="url(#shadow)" fill="#FFFFFF">
    <path d="M256 80 C270 140 330 180 340 240 C352 310 305 380 240 395 C175 410 115 350 125 280 C130 245 155 220 180 200 C182 230 205 255 235 250 C240 210 215 170 210 130 C225 115 242 98 256 80 Z" />
    <path d="M260 210 C290 250 310 290 295 335 C280 370 240 380 220 350 C205 330 210 300 225 280 C235 265 248 245 260 210 Z" fill="#FFE3DD"/>
    <path d="M360 120 L368 142 L390 150 L368 158 L360 180 L352 158 L330 150 L352 142 Z" fill="#FFF"/>
    <text x="256" y="445" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="36" letter-spacing="4" fill="#FFFFFF" text-anchor="middle">JUDGEMENT</text>
  </g>
</svg>
`;

async function generate() {
  const stdBuffer = Buffer.from(standardSvg);
  const maskBuffer = Buffer.from(maskableSvg);

  // Write base SVG
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg.trim());

  // 192x192
  await sharp(stdBuffer).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192x192.png'));
  await sharp(maskBuffer).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192x192-maskable.png'));

  // 512x512
  await sharp(stdBuffer).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512x512.png'));
  await sharp(maskBuffer).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512x512-maskable.png'));

  // Apple touch icon (180x180)
  await sharp(stdBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(stdBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-icon.png'));
  await sharp(stdBuffer).resize(180, 180).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'));

  // Favicons 32x32
  await sharp(stdBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'icon-light-32x32.png'));
  await sharp(stdBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'icon-dark-32x32.png'));

  console.log('✅ PWA icons successfully generated!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
