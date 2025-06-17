# Authentication System

This authentication system follows security best practices, using HTTP-only cookies for tokens and implementing a token refresh strategy optimized for security.

## Key Design Principles

1. **Minimal Token Exposure**: Refresh tokens are only sent when absolutely necessary
2. **HTTP-only Cookies**: All tokens are stored in HTTP-only cookies to prevent XSS attacks
3. **Automatic Refresh Token Handling**: Refresh tokens are automatically provided when a 401 error occurs

## Authentication Flow

### Initial Authentication (Login/Registration)

1. User logs in or registers
2. Server authenticates user and returns:
   - User data in the response body
   - Access token as an HTTP-only cookie
   - No refresh token initially (for security)

### Regular API Requests

1. Frontend makes API requests with the access token cookie (automatically included)
2. If the token is valid, requests proceed normally
3. If the token expires, the server returns a 401 Unauthorized error with:
   - A refresh token cookie (automatically added)
   - A response indicating the client should try to refresh

### Automatic Token Refresh

When a 401 error occurs:

1. The server automatically:
   - Detects the authentication failure
   - Extracts user information from the expired token
   - Sets a refresh token as an HTTP-only cookie
   - Returns a response with `shouldRefresh: true`

2. The frontend should:
   - Call the `/auth/refresh` endpoint to get a new access token
   - Retry the original failed request

### Example Frontend Implementation

```typescript
// Example API request with automatic token refresh
async function apiRequest(url, options = {}) {
  try {
    // Make the original request
    const response = await fetch(url, options);
    
    // If successful, return the response
    if (response.ok) {
      return response.json();
    }
    
    // Handle 401 (Unauthorized) errors
    if (response.status === 401) {
      const errorData = await response.json();
      
      // Check if we should try to refresh the token
      if (errorData.shouldRefresh) {
        // Call refresh endpoint to get new access token using the refresh token cookie
        const refreshResponse = await fetch('/auth/refresh', {
          method: 'POST',
          credentials: 'include', // Include cookies
        });
        
        if (!refreshResponse.ok) {
          // If refresh fails, redirect to login
          window.location.href = '/login';
          return;
        }
        
        // Retry the original request (now with new access token cookie)
        const retryResponse = await fetch(url, {
          ...options,
          credentials: 'include',
        });
        
        if (retryResponse.ok) {
          return retryResponse.json();
        }
      }
      
      // If we shouldn't refresh or the retry failed, redirect to login
      if (errorData.shouldRedirectToLogin) {
        window.location.href = '/login';
        return;
      }
    }
    
    throw new Error(`API request failed: ${response.statusText}`);
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}
```

## Endpoints

### POST /auth/login
- Authenticates user with email/password
- Sets access token cookie
- Returns user data

### POST /auth/register
- Creates new user and organization
- Sets access token cookie
- Returns user data

### POST /auth/refresh
- Uses refresh token to get new access token
- Sets new access token cookie
- May update refresh token if needed
- Returns success status

### POST /auth/logout
- Clears all auth cookies
- Returns success status

## Security Benefits

- **Reduced Attack Surface**: Refresh tokens only exist when needed
- **Prevention of XSS**: Tokens are in HTTP-only cookies, inaccessible to JavaScript
- **Automatic Token Handling**: No manual management of refresh tokens required
- **Secure Token Rotation**: New tokens issued only during explicit refresh flows
- **Minimal Token Exposure**: Refresh tokens not exposed in normal operations 