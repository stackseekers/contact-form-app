export const config = {
    method: ["POST", "OPTIONS"]
};

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 5;

// Sanitize input to prevent XSS
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
}

// Rate limiting function
function checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;

    // Clean up old entries
    for (const [key, timestamps] of rateLimitMap.entries()) {
        const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
        if (validTimestamps.length === 0) {
            rateLimitMap.delete(key);
        } else {
            rateLimitMap.set(key, validTimestamps);
        }
    }

    // Check current IP
    const ipTimestamps = rateLimitMap.get(ip) || [];
    const validTimestamps = ipTimestamps.filter(timestamp => timestamp > windowStart);

    if (validTimestamps.length >= MAX_REQUESTS) {
        return false;
    }

    validTimestamps.push(now);
    rateLimitMap.set(ip, validTimestamps);
    return true;
}

// Verify reCAPTCHA
async function verifyCaptcha(token, secretKey) {
    if (!token || !secretKey) return false;

    try {
        const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${secretKey}&response=${token}`
        });

        const result = await response.json();
        return result.success === true;
    } catch (error) {
        console.error('CAPTCHA verification error:', error);
        return false;
    }
}

export default async function handler(event, context) {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400"
    };

    // Handle preflight requests
    if (event.method === "OPTIONS") {
        return new Response("", { status: 200, headers });
    }

    // Only allow POST requests
    if (event.method !== "POST") {
        return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            { status: 405, headers }
        );
    }

    // Get environment variables
    const notionApiKey = process.env.NOTION_API_KEY;
    const notionDatabaseId = process.env.NOTION_DATABASE_ID;
    const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;

    // Check if Notion is configured
    if (!notionApiKey || !notionDatabaseId) {
        console.error('Missing Notion configuration:', {
            hasApiKey: !!notionApiKey,
            hasDatabaseId: !!notionDatabaseId
        });
        return new Response(
            JSON.stringify({
                error: "Notion configuration missing. Please set NOTION_API_KEY and NOTION_DATABASE_ID environment variables."
            }),
            { status: 500, headers }
        );
    }

    try {
        // Get client IP for rate limiting
        const clientIP = event.headers.get('x-forwarded-for') ||
            event.headers.get('x-real-ip') ||
            context.clientContext?.identity?.url ||
            'unknown';

        // Check rate limit
        if (!checkRateLimit(clientIP)) {
            return new Response(
                JSON.stringify({ error: "Too many requests. Please wait before submitting again." }),
                { status: 429, headers }
            );
        }

        // Parse form data
        const formData = await event.json();

        if (!formData || Object.keys(formData).length === 0) {
            return new Response(
                JSON.stringify({ error: "No form data received." }),
                { status: 400, headers }
            );
        }

        // Verify CAPTCHA if provided
        if (formData.captchaToken && recaptchaSecretKey) {
            const captchaValid = await verifyCaptcha(formData.captchaToken, recaptchaSecretKey);
            if (!captchaValid) {
                return new Response(
                    JSON.stringify({ error: "CAPTCHA verification failed. Please try again." }),
                    { status: 400, headers }
                );
            }
        }

        // Sanitize form data
        const sanitizedData = {};
        Object.entries(formData).forEach(([key, value]) => {
            if (key !== 'captchaToken') {
                if (typeof value === 'string') {
                    sanitizedData[key] = sanitizeInput(value);
                } else {
                    sanitizedData[key] = value;
                }
            }
        });

        // Validate email format
        if (sanitizedData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedData.email)) {
            return new Response(
                JSON.stringify({ error: "Invalid email format." }),
                { status: 400, headers }
            );
        }

        // Prepare Notion page properties
        const notionProperties = {
            "Status": { select: { name: "New" } },
            "Date Received": { date: { start: new Date().toISOString() } }
        };

        // Map form fields to Notion properties
        Object.entries(sanitizedData).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                switch (key) {
                    case 'name':
                        notionProperties["Name"] = { title: [{ text: { content: value } }] };
                        break;
                    case 'email':
                        notionProperties["Email"] = { email: value };
                        break;
                    case 'phone':
                        notionProperties["Phone"] = { phone_number: value };
                        break;
                    case 'company':
                        notionProperties["Company"] = { rich_text: [{ text: { content: value } }] };
                        break;
                    case 'subject':
                        notionProperties["Subject"] = { rich_text: [{ text: { content: value } }] };
                        break;
                    case 'message':
                        notionProperties["Message"] = { rich_text: [{ text: { content: value } }] };
                        break;
                    case 'website':
                        notionProperties["Website"] = { url: value };
                        break;
                    case 'budget':
                        notionProperties["Budget"] = { rich_text: [{ text: { content: value } }] };
                        break;
                    case 'newsletter':
                        notionProperties["Newsletter"] = { select: { name: value ? "Yes" : "No" } };
                        break;
                    default:
                        notionProperties[key.charAt(0).toUpperCase() + key.slice(1)] = {
                            rich_text: [{ text: { content: String(value) } }]
                        };
                }
            }
        });

        // Create Notion page
        const notionPayload = {
            parent: { database_id: notionDatabaseId },
            properties: notionProperties
        };

        console.log('Submitting to Notion:', {
            databaseId: notionDatabaseId,
            properties: Object.keys(notionProperties)
        });

        const notionResponse = await fetch("https://api.notion.com/v1/pages", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${notionApiKey}`,
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(notionPayload)
        });

        if (!notionResponse.ok) {
            const errorText = await notionResponse.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: errorText };
            }

            console.error("Notion API error:", errorData);
            return new Response(
                JSON.stringify({
                    error: errorData.error || errorData.message || `Notion API error: ${notionResponse.status}`
                }),
                { status: notionResponse.status, headers }
            );
        }

        const notionResult = await notionResponse.json();

        console.log("Contact form submitted successfully:", {
            ...sanitizedData,
            notionPageId: notionResult.id,
            clientIP: clientIP
        });

        return new Response(
            JSON.stringify({
                success: true,
                message: "Contact form submitted successfully",
                pageId: notionResult.id
            }),
            { status: 200, headers }
        );

    } catch (error) {
        console.error("Contact form submission error:", error);
        return new Response(
            JSON.stringify({
                error: "Internal server error",
                details: error.message
            }),
            { status: 500, headers }
        );
    }
}
