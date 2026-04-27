# Email OTP Setup Guide

## Overview

CogniAuth now supports email-based OTP (One-Time Password) verification during signup. Instead of displaying OTPs on screen, they are securely sent to the user's email address, with the sender email configurable in the profile settings.

## Features Implemented

### 1. **Password Validation on Login**
- During signup, users create a password
- On login, the system validates the password against the stored password
- Only the correct password is accepted (no password bypass)

### 2. **Email-based OTP Verification**
- When signing up, users enter their email
- System sends a 6-digit OTP to the user's email
- User enters the OTP on the verification screen
- OTP expires after 10 minutes for security
- Users can resend OTP if needed

### 3. **Configurable Email Settings**
- Users can configure the sender email address (default: cogniguard@example.com)
- Users can configure the sender name (default: CogniAuth)
- Settings are stored in browser localStorage and persist across sessions

## Development/Testing Mode

Currently, the system operates in **development mode** with the following behavior:

1. **LocalStorage-based OTP**: OTPs are stored in browser localStorage
2. **Console logging**: Generated OTPs are logged to browser console
3. **Display on screen**: In dev mode, the OTP is shown in the UI for testing purposes

### Testing the OTP Flow

1. **Start signup**: Navigate to "Create Account"
2. **Enter email**: Provide any email address
3. **Send OTP**: Click "Send Code"
4. **Check console**: Open browser DevTools (F12) → Console tab
5. **Find OTP**: Look for message like `[Dev Mode] Your OTP: 123456`
6. **Enter OTP**: Paste the 6-digit code in the verification field
7. **Verify**: Click "Verify Code"

## Production Setup (Future)

To integrate with a real email service, you'll need to:

### Option 1: EmailJS Service (Recommended)
```javascript
// In emailService.js, configure:
const EMAILJS_SERVICE_ID = 'your_service_id';
const EMAILJS_TEMPLATE_ID = 'template_otp_signup';
const EMAILJS_PUBLIC_KEY = 'your_public_key';
```

Steps:
1. Create an account at [emailjs.com](https://www.emailjs.com/)
2. Set up email service (Gmail, Outlook, etc.)
3. Create email template with variables: `{{to_email}}`, `{{otp_code}}`, `{{sender_name}}`
4. Update the keys in emailService.js
5. Load EmailJS library in index.html

### Option 2: Custom Backend API
Create a backend endpoint that sends emails:
```javascript
// Replace sendOTPEmail in emailService.js
export async function sendOTPEmail(userEmail, otp) {
  const response = await fetch('/api/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email: userEmail, 
      otp: otp 
    })
  });
  return await response.json();
}
```

## File Structure

- **emailService.js**: Handles OTP generation, sending, and verification
- **userDatabase.js**: Manages user registration and password storage
- **App.jsx**: Updated with OTP flow and email configuration UI

## API Reference

### emailService.js

```javascript
// Generate OTP
generateOTP(length = 6) → string

// Send OTP to email
sendOTPEmail(userEmail, otp) → Promise<{success, message, otp?}>

// Verify OTP
verifyOTP(userEmail, enteredOTP) → {valid, message}

// Clear stored OTP
clearOTP(userEmail) → void

// Get/Save email configuration
getEmailConfig() → {fromEmail, senderName, provider}
saveEmailConfig(config) → void
```

### userDatabase.js

```javascript
// Authentication
authenticateUser(email, password) → {success, message, user?}
registerUser(email, password, nickname, avatarColor) → {success, message}

// Utilities
userExists(email) → boolean
getUser(email) → user | null
```

## Security Notes

⚠️ **Current Development Limitations**:
- Passwords are stored in plain text (use bcrypt in production)
- OTPs are stored in localStorage (not encrypted)
- No HTTPS/TLS security (required for production)

✅ **Implemented Security Features**:
- OTP expiration (10 minutes)
- Limited OTP attempts before expiration
- Password validation on every login
- Separate OTP codes per email

## Troubleshooting

### OTP not appearing in dev mode?
1. Check browser console (F12 → Console)
2. Look for "[Dev Mode] Your OTP: XXXXXX" message
3. Verify localStorage: `localStorage.getItem('otp_youremail@example.com')`

### Changing email configuration?
1. Go to Profile → Email Settings
2. Click "Edit"
3. Modify sender email and name
4. Click "Save Changes"

### Resetting user data?
```javascript
// In browser console:
localStorage.removeItem('users');
localStorage.removeItem('emailConfig');
```

## Next Steps

1. **Integrate EmailJS** for real email sending
2. **Add backend API** for email delivery service
3. **Implement email templates** with HTML formatting
4. **Add rate limiting** for OTP requests
5. **Implement password hashing** with bcrypt
6. **Add email verification** for account recovery
