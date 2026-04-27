// Email Service Configuration
// This file handles email sending for OTP verification

// Default configuration - can be modified in settings
let emailConfig = {
  fromEmail: 'cogniguard@example.com',
  senderName: 'CogniAuth',
  apiKey: '', // Will be configured by user
  provider: 'emailjs' // or 'custom'
};

// Load configuration from localStorage on startup
export function loadEmailConfig() {
  const stored = localStorage.getItem('emailConfig');
  if (stored) {
    emailConfig = JSON.parse(stored);
  }
}

// Save configuration to localStorage
export function saveEmailConfig(config) {
  emailConfig = { ...emailConfig, ...config };
  localStorage.setItem('emailConfig', JSON.stringify(emailConfig));
}

// Get current configuration
export function getEmailConfig() {
  return { ...emailConfig };
}

// Generate OTP code
export function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

// Send OTP via email using EmailJS service
export async function sendOTPEmail(userEmail, otp) {
  try {
    // Initialize EmailJS if API key is configured
    if (emailConfig.apiKey && window.emailjs) {
      const templateParams = {
        to_email: userEmail,
        to_name: userEmail.split('@')[0],
        otp_code: otp,
        from_email: emailConfig.fromEmail,
        sender_name: emailConfig.senderName
      };

      const response = await window.emailjs.send(
        'service_default', // Service ID
        'template_otp_signup', // Template ID
        templateParams
      );

      return {
        success: true,
        message: 'OTP sent successfully to ' + userEmail,
        response
      };
    } else {
      // Fallback: Store OTP locally for development/testing
      localStorage.setItem(`otp_${userEmail}`, JSON.stringify({
        code: otp,
        timestamp: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
      }));

      console.log(`[Development Mode] OTP for ${userEmail}: ${otp}`);
      
      return {
        success: true,
        message: 'OTP generated (check console/localStorage for development)',
        otp: otp // Return OTP for development purposes
      };
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    return {
      success: false,
      message: 'Failed to send OTP: ' + error.message,
      error
    };
  }
}

// Verify OTP code
export function verifyOTP(userEmail, enteredOTP) {
  const stored = localStorage.getItem(`otp_${userEmail}`);
  
  if (!stored) {
    return {
      valid: false,
      message: 'No OTP found for this email'
    };
  }

  const otpData = JSON.parse(stored);
  
  // Check if OTP has expired (10 minutes)
  if (Date.now() > otpData.expiresAt) {
    localStorage.removeItem(`otp_${userEmail}`);
    return {
      valid: false,
      message: 'OTP has expired. Please request a new one.'
    };
  }

  // Verify OTP code
  if (otpData.code === enteredOTP) {
    localStorage.removeItem(`otp_${userEmail}`);
    return {
      valid: true,
      message: 'OTP verified successfully'
    };
  }

  return {
    valid: false,
    message: 'Invalid OTP. Please try again.'
  };
}

// Clear stored OTP
export function clearOTP(userEmail) {
  localStorage.removeItem(`otp_${userEmail}`);
}
