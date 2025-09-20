# Webhook URLs Quick Reference

## Your Webhook Base URL
```
https://your-domain.com/api/v1/webhooks
```

## Individual Webhook Endpoints

### 1. Twilio Webhooks
**URL:** `https://your-domain.com/api/v1/webhooks/twilio`
- **Purpose:** Handle SMS/WhatsApp message status updates
- **Method:** POST
- **Content-Type:** `application/x-www-form-urlencoded`
- **Headers:** `X-Twilio-Signature` (required for verification)

### 2. OpenAI Webhooks
**URL:** `https://your-domain.com/api/v1/webhooks/openai`
- **Purpose:** Handle AI completion status updates
- **Method:** POST
- **Content-Type:** `application/json`
- **Headers:** `openai-signature` (required for verification)

### 3. Google OAuth Webhooks
**URL:** `https://your-domain.com/api/v1/webhooks/google`
- **Purpose:** Handle user profile updates from Google
- **Method:** POST
- **Content-Type:** `application/json`
- **Headers:** `x-google-signature` (required for verification)

### 4. Generic Webhook Handler
**URL:** `https://your-domain.com/api/v1/webhooks/generic`
- **Purpose:** Handle custom webhook integrations
- **Method:** POST
- **Content-Type:** `application/json`
- **Body:** `{"service": "service_name", "event": "event_name", "data": {...}}`

### 5. Health Check
**URL:** `https://your-domain.com/api/v1/webhooks/health`
- **Purpose:** Check webhook service availability
- **Method:** GET
- **Response:** Service status and health information

### 6. Test Webhook
**URL:** `https://your-domain.com/api/v1/webhooks/test`
- **Purpose:** Test webhook functionality
- **Method:** POST
- **Content-Type:** `application/json`
- **Body:** `{"service": "test", "event": "test.event", "data": {...}}`

## Local Development URLs
```
http://localhost:666/api/v1/webhooks/[endpoint]
```

## Configuration Checklist

### Environment Variables Required:
```bash
TWILIO_WEBHOOK_SECRET=your_secret_here
OPENAI_WEBHOOK_SECRET=your_secret_here
GOOGLE_WEBHOOK_SECRET=your_secret_here
```

### Service Configuration:

#### Twilio Console:
1. Go to Messaging > Settings > Webhooks
2. Set Status Callback URL: `https://your-domain.com/api/v1/webhooks/twilio`

#### OpenAI Platform:
1. Go to API Keys > Webhooks
2. Add webhook URL: `https://your-domain.com/api/v1/webhooks/openai`
3. Set webhook secret

#### Google Cloud Console:
1. Go to APIs & Services > Credentials
2. Edit OAuth 2.0 Client ID
3. Add webhook URL: `https://your-domain.com/api/v1/webhooks/google`

## Testing Commands

### Health Check:
```bash
curl -X GET https://your-domain.com/api/v1/webhooks/health
```

### Test Webhook:
```bash
curl -X POST https://your-domain.com/api/v1/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{"service": "test", "event": "test.event", "data": {"message": "Hello"}}'
```

### Test Twilio Webhook:
```bash
curl -X POST https://your-domain.com/api/v1/webhooks/twilio \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "X-Twilio-Signature: test-signature" \
  -d "MessageStatus=delivered&MessageSid=SM123&To=%2B1234567890"
```

## Security Notes
- All webhooks use HMAC-SHA256 signature verification
- HTTPS is required for production
- Rate limiting is applied to all endpoints
- Invalid signatures return 401 Unauthorized

## Monitoring
- Check `/health` endpoint regularly
- Monitor webhook delivery success rates
- Set up alerts for failed webhook deliveries
- Review logs for webhook events and errors



