# GO-GO Shuttles Modernization Report

**Date:** 2 August 2026  
**Prepared for:** GO-GO Shuttles Leadership Team  
**Prepared by:** Engineering Team

## 1. Plain-English Summary

We have moved the business-critical booking and quote logic away from the old WordPress-heavy setup and into a modern platform that is easier to secure, easier to expand, and easier to integrate with other systems.

In simple terms: the new foundation is working, core customer flows are running, and we are now in deployment preparation and live cutover steps.

## 2. Why This Rewrite Was Important

The previous setup worked, but it had long-term risk for growth:

- Too much dependence on WordPress/plugin behaviour for business workflows
- Higher security exposure due to plugin/theme attack surface
- Harder to maintain and test when features become more complex
- Difficult to support new channels like WhatsApp automation or a future mobile app

The rewrite was done to create a stable business platform, not just a website refresh.

## 3. What Has Been Completed So Far

### 3.1 Core Platform

- New architecture is in place: modern frontend + dedicated backend API
- Quote and booking workflows are implemented on the new backend
- Environment and deployment structure has been cleaned up for production readiness

### 3.2 Quote and Booking Communication Upgrades

- Quote acknowledgements now include PDF estimate attachments
- EFT details are now included in the quote customer flow
- PDF output was improved for presentation quality (including better top spacing)
- Receipt generation logic is implemented for paid bookings (triggered by payment status)

### 3.3 Email and Payment Readiness

- PayFast integration controls are implemented through configuration
- SMTP email behavior has been tested successfully in controlled runs
- Customer and admin email template structure is now more maintainable

### 3.4 Deployment Preparation Work Completed

- Frontend build/start commands are now explicit and repeatable
- API runtime startup path issues were resolved
- Secret handling and `.gitignore` rules were tightened to reduce leakage risk

## 4. Security and Risk Position (Business View)

### Improvements already achieved

- Reduced dependence on legacy CMS behavior for core workflows
- Clearer separation between public site and business logic
- Better control of payment/email logic
- Better control of deployment and environment variables

### Current risks still being actively managed

- Live database migration and cutover needs strict change control
- Hosting limitations on current cPanel/Afrihost environment may affect deployment topology
- Production secrets must be rotated/managed carefully during go-live

## 5. Three-Project Delivery Plan

## Project 1: Customer Experience Platform

**Purpose:** Customer-facing website flows (quote, booking, confirmations).  
**Status:** Active and functional on new stack.  
**Business value:** Better customer journey, faster content and UX iteration, improved conversion support.

## Project 2: Core API Platform

**Purpose:** Single backend for booking, payments, notifications, and integrations.  
**Status:** Core foundation established and validated.  
**Business value:** One trusted system can power website, operations, WhatsApp, and mobile without rebuilding logic each time.

## Project 3: Backoffice Operations App

**Purpose:** Internal operations workflows (dispatch, tracking, approvals, customer management, reporting).  
**Status:** Next planned delivery phase.  
**Business value:** Less manual admin, faster turnaround, stronger operational visibility and control.

## 6. Integration Readiness (Important for Growth)

The new platform is designed to integrate, not isolate.

### 6.1 WhatsApp Booking and Support via Meta APIs

The system can support WhatsApp-driven flows such as:

- Capture lead and booking intent from WhatsApp
- Send quote summaries and confirmations
- Send booking/payment status updates
- Hand over from bot to human operator when needed

### 6.2 Future Mobile App Support

If GO-GO Shuttles launches a mobile app later, it can use the same backend APIs:

- Same business rules as website and backoffice
- Same quote/booking/payment logic
- Faster app delivery because backend groundwork is already done
- Lower long-term cost due to reuse

## 7. Deployment Strategy Being Finalized

Current practical direction:

- Frontend deployment on Vercel
- API deployment where Node runtime is stable and not heavily serverless-cold-start dependent
- Database migration/cutover handled carefully with validated backup/export process

Reason: this approach balances speed, cost, and reliability for launch.

## 8. Immediate Next Steps (Business and Technical)

1. Finalize and validate production database migration
2. Complete production environment variable setup for frontend and API
3. Run controlled production smoke tests (quote, booking, payment, email)
4. Lock go-live checklist and rollback steps
5. Start backoffice implementation planning on top of the stabilized API

## 9. Business Outcome So Far

GO-GO Shuttles now has a strong modernization base that is:

- More secure and easier to maintain than the legacy approach
- Better positioned for growth and new channels
- Integration-ready for WhatsApp and future mobile experiences
- Structured for phased delivery, including the backoffice app

In short: the rewrite investment is already producing a more scalable and future-ready business platform.
