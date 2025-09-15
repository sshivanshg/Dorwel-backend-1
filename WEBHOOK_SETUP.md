# Webhook Setup Guide

## Overview

Your Dorwel backend system has a comprehensive webhook implementation that supports:
- **Twilio** (SMS/WhatsApp message status updates)
- **OpenAI** (AI completion status updates)
- **Google OAuth** (User profile updates)
- **Generic webhooks** (Custom integrations)

## Available Webhook Endpoints

### Base URL
```
https://your-domain.com/api/v1/webhooks
```

### Endpoints
- `POST /api/v1/webhooks/twilio` - Twilio webhooks
- `POST /api/v1/webhooks/openai` - OpenAI webhooks
- `POST /api/v1/webhooks/google` - Google OAuth webhooks
- `POST /api/v1/webhooks/generic` - Generic webhook handler
- `GET /api/v1/webhooks/health` - Health check for webhook services
- `POST /api/v1/webhooks/test` - Test webhook endpoint

## Environment Variables Setup

Add these to your `.env` file:

```bash
# Webhook Secrets (Generate strong random strings)
TWILIO_WEBHOOK_SECRET=your_twilio_webhook_secret_here
OPENAI_WEBHOOK_SECRET=your_openai_webhook_secret_here
GOOGLE_WEBHOOK_SECRET=your_google_webhook_secret_here
```

### Generate Webhook Secrets
```bash
# Generate secure random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Service-Specific Setup

### 1. Twilio Webhooks

#### Configure in Twilio Console:
1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Messaging** > **Settings** > **Webhooks**
3. Set webhook URL: `https://your-domain.com/api/v1/webhooks/twilio`
4. Configure events:
   - Message Status Callback
   - Incoming Messages (if needed)

#### Supported Events:
- `delivered` - Message delivered successfully
- `failed` - Message delivery failed
- `undelivered` - Message could not be delivered

#### Webhook Payload Example:
```json
{
  "MessageStatus": "delivered",
  "MessageSid": "SM1234567890abcdef",
  "To": "+1234567890",
  "From": "+0987654321",
  "Body": "Hello from Twilio"
}
```

### 2. OpenAI Webhooks

#### Configure in OpenAI Platform:
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to **API Keys** > **Webhooks**
3. Add webhook URL: `https://your-domain.com/api/v1/webhooks/openai`
4. Set webhook secret in environment variables

#### Supported Events:
- `completion.completed` - AI completion finished successfully
- `completion.failed` - AI completion failed

#### Webhook Payload Example:
```json
{
  "event": "completion.completed",
  "data": {
    "id": "cmpl-1234567890abcdef",
    "model": "gpt-4",
    "status": "completed"
  }
}
```

### 3. Google OAuth Webhooks

#### Configure in Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add webhook URL: `https://your-domain.com/api/v1/webhooks/google`

#### Supported Events:
- `user.updated` - User profile updated
- `user.deleted` - User account deleted

#### Webhook Payload Example:
```json
{
  "event": "user.updated",
  "data": {
    "userId": "google_user_id_123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

## Testing Webhooks

### 1. Health Check
```bash
curl -X GET https://your-domain.com/api/v1/webhooks/health
```

### 2. Test Webhook
```bash
curl -X POST https://your-domain.com/api/v1/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{
    "service": "test",
    "event": "test.event",
    "data": {
      "message": "Test webhook payload"
    }
  }'
```

### 3. Test Twilio Webhook
```bash
curl -X POST https://your-domain.com/api/v1/webhooks/twilio \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "X-Twilio-Signature: test-signature" \
  -d "MessageStatus=delivered&MessageSid=SM123&To=%2B1234567890&From=%2B0987654321"
```

## Security Considerations

### 1. Webhook Signature Verification
- All webhooks verify signatures using HMAC-SHA256
- Secrets are stored securely in environment variables
- Invalid signatures return 401 Unauthorized

### 2. Rate Limiting
- Webhook endpoints are protected by rate limiting
- Default: 100 requests per 15 minutes per IP

### 3. HTTPS Only
- All webhook URLs must use HTTPS in production
- HTTP is only allowed for local development

## Monitoring and Logging

### Logs
All webhook events are logged with:
- Timestamp
- Service name
- Event type
- Success/failure status
- Error details (if any)

### Health Monitoring
Use the health check endpoint to monitor webhook service availability:
```bash
curl https://your-domain.com/api/v1/webhooks/health
```

Response:
```json
{
  "success": true,
  "data": {
    "services": {
      "twilio": true,
      "openai": true,
      "google": true
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "status": "healthy"
  }
}
```

## Troubleshooting

### Common Issues:

1. **401 Unauthorized**
   - Check webhook secret configuration
   - Verify signature generation

2. **500 Internal Server Error**
   - Check server logs for detailed error messages
   - Verify database connectivity
   - Check service dependencies

3. **Webhook Not Receiving Events**
   - Verify webhook URL is accessible
   - Check firewall/network configuration
   - Confirm service-specific webhook configuration

### Debug Mode
Enable debug logging by setting:
```bash
NODE_ENV=development
```

## Production Deployment

### 1. Environment Variables
Ensure all webhook secrets are set in production:
```bash
TWILIO_WEBHOOK_SECRET=production_secret_here
OPENAI_WEBHOOK_SECRET=production_secret_here
GOOGLE_WEBHOOK_SECRET=production_secret_here
```

### 2. SSL Certificate
Ensure your domain has a valid SSL certificate for HTTPS webhooks.

### 3. Monitoring
Set up monitoring for:
- Webhook endpoint availability
- Response times
- Error rates
- Failed webhook deliveries

## Next Steps

1. **Set up environment variables** with your webhook secrets
2. **Configure webhook URLs** in each service's console
3. **Test webhook endpoints** using the provided test commands
4. **Monitor webhook health** using the health check endpoint
5. **Set up production monitoring** for webhook reliability

Your webhook system is now ready to handle real-time events from external services!
