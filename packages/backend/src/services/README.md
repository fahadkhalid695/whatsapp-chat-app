# Authentication Service Documentation

## Overview

The authentication service provides secure phone number-based authentication for the WhatsApp chat application. It implements JWT token-based authentication with SMS verification.

## Features

- Phone number validation and formatting
- SMS verification code generation and sending
- JWT token generation and validation
- User registration and login
- Token refresh mechanism
- Session management

## API Endpoints

### POST /api/auth/verify-phone

Initiates phone number verification by sending an SMS code.

**Request:**
```json
{
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verificationId": "uuid-string",
    "message": "Verification code sent successfully"
  }
}
```

### POST /api/auth/verify-code

Verifies the SMS code and completes authentication.

**Request:**
```json
{
  "verificationId": "uuid-string",
  "code": "123456",
  "displayName": "John Doe",
  "profilePicture": "https://example.com/avatar.jpg" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "phoneNumber": "+1234567890",
      "displayName": "John Doe",
      "profilePicture": "https://example.com/avatar.jpg",
      "status": "Available",
      "lastSeen": "2023-01-01T00:00:00.000Z",
      "isOnline": true,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    }
  }
}
```

### POST /api/auth/refresh

Refreshes an expired access token using a refresh token.

**Request:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-jwt-access-token"
  }
}
```

### POST /api/auth/logout

Logs out the current user.

**Headers:**
```
Authorization: Bearer jwt-access-token
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/auth/me

Gets current user information.

**Headers:**
```
Authorization: Bearer jwt-access-token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-id",
    "phoneNumber": "+1234567890"
  }
}
```

## Security Features

### JWT Tokens
- Access tokens expire in 24 hours (configurable)
- Refresh tokens expire in 7 days (configurable)
- Tokens are signed with secure secrets

### Phone Number Validation
- International format required (+country code)
- Comprehensive validation and formatting
- Support for various input formats

### SMS Verification
- 6-digit verification codes
- 10-minute expiration time
- Maximum 3 verification attempts
- Mock SMS service for development

### Rate Limiting
- Verification attempt limits
- Session cleanup for expired codes
- Protection against brute force attacks

## Configuration

Environment variables for authentication:

```env
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# SMS Configuration
SMS_PROVIDER=mock  # or 'twilio', 'aws-sns', etc.
SMS_API_KEY=your-sms-api-key
SMS_API_SECRET=your-sms-api-secret
```

## Usage Examples

### Frontend Integration

```typescript
// Initiate phone verification
const verifyPhone = async (phoneNumber: string) => {
  const response = await fetch('/api/auth/verify-phone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber }),
  });
  return response.json();
};

// Verify code and authenticate
const verifyCode = async (verificationId: string, code: string, displayName: string) => {
  const response = await fetch('/api/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationId, code, displayName }),
  });
  return response.json();
};

// Use access token for authenticated requests
const makeAuthenticatedRequest = async (accessToken: string) => {
  const response = await fetch('/api/protected-endpoint', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  return response.json();
};
```

### Middleware Usage

```typescript
import { authenticateToken, requireOwnership } from '../middleware/auth';

// Protect routes with authentication
router.get('/protected', authenticateToken, (req, res) => {
  // req.user contains JWT payload
  res.json({ userId: req.user.userId });
});

// Require resource ownership
router.put('/users/:userId', authenticateToken, requireOwnership('userId'), (req, res) => {
  // User can only update their own profile
});
```

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_001 | Invalid phone number format |
| AUTH_002 | Verification code is invalid or expired |
| AUTH_003 | Authentication token has expired |
| AUTH_004 | User is not authorized for this action |
| AUTH_005 | Access denied - insufficient permissions |
| AUTH_006 | Too many verification attempts |

## Testing

The authentication service includes comprehensive tests:

- Unit tests for utilities (JWT, phone validation)
- Service tests for authentication flows
- Integration tests for API endpoints
- Mock implementations for development

Run tests with:
```bash
npm test -- --testPathPattern="auth|jwt|phone"
```

## Development Notes

### Mock SMS Service
In development mode, SMS codes are logged to the console instead of being sent via SMS. This allows for easy testing without requiring SMS service credentials.

### Database Requirements
The authentication service requires the following database tables:
- `users` - User profiles and authentication data

### Security Considerations
- Store JWT secrets securely
- Use HTTPS in production
- Implement rate limiting
- Monitor for suspicious authentication patterns
- Consider implementing token blacklisting for enhanced security