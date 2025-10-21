// Contact Form Submission Handler with Security Features
// Functions API v2 configuration
export const config = {
  method: ["POST", "OPTIONS"],
};

// Rate limiting storage (in-memory for serverless)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // 5 requests per minute per IP

// Input sanitization function
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Remove script tags and dangerous HTML
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
function checkRateLimit(clientIP) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Clean old entries
  for (const [ip, timestamps] of rateLimitStore.entries()) {
    const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(ip);
    } else {
      rateLimitStore.set(ip, validTimestamps);
    }
  }
  
  // Check current IP
  const timestamps = rateLimitStore.get(clientIP) || [];
  const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }
  
  // Add current request
  validTimestamps.push(now);
  rateLimitStore.set(clientIP, validTimestamps);
  
  return true; // Within rate limit
}

// CAPTCHA verification function
async function verifyCaptcha(captchaToken, secretKey) {
  if (!captchaToken || !secretKey) {
    return false;
  }
  
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${captchaToken}`
    });
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return false;
  }
}

export default async function handler(request, context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;
  const captchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!notionApiKey || !databaseId) {
    return new Response(JSON.stringify({ 
      error: "Notion configuration missing. Please set NOTION_API_KEY and NOTION_DATABASE_ID environment variables." 
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    context.clientContext?.identity?.url || 
                    'unknown';

    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      return new Response(JSON.stringify({ 
        error: "Too many requests. Please wait before submitting again." 
      }), {
        status: 429,
        headers: corsHeaders,
      });
    }

    const formData = await request.json();

    // Validate that we have at least some data
    if (!formData || Object.keys(formData).length === 0) {
      return new Response(JSON.stringify({ 
        error: "No form data received." 
      }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Verify CAPTCHA if provided
    if (formData.captchaToken && captchaSecretKey) {
      const captchaValid = await verifyCaptcha(formData.captchaToken, captchaSecretKey);
      if (!captchaValid) {
        return new Response(JSON.stringify({ 
          error: "CAPTCHA verification failed. Please try again." 
        }), {
          status: 400,
          headers: corsHeaders,
        });
      }
    }

    // Sanitize all text inputs
    const sanitizedData = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'captchaToken') {
        // Skip CAPTCHA token from sanitization
        return;
      }
      
      if (typeof value === 'string') {
        sanitizedData[key] = sanitizeInput(value);
      } else {
        sanitizedData[key] = value;
      }
    });

    // Validate email format if email is provided
    if (sanitizedData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(sanitizedData.email)) {
        return new Response(JSON.stringify({ 
          error: "Invalid email format." 
        }), {
          status: 400,
          headers: corsHeaders,
        });
      }
    }

    // Build Notion properties dynamically based on sanitized data
    const notionProperties = {
      "Status": { 
        select: { name: "New" } 
      },
      "Date Received": { 
        date: { start: new Date().toISOString() } 
      },
    };

    // Map form fields to Notion properties (excluding CAPTCHA token)
    Object.entries(sanitizedData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        switch (key) {
          case 'name':
            notionProperties["Name"] = { 
              title: [{ text: { content: value } }] 
            };
            break;
          case 'email':
            notionProperties["Email"] = { 
              email: value 
            };
            break;
          case 'phone':
            notionProperties["Phone"] = { 
              phone_number: value 
            };
            break;
          case 'company':
            notionProperties["Company"] = { 
              rich_text: [{ text: { content: value } }] 
            };
            break;
          case 'subject':
            notionProperties["Subject"] = { 
              rich_text: [{ text: { content: value } }] 
            };
            break;
          case 'message':
            notionProperties["Message"] = { 
              rich_text: [{ text: { content: value } }] 
            };
            break;
          case 'website':
            notionProperties["Website"] = { 
              url: value 
            };
            break;
          case 'budget':
            notionProperties["Budget"] = { 
              rich_text: [{ text: { content: value } }] 
            };
            break;
          case 'newsletter':
            notionProperties["Newsletter"] = { 
              select: { name: value ? "Yes" : "No" } 
            };
            break;
          default:
            // For any custom fields, add them as rich text
            notionProperties[key.charAt(0).toUpperCase() + key.slice(1)] = { 
              rich_text: [{ text: { content: String(value) } }] 
            };
        }
      }
    });

    // Prepare data for Notion
    const notionData = {
      parent: {
        database_id: databaseId,
      },
      properties: notionProperties,
    };

    // Submit to Notion
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notionData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      console.error("Notion API error:", errorData);
      return new Response(JSON.stringify({ 
        error: errorData.error || errorData.message || `Notion API error: ${response.status}` 
      }), {
        status: response.status,
        headers: corsHeaders,
      });
    }

    const result = await response.json();
    
    console.log("Contact form submitted successfully:", {
      ...sanitizedData,
      notionPageId: result.id,
      clientIP: clientIP
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: "Contact form submitted successfully",
      pageId: result.id
    }), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error("Contact form submission error:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message 
    }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
