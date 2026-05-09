# EmailJS Setup Guide for OTP Email Sending

This guide will help you set up EmailJS to send OTP codes to users' email addresses.

## What is EmailJS?

EmailJS is a service that allows you to send emails directly from your web application without needing a backend server. It's perfect for sending OTP verification codes.

## Step 1: Create an EmailJS Account

1. Go to [EmailJS.com](https://www.emailjs.com/)
2. Click **Sign Up** and create a free account
3. Verify your email address

## Step 2: Create an Email Service

1. In your EmailJS dashboard, go to **Email Services**
2. Click **Create New Service**
3. Choose your email provider (Gmail, Outlook, Yahoo, etc.)
4. Follow the instructions to connect your email account
5. **Note down your Service ID** (looks like: `service_xxxxxx`)

## Step 3: Create an Email Template

1. Go to **Email Templates** in your dashboard
2. Click **Create New Template**
3. Use this template structure:

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
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #f0a500; }
        .otp-box { 
            background-color: #f0a500; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px; 
            margin: 30px 0;
        }
        .otp-code { 
            font-size: 32px; 
            font-weight: bold; 
            color: white; 
            letter-spacing: 10px;
            font-family: 'Courier New', monospace;
        }
        .expiry { 
            color: #666; 
            font-size: 14px; 
            margin-top: 15px;
        }
        .footer { 
            text-align: center; 
            color: #999; 
            font-size: 12px; 
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">✓ {{sender_name}}</div>
        </div>
        
        <p>Hi {{to_name}},</p>
        <p>Your email verification code is:</p>
        
        <div class="otp-box">
            <div class="otp-code">{{otp_code}}</div>
            <div class="expiry">⏱️ This code expires in {{expiry_time}}</div>
        </div>
        
        <p>Enter this code to verify your email and complete your signup.</p>
        
        <p style="color: #999; font-size: 13px;">
            <strong>Security Note:</strong> Never share this code with anyone. CogniAuth support will never ask for this code.
        </p>
        
        <div class="footer">
            <p>© 2026 CogniAuth. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

4. Save the template
5. **Note down your Template ID** (looks like: `template_xxxxxx`)

## Step 4: Get Your Public Key

1. In your EmailJS dashboard, go to **Account** → **API Keys**
2. Copy your **Public Key** (looks like: `xxxxxxxxxxxxxx`)

## Step 5: Configure CogniAuth

Now you need to enter your EmailJS credentials in the app. Look for the **Settings** button in the navigation and:

1. Find the **Email Configuration** section
2. Enter the following:
   - **Service ID:** Your EmailJS Service ID
   - **Template ID:** Your EmailJS Template ID (use: `otp_verification`)
   - **Public Key:** Your EmailJS Public Key
   - **From Email:** Your verified email address
   - **Sender Name:** CogniAuth (or your preferred name)

3. Click **Save Configuration**

## Step 6: Test the Setup

1. Go to the signup page
2. Enter any email address
3. If configured correctly, you should:
   - See "OTP sent successfully" message
   - Receive an email with your OTP code
   - Not see the OTP code displayed on the screen

4. Enter the OTP code from your email and click **Verify**

## Troubleshooting

**"OTP generated successfully" but no email received:**
- Check spam/junk folder
- Verify your email service is connected in EmailJS
- Check the EmailJS Activity log for errors

**"Failed to send OTP" error:**
- Make sure all credentials are entered correctly
- Verify your template ID is correct
- Check that your email service is active

**Still showing OTP on screen:**
- OTP is never displayed once configured
- It will only appear in console.log during development

## Security Notes

- ✅ OTP is never displayed to the user
- ✅ OTP is only sent to verified email
- ✅ OTP expires after 1 minute
- ✅ All credentials are stored locally in browser
- ✅ No backend needed - fully client-side

## Support

For EmailJS support, visit: [EmailJS Documentation](https://www.emailjs.com/docs/)
