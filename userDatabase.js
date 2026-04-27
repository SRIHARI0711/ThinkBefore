// User Database Service
// Manages user registration, authentication, and profile storage

// Get all registered users from localStorage
export function getAllUsers() {
  const stored = localStorage.getItem('users');
  return stored ? JSON.parse(stored) : {};
}

// Save users to localStorage
function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users));
}

// Check if user exists
export function userExists(email) {
  const users = getAllUsers();
  return email.toLowerCase() in users;
}

// Get user by email
export function getUser(email) {
  const users = getAllUsers();
  const user = users[email.toLowerCase()];
  if (user) {
    // Don't return password to frontend
    const { password, ...safeUser } = user;
    return safeUser;
  }
  return null;
}

// Register new user
export function registerUser(email, password, nickname, avatarColor) {
  const users = getAllUsers();
  const emailLower = email.toLowerCase();

  if (emailLower in users) {
    return {
      success: false,
      message: 'Email already registered'
    };
  }

  users[emailLower] = {
    email,
    emailLower,
    password: password, // In production, use bcrypt or similar
    nickname,
    avatarColor,
    createdAt: new Date().toISOString(),
    verified: true // Set to true after OTP verification in production
  };

  saveUsers(users);
  
  return {
    success: true,
    message: 'User registered successfully'
  };
}

// Authenticate user (verify password)
export function authenticateUser(email, password) {
  const users = getAllUsers();
  const user = users[email.toLowerCase()];

  if (!user) {
    return {
      success: false,
      message: 'User not found'
    };
  }

  if (user.password !== password) {
    return {
      success: false,
      message: 'Invalid password'
    };
  }

  // Return user data without password
  const { password: _, ...safeUser } = user;
  return {
    success: true,
    message: 'Authentication successful',
    user: safeUser
  };
}

// Update user profile
export function updateUserProfile(email, updates) {
  const users = getAllUsers();
  const emailLower = email.toLowerCase();

  if (!(emailLower in users)) {
    return {
      success: false,
      message: 'User not found'
    };
  }

  users[emailLower] = {
    ...users[emailLower],
    ...updates,
    emailLower // Keep original lowercase email
  };

  saveUsers(users);

  return {
    success: true,
    message: 'Profile updated successfully'
  };
}

// Change password
export function changePassword(email, oldPassword, newPassword) {
  const users = getAllUsers();
  const emailLower = email.toLowerCase();

  if (!(emailLower in users)) {
    return {
      success: false,
      message: 'User not found'
    };
  }

  if (users[emailLower].password !== oldPassword) {
    return {
      success: false,
      message: 'Current password is incorrect'
    };
  }

  users[emailLower].password = newPassword;
  saveUsers(users);

  return {
    success: true,
    message: 'Password changed successfully'
  };
}

// Delete user account
export function deleteUserAccount(email, password) {
  const users = getAllUsers();
  const emailLower = email.toLowerCase();

  if (!(emailLower in users)) {
    return {
      success: false,
      message: 'User not found'
    };
  }

  if (users[emailLower].password !== password) {
    return {
      success: false,
      message: 'Password is incorrect'
    };
  }

  delete users[emailLower];
  saveUsers(users);

  return {
    success: true,
    message: 'Account deleted successfully'
  };
}
