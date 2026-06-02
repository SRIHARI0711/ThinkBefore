// userDatabase.js - Frontend service to interact with MongoDB backend API
// This replaces localStorage with API calls to the backend server

const API_BASE_URL = 'http://localhost:5000/api/auth';

// Validate password strength (same validation as backend)
export function validatePassword(password) {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&* etc)');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// Register new user
export async function registerUser(email, password, nickname, avatarColor) {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        nickname,
        avatarColor
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Error registering user'
      };
    }

    return data;
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: 'Network error: Unable to register user. Make sure backend server is running on port 5000.'
    };
  }
}

// Authenticate user (login)
export async function authenticateUser(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Authentication failed'
      };
    }

    return data;
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      message: 'Network error: Unable to authenticate. Make sure backend server is running on port 5000.'
    };
  }
}

// Check if user exists
export async function userExists(email) {
  try {
    const response = await fetch(`${API_BASE_URL}/user/${encodeURIComponent(email.toLowerCase())}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.success;
    }
    return false;
  } catch (error) {
    console.error('User exists check error:', error);
    return false;
  }
}

// Get user by email
export async function getUser(email) {
  try {
    const response = await fetch(`${API_BASE_URL}/user/${encodeURIComponent(email.toLowerCase())}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.success ? data.user : null;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

// Update user profile
export async function updateUserProfile(email, updates) {
  try {
    const response = await fetch(`${API_BASE_URL}/user/${encodeURIComponent(email.toLowerCase())}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Error updating profile'
      };
    }

    return data;
  } catch (error) {
    console.error('Update profile error:', error);
    return {
      success: false,
      message: 'Network error: Unable to update profile'
    };
  }
}

// Change password
export async function changePassword(email, currentPassword, newPassword) {
  try {
    const response = await fetch(`${API_BASE_URL}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        currentPassword,
        newPassword
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Error changing password'
      };
    }

    return data;
  } catch (error) {
    console.error('Change password error:', error);
    return {
      success: false,
      message: 'Network error: Unable to change password'
    };
  }
}

// Reset password (compatible with existing function if used)
export async function resetPassword(email, newPassword) {
  try {
    const response = await fetch(`${API_BASE_URL}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        newPassword
      })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Reset password error:', error);
    return {
      success: false,
      message: 'Network error: Unable to reset password'
    };
  }
}

// Verify password (for security checks)
export async function verifyPassword(email, password) {
  try {
    const response = await authenticateUser(email, password);
    return response.success;
  } catch (error) {
    console.error('Verify password error:', error);
    return false;
  }
}

// Get all users (for admin purposes - optional)
export async function getAllUsers() {
  console.warn('getAllUsers() is deprecated with MongoDB backend');
  return {};
}

// For backward compatibility, store email in sessionStorage when logged in
// This helps frontend access user data without calling API every time
export function saveUserSession(user) {
  if (user && user.email) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
  }
}

// Retrieve cached user session
export function getUserSession() {
  const userStr = sessionStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

// Clear user session on logout
export function clearUserSession() {
  sessionStorage.removeItem('currentUser');
}
