# Razorpay Subscription System Integration Guide

## Overview

Your Dorwel backend now includes a comprehensive **Razorpay-powered subscription system** with monthly and yearly billing cycles. This system integrates seamlessly with your existing team-based RBAC system and provides complete payment processing, subscription management, and usage tracking.

## System Architecture

### **Core Components:**

1. **Subscription Plans** - Configurable plans with features and limits
2. **User Subscriptions** - Active user subscriptions with usage tracking
3. **Payment Processing** - Razorpay integration for secure payments
4. **Webhook Handling** - Real-time subscription event processing
5. **Usage Management** - Resource limits and quota tracking

### **Integration Flow:**
```
User → Select Plan → Create Order → Payment → Subscription → Usage Tracking → Renewal
```

## Models

### **1. SubscriptionPlan Model (`subscriptionPlanModel.js`)**
- **Purpose:** Manages subscription plans and their features
- **Key Features:**
  - Plan types: basic, professional, enterprise, custom
  - Billing cycles: monthly, yearly
  - Feature flags and resource limits
  - Razorpay plan integration
  - Trial period support

### **2. Subscription Model (`subscriptionModel.js`)**
- **Purpose:** Tracks user subscriptions and usage
- **Key Features:**
  - Subscription lifecycle management
  - Usage tracking for all resources
  - Feature access control
  - Subscription history
  - Trial period management

### **3. Payment Model (`paymentModel.js`)**
- **Purpose:** Records all payment transactions
- **Key Features:**
  - Payment status tracking
  - Refund management
  - Receipt generation
  - Payment method details
  - Error handling

### **4. Enhanced User Model (`userModel.js`)**
- **Purpose:** Extended with subscription tracking
- **Key Features:**
  - Razorpay customer ID
  - Subscription status
  - Subscription expiry tracking

## Subscription Plans

### **Plan Types:**
- `basic` - Entry-level plan with limited features
- `professional` - Full-featured plan for growing businesses
- `enterprise` - Advanced plan with premium features
- `custom` - Tailored plans for specific needs

### **Billing Cycles:**
- `monthly` - Monthly recurring billing
- `yearly` - Annual billing with potential discounts

### **Resource Limits:**
- **Teams** - Maximum number of teams
- **Users** - Maximum team members
- **Projects** - Maximum active projects
- **Clients** - Maximum client records
- **Leads** - Maximum lead records
- **Storage** - Maximum storage in GB

### **Feature Flags:**
- `aiEstimates` - AI-powered estimate generation
- `advancedAnalytics` - Advanced reporting and analytics
- `customBranding` - White-label customization
- `prioritySupport` - Priority customer support
- `apiAccess` - API access for integrations
- `whiteLabel` - Complete white-label solution

## API Endpoints

### **Subscription Plan Management:**
```
POST   /api/v1/subscriptions/plans                    - Create plan (Admin)
GET    /api/v1/subscriptions/plans                    - Get plans
GET    /api/v1/subscriptions/plans/:planId            - Get specific plan
PUT    /api/v1/subscriptions/plans/:planId            - Update plan (Admin)
DELETE /api/v1/subscriptions/plans/:planId            - Delete plan (Admin)
```

### **Subscription Management:**
```
POST   /api/v1/subscriptions/subscribe                - Create subscription
GET    /api/v1/subscriptions/my-subscriptions         - Get user subscriptions
GET    /api/v1/subscriptions/active                   - Get active subscription
POST   /api/v1/subscriptions/:subscriptionId/cancel   - Cancel subscription
```

### **Payment Management:**
```
POST   /api/v1/subscriptions/payment/order            - Create payment order
POST   /api/v1/subscriptions/payment/verify           - Verify payment
GET    /api/v1/subscriptions/payments                 - Get user payments
GET    /api/v1/subscriptions/payments/:paymentId      - Get specific payment
```

### **Usage and Limits:**
```
GET    /api/v1/subscriptions/usage/:resourceType      - Check usage limit
GET    /api/v1/subscriptions/usage                    - Get usage statistics
```

### **Admin Functions:**
```
GET    /api/v1/subscriptions/admin/subscriptions      - Get all subscriptions
GET    /api/v1/subscriptions/admin/stats              - Get subscription stats
GET    /api/v1/subscriptions/admin/payment-stats      - Get payment statistics
```

## Usage Examples

### **1. Creating a Subscription Plan:**
```javascript
POST /api/v1/subscriptions/plans
{
  "name": "Professional Plan",
  "description": "Full-featured plan for growing design studios",
  "planType": "professional",
  "billingCycle": "monthly",
  "price": {
    "amount": 2999,
    "currency": "INR"
  },
  "features": {
    "teams": { "max": 5, "unlimited": false },
    "users": { "max": 25, "unlimited": false },
    "projects": { "max": 100, "unlimited": false },
    "clients": { "max": 500, "unlimited": false },
    "leads": { "max": 1000, "unlimited": false },
    "storage": { "max": 50, "unlimited": false },
    "features": {
      "aiEstimates": true,
      "advancedAnalytics": true,
      "customBranding": false,
      "prioritySupport": true,
      "apiAccess": true,
      "whiteLabel": false
    }
  },
  "trialPeriod": {
    "enabled": true,
    "days": 14
  },
  "discounts": {
    "yearlyDiscount": 20
  }
}
```

### **2. Creating a Subscription:**
```javascript
POST /api/v1/subscriptions/subscribe
{
  "planId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "paymentMethod": "card"
}
```

### **3. Creating a Payment Order:**
```javascript
POST /api/v1/subscriptions/payment/order
{
  "planId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "amount": 2999,
  "currency": "INR"
}
```

### **4. Verifying Payment:**
```javascript
POST /api/v1/subscriptions/payment/verify
{
  "orderId": "order_1234567890",
  "paymentId": "pay_1234567890",
  "signature": "signature_hash",
  "planId": "60f7b3b3b3b3b3b3b3b3b3b3"
}
```

### **5. Checking Usage Limits:**
```javascript
GET /api/v1/subscriptions/usage/teams
```

## Razorpay Integration

### **Configuration:**
Add these environment variables to your `.env` file:
```env
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### **Webhook Events:**
The system handles these Razorpay webhook events:
- `payment.captured` - Payment successful
- `payment.failed` - Payment failed
- `subscription.activated` - Subscription activated
- `subscription.charged` - Recurring payment
- `subscription.completed` - Subscription completed
- `subscription.cancelled` - Subscription cancelled
- `subscription.paused` - Subscription paused
- `subscription.resumed` - Subscription resumed
- `subscription.halted` - Payment failed, subscription halted

### **Webhook Endpoint:**
```
POST /api/v1/webhooks/razorpay
```

## Usage Tracking

### **Resource Types:**
- `teams` - Team creation limits
- `users` - User addition limits
- `projects` - Project creation limits
- `clients` - Client record limits
- `leads` - Lead record limits
- `storage` - Storage usage limits

### **Usage Checking:**
```javascript
// Check if user can create a new team
const usageCheck = await Subscription.checkUsageLimit(subscriptionId, 'teams');
if (usageCheck.allowed) {
  // Allow team creation
} else {
  // Show upgrade message
}
```

### **Usage Updates:**
```javascript
// Increment usage when resource is created
await Subscription.updateUsage(subscriptionId, 'teams', 1);
```

## Subscription Lifecycle

### **1. Trial Period:**
- Users can start with a trial period
- Trial features are limited
- Automatic conversion to paid plan

### **2. Active Subscription:**
- Full access to plan features
- Usage tracking and limits
- Automatic renewals

### **3. Payment Failures:**
- Grace period for failed payments
- Subscription halted after multiple failures
- User notifications and retry options

### **4. Cancellation:**
- Immediate or end-of-cycle cancellation
- Data retention policies
- Downgrade to free tier

## Security Features

### **Payment Security:**
- Razorpay's PCI DSS compliance
- Secure webhook signature verification
- Encrypted payment data storage

### **Access Control:**
- Role-based plan management
- User-specific subscription access
- Admin-only plan creation/modification

### **Data Protection:**
- Secure payment information handling
- Audit trails for all transactions
- GDPR-compliant data management

## Integration with Team RBAC

### **Team-Based Limits:**
- Subscription limits apply to teams
- Team members inherit subscription features
- Cross-team resource sharing

### **Permission Integration:**
- Subscription status affects permissions
- Feature flags control access
- Usage limits prevent overages

## Monitoring and Analytics

### **Subscription Metrics:**
- Active subscriptions count
- Revenue tracking
- Churn rate analysis
- Plan popularity

### **Usage Analytics:**
- Resource utilization
- Feature adoption
- User behavior patterns
- Growth metrics

### **Payment Analytics:**
- Payment success rates
- Revenue trends
- Refund analysis
- Payment method preferences

## Error Handling

### **Payment Failures:**
- Automatic retry mechanisms
- User notification system
- Grace period management
- Fallback options

### **Subscription Issues:**
- Status synchronization
- Webhook failure handling
- Manual intervention tools
- Recovery procedures

## Testing

### **Test Payment Flow:**
```javascript
// Use Razorpay test mode
const testOrder = await razorpayService.createOrder({
  amount: 100, // 1 INR in paise
  currency: 'INR',
  receipt: 'test_receipt'
});
```

### **Webhook Testing:**
```javascript
// Test webhook endpoint
POST /api/v1/webhooks/test
{
  "service": "razorpay",
  "event": "payment.captured",
  "data": { /* test data */ }
}
```

## Deployment Checklist

### **Environment Setup:**
- [ ] Razorpay account created
- [ ] API keys configured
- [ ] Webhook endpoints set up
- [ ] SSL certificates installed

### **Database Setup:**
- [ ] Subscription plans created
- [ ] Initial data seeded
- [ ] Indexes created
- [ ] Backup procedures in place

### **Monitoring Setup:**
- [ ] Payment monitoring configured
- [ ] Webhook failure alerts
- [ ] Usage tracking enabled
- [ ] Analytics dashboard ready

## Best Practices

### **Plan Design:**
- Start with simple plans
- Clear feature differentiation
- Reasonable pricing tiers
- Trial period benefits

### **User Experience:**
- Clear upgrade paths
- Usage notifications
- Easy cancellation process
- Transparent billing

### **Technical Implementation:**
- Robust error handling
- Comprehensive logging
- Regular backups
- Performance monitoring

## Troubleshooting

### **Common Issues:**

1. **Payment Failures:**
   - Check Razorpay configuration
   - Verify webhook signatures
   - Review payment method support

2. **Subscription Sync Issues:**
   - Check webhook delivery
   - Verify database connections
   - Review error logs

3. **Usage Limit Problems:**
   - Check subscription status
   - Verify plan limits
   - Review usage calculations

### **Support Resources:**
- Razorpay documentation
- Webhook event reference
- API error codes
- Community forums

Your Razorpay subscription system is now fully integrated and ready to handle monthly and yearly billing for your interior design management platform! 🎉

## Quick Start Guide

1. **Set up Razorpay account** and get API keys
2. **Configure environment variables** in your `.env` file
3. **Create subscription plans** using the admin API
4. **Test payment flow** with test mode
5. **Set up webhooks** in Razorpay dashboard
6. **Monitor subscriptions** and usage
7. **Handle customer support** requests

The system is production-ready and provides a complete subscription management solution for your business! 🚀
