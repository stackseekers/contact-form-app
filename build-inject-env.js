#!/usr/bin/env node

// Build script to inject Netlify environment variables into client-side code
// This script runs during the build process to make server-side env vars available to client-side

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Netlify environment variables
const netlifyUrl = process.env.URL || process.env.DEPLOY_URL || process.env.SITE_URL || 'https://contact-form-app.stackseekers.com';
const recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY || '';

console.log('Injecting Netlify environment variables...');
console.log('NETLIFY_URL:', netlifyUrl);
console.log('RECAPTCHA_SITE_KEY:', recaptchaSiteKey ? '[SET]' : '[NOT SET]');

// Read the contact-widget.js file
const widgetPath = path.join(__dirname, 'public', 'contact-widget.js');
let widgetContent = fs.readFileSync(widgetPath, 'utf8');

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

// Replace the entire apiUrl function content - updated regex to match current structure
widgetContent = widgetContent.replace(
    /apiUrl: \(\(\) => \{[\s\S]*?\}\)\(\),/,
    `apiUrl: (() => {${envInjection}})(),`
);

// Replace CAPTCHA site key function content - more specific pattern
widgetContent = widgetContent.replace(
    /captchaSiteKey: \(\(\) => \{[\s\S]*?return '';[\s\S]*?\}\)\(\),/,
    `captchaSiteKey: (() => {${captchaInjection}})(),`
);

// Write the updated widget file
fs.writeFileSync(widgetPath, widgetContent);

// Now process the HTML file
const htmlPath = path.join(__dirname, 'public', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Add cache-busting parameter to script tags in HTML
const timestamp = Date.now();
htmlContent = htmlContent.replace(/contact-widget\.js(\?v=\d+)?/g, `contact-widget.js?v=${timestamp}`);
console.log('Added cache-busting parameter to contact-widget.js references');

// Replace placeholder URLs with actual Netlify site URL
if (netlifyUrl) {
    htmlContent = htmlContent.replace(/\{\{NETLIFY_SITE_URL\}\}/g, netlifyUrl);
    console.log('HTML file URLs updated with:', netlifyUrl);
} else {
    console.warn('Warning: No Netlify site URL found. Placeholder URLs will remain in HTML file.');
    console.warn('Make sure to set URL, DEPLOY_URL, or SITE_URL environment variable.');
}

// Write the updated HTML file
fs.writeFileSync(htmlPath, htmlContent);


console.log('Environment variables injected successfully!');
console.log('Files updated:');
console.log('- contact-widget.js');
console.log('- index.html');
