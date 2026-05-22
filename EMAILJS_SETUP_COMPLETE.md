# EmailJS Setup Guide for CogniAuth Email Services

This comprehensive guide will help you set up EmailJS to send OTP verification codes and password reset links for CogniAuth.

## What is EmailJS?

EmailJS is a service that allows you to send emails directly from your web application without needing a backend server. It's perfect for sending OTP verification codes and password reset links.

## Overview of Email Services

CogniAuth uses two types of emails:
1. **OTP Verification Email** - 6-digit code for new user email verification
2. **Password Reset Email** - Reset link for forgot password functionality

---

# SETUP WITH YOUR NEW EMAIL: noreply.thinkbefore@gmail.com

## Step 1: Create an EmailJS Account

1. Go to [EmailJS.com](https://www.emailjs.com/)
2. Click **Sign Up** and create a free account
3. Verify your email address

## Step 2: Create an Email Service (Gmail)

Since you're using Gmail (noreply.thinkbefore@gmail.com), follow these steps:

1. In your EmailJS dashboard, go to **Email Services**
2. Click **Create New Service**
3. Select **Gmail** from the list
4. Click **Connect with Gmail**
5. You'll be redirected to Google login:
   - Sign in with **noreply.thinkbefore@gmail.com**
   - Grant EmailJS permission to send emails on your behalf
6. Once connected, click **Create Service**
7. **Note down your Service ID** (looks like: `service_xxxxxx`)

## Step 3: Enable Gmail App Password (IMPORTANT for Gmail)

Since you're using Gmail, you need to set up an App Password:

1. Go to your Google Account: [myaccount.google.com](https://myaccount.google.com)
2. Click **Security** in the left sidebar
3. Scroll down to **App passwords** (or go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords))
4. Select **Mail** and **Windows Computer** (or your device)
5. Google will generate a 16-character app password
6. **Save this password** - you may need it if EmailJS asks for it

**Note:** You need 2-Step Verification enabled on your Google account for App passwords to work.

## Step 4: Create OTP Verification Email Template

1. Go to **Email Templates** in your EmailJS dashboard
2. Click **Create New Template**
3. Fill in the following details:

**Template Name:** `otp_verification`

**Template Parameters:**
```
to_email: {{to_email}}
to_name: {{to_name}}
otp_code: {{otp_code}}
from_email: {{from_email}}
sender_name: {{sender_name}}
expiry_time: {{expiry_time}}
```

**Email Subject:**
```
Your CogniAuth Verification Code: {{otp_code}}
```

**Email Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #f0a500; margin-bottom: 10px; }
        .tagline { font-size: 13px; color: #999; }
        .content { margin: 20px 0; line-height: 1.6; color: #333; }
        .otp-box { 
            background: linear-gradient(135deg, #f0a500 0%, #f59e0b 100%);
            padding: 30px; 
            text-align: center; 
            border-radius: 10px; 
            margin: 30px 0;
            box-shadow: 0 4px 12px rgba(240, 165, 0, 0.2);
        }
        .otp-code { 
            font-size: 36px; 
            font-weight: bold; 
            color: white; 
            letter-spacing: 8px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            margin-bottom: 10px;
        }
        .expiry { 
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            font-weight: 500;
        }
        .instructions { 
            background-color: #f9f9f9;
            padding: 15px;
            border-left: 4px solid #f0a500;
            border-radius: 4px;
            margin: 20px 0;
            font-size: 14px;
        }
        .security-note { 
            background-color: #fef3c7;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #fcd34d;
            font-size: 13px;
            color: #78350f;
        }
        .footer { 
            text-align: center; 
            color: #999; 
            font-size: 12px; 
            margin-top: 30px;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">✓ {{sender_name}}</div>
            <div class="tagline">AI-Powered Impulse Intervention System</div>
        </div>
        
        <div class="content">
            <p>Hi {{to_name}},</p>
            <p>Welcome to {{sender_name}}! Please verify your email address using the code below:</p>
        </div>
        
        <div class="otp-box">
            <div class="otp-code">{{otp_code}}</div>
            <div class="expiry">⏱️ This code expires in {{expiry_time}}</div>
        </div>
        
        <div class="instructions">
            <strong>How to use:</strong> Enter this code in the verification field on the signup page. This code is valid for {{expiry_time}} only.
        </div>

        <div class="security-note">
            <strong>🔒 Security:</strong> Never share this code with anyone. {{sender_name}} support will never ask for this code. If you didn't request this email, please ignore it.
        </div>
        
        <div class="footer">
            <p>© 2026 {{sender_name}}. All rights reserved.</p>
            <p style="margin-top: 10px; font-size: 11px;">This is an automated message, please do not reply.</p>
        </div>
    </div>
</body>
</html>
```

4. Click **Create Template**
5. **Note down your OTP Template ID** (looks like: `template_xxxxxx`)

## Step 5: Create Password Reset Email Template

1. Go to **Email Templates** in your EmailJS dashboard
2. Click **Create New Template**
3. Fill in the following details:

**Template Name:** `password_reset`

**Template Parameters:**
```
to_email: {{to_email}}
to_name: {{to_name}}
reset_link: {{reset_link}}
from_email: {{from_email}}
sender_name: {{sender_name}}
expiry_time: {{expiry_time}}
```

**Email Subject:**
```
Reset Your {{sender_name}} Password
```

**Email Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #f0a500; margin-bottom: 10px; }
        .tagline { font-size: 13px; color: #999; }
        .content { margin: 20px 0; line-height: 1.6; color: #333; }
        .reset-box { 
            background-color: #f9f9f9;
            padding: 30px; 
            text-align: center; 
            border-radius: 10px; 
            margin: 30px 0;
            border: 2px solid #f0a500;
        }
        .reset-link {
            display: inline-block;
            background: linear-gradient(135deg, #f0a500 0%, #f59e0b 100%);
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin: 10px 0;
        }
        .expiry { 
            color: #666;
            font-size: 14px;
            margin-top: 15px;
            font-weight: 500;
        }
        .or-separator {
            text-align: center;
            margin: 20px 0;
            color: #999;
            font-size: 13px;
        }
        .copy-link {
            background-color: #f5f5f5;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #ddd;
            word-break: break-all;
            font-size: 12px;
            font-family: monospace;
            color: #666;
        }
        .security-note { 
            background-color: #fee2e2;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #fecaca;
            font-size: 13px;
            color: #991b1b;
        }
        .instructions {
            background-color: #f0fdf4;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #22c55e;
            margin: 20px 0;
            font-size: 14px;
            color: #166534;
        }
        .footer { 
            text-align: center; 
            color: #999; 
            font-size: 12px; 
            margin-top: 30px;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">✓ {{sender_name}}</div>
            <div class="tagline">AI-Powered Impulse Intervention System</div>
        </div>
        
        <div class="content">
            <p>Hi {{to_name}},</p>
            <p>We received a request to reset the password for your {{sender_name}} account. Click the button below to set a new password:</p>
        </div>
        
        <div class="reset-box">
            <a href="{{reset_link}}" class="reset-link">Reset Password</a>
            <div class="expiry">✓ This link expires in {{expiry_time}}</div>
        </div>

        <div class="or-separator">— Or copy this link —</div>
        
        <div class="copy-link">
            {{reset_link}}
        </div>

        <div class="instructions">
            <strong>💡 Next Steps:</strong> After clicking the link, you'll be able to enter a new password for your account. Make sure it's at least 8 characters with uppercase letters and special characters.
        </div>

        <div class="security-note">
            <strong>⚠️ Important:</strong> If you didn't request a password reset, please ignore this email or contact support. For your security, never share this link with anyone.
        </div>
        
        <div class="footer">
            <p>© 2026 {{sender_name}}. All rights reserved.</p>
            <p style="margin-top: 10px; font-size: 11px;">This is an automated message, please do not reply.</p>
        </div>
    </div>
</body>
</html>
```

4. Click **Create Template**
5. **Note down your Password Reset Template ID** (looks like: `template_xxxxxx`)

## Step 6: Get Your Public Key

1. In your EmailJS dashboard, go to **Account** → **API Keys**
2. Copy your **Public Key** (looks like: `xxxxxxxxxxxxxx`)
3. Keep this safe - you'll need it to configure the app

## Step 7: Configure CogniAuth with Your EmailJS Credentials

Now you need to enter your EmailJS credentials in the app:

1. Open the CogniAuth app in your browser
2. On the login/welcome screen, scroll down or look for a **Settings** button or ⚙️ icon
3. Find the **Email Configuration** section
4. Enter the following information:
   ```
   Service ID: service_xxxxxx (from Step 2)
   Template ID (OTP): template_xxxxxx (from Step 4)
   Template ID (Reset): template_xxxxxx (from Step 5)
   Public Key: Your EmailJS Public Key (from Step 6)
   From Email: noreply.thinkbefore@gmail.com
   Sender Name: CogniAuth
   ```
5. Click **Save Configuration**

## Step 8: Test the Setup

### Test OTP Verification (Email Signup):
1. Go to the CogniAuth app login screen
2. Click **Create Account**
3. Enter any email address (e.g., test@example.com)
4. Click **Send Verification Code**
5. Check your email inbox for the OTP email
6. You should receive an email with subject: "Your CogniAuth Verification Code: XXXXXX"
7. Copy the 6-digit code from the email
8. Paste it in the verification field in the app
9. Click **Verify** to continue with signup

### Test Password Reset (Forgot Password):
1. Sign in with a test account
2. Go back to login screen
3. Click on the password field and then **Forgot Password?**
4. Enter your registered email address
5. Click **Send Reset Link**
6. Check your email for the password reset email
7. You should receive an email with subject: "Reset Your CogniAuth Password"
8. Click the **Reset Password** button or copy the link
9. Paste the link in your browser address bar
10. You'll be directed to the reset password page
11. Enter a new password and confirm it
12. Click **Reset Password**
13. You should be redirected to login with the new password

## IMPORTANT NOTES FOR GMAIL USERS

### Why Gmail Needs Special Setup?

Gmail has security restrictions that require:
1. **App Password** - A special password for third-party apps like EmailJS
2. **2-Step Verification** - Must be enabled on your Google account

### If emails aren't sending from Gmail:

1. Ensure 2-Step Verification is enabled:
   - Go to [myaccount.google.com/security](https://myaccount.google.com/security)
   - Look for "2-Step Verification" and enable it

2. Check App passwords:
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Create an app password for Gmail if you haven't already
   - Copy and save this password

3. In EmailJS Gmail service settings:
   - You may need to paste the App Password in the appropriate field

### Alternative Email Providers:

If you have issues with Gmail, consider using:
- **SendGrid** - Best for production (1000+ emails/month free)
- **Mailgun** - Great reliability (100 emails/day free)
- **Brevo (formerly Sendinblue)** - Free tier with good limits

## Troubleshooting

### OTP email not received:
- [ ] Check your spam/junk folder
- [ ] Verify the Service ID is correct
- [ ] Verify the OTP Template ID is correct
- [ ] Check EmailJS Activity log (Dashboard → Activity) for errors
- [ ] Ensure Gmail App Password is configured correctly
- [ ] Check that noreply.thinkbefore@gmail.com is verified in Gmail

### "OTP generated successfully" but showing code on screen:
- [ ] Your Public Key is not configured correctly
- [ ] Public Key is blank in settings
- [ ] Reload the page after saving configuration
- [ ] Clear browser cache (Ctrl+Shift+Delete)

### Reset link not working or not received:
- [ ] Check that reset email was not sent to spam folder
- [ ] Ensure Password Reset Template ID is configured correctly
- [ ] Verify the reset link URL is correct in the email
- [ ] Check that the token hasn't expired (24 hours validity)
- [ ] Try sending a new reset request

### EmailJS Connection Error:
- [ ] Public Key format is wrong (should be alphanumeric)
- [ ] Service ID or Template ID is incorrect
- [ ] Check EmailJS dashboard to ensure services are active
- [ ] Clear browser cache and try again
- [ ] Check that EmailJS hasn't been suspended

### Development Mode (OTP showing on screen):
- [ ] This happens when Public Key is not set
- [ ] It's a fallback for testing without emails
- [ ] Once you configure the Public Key, emails will be sent instead

## How It Works

### OTP Verification Flow:
1. User enters email on signup page
2. App generates 6-digit OTP code
3. App stores OTP in browser (localStorage) with 1-minute expiry
4. App sends email via EmailJS with OTP code
5. User receives email and enters code
6. App verifies code matches stored value
7. After verification, user proceeds to set password

### Password Reset Flow:
1. User clicks "Forgot Password?" on login page
2. App asks for email address
3. App checks if email exists in database
4. App generates unique reset token (24-hour validity)
5. App sends reset email via EmailJS with reset link
6. User clicks link or copies it to browser
7. App verifies token is valid and not used
8. User enters new password
9. App resets password in database
10. Token is marked as used (can't be used again)
11. User can login with new password

## Security Best Practices

1. **Keep credentials safe** - Never share Service ID or Public Key
2. **Never commit credentials** - Add .env files to .gitignore
3. **Verify emails** - Always verify the sender email address in EmailJS
4. **Monitor usage** - Check EmailJS Activity log for unusual activity
5. **Use HTTPS** - Always use secure connections in production
6. **Rotate keys regularly** - Generate new keys periodically
7. **OTP expiry** - Currently set to 1 minute for security
8. **Reset token expiry** - Currently set to 24 hours

## Questions or Issues?

For more help:
- [EmailJS Documentation](https://www.emailjs.com/docs/)
- [EmailJS GitHub Issues](https://github.com/EmailJS/EmailJS)
- Gmail App Passwords: [support.google.com](https://support.google.com/accounts/answer/185833)
- CogniAuth Documentation

---

## Configuration Checklist

Before testing, verify you have:

- [ ] EmailJS Account created
- [ ] Gmail service connected in EmailJS
- [ ] App Password generated from Google
- [ ] OTP Verification template created (noted template ID)
- [ ] Password Reset template created (noted template ID)
- [ ] Public Key from EmailJS Account settings
- [ ] All credentials entered in CogniAuth app
- [ ] Email configuration saved in CogniAuth

You're all set! 🎉
