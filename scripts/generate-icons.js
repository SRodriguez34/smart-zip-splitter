/**
 * PWA Icon Generation Script
 * Generates all required PWA icons from a base SVG or PNG file
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icon sizes required for PWA
const ICON_SIZES = [
  16, 32, 48, 72, 96, 128, 144, 152, 192, 256, 384, 512
];

// Maskable icon sizes (for Android adaptive icons)
const MASKABLE_SIZES = [192, 512];

// Favicon sizes
const FAVICON_SIZES = [16, 32, 48];

// Apple touch icon sizes
const APPLE_SIZES = [57, 60, 72, 76, 114, 120, 144, 152, 180];

// Windows tile sizes
const TILE_SIZES = [70, 150, 310];

// Base icon configuration
const BASE_ICON = {
  input: path.join(__dirname, '../public/icon.svg'), // Base SVG file
  output: path.join(__dirname, '../public/icons'),
  backgroundColor: '#3b82f6', // Blue background for maskable icons
  padding: 10 // Padding percentage for maskable icons
};

// Ensure icons directory exists
function ensureIconsDirectory() {
  if (!fs.existsSync(BASE_ICON.output)) {
    fs.mkdirSync(BASE_ICON.output, { recursive: true });
  }
}

// Generate a single icon
async function generateIcon(size, options = {}) {
  const {
    suffix = '',
    backgroundColor = null,
    padding = 0,
    format = 'png'
  } = options;

  const filename = `icon${suffix ? `-${suffix}` : ''}-${size}.${format}`;
  const outputPath = path.join(BASE_ICON.output, filename);

  console.log(`Generating ${filename}...`);

  try {
    const iconSize = Math.round(size - (padding * size / 100));
    let pipeline = sharp(BASE_ICON.input)
      .resize(iconSize, iconSize);

    // Add background for maskable icons
    if (backgroundColor) {
      const paddingPx = Math.round(padding * size / 100 / 2);
      pipeline = pipeline.extend({
        top: paddingPx,
        bottom: paddingPx,
        left: paddingPx,
        right: paddingPx,
        background: backgroundColor
      });
    }

    // Final resize to exact dimensions
    pipeline = pipeline.resize(size, size);

    // Set format
    if (format === 'ico') {
      pipeline = pipeline.ico();
    } else {
      pipeline = pipeline.png({ compressionLevel: 9, quality: 95 });
    }

    await pipeline.toFile(outputPath);
    console.log(`✓ Generated ${filename}`);
  } catch (error) {
    console.error(`✗ Error generating ${filename}:`, error.message);
  }
}

// Generate all standard icons
async function generateStandardIcons() {
  console.log('Generating standard PWA icons...');
  
  for (const size of ICON_SIZES) {
    await generateIcon(size);
  }
}

// Generate maskable icons (for Android adaptive icons)
async function generateMaskableIcons() {
  console.log('Generating maskable icons...');
  
  for (const size of MASKABLE_SIZES) {
    await generateIcon(size, {
      suffix: 'maskable',
      backgroundColor: BASE_ICON.backgroundColor,
      padding: BASE_ICON.padding
    });
  }
}

// Generate favicons
async function generateFavicons() {
  console.log('Generating favicons...');
  
  // Generate PNG favicons
  for (const size of FAVICON_SIZES) {
    await generateIcon(size, { suffix: 'favicon' });
  }

  // Generate ICO favicon (multiple sizes in one file)
  console.log('Generating favicon.ico...');
  try {
    const icoPath = path.join(__dirname, '../public/favicon.ico');
    
    // Create ICO with multiple sizes
    const icoBuffer = await sharp(BASE_ICON.input)
      .resize(32, 32)
      .png()
      .toBuffer();
    
    fs.writeFileSync(icoPath, icoBuffer);
    console.log('✓ Generated favicon.ico');
  } catch (error) {
    console.error('✗ Error generating favicon.ico:', error.message);
  }
}

// Generate Apple touch icons
async function generateAppleIcons() {
  console.log('Generating Apple touch icons...');
  
  for (const size of APPLE_SIZES) {
    await generateIcon(size, { suffix: 'apple-touch' });
  }

  // Generate the main apple-touch-icon.png (180x180)
  try {
    const applePath = path.join(__dirname, '../public/apple-touch-icon.png');
    await sharp(BASE_ICON.input)
      .resize(180, 180)
      .png({ compressionLevel: 9, quality: 95 })
      .toFile(applePath);
    console.log('✓ Generated apple-touch-icon.png');
  } catch (error) {
    console.error('✗ Error generating apple-touch-icon.png:', error.message);
  }
}

// Generate Windows tile icons
async function generateTileIcons() {
  console.log('Generating Windows tile icons...');
  
  for (const size of TILE_SIZES) {
    await generateIcon(size, { suffix: 'tile' });
  }
}

// Generate shortcut icons (for manifest shortcuts)
async function generateShortcutIcons() {
  console.log('Generating shortcut icons...');
  
  const shortcuts = [
    { name: 'split', color: '#10b981', icon: '⚡' },
    { name: 'drive', color: '#3b82f6', icon: '☁️' },
    { name: 'settings', color: '#8b5cf6', icon: '⚙️' }
  ];

  for (const shortcut of shortcuts) {
    try {
      const filename = `shortcut-${shortcut.name}.png`;
      const outputPath = path.join(BASE_ICON.output, filename);

      // Create a simple colored icon with emoji
      const svg = `
        <svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
          <rect width="192" height="192" fill="${shortcut.color}" rx="24"/>
          <text x="96" y="120" font-size="80" text-anchor="middle" fill="white">${shortcut.icon}</text>
        </svg>
      `;

      await sharp(Buffer.from(svg))
        .png({ compressionLevel: 9, quality: 95 })
        .toFile(outputPath);

      console.log(`✓ Generated ${filename}`);
    } catch (error) {
      console.error(`✗ Error generating shortcut-${shortcut.name}.png:`, error.message);
    }
  }
}

// Generate splash screens for iOS
async function generateSplashScreens() {
  console.log('Generating iOS splash screens...');
  
  const splashSizes = [
    { width: 320, height: 568, name: 'iphone5' },
    { width: 375, height: 667, name: 'iphone6' },
    { width: 414, height: 736, name: 'iphone6plus' },
    { width: 375, height: 812, name: 'iphonex' },
    { width: 414, height: 896, name: 'iphonexr' },
    { width: 768, height: 1024, name: 'ipad' },
    { width: 1024, height: 1366, name: 'ipadpro' }
  ];

  for (const splash of splashSizes) {
    try {
      const filename = `splash-${splash.name}.png`;
      const outputPath = path.join(BASE_ICON.output, filename);

      // Create centered splash screen
      const iconSize = Math.min(splash.width, splash.height) * 0.3;
      
      const svg = `
        <svg width="${splash.width}" height="${splash.height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${splash.width}" height="${splash.height}" fill="#ffffff"/>
          <g transform="translate(${splash.width/2 - iconSize/2}, ${splash.height/2 - iconSize/2})">
            <rect width="${iconSize}" height="${iconSize}" fill="#3b82f6" rx="${iconSize * 0.1}"/>
            <text x="${iconSize/2}" y="${iconSize/2 + iconSize*0.1}" font-size="${iconSize*0.4}" text-anchor="middle" fill="white">📱</text>
          </g>
        </svg>
      `;

      await sharp(Buffer.from(svg))
        .png({ compressionLevel: 9, quality: 95 })
        .toFile(outputPath);

      console.log(`✓ Generated ${filename}`);
    } catch (error) {
      console.error(`✗ Error generating splash-${splash.name}.png:`, error.message);
    }
  }
}

// Generate all icons
async function generateAllIcons() {
  console.log('🎨 Starting PWA icon generation...\n');
  
  ensureIconsDirectory();

  try {
    await generateStandardIcons();
    await generateMaskableIcons();
    await generateFavicons();
    await generateAppleIcons();
    await generateTileIcons();
    await generateShortcutIcons();
    await generateSplashScreens();
    
    console.log('\n✅ All PWA icons generated successfully!');
    console.log(`📁 Icons saved to: ${BASE_ICON.output}`);
    
    // Generate summary
    const files = fs.readdirSync(BASE_ICON.output);
    console.log(`📊 Generated ${files.length} icon files`);
    
  } catch (error) {
    console.error('\n❌ Error during icon generation:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateAllIcons();
}

module.exports = {
  generateAllIcons,
  generateStandardIcons,
  generateMaskableIcons,
  generateFavicons,
  generateAppleIcons,
  generateTileIcons,
  generateShortcutIcons,
  generateSplashScreens
};