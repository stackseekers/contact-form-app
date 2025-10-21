(function () {
    'use strict';

    const DEFAULT_CONFIG = {
        apiUrl: (() => {
            // Netlify environment variables injected at build time
            const netlifySiteUrl = '';
            
            if (netlifySiteUrl) {
                console.log('Netlify site URL from build injection:', netlifySiteUrl);
                return netlifySiteUrl + '/.netlify/functions/submit-contact';
            }
            
            // Error case - no environment variables available
            console.error('Could not detect Netlify site URL. Make sure the build process injected the environment variables.');
            return 'NETLIFY_SITE_URL_NOT_DETECTED/.netlify/functions/submit-contact';
})(),

        // Widget styling options
        theme: {
            primaryColor: '#3b82f6',
            borderRadius: '12px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            maxWidth: '500px'
        },

        // Form configuration
        form: {
            title: 'Contact Us',
            submitText: 'Send Message',
            successMessage: 'Thank you! Your message has been sent successfully.',
            errorMessage: 'Failed to send message. Please try again.',
            loadingText: 'Sending message...',
            enableCaptcha: true, // Enable CAPTCHA by default
            captchaSiteKey: (() => {
                // CAPTCHA site key injected at build time
                return '6LdCWOwrAAAAAIdo6dFXQHvsak_8SMyqTSLC6eCf';
            })()
        },

        // Field configuration - specify which fields to include
        fields: {
            name: {
                enabled: true,
                required: true,
                label: 'Full Name',
                placeholder: 'Your full name',
                type: 'text'
            },
            email: {
                enabled: true,
                required: true,
                label: 'Email Address',
                placeholder: 'your@email.com',
                type: 'email'
            },
            phone: {
                enabled: false,
                required: false,
                label: 'Phone Number',
                placeholder: '+1 (555) 123-4567',
                type: 'tel'
            },
            company: {
                enabled: false,
                required: false,
                label: 'Company',
                placeholder: 'Your company name',
                type: 'text'
            },
            subject: {
                enabled: false,
                required: true,
                label: 'Subject',
                placeholder: 'Select a subject',
                type: 'select',
                options: [
                    { value: '', text: 'Select a subject', disabled: true, selected: true },
                    { value: 'General Inquiry', text: 'General Inquiry' },
                    { value: 'Support Request', text: 'Support Request' },
                    { value: 'Sales Question', text: 'Sales Question' },
                    { value: 'Partnership', text: 'Partnership' },
                    { value: 'Feedback', text: 'Feedback' },
                    { value: 'Other', text: 'Other' }
                ]
            },
            message: {
                enabled: true,
                required: true,
                label: 'Message',
                placeholder: 'Please describe your inquiry or message...',
                type: 'textarea',
                rows: 4
            },
            website: {
                enabled: false,
                required: false,
                label: 'Website',
                placeholder: 'https://your-website.com',
                type: 'url'
            },
            budget: {
                enabled: false,
                required: false,
                label: 'Budget Range',
                placeholder: 'Select budget range',
                type: 'select',
                options: [
                    { value: '', text: 'Select budget range', disabled: true, selected: true },
                    { value: 'Under $1,000', text: 'Under $1,000' },
                    { value: '$1,000 - $5,000', text: '$1,000 - $5,000' },
                    { value: '$5,000 - $10,000', text: '$5,000 - $10,000' },
                    { value: '$10,000 - $25,000', text: '$10,000 - $25,000' },
                    { value: 'Over $25,000', text: 'Over $25,000' }
                ]
            },
            newsletter: {
                enabled: false,
                required: false,
                label: 'Subscribe to Newsletter',
                type: 'checkbox',
                checked: false
            }
        }
    };

    // Widget Class
    class ContactWidget {
        constructor(container, options = {}) {
            this.container = typeof container === 'string' ? document.querySelector(container) : container;
            this.config = this.mergeConfig(DEFAULT_CONFIG, options);

            if (!this.container) {
                console.error('ContactWidget: Container element not found');
                return;
            }

            this.init();
        }

        mergeConfig(defaultConfig, userConfig) {
            const merged = JSON.parse(JSON.stringify(defaultConfig));

            // Deep merge configuration
            const deepMerge = (target, source) => {
                for (const key in source) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        if (!target[key]) target[key] = {};
                        deepMerge(target[key], source[key]);
                    } else {
                        target[key] = source[key];
                    }
                }
            };

            deepMerge(merged, userConfig);
            return merged;
        }

        init() {
            this.container.innerHTML = this.generateHTML();
            this.form = this.container.querySelector('.contact-form');
            this.submitBtn = this.container.querySelector('.submit-btn');
            this.loading = this.container.querySelector('.loading');
            this.statusMessage = this.container.querySelector('.status-message');

            // Load reCAPTCHA script if CAPTCHA is enabled
            if (this.config.form.enableCaptcha && this.config.form.captchaSiteKey) {
                this.loadRecaptcha();
            }

            this.bindEvents();
        }

        generateHTML() {
            const enabledFields = Object.entries(this.config.fields)
                .filter(([key, field]) => field.enabled)
                .map(([key, field]) => this.generateFieldHTML(key, field));

            return `
                <div class="contact-widget" style="
                    font-family: ${this.config.theme.fontFamily};
                    max-width: ${this.config.theme.maxWidth};
                    margin: 0 auto;
                    background: #ffffff;
                    border-radius: ${this.config.theme.borderRadius};
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    padding: 24px;
                    border: 1px solid #e2e8f0;
                    position: relative;
                    z-index: 1000;
                ">
                    <h2 style="
                        color: #1a202c;
                        font-size: 24px;
                        font-weight: 600;
                        margin: 0 0 20px 0;
                        text-align: center;
                    ">${this.config.form.title}</h2>
                    
                    <form class="contact-form" style="margin: 0;">
                        ${enabledFields.join('')}
                        
                        ${this.config.form.enableCaptcha && this.config.form.captchaSiteKey ? `
                            <div class="captcha-container" style="margin: 16px 0;">
                                <div class="g-recaptcha" data-sitekey="${this.config.form.captchaSiteKey}"></div>
                            </div>
                        ` : ''}
                        
                        <button type="submit" class="submit-btn" style="
                            width: 100%;
                            background: ${this.config.theme.primaryColor};
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 8px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: background-color 0.2s;
                        ">${this.config.form.submitText}</button>

                        <div class="loading" style="
                            display: none;
                            text-align: center;
                            margin-top: 16px;
                        ">
                            <div class="spinner" style="
                                border: 2px solid #f3f4f6;
                                border-top: 2px solid ${this.config.theme.primaryColor};
                                border-radius: 50%;
                                width: 20px;
                                height: 20px;
                                animation: spin 1s linear infinite;
                                margin: 0 auto;
                            "></div>
                            <p style="margin: 8px 0 0 0; color: #6b7280;">${this.config.form.loadingText}</p>
                        </div>

                        <div class="status-message" style="
                            margin-top: 16px;
                            padding: 12px;
                            border-radius: 8px;
                            font-size: 14px;
                            text-align: center;
                            display: none;
                        "></div>
                    </form>
                </div>
                
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    
                    .contact-widget input:focus,
                    .contact-widget textarea:focus,
                    .contact-widget select:focus {
                        outline: none;
                        border-color: ${this.config.theme.primaryColor};
                        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                    }
                    
                    .contact-widget .submit-btn:hover:not(:disabled) {
                        background: ${this.config.theme.primaryColor}dd;
                    }
                    
                    .contact-widget .submit-btn:disabled {
                        background: #9ca3af;
                        cursor: not-allowed;
                    }
                    
                    .contact-widget .status-success {
                        background: #d1fae5;
                        color: #065f46;
                        border: 1px solid #a7f3d0;
                    }
                    
                    .contact-widget .status-error {
                        background: #fee2e2;
                        color: #991b1b;
                        border: 1px solid #fecaca;
                    }
                    
                    .contact-widget .form-group {
                        margin-bottom: 16px;
                    }
                    
                    .contact-widget .form-group label {
                        display: block;
                        font-size: 14px;
                        font-weight: 500;
                        color: #374151;
                        margin-bottom: 6px;
                    }
                    
                    .contact-widget .form-group input,
                    .contact-widget .form-group textarea,
                    .contact-widget .form-group select {
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 16px;
                        transition: border-color 0.2s, box-shadow 0.2s;
                        box-sizing: border-box;
                    }
                    
                    .contact-widget .form-group textarea {
                        resize: vertical;
                    }
                    
                    .contact-widget .form-group input[type="checkbox"] {
                        width: auto;
                        margin-right: 8px;
                    }
                    
                    .contact-widget .checkbox-group {
                        display: flex;
                        align-items: center;
                    }
                    
                    .contact-widget .checkbox-group label {
                        margin-bottom: 0;
                        cursor: pointer;
                    }
                    
                    @media (max-width: 640px) {
                        .contact-widget {
                            margin: 16px;
                            padding: 20px;
                        }
                    }
                </style>
            `;
        }

        generateFieldHTML(key, field) {
            const required = field.required ? ' *' : '';
            const requiredAttr = field.required ? 'required' : '';
            const labelText = field.customText || field.label;

            let inputHTML = '';

            switch (field.type) {
                case 'textarea':
                    inputHTML = `
                        <textarea 
                            id="contact-${key}" 
                            name="${key}" 
                            ${requiredAttr}
                            placeholder="${field.placeholder}"
                            rows="${field.rows || 4}"
                            style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 16px; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; resize: vertical;"
                        ></textarea>
                    `;
                    break;

                case 'select':
                    const options = field.options.map(option =>
                        `<option value="${option.value}" ${option.disabled ? 'disabled' : ''} ${option.selected ? 'selected' : ''}>${option.text}</option>`
                    ).join('');

                    inputHTML = `
                        <select 
                            id="contact-${key}" 
                            name="${key}" 
                            ${requiredAttr}
                            style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 16px; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; background: white;"
                        >
                            ${options}
                        </select>
                    `;
                    break;

                case 'checkbox':
                    inputHTML = `
                        <div class="checkbox-group">
                            <input 
                                type="checkbox" 
                                id="contact-${key}" 
                                name="${key}" 
                                ${field.checked ? 'checked' : ''}
                                style="width: auto; margin-right: 8px;"
                            >
                            <label for="contact-${key}" style="margin-bottom: 0; cursor: pointer;">
                                ${labelText}
                            </label>
                        </div>
                    `;
                    break;

                default:
                    inputHTML = `
                        <input 
                            type="${field.type}" 
                            id="contact-${key}" 
                            name="${key}" 
                            ${requiredAttr}
                            placeholder="${field.placeholder}"
                            style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 16px; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;"
                        >
                    `;
            }

            if (field.type === 'checkbox') {
                return `
                    <div class="form-group" style="margin-bottom: 16px;">
                        ${inputHTML}
                    </div>
                `;
            } else {
                return `
                    <div class="form-group" style="margin-bottom: 16px;">
                        <label for="contact-${key}" style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">
                            ${labelText}${required}
                        </label>
                        ${inputHTML}
                    </div>
                `;
            }
        }

        loadRecaptcha() {
            // Check if reCAPTCHA script is already loaded
            if (window.grecaptcha) {
                return;
            }

            // Create script element
            const script = document.createElement('script');
            script.src = 'https://www.google.com/recaptcha/api.js';
            script.async = true;
            script.defer = true;

            // Add to head
            document.head.appendChild(script);
        }

        bindEvents() {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));

            // Add character counter for message field if enabled
            const messageField = this.container.querySelector('#contact-message');
            if (messageField) {
                const maxLength = 1000;

                messageField.addEventListener('input', function () {
                    const remaining = maxLength - this.value.length;
                    if (remaining < 50) {
                        this.style.borderColor = remaining < 0 ? '#ef4444' : '#f59e0b';
                    } else {
                        this.style.borderColor = '#d1d5db';
                    }
                });
            }
        }

        showStatus(message, isSuccess = true) {
            this.statusMessage.textContent = message;

            // Only apply styling if there's actually a message
            if (message) {
                this.statusMessage.className = `status-message ${isSuccess ? 'status-success' : 'status-error'}`;
                this.statusMessage.style.display = 'block';
            } else {
                // Clear the message and hide the container
                this.statusMessage.className = 'status-message';
                this.statusMessage.style.display = 'none';
            }

            // Auto-hide success messages after 5 seconds
            if (message && isSuccess) {
                setTimeout(() => {
                    this.statusMessage.style.display = 'none';
                }, 5000);
            }
        }

        setLoading(isLoading) {
            this.submitBtn.disabled = isLoading;
            this.loading.style.display = isLoading ? 'block' : 'none';
            this.submitBtn.style.display = isLoading ? 'none' : 'block';
        }

        async handleSubmit(e) {
            e.preventDefault();

            const formData = new FormData(this.form);
            const data = {};

            // Collect enabled fields data
            Object.entries(this.config.fields).forEach(([key, field]) => {
                if (field.enabled) {
                    if (field.type === 'checkbox') {
                        data[key] = formData.get(key) ? true : false;
                    } else {
                        const value = formData.get(key);
                        data[key] = value ? value.trim() : '';
                    }
                }
            });

            // Validate required fields
            const missingFields = [];
            Object.entries(this.config.fields).forEach(([key, field]) => {
                if (field.enabled && field.required && (!data[key] || data[key] === '')) {
                    const labelText = field.customText || field.label;
                    missingFields.push(labelText);
                }
            });

            if (missingFields.length > 0) {
                this.showStatus(`Please fill in all required fields: ${missingFields.join(', ')}`, false);
                return;
            }

            // Validate email format if email field is enabled
            if (this.config.fields.email.enabled && data.email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(data.email)) {
                    this.showStatus('Please enter a valid email address.', false);
                    return;
                }
            }

            // Add CAPTCHA token if enabled
            if (this.config.form.enableCaptcha && this.config.form.captchaSiteKey) {
                if (!window.grecaptcha) {
                    this.showStatus('CAPTCHA is loading. Please wait and try again.', false);
                    return;
                }

                const captchaResponse = grecaptcha.getResponse();
                if (!captchaResponse) {
                    this.showStatus('Please complete the CAPTCHA verification.', false);
                    return;
                }
                data.captchaToken = captchaResponse;
            }

            this.setLoading(true);
            this.showStatus('', true); // Clear previous messages

            try {
                console.log('Attempting to submit to:', this.config.apiUrl);
                console.log('Submitting data:', data);

                const response = await fetch(this.config.apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    this.showStatus(this.config.form.successMessage, true);
                    this.form.reset();

                    // Reset CAPTCHA if enabled
                    if (this.config.form.enableCaptcha && this.config.form.captchaSiteKey && window.grecaptcha) {
                        grecaptcha.reset();
                    }
                } else {
                    this.showStatus(result.error || this.config.form.errorMessage, false);

                    // Reset CAPTCHA on error
                    if (this.config.form.enableCaptcha && this.config.form.captchaSiteKey && window.grecaptcha) {
                        grecaptcha.reset();
                    }
                }
            } catch (error) {
                console.error('Contact form submission error:', error);
                console.error('Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    apiUrl: this.config.apiUrl
                });

                let errorMessage = 'Network error. Please check your connection and try again.';

                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    errorMessage = 'Unable to connect to the server. Please check if the site is properly deployed.';
                } else if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
                    errorMessage = 'Network error. Please check your internet connection.';
                }

                this.showStatus(errorMessage, false);

                // Reset CAPTCHA on error
                if (this.config.form.enableCaptcha && this.config.form.captchaSiteKey && window.grecaptcha) {
                    grecaptcha.reset();
                }
            } finally {
                this.setLoading(false);
            }
        }
    }

    // Auto-initialize if data-contact-widget attribute is present
    document.addEventListener('DOMContentLoaded', function () {
        const autoContainers = document.querySelectorAll('[data-contact-widget]');
        autoContainers.forEach(container => {
            new ContactWidget(container);
        });
    });

    // Expose ContactWidget globally
    window.ContactWidget = ContactWidget;

})();