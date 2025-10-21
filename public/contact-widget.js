!function () {
    'use strict';

    const C = {
        apiUrl: (() => {
            const n = '';
            if (n) return console.log('Netlify site URL from build injection:', n), n + '/.netlify/functions/submit-contact';
            console.error('Could not detect Netlify site URL. Make sure the build process injected the environment variables.');
            return 'NETLIFY_SITE_URL_NOT_DETECTED/.netlify/functions/submit-contact'
        })(),
        theme: {
            primaryColor: '#3b82f6',
            borderRadius: '12px',
            fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
            maxWidth: '500px'
        },
        form: {
            title: 'Contact Us',
            submitText: 'Send Message',
            successMessage: 'Thank you! Your message has been sent successfully.',
            errorMessage: 'Failed to send message. Please try again.',
            loadingText: 'Sending message...',
            enableCaptcha: !0,
            captchaSiteKey: '6LdCWOwrAAAAAIdo6dFXQHvsak_8SMyqTSLC6eCf'
        },
        fields: {
            name: { enabled: !0, required: !0, label: 'Full Name', placeholder: 'Your full name', type: 'text' },
            email: { enabled: !0, required: !0, label: 'Email Address', placeholder: 'your@email.com', type: 'email' },
            phone: { enabled: !1, required: !1, label: 'Phone Number', placeholder: '+1 (555) 123-4567', type: 'tel' },
            company: { enabled: !1, required: !1, label: 'Company', placeholder: 'Your company name', type: 'text' },
            subject: {
                enabled: !1,
                required: !0,
                label: 'Subject',
                placeholder: 'Select a subject',
                type: 'select',
                options: [
                    { value: '', text: 'Select a subject', disabled: !0, selected: !0 },
                    { value: 'General Inquiry', text: 'General Inquiry' },
                    { value: 'Support Request', text: 'Support Request' },
                    { value: 'Sales Question', text: 'Sales Question' },
                    { value: 'Partnership', text: 'Partnership' },
                    { value: 'Feedback', text: 'Feedback' },
                    { value: 'Other', text: 'Other' }
                ]
            },
            message: { enabled: !0, required: !0, label: 'Message', placeholder: 'Please describe your inquiry or message...', type: 'textarea', rows: 4 },
            website: { enabled: !1, required: !1, label: 'Website', placeholder: 'https://your-website.com', type: 'url' },
            budget: {
                enabled: !1,
                required: !1,
                label: 'Budget Range',
                placeholder: 'Select budget range',
                type: 'select',
                options: [
                    { value: '', text: 'Select budget range', disabled: !0, selected: !0 },
                    { value: 'Under $1,000', text: 'Under $1,000' },
                    { value: '$1,000 - $5,000', text: '$1,000 - $5,000' },
                    { value: '$5,000 - $10,000', text: '$5,000 - $10,000' },
                    { value: '$10,000 - $25,000', text: '$10,000 - $25,000' },
                    { value: 'Over $25,000', text: 'Over $25,000' }
                ]
            },
            newsletter: { enabled: !1, required: !1, label: 'Subscribe to Newsletter', type: 'checkbox', checked: !1 }
        }
    };

    class W {
        constructor(e, t = {}) {
            this.container = 'string' == typeof e ? document.querySelector(e) : e,
                this.config = this.mergeConfig(C, t),
                this.container || console.error('ContactWidget: Container element not found'),
                this.init()
        }

        mergeConfig(e, t) {
            const n = JSON.parse(JSON.stringify(e));
            const r = (e, t) => {
                for (const n in t)
                    t[n] && 'object' == typeof t[n] && !Array.isArray(t[n]) ?
                        (e[n] || (e[n] = {}), r(e[n], t[n])) :
                        e[n] = t[n]
            };
            return r(n, t), n
        }

        init() {
            this.container.innerHTML = this.generateHTML(),
                this.form = this.container.querySelector('.contact-form'),
                this.submitBtn = this.container.querySelector('.submit-btn'),
                this.loading = this.container.querySelector('.loading'),
                this.statusMessage = this.container.querySelector('.status-message'),
                this.config.form.enableCaptcha && this.config.form.captchaSiteKey && this.loadRecaptcha(),
                this.bindEvents()
        }

        generateHTML() {
            const e = Object.entries(this.config.fields).filter(([e, t]) => t.enabled).map(([e, t]) => this.generateFieldHTML(e, t));
            return '<div class="contact-widget" style="font-family:' + this.config.theme.fontFamily + ';max-width:' + this.config.theme.maxWidth + ';margin:0 auto;background:#fff;border-radius:' + this.config.theme.borderRadius + ';box-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -1px rgba(0,0,0,.06);padding:24px;border:1px solid #e2e8f0;position:relative;z-index:1000"><h2 style="color:#1a202c;font-size:24px;font-weight:600;margin:0 0 20px;text-align:center">' + this.config.form.title + '</h2><form class="contact-form" style="margin:0">' + e.join('') + (this.config.form.enableCaptcha && this.config.form.captchaSiteKey ? '<div class="captcha-container" style="margin:16px 0"><div class="g-recaptcha" data-sitekey="' + this.config.form.captchaSiteKey + '"></div></div>' : '') + '<button type="submit" class="submit-btn" style="width:100%;background:' + this.config.theme.primaryColor + ';color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;transition:background-color .2s">' + this.config.form.submitText + '</button><div class="loading" style="display:none;text-align:center;margin-top:16px"><div class="spinner" style="border:2px solid #f3f4f6;border-top:2px solid ' + this.config.theme.primaryColor + ';border-radius:50%;width:20px;height:20px;animation:spin 1s linear infinite;margin:0 auto"></div><p style="margin:8px 0 0;color:#6b7280">' + this.config.form.loadingText + '</p></div><div class="status-message" style="margin-top:16px;padding:12px;border-radius:8px;font-size:14px;text-align:center;display:none"></div></form></div><style>@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}.contact-widget input:focus,.contact-widget textarea:focus,.contact-widget select:focus{outline:none;border-color:' + this.config.theme.primaryColor + ';box-shadow:0 0 0 3px rgba(59,130,246,.1)}.contact-widget .submit-btn:hover:not(:disabled){background:' + this.config.theme.primaryColor + 'dd}.contact-widget .submit-btn:disabled{background:#9ca3af;cursor:not-allowed}.contact-widget .status-success{background:#d1fae5;color:#065f46;border:1px solid #a7f3d0}.contact-widget .status-error{background:#fee2e2;color:#991b1b;border:1px solid #fecaca}.contact-widget .form-group{margin-bottom:16px}.contact-widget .form-group label{display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px}.contact-widget .form-group input,.contact-widget .form-group textarea,.contact-widget .form-group select{width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:16px;transition:border-color .2s,box-shadow .2s;box-sizing:border-box}.contact-widget .form-group textarea{resize:vertical}.contact-widget .form-group input[type="checkbox"]{width:auto;margin-right:8px}.contact-widget .checkbox-group{display:flex;align-items:center}.contact-widget .checkbox-group label{margin-bottom:0;cursor:pointer}@media (max-width:640px){.contact-widget{margin:16px;padding:20px}}</style>'
        }

        generateFieldHTML(e, t) {
            const n = t.required ? ' *' : '',
                r = t.required ? 'required' : '',
                o = t.customText || t.label;
            let a = '';
            switch (t.type) {
                case 'textarea':
                    a = '<textarea id="contact-' + e + '" name="' + e + '" ' + r + ' placeholder="' + t.placeholder + '" rows="' + (t.rows || 4) + '" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:16px;transition:border-color .2s,box-shadow .2s;box-sizing:border-box;resize:vertical"></textarea>';
                    break;
                case 'select':
                    const s = t.options.map(e => '<option value="' + e.value + '" ' + (e.disabled ? 'disabled' : '') + ' ' + (e.selected ? 'selected' : '') + '>' + e.text + '</option>').join('');
                    a = '<select id="contact-' + e + '" name="' + e + '" ' + r + ' style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:16px;transition:border-color .2s,box-shadow .2s;box-sizing:border-box;background:#fff">' + s + '</select>';
                    break;
                case 'checkbox':
                    a = '<div class="checkbox-group"><input type="checkbox" id="contact-' + e + '" name="' + e + '" ' + (t.checked ? 'checked' : '') + ' style="width:auto;margin-right:8px"><label for="contact-' + e + '" style="margin-bottom:0;cursor:pointer">' + o + '</label></div>';
                    break;
                default:
                    a = '<input type="' + t.type + '" id="contact-' + e + '" name="' + e + '" ' + r + ' placeholder="' + t.placeholder + '" style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:16px;transition:border-color .2s,box-shadow .2s;box-sizing:border-box">'
            }
            return 'checkbox' === t.type ?
                '<div class="form-group" style="margin-bottom:16px">' + a + '</div>' :
                '<div class="form-group" style="margin-bottom:16px"><label for="contact-' + e + '" style="display:block;font-size:14px;font-weight:500;color:#374151;margin-bottom:6px">' + o + n + '</label>' + a + '</div>'
        }

        loadRecaptcha() {
            if (window.grecaptcha) return;
            const e = document.createElement('script');
            e.src = 'https://www.google.com/recaptcha/api.js',
                e.async = !0,
                e.defer = !0,
                document.head.appendChild(e)
        }

        bindEvents() {
            this.form.addEventListener('submit', e => this.handleSubmit(e));
            const e = this.container.querySelector('#contact-message');
            e && (e.addEventListener('input', function () {
                const e = 1000 - this.value.length;
                this.style.borderColor = e < 0 ? '#ef4444' : e < 50 ? '#f59e0b' : '#d1d5db'
            }))
        }

        showStatus(e, t = !0) {
            this.statusMessage.textContent = e,
                e ? (this.statusMessage.className = 'status-message ' + (t ? 'status-success' : 'status-error'), this.statusMessage.style.display = 'block') :
                    (this.statusMessage.className = 'status-message', this.statusMessage.style.display = 'none'),
                e && t && setTimeout(() => { this.statusMessage.style.display = 'none' }, 5e3)
        }

        setLoading(e) {
            this.submitBtn.disabled = e,
                this.loading.style.display = e ? 'block' : 'none',
                this.submitBtn.style.display = e ? 'none' : 'block'
        }

        async handleSubmit(e) {
            e.preventDefault();
            const t = new FormData(this.form),
                n = {};
            Object.entries(this.config.fields).forEach(([e, r]) => {
                if (r.enabled)
                    'checkbox' === r.type ? n[e] = !!t.get(e) : n[e] = t.get(e) ? t.get(e).trim() : ''
            });
            const o = [];
            Object.entries(this.config.fields).forEach(([e, t]) => {
                if (t.enabled && t.required && (!n[e] || '' === n[e])) {
                    const e = t.customText || t.label;
                    o.push(e)
                }
            });
            if (o.length > 0) return void this.showStatus('Please fill in all required fields: ' + o.join(', '), !1);
            if (this.config.fields.email.enabled && n.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email)) return void this.showStatus('Please enter a valid email address.', !1);
            if (this.config.form.enableCaptcha && this.config.form.captchaSiteKey) {
                if (!window.grecaptcha) return void this.showStatus('CAPTCHA is loading. Please wait and try again.', !1);
                const e = grecaptcha.getResponse();
                if (!e) return void this.showStatus('Please complete the CAPTCHA verification.', !1);
                n.captchaToken = e
            }
            this.setLoading(!0), this.showStatus('', !0);
            try {
                console.log('Attempting to submit to:', this.config.apiUrl),
                    console.log('Submitting data:', n);
                const response = await fetch(this.config.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(n)
                });
                const result = await response.json();
                response.ok && result.success ?
                    (this.showStatus(this.config.form.successMessage, !0), this.form.reset(), this.config.form.enableCaptcha && this.config.form.captchaSiteKey && window.grecaptcha && grecaptcha.reset()) :
                    (this.showStatus(result.error || this.config.form.errorMessage, !1), this.config.form.enableCaptcha && this.config.form.captchaSiteKey && window.grecaptcha && grecaptcha.reset())
            } catch (e) {
                console.error('Contact form submission error:', e),
                    console.error('Error details:', { name: e.name, message: e.message, stack: e.stack, apiUrl: this.config.apiUrl });
                let t = 'Network error. Please check your connection and try again.';
                'TypeError' === e.name && e.message.includes('Failed to fetch') ?
                    t = 'Unable to connect to the server. Please check if the site is properly deployed.' :
                    'TypeError' === e.name && e.message.includes('NetworkError') &&
                    (t = 'Network error. Please check your internet connection.'),
                    this.showStatus(t, !1),
                    this.config.form.enableCaptcha && this.config.form.captchaSiteKey && window.grecaptcha && grecaptcha.reset()
            } finally {
                this.setLoading(!1)
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-contact-widget]').forEach(e => { new W(e) })
    }),
        window.ContactWidget = W
}()