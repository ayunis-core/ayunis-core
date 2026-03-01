# PRD: Usage-Based Pricing (AYC-77)

## Problem

Currently, Ayunis Core only supports seat-based subscription pricing (price per user). Organizations need an alternative pricing model where they pay for actual usage (token consumption) rather than per-seat. This allows more flexible pricing aligned with actual consumption, especially for organizations with varying usage patterns.

## Solution Overview

Introduce a **credits-based usage pricing model** that coexists with the current seat-based pricing. Credits are the universal unit of consumption, where the cost in credits depends on the model's token pricing—expensive models consume more credits per token than cheaper models.

### Key Concepts

- **Credit**: Universal usage unit. 1 credit = a normalized token cost across models
- **Yearly Credit Allowance**: Max credits per organization per year
- **Monthly Budget**: 1/12 of the yearly allowance, reset monthly
- **Credit Cost per Model**: Derived from `inputTokenCost` and `outputTokenCost` on `LanguageModel`

---

## Requirements by Role

---

## 1. Super Admin

Super admins are the **only role** that can manage subscriptions. They have full control over both seat-based and usage-based pricing.

### Scenario 1.1: View All Organization Subscriptions

**Description**: Super admin views the list of all organizations and their subscription details.

**Requirements**:

- Display list of all organizations with subscription info
- Show subscription type (seat-based or usage-based)
- For seat-based: show number of seats, price per seat
- For usage-based: show yearly credit allowance, optional package name, optional price

---

### Scenario 1.2: Create/Edit Seat-Based Subscription

**Description**: Super admin creates or modifies a seat-based subscription for an organization.

**Requirements**:

- Set number of seats
- Set price per seat
- Set billing info

**Acceptance Criteria**:

- [ ] Super admin can create a new seat-based subscription
- [ ] Super admin can edit existing seat-based subscription
- [ ] Changes take effect immediately
- [ ] Validation prevents invalid values (e.g., negative seats)

---

### Scenario 1.3: Create/Edit Usage-Based Subscription

**Description**: Super admin creates or modifies a usage-based subscription for an organization.

**Requirements**:

- Set yearly credit allowance (required)
- Set package name (optional, display-only)
- Set price (optional, display-only)

**Acceptance Criteria**:

- [ ] Super admin can create a new usage-based subscription
- [ ] Super admin can set yearly credit allowance
- [ ] Package name and price are optional fields with no business logic attached
- [ ] Super admin can edit existing usage-based subscription
- [ ] Monthly budget is automatically calculated as yearly_credits / 12

---

### Scenario 1.4: Switch Subscription Type

**Description**: Super admin switches an organization between seat-based and usage-based pricing.

**Requirements**:

- Allow switching from seat-based to usage-based and vice versa
- Clear type-specific fields when switching

**Acceptance Criteria**:

- [ ] Super admin can switch organization from seat-based to usage-based
- [ ] Super admin can switch organization from usage-based to seat-based
- [ ] Previous subscription is marked as cancelled
- [ ] New subscription is created with appropriate type

**Open Question**:

- Is the previous subscription cancelled instantly or when it renews?

---

### Scenario 1.5: View Organization Usage Statistics

**Description**: Super admin views detailed usage statistics for any organization.

**Requirements**:

- View total credits consumed this month
- View credits consumed per user
- View historical usage trends

**Acceptance Criteria**:

- [ ] Super admin can view usage statistics for any organization
- [ ] Statistics show current month's credit consumption
- [ ] Per-user breakdown is available
- [ ] Usage data is accurate based on actual token consumption

---

## 2. Organization Admin

Organization admins can **view** subscription and usage information but **cannot modify** subscriptions. The subscription tab is removed for org admins.

### Scenario 2.1: View Usage Dashboard

**Description**: Org admin views the usage tab showing credit consumption (only for usage-based subscriptions).

**Requirements**:

- Show total credits consumed this month
- Show remaining credits for this month (monthly budget - consumed)
- Show credits consumed per user in the organization
- Show monthly budget (yearly allowance / 12)

**Acceptance Criteria**:

- [ ] Usage tab is visible for organizations with usage-based subscriptions
- [ ] Dashboard shows: consumed credits, remaining credits, monthly budget
- [ ] Per-user breakdown shows each user's credit consumption
- [ ] Data refreshes to show current usage

---

### Scenario 2.2: View Per-User Credit Consumption

**Description**: Org admin sees how much each user has consumed.

**Requirements**:

- List all users in the organization
- Show credits consumed per user for current month
- Sort by consumption (highest first)

**Acceptance Criteria**:

- [ ] Table lists all org users with their credit consumption
- [ ] Consumption is shown in credits (not raw tokens)
- [ ] Default sort is by consumption descending
- [ ] Total across all users equals org total consumption

---

### Scenario 2.3: No Access to Subscription Management

**Description**: Org admins no longer have access to subscription management.

**Requirements**:

- Remove subscription tab from org admin navigation
- Subscription modification is only available to super admins

**Acceptance Criteria**:

- [ ] Subscription tab is not visible to org admins
- [ ] API endpoints for subscription modification return 403 for org admins
- [ ] Org admins can still view their subscription type in a read-only manner (e.g., in settings overview)

---

## 3. System (Background Processing)

### Scenario 3.1: Calculate Credits from Token Usage

**Description**: System converts token usage to credits based on model pricing.

**Requirements**:

- Use `inputTokenCost` and `outputTokenCost` from `LanguageModel` entity
- Calculate credit cost for each usage record
- Store credits alongside token counts in usage tracking

**Credit Formula** (example):

```
credits = (inputTokens * inputTokenCost + outputTokens * outputTokenCost) / BASE_CREDIT_VALUE
```

Where `BASE_CREDIT_VALUE` is a configurable constant that normalizes costs to credits.

**Acceptance Criteria**:

- [ ] Each usage record includes calculated credit cost
- [ ] Credit calculation uses current model pricing
- [ ] Models without pricing info use a default/fallback rate
- [ ] Credits are stored with sufficient precision

---

### Scenario 3.2: Monthly Budget Reset

**Description**: System tracks monthly credit consumption with automatic period reset.

**Requirements**:

- Monthly budget = yearly_allowance / 12
- Track consumption per calendar month
- Reset consumption counter at month boundary

**Acceptance Criteria**:

- [ ] Monthly consumption is tracked separately from yearly
- [ ] At month start, consumption resets to 0
- [ ] Historical monthly data is preserved for reporting
- [ ] Unused credits do NOT roll over to next month

---

### Scenario 3.3: Enforce Credit Limits

**Description**: System enforces credit limits when budget is exhausted.

**Requirements**:

- Check available credits before processing request
- Return appropriate error when credits exhausted
- Allow grace period or soft limits (configurable)

**Acceptance Criteria**:

- [ ] Requests are blocked when monthly credits are exhausted
- [ ] Error message clearly indicates credit limit reached
- [ ] Super admin can configure hard vs soft limits

---

### Scenario 3.4: Send Usage Alert Email at 80% Consumption

**Description**: System sends an email notification to organization admins when 80% of the monthly credit budget is consumed.

**Requirements**:

- Monitor credit consumption against monthly budget
- Trigger email when consumption reaches 80% threshold
- Send to all organization admins
- Send only once per month (don't re-trigger if usage fluctuates)

**Acceptance Criteria**:

- [ ] Email is sent when org consumption reaches 80% of monthly budget
- [ ] Email is sent to all org admins
- [ ] Email includes: current consumption, monthly budget, remaining credits
- [ ] Email is sent only once per billing period (not repeated)
- [ ] System tracks that alert was sent for the current period

> **Future Enhancement**: Extend to customizable usage alerts (configurable thresholds, multiple alert levels, notification channels).

---

## Maybe / Later

- Customizable usage alerts (multiple thresholds, notification preferences)
- Grace period with cheaper model when credit limit is reached

## Not do

- Regular users do not see their own consumption

## To remove

- Subscription tab for admins (super admins are in control)
- Monthly subscription cycle and cycle in general (only yearly)
- Billing info (source of truth elsewhere)
