# WooCommerce API Key Authentication Troubleshooting

## Problem

You're getting a 403 error with "Invalid API key" when trying to sync products:

```json
{
  "success": false,
  "message": "Failed to sync all 2 products",
  "error": "All products failed to sync",
  "results": {
    "failed": [
      {
        "product": "Product Name",
        "sku": "SKU-001",
        "error": {
          "code": "rest_forbidden",
          "message": "Invalid API key.",
          "data": {
            "status": 403
          }
        }
      }
    ]
  }
}
```

## Solution Steps

### 1. Verify API Key in WordPress Plugin

1. Log in to your WordPress admin panel
2. Navigate to **POS Sync** → **Settings** (or wherever your plugin settings are)
3. Copy the API key shown there
4. Make sure it's the exact value (no extra spaces, correct case if applicable)

### 2. Check Your `.env` File

Open your `.env` file and verify:

```env
WORDPRESS_URL=https://your-wordpress-site.com
WORDPRESS_API_KEY=your-actual-api-key-here
SYNC_TO_WOOCOMMERCE=true
```

**Common Issues:**
- ❌ API key has extra spaces: `WORDPRESS_API_KEY= abc123 ` (should be `WORDPRESS_API_KEY=abc123`)
- ❌ API key is wrapped in quotes: `WORDPRESS_API_KEY="abc123"` (remove quotes)
- ❌ Missing `WORDPRESS_API_KEY` entirely
- ❌ Wrong variable name: `WORDPRESS_KEY` instead of `WORDPRESS_API_KEY`
- ❌ WORDPRESS_URL doesn't match your actual WordPress site URL

### 3. Restart Your Server

After updating `.env`, **restart your Node.js server**:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
# or
npm start
```

Environment variables are only loaded when the server starts!

### 4. Test the Connection

Use the status endpoint to verify your configuration:

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:8080/api/woocommerce/status"
```

**Expected Response (Success):**
```json
{
  "success": true,
  "syncEnabled": true,
  "configValid": true,
  "enabled": true,
  "connected": true,
  "status": { ... }
}
```

**Expected Response (API Key Issue):**
```json
{
  "success": true,
  "syncEnabled": true,
  "configValid": true,
  "enabled": true,
  "connected": false,
  "error": {
    "code": "rest_forbidden",
    "message": "Invalid API key."
  }
}
```

### 5. Verify API Key Format

The API key should be sent in the `X-API-Key` header. Check that:

1. Your WordPress plugin expects `X-API-Key` header (not `Authorization` or `X-Api-Key`)
2. The API key value matches exactly what's in WordPress
3. No special characters are being escaped incorrectly

### 6. Check WordPress Plugin Configuration

In your WordPress plugin settings:

1. **API Key**: Should be a secure random string (32+ characters recommended)
2. **API Key Header**: Should be set to `X-API-Key` (case-sensitive)
3. **Allowed Origins**: Make sure your POS API URL is allowed (if CORS is configured)

### 7. Debug Steps

#### Step 1: Check Environment Variables Are Loaded

Add a temporary debug endpoint or check logs:

```javascript
// In your code, temporarily log:
console.log('WORDPRESS_API_KEY:', process.env.WORDPRESS_API_KEY ? 'SET' : 'NOT SET');
console.log('WORDPRESS_API_KEY length:', process.env.WORDPRESS_API_KEY?.length);
console.log('WORDPRESS_URL:', process.env.WORDPRESS_URL);
```

#### Step 2: Test API Key Manually

Test the API key directly with curl:

```bash
curl -X GET \
  -H "X-API-Key: YOUR_API_KEY_HERE" \
  "https://your-wordpress-site.com/wp-json/wc-pos-sync/v1/status"
```

If this fails, the issue is with the API key itself or WordPress plugin configuration.

#### Step 3: Check WordPress Plugin Logs

Check WordPress error logs or plugin-specific logs for more details about why authentication is failing.

### 8. Common WordPress Plugin Issues

#### Issue: Plugin Not Activated
- **Solution**: Activate the WooCommerce POS Sync plugin in WordPress

#### Issue: API Key Not Generated
- **Solution**: Generate a new API key in plugin settings

#### Issue: API Key Regenerated
- **Solution**: Update your `.env` file with the new API key and restart server

#### Issue: Wrong API Endpoint
- **Solution**: Verify the endpoint URL matches: `/wp-json/wc-pos-sync/v1/sync-product`

### 9. Security Considerations

- ✅ Never commit `.env` file to version control
- ✅ Use strong, random API keys (32+ characters)
- ✅ Rotate API keys periodically
- ✅ Use HTTPS in production
- ✅ Restrict API key access to specific IPs if possible

### 10. Still Not Working?

If you've tried all the above:

1. **Generate a new API key** in WordPress plugin settings
2. **Update `.env`** with the new key
3. **Restart server**
4. **Test again**

If it still fails, check:
- WordPress plugin version compatibility
- PHP version requirements
- WordPress REST API is enabled
- No security plugins blocking the API endpoint
- Server firewall/security rules

## Quick Checklist

- [ ] API key exists in WordPress plugin settings
- [ ] API key copied exactly (no extra spaces)
- [ ] `.env` file has `WORDPRESS_API_KEY=...` (no quotes)
- [ ] `.env` file has `WORDPRESS_URL=https://...` (correct URL)
- [ ] `.env` file has `SYNC_TO_WOOCOMMERCE=true`
- [ ] Server restarted after `.env` changes
- [ ] WordPress plugin is activated
- [ ] WordPress REST API is enabled
- [ ] Tested with status endpoint
- [ ] Checked WordPress error logs

## Error Messages Explained

### "Invalid API key" (403)
- API key doesn't match what's configured in WordPress
- API key not set in `.env` file
- Server not restarted after updating `.env`

### "Unauthorized" (401)
- API key header not being sent
- API key format incorrect
- WordPress plugin authentication misconfigured

### "rest_forbidden"
- WordPress REST API authentication failed
- API key validation failed in WordPress plugin
- Check WordPress plugin settings

## Getting Help

If you're still stuck:

1. Check the status endpoint: `GET /api/woocommerce/status`
2. Review server logs for detailed error messages
3. Check WordPress error logs
4. Verify plugin documentation for API key requirements
5. Test API key manually with curl

## Prevention

To avoid this issue in the future:

1. **Document your API keys** securely (password manager)
2. **Use environment-specific keys** (dev/staging/production)
3. **Set up monitoring** to alert on authentication failures
4. **Regular key rotation** schedule
5. **Version control** your `.env.example` (without actual keys)
