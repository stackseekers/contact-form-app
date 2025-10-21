#!/usr/bin/env node

// Comprehensive build script for minified contact form widget
// This script handles both development and production builds with proper minification

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Contact Form Widget Build Script');
console.log('Mode: Minified Production Only');
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

    // Always use contact-widget.js (now minified)
    const scriptFile = 'contact-widget.js';

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

// Process JavaScript file (minified only)
const jsFile = { path: path.join(__dirname, 'public', 'contact-widget.js'), name: 'contact-widget.js' };

const processedFiles = [];

// Process the JavaScript file
try {
    if (fs.existsSync(jsFile.path)) {
        const fileName = processJsFile(jsFile.path, jsFile.name);
        processedFiles.push(fileName);
    } else {
        console.log(`⚠️  Skipping ${jsFile.name} - file not found`);
    }
} catch (error) {
    console.error(`❌ Error processing ${jsFile.name}:`, error.message);
}

// Function is already minified - no replacement needed
console.log('✅ Using minified submit-contact.js');
processedFiles.push('submit-contact.js (minified)');

// Process HTML files
const htmlFiles = [
    { path: path.join(__dirname, 'public', 'index.html'), name: 'index.html' },
    { path: path.join(__dirname, 'public', 'example.html'), name: 'example.html' },
    { path: path.join(__dirname, 'public', 'example-minified.html'), name: 'example-minified.html' }
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

console.log('\n🎯 Minified Production Build Complete!');
console.log('   - Using minified contact-widget.js');
console.log('   - Using minified submit-contact.js');
console.log('   - Optimized for production deployment');

console.log('\n📝 Next Steps:');
console.log('   - Deploy with: npm run deploy');
console.log('   - Test locally: npm run dev');
