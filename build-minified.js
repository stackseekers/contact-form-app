#!/usr/bin/env node

// Comprehensive build script for minified contact form widget
// This script handles both development and production builds with proper minification

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check build mode from arguments or environment
const isDevMode = process.argv.includes('--dev') || process.env.BUILD_MODE === 'dev';
const isMinifiedMode = process.argv.includes('--minified') || process.env.BUILD_MODE === 'minified';

console.log('🚀 Contact Form Widget Build Script');
console.log(`Mode: ${isDevMode ? 'Development' : isMinifiedMode ? 'Minified Production' : 'Production'}`);
console.log('=====================================\n');

// Netlify environment variables
const netlifyUrl = process.env.URL || process.env.DEPLOY_URL || process.env.SITE_URL;
const recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY || '';

console.log('Environment Variables:');
console.log(`NETLIFY_URL: ${netlifyUrl || '[NOT SET]'}`);
console.log(`RECAPTCHA_SITE_KEY: ${recaptchaSiteKey ? '[SET]' : '[NOT SET]'}\n`);

// Generate timestamp for cache-busting
const timestamp = Date.now();

// Function to process JavaScript files (both original and minified)
function processJsFile(filePath, fileName) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace the environment variable detection with actual values
    const envInjection = `
            // Netlify environment variables injected at build time
            const netlifySiteUrl = '${netlifyUrl || ''}';
            
            if (netlifySiteUrl) {
                console.log('Netlify site URL from build injection:', netlifySiteUrl);
                return netlifySiteUrl + '/.netlify/functions/submit-contact';
            }
            
            // Error case - no environment variables available
            console.error('Could not detect Netlify site URL. Make sure the build process injected the environment variables.');
            return 'NETLIFY_SITE_URL_NOT_DETECTED/.netlify/functions/submit-contact';
`;

    // Replace CAPTCHA site key injection
    const captchaInjection = `
            // CAPTCHA site key injected at build time
            return '${recaptchaSiteKey}';
`;

    // Replace the entire apiUrl function content
    content = content.replace(
        /apiUrl: \(\(\) => \{[\s\S]*?\}\)\(\),/,
        `apiUrl: (() => {${envInjection}})(),`
    );

    // Replace CAPTCHA site key function content
    content = content.replace(
        /captchaSiteKey: \(\(\) => \{[\s\S]*?return '';[\s\S]*?\}\)\(\),/,
        `captchaSiteKey: (() => {${captchaInjection}})(),`
    );

    // Write the updated file
    fs.writeFileSync(filePath, content);
    console.log(`✅ Environment variables injected into ${fileName}`);
    return fileName;
}

// Function to process HTML files
function processHtmlFile(filePath, fileName) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Determine which script to use based on build mode
    const scriptFile = isMinifiedMode ? 'contact-widget.min.js' : 'contact-widget.js';

    // Add cache-busting parameter to script tags
    content = content.replace(/contact-widget\.js(\?v=\d+)?/g, `${scriptFile}?v=${timestamp}`);
    content = content.replace(/contact-widget\.min\.js(\?v=\d+)?/g, `${scriptFile}?v=${timestamp}`);
    console.log(`✅ Updated script references in ${fileName} to use ${scriptFile}`);

    // Replace placeholder URLs with actual Netlify site URL
    if (netlifyUrl) {
        content = content.replace(/\{\{NETLIFY_SITE_URL\}\}/g, netlifyUrl);
        console.log(`✅ ${fileName} URLs updated with: ${netlifyUrl}`);
    } else {
        console.warn(`⚠️  No Netlify site URL found. Placeholder URLs will remain in ${fileName}.`);
    }

    // Write the updated file
    fs.writeFileSync(filePath, content);
    return fileName;
}

// Process JavaScript files
const jsFiles = [
    { path: path.join(__dirname, 'public', 'contact-widget.js'), name: 'contact-widget.js' },
    { path: path.join(__dirname, 'public', 'contact-widget.min.js'), name: 'contact-widget.min.js' }
];

const processedFiles = [];

// Process each JavaScript file
jsFiles.forEach(file => {
    try {
        if (fs.existsSync(file.path)) {
            const fileName = processJsFile(file.path, file.name);
            processedFiles.push(fileName);
        } else {
            console.log(`⚠️  Skipping ${file.name} - file not found`);
        }
    } catch (error) {
        console.error(`❌ Error processing ${file.name}:`, error.message);
    }
});

// Handle Netlify function replacement
const originalFunctionPath = path.join(__dirname, 'netlify', 'functions', 'submit-contact.js');
const minifiedFunctionPath = path.join(__dirname, 'netlify', 'functions', 'submit-contact-min.js');

if (!isDevMode && fs.existsSync(minifiedFunctionPath)) {
    try {
        // Backup original file
        const backupPath = path.join(__dirname, 'netlify', 'functions', 'submit-contact.js.backup');
        if (fs.existsSync(originalFunctionPath)) {
            fs.copyFileSync(originalFunctionPath, backupPath);
            console.log('✅ Original submit-contact.js backed up');
        }

        // Replace with minified version
        fs.copyFileSync(minifiedFunctionPath, originalFunctionPath);
        console.log('✅ Replaced submit-contact.js with minified version');
        processedFiles.push('submit-contact.js (minified)');
    } catch (error) {
        console.error('❌ Error replacing function with minified version:', error.message);
    }
} else if (isDevMode) {
    console.log('🔧 Development mode: Using original submit-contact.js');
} else {
    console.log('⚠️  Minified function not found, using original submit-contact.js');
}

// Process HTML files
const htmlFiles = [
    { path: path.join(__dirname, 'public', 'index.html'), name: 'index.html' },
    { path: path.join(__dirname, 'public', 'example.html'), name: 'example.html' }
];

// Process each HTML file
htmlFiles.forEach(file => {
    try {
        const fileName = processHtmlFile(file.path, file.name);
        processedFiles.push(fileName);
    } catch (error) {
        console.error(`❌ Error processing ${file.name}:`, error.message);
    }
});

// Build summary
console.log('\n📊 Build Summary:');
console.log('==================');
console.log(`✅ Files processed: ${processedFiles.length}`);
processedFiles.forEach(file => console.log(`   - ${file}`));

if (isMinifiedMode) {
    console.log('\n🎯 Minified Production Build Complete!');
    console.log('   - Using contact-widget.min.js');
    console.log('   - Using submit-contact.min.js');
    console.log('   - Optimized for production deployment');
} else if (isDevMode) {
    console.log('\n🔧 Development Build Complete!');
    console.log('   - Using original files for debugging');
    console.log('   - Environment variables injected');
} else {
    console.log('\n🚀 Production Build Complete!');
    console.log('   - Using minified backend function');
    console.log('   - Environment variables injected');
}

console.log('\n📝 Next Steps:');
if (isMinifiedMode) {
    console.log('   - Deploy with: npm run deploy');
    console.log('   - Test locally: npm run dev');
} else {
    console.log('   - Deploy with: npm run deploy');
    console.log('   - For minified build: npm run build -- --minified');
}
