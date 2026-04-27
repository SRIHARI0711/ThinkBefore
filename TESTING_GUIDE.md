# Testing Guide: Password Validation & Email OTP

## Quick Start Testing

### Test 1: Password Validation (Login)

**Scenario**: User signs up with a password, then tries to login

**Steps**:
1. **Signup with password**
   - Click "Create Account"
   - Email: `test@example.com`
   - Click "Send Code"
   - Check console for OTP (e.g., `123456`)
   - Enter OTP
   - Nickname: `testuser`
   - Password: `MySecurePassword123`
   - Avatar color: Any color
   - Click "Create Account"
   - You're now logged in

2. **Logout**
   - Click Profile
   - Click "Sign Out →"
   - Back at welcome page

3. **Try login with WRONG password**
   - Click "Get Started"
   - Email: `test@example.com`
   - Click "Continue"
   - Password: `WrongPassword`
   - Click "Sign In"
   - ❌ **Expected**: Error message "Invalid password"
   - ✅ **Result**: Cannot login with wrong password

4. **Try login with CORRECT password**
   - Password: `MySecurePassword123`
   - Click "Sign In"
   - ✅ **Expected**: Successfully logged in to Dashboard
   - ✅ **Result**: Redirected to Dashboard

---

### Test 2: OTP Verification (Email)

**Scenario**: OTP is sent to email, not displayed on screen

**Steps**:
1. **Start signup**
   - Click "Create Account"
   - Email: `secure@example.com`

2. **Send OTP**
   - Click "Send Code"
   - ❌ **Old behavior**: OTP displayed on signup page
   - ✅ **New behavior**: Redirected to OTP verification screen
   - ✅ **Message**: "We sent a 6-digit code to secure@example.com"
   - Note: OTP is NOT visible on screen

3. **Find OTP in dev mode**
   - Open browser console (F12 or Right-click → Inspect → Console)
   - Look for: `[Dev Mode] Your OTP: XXXXXX`
   - Copy the 6-digit code

4. **Enter OTP**
   - Paste OTP in the "Enter OTP code" field
   - "Verify Code" button should enable when 6 digits entered
   - Click "Verify Code"
   - ✅ **Expected**: Moved to nickname selection page
   - If wrong OTP: ❌ "Invalid OTP. Please try again."

5. **Resend OTP**
   - If you didn't capture OTP, click "Resend Code"
   - New OTP generated and logged to console
   - You have 10 minutes for each OTP

---

### Test 3: Email Configuration (Customizable Sender)

**Scenario**: Configure cogniguard email address

**Steps**:
1. **Navigate to Email Settings**
   - Login to app
   - Click Profile (top-right)
   - Scroll down to "Email Settings"

2. **View current settings**
   - Sender Email: `cogniguard@example.com`
   - Sender Name: `CogniAuth`
   - (These are displayed by default)

3. **Edit email settings**
   - Click "Edit" button
   - Change "Sender Email Address": `support@mycompany.com`
   - Change "Sender Name": `My Company Support`
   - Click "Save Changes"
   - ✅ **Expected**: Settings saved and updated
   - Refresh page (F5) and return to Profile → Email Settings
   - ✅ **Verify**: New values persist

4. **Reset to defaults**
   - Click "Edit"
   - Enter defaults again
   - Click "Save Changes"

---

### Test 4: Complete Signup Flow

**Full journey from signup to login**

**Steps**:
1. **Create Account**
   ```
   Email: newuser@test.com
   OTP: [From console]
   Nickname: innovator_pro
   Color: Purple
   Password: SecurePass@2024
   ```

2. **Automatic Login**
   - ✅ Redirected to Dashboard
   - ✅ Can see Dashboard, History, Profile

3. **Logout**
   - Profile → Sign Out

4. **Login Back**
   ```
   Email: newuser@test.com
   Password: SecurePass@2024
   ```
   - ✅ Successfully logged in

5. **Try wrong password**
   ```
   Email: newuser@test.com
   Password: WrongOne
   ```
   - ❌ "Invalid password" error
   - Cannot proceed

---

### Test 5: OTP Expiration

**Scenario**: OTP expires after 10 minutes

**Steps**:
1. Send OTP (current time: let's say 1:00 PM)
2. Wait 10+ minutes
3. Try to enter the old OTP
4. ❌ **Expected**: "OTP has expired. Please request a new one."
5. Click "Resend Code" and get new OTP
6. ✅ New OTP works

---

### Test 6: Duplicate Email Registration

**Scenario**: Try to register with existing email

**Steps**:
1. First signup: `duplicate@test.com` (Complete successfully)
2. Try signup again: `duplicate@test.com`
3. Click "Send Code"
4. ❌ **Expected**: Error message "This email is already registered"
5. ✅ Cannot proceed

---

### Test 7: Multiple Users

**Scenario**: Create multiple accounts and switch between them

**Steps**:
1. **Create User 1**
   ```
   Email: user1@test.com
   Password: Pass1@2024
   ```

2. **Create User 2**
   ```
   Email: user2@test.com
   Password: Pass2@2024
   ```

3. **Login as User 1**
   - Email: user1@test.com
   - Password: Pass1@2024
   - ✅ Can login

4. **Logout and Login as User 2**
   - Email: user2@test.com
   - Password: Pass2@2024
   - ✅ Can login
   - Separate profile, history, settings

5. **Password isolation test**
   - Logout
   - Try User 1's email with User 2's password
   - ❌ "Invalid password"
   - ✅ Each user has their own password

---

## Browser Console Testing

### Check stored data:
```javascript
// View all registered users
console.log(JSON.parse(localStorage.getItem('users')))

// View email configuration
console.log(JSON.parse(localStorage.getItem('emailConfig')))

// View stored OTP (for debugging)
console.log(JSON.parse(localStorage.getItem('otp_test@example.com')))
```

### Clear all data (start fresh):
```javascript
// Clear users
localStorage.removeItem('users')

// Clear OTPs
localStorage.removeItem('otp_test@example.com')

// Clear email config
localStorage.removeItem('emailConfig')

// Clear all
localStorage.clear()
```

---

## Expected vs Actual Behavior

| Feature | Old Behavior | New Behavior |
|---------|-------------|--------------|
| **Password Login** | Any password accepted | ✅ Only registered password works |
| **OTP Display** | Shown on signup screen | ✅ Sent to email (console in dev) |
| **Password Validation** | None | ✅ Validated on each login |
| **Email Sender** | Fixed | ✅ Configurable in Profile |
| **OTP Expiration** | None | ✅ 10 minutes |
| **Duplicate Emails** | Allowed | ✅ Prevented |
| **User Isolation** | Single user | ✅ Multiple users supported |

---

## Troubleshooting

### OTP not showing?
- ✅ Open Developer Console (F12)
- ✅ Go to Console tab
- ✅ Look for `[Dev Mode] Your OTP: XXXXXX`
- ✅ If not there, check console errors

### Wrong password error appearing?
- ✅ Make sure you're using exact password from signup
- ✅ Passwords are case-sensitive
- ✅ Check for extra spaces

### Email settings not saving?
- ✅ Click "Save Changes" button explicitly
- ✅ Check browser localStorage is enabled
- ✅ Try clearing browser cache and reloading

### Can't register with email?
- ✅ Email must not already exist
- ✅ OTP must be correct (from console)
- ✅ Must wait for OTP verification
- ✅ Cannot skip OTP step

---

## Performance Notes

- **Local Storage**: All data stored in browser (no server)
- **OTP Generation**: Instant
- **Password Validation**: Instant
- **Email Settings**: Saved immediately
- **Speed**: All operations should be instant

---

## Security Test Checklist

- [x] Passwords validated on every login
- [x] OTP required for signup
- [x] OTP expires after 10 minutes
- [x] Cannot duplicate email registration
- [x] Each user has isolated password
- [x] Email configuration customizable
- [x] Email not displayed on screen
- [x] Settings persist across sessions

---

## Success Criteria

✅ All tests pass → Implementation successful!
✅ Wrong password rejected → Password validation working
✅ OTP in console only → Privacy maintained
✅ Email config editable → Customization available
✅ Multiple users supported → System scalable
