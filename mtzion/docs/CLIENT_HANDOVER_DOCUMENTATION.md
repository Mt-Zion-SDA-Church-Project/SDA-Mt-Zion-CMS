# SDA Mt. Zion Church Management System
## Client Handover Documentation (Comprehensive)

Version: 1.0  
Prepared for: Church Leadership, Secretariat, Finance, and IT Support  
Project: Seventh-Day Adventist Church, Mt. Zion - Kigoma CMS  
Application type: Web-based role-driven Church Management System  

---

## 1) Executive Overview

The SDA Mt. Zion CMS is a centralized web platform for managing church operations across membership records, children and sabbath resources, visitors, offertory workflows, events, attendance, galleries, reporting, user access, and system logs.

The system is designed with:

- Role-based access (Super Admin, Admin, Member)
- Modular navigation with privilege-based visibility
- Supabase-backed authentication and database
- Activity logging for auditability
- Operational pages for day-to-day church workflows
- Member portal for self-service engagement

This document serves as the official handover manual for both non-technical and technical users.

---

## 2) System Objectives and Scope

### 2.1 Core objectives

- Keep church records organized and accurate
- Reduce manual paperwork for administration
- Improve visibility of attendance, offerings, and events
- Enable members to engage through a dedicated portal
- Ensure controlled access via privileges and roles
- Maintain traceability using system/user activity logs

### 2.2 Scope covered

1. Authentication and account lifecycle
2. Role and privilege governance
3. Admin operational modules
4. Member portal modules
5. Security model and compliance controls
6. Backup, maintenance, and release management
7. Troubleshooting and support procedures
8. Handover operations checklist

---

## 3) High-Level Architecture

### 3.1 Frontend

- Framework: React + TypeScript + Vite
- UI behavior: responsive desktop/mobile layouts
- State/data handling: TanStack React Query
- Routing: role-protected route structure

### 3.2 Backend and database

- Backend platform: Supabase
- Data: PostgreSQL
- Auth: Supabase Auth
- Storage: Supabase Storage (gallery/media workflows)
- Row Level Security (RLS): enabled on sensitive tables

### 3.3 Cross-cutting components

- Validation: centralized Zod schemas
- Activity logging triggers across core domain tables
- User sessions and user activity logging
- Privilege checks in UI navigation and screen behavior

---

## 4) Roles, Permissions, and Governance

### 4.1 User roles

#### Super Admin

- Full administrative access
- Can manage privileges console
- Can access system-level logs and governance controls
- Can control global member portal settings (e.g., offerings card visibility)

#### Admin

- Operational management across most modules
- Can create and manage records (members, visitors, offerings, events, attendance, etc.)
- Can manage system users where allowed by role policy

#### Member

- Access to member-facing portal only
- Can view dashboard and use enabled tabs based on member privileges

### 4.2 Privilege model

Privileges are stored in `user_privileges` and checked by:

- Sidebar visibility logic
- Route/tab access logic
- Member mobile navigation gating

Privileges can be managed by Super Admin from the Privileges console.

### 4.3 Global member dashboard governance

A global setting controls whether the member dashboard should show the “My Offerings” card.

- Backed by `member_portal_settings`
- Updated via Super Admin privileges console
- Applied to all members globally

---

## 5) Authentication and Account Lifecycle

### 5.1 Account creation patterns

Accounts are created through administrative workflows and linked to system records.

Typical paths:

- Add System User (admin onboarding)
- Create portal user from Member details

### 5.2 Email confirmation flow (secure)

Current secure onboarding flow:

1. Admin creates user account.
2. User receives confirmation email.
3. User clicks confirmation button.
4. User is redirected to `/set-password`.
5. User sets new password.
6. User proceeds into portal.

Important: Plaintext passwords are not sent in email.

### 5.3 Redirect URL requirements (Supabase)

Supabase Auth must allow relevant redirect URLs, especially:

- `/set-password`
- `/login`
- Any approved wildcard pattern for your domain

If redirects are not configured, users may fail during confirmation or password setup.

### 5.4 Password reset / first-access behavior

The set-password screen initializes auth session from Supabase link tokens and then updates password using authenticated context.

---

## 6) Admin Modules and Operating Procedures

### 6.1 Dashboard

Purpose:

- High-level operational visibility for admins
- Quick navigation entry point

Recommended daily checks:

- New records created
- Events and attendance status
- Notification state

### 6.2 Members

Submodules:

- Member Details
- Add New Member
- Birthdays

Operational notes:

- Ensure member identity fields are complete
- Link users to portal accounts only when member email is valid
- Keep member status (`active`/others) accurate for auth and reporting

### 6.3 Children & Sabbath School

Submodules:

- Children Details
- Add Child
- Sabbath School resources listing and upload pages

Important:

- Child registration does not require portal login accounts
- Parent contact numbers should follow current phone validation rules

### 6.4 Visitors

Submodules:

- Visitor Details
- Add Visitor

Procedure:

1. Capture identity and contact details
2. Review duplicates before saving
3. Keep mobile and address data standardized

### 6.5 Offertory / Giving workflows

Submodules:

- Offertory summaries and records
- Add offertory entries

Best practice:

- Reconcile amounts periodically against offline finance records
- Restrict access via privileges to finance-authorized users

### 6.6 System Users

Submodules:

- Manage System Users
- Add System User

Procedure:

1. Create user with correct role
2. Ensure confirmation email is delivered
3. User confirms email and sets password
4. Validate first login

### 6.7 Events

Submodules:

- Add Event
- Upcoming Events

Notes:

- Event changes are tracked in activity logging
- Event data drives attendance and member-facing event views

### 6.8 Attendance

Purpose:

- Track member attendance for events/services
- Support check-in workflows and attendance analytics

Data integrity notes:

- Unique constraints prevent duplicate attendance where configured

### 6.9 Gallery

Purpose:

- Manage albums/photos for church communications and member engagement

Technical notes:

- Uses storage bucket policies
- Should be periodically reviewed for storage usage and content quality

### 6.10 Reports

Purpose:

- Summaries for management and leadership decision-making

Recommendation:

- Establish a monthly reporting routine with archived exports

### 6.11 Logs (Super Admin + authorized Admin scopes)

Submodules:

- Activity Log
- User Log / Session log

Use cases:

- Investigate operational incidents
- Verify who changed what and when
- Track authentication/session behavior

---

## 7) Member Portal Modules and Usage

### 7.1 Dashboard

Shows member-centric summary cards and recent items (subject to global and per-tab controls).

Controls:

- Global: offerings card visibility
- Per-member privilege tab gating

### 7.2 QR Check-in

Supports event attendance check-in flow through QR-enabled process.

### 7.3 Events

Member-facing list of relevant events and schedules.

### 7.4 Birthdays

Displays birthday-related member information where applicable.

### 7.5 Resources

Member access to sabbath resources and related materials.

### 7.6 Give Offertory

Member-facing payment/recording workflow for offerings where enabled.

### 7.7 Gallery

Member view into church media content.

---

## 8) Data Model (Functional Summary)

The schema is migration-driven and includes, among others:

- `system_users`
- `members`
- `teens`
- `visitors`
- `events`
- `attendance`
- `tithes`, `offerings`, and offering-related category/payment tables
- `galleries`, `gallery_photos`
- `notifications`
- `activity_logs`
- `user_login_sessions`
- `user_privileges`
- `member_portal_settings`

### 8.1 Logging model

Change logging is driven by database triggers and a generic logging function for key tables. This supports auditability and operational tracing.

### 8.2 Security model

RLS is enabled for sensitive tables and governed by policies using authenticated user context and system role checks.

---

## 9) Validation Standards and Data Quality Rules

### 9.1 Phone/mobile validation

For key entry forms (member/visitor/child contact numbers), accepted formats are:

- Local: `0` + 9 digits (10 digits total), e.g. `07XXXXXXXX`
- International: `+` + country code + 9 digits, e.g. `+2567XXXXXXXX`

### 9.2 Required fields

Required fields are validated on form submit using centralized schema rules.

### 9.3 Date formats

Date fields are validated in consistent input formats for reliability and reporting.

---

## 10) Environment and Deployment Configuration

### 10.1 Required environment variables (frontend)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_APP_URL` (must reflect live domain for auth redirect links)

### 10.2 Hosting

Production deployment uses your chosen hosting platform (e.g., Vercel for frontend).

### 10.3 Supabase auth settings checklist

1. **Site URL** is set to production domain
2. **Redirect URLs** include:
   - `/set-password`
   - `/login`
   - Optional wildcard for operational flexibility
3. Email templates configured in Supabase dashboard

### 10.4 Migration management

All schema and policy changes are tracked through SQL migration files.

Operational rule:

- Always apply migrations in order
- Verify post-migration behavior in staging/controlled test account

---

## 11) Security and Compliance Practices

### 11.1 Credential handling

- Do not send plaintext passwords over email
- Use confirmation + set-password flow
- Use secure password reset mechanisms only

### 11.2 Principle of least privilege

- Restrict financial and system modules by explicit privilege settings
- Keep super admin access limited to trusted custodians

### 11.3 Auditability

- Retain logs for accountability
- Review suspicious behavior through system/user logs

### 11.4 Session and access control

- Ensure deactivated users cannot sign in
- Review active/inactive status in system users

### 11.5 Data privacy

- Only authorized roles should access personally identifiable data
- Avoid exporting and sharing raw datasets without policy controls

---

## 12) Daily, Weekly, and Monthly Operations

### 12.1 Daily runbook

1. Check errors or blocked operations reported by users
2. Review new member/visitor/event entries for data quality
3. Confirm critical modules are responsive (login, dashboard, attendance)

### 12.2 Weekly runbook

1. Validate attendance/event records for the week
2. Review system logs for anomalies
3. Confirm backup/export routine completed

### 12.3 Monthly runbook

1. Generate and archive monthly reports
2. Review privileges and access rights
3. Verify storage usage (gallery/media)
4. Review outstanding enhancement requests from ministry leaders

---

## 13) Backup, Recovery, and Continuity

### 13.1 Backup strategy

At minimum:

- Regular database backups (automated preferred)
- Export critical financial/attendance snapshots periodically

### 13.2 Recovery strategy

- Define restore procedure owner (technical lead)
- Keep credentials and environment secrets in secure vault
- Test restore procedure in non-production environment

### 13.3 Business continuity

- Maintain at least two trained administrators
- Keep emergency support contacts documented

---

## 14) Troubleshooting Guide

### 14.1 “Auth session missing” on set-password page

Possible causes:

- Expired or already-used confirmation link
- Redirect URL mismatch in Supabase
- Invalid/missing token parameters

Actions:

1. Request a fresh confirmation email
2. Verify Supabase redirect URLs include `/set-password`
3. Re-test with copied link in same browser session

### 14.2 User cannot see expected menu/tab

Possible causes:

- Missing/blocked `user_privileges` entry
- Wrong role assignment
- Stale client cache

Actions:

1. Check privileges console for user and tab
2. Confirm role in `system_users`
3. Refresh session/login

### 14.3 Activity log missing for an operation

Possible causes:

- Trigger missing/not deployed
- RLS insert policy issue on logging table
- Migration not applied in target environment

Actions:

1. Confirm migrations applied
2. Validate trigger existence
3. Check policy/permission setup for audit inserts

### 14.4 Save action works but list appears stale

Possible causes:

- Query cache not yet invalidated/refetched

Actions:

1. Refresh page
2. Check real-time/invalidation logic for the module

---

## 15) Handover Checklist (Formal Sign-off)

Use this checklist during final transfer meeting.

### 15.1 Access and ownership

- [ ] Production hosting ownership transferred/confirmed
- [ ] Supabase project ownership/admin rights confirmed
- [ ] Domain/DNS ownership documented
- [ ] Secrets and env vars handed over securely

### 15.2 Technical readiness

- [ ] All migrations applied in production
- [ ] Redirect URLs and site URL verified
- [ ] Email templates verified (confirm signup)
- [ ] Key modules smoke-tested

### 15.3 Operational readiness

- [ ] Super Admin trained on privileges and settings
- [ ] Admins trained on daily workflows
- [ ] Reporting procedure agreed
- [ ] Incident/escalation contacts documented

### 15.4 Documentation readiness

- [ ] This handover manual shared
- [ ] Credentials policy and security rules explained
- [ ] Backup/recovery runbook approved

---

## 16) Recommended Training Plan (Client Team)

### Session 1: Super Admin (90 minutes)

- Governance model
- Privileges console
- System logs and investigations
- Global member portal settings

### Session 2: Operations Admin (120 minutes)

- Member/visitor/children management
- Events, attendance, and reports
- Offertory workflows and controls

### Session 3: Member Support Team (60 minutes)

- Login/confirmation/set-password support
- Basic troubleshooting and escalation

---

## 17) Support Model After Handover

Define and agree:

1. First-line support contact (church office / admin)
2. Second-line technical support contact
3. Severity model:
   - Critical: login outage, data loss risk
   - High: key module unavailable
   - Medium: workflow issue with workaround
   - Low: cosmetic or enhancement requests
4. Response and resolution targets per severity

---

## 18) Future Improvement Backlog (Optional)

Suggested future enhancements:

- Strong password strength meter and policy hints
- Two-factor authentication for privileged roles
- Advanced report exports and scheduled reports
- Better audit dashboards with filters and trends
- Data archiving utilities for long-term performance
- Admin activity digest emails

---

## 19) Quick Reference Appendix

### A) Key route groups

- Admin routes: `/admin/...`
- Member routes: `/member/...`
- Auth routes: `/login`, `/set-password`

### B) Sensitive operational controls

- Role assignment (`system_users`)
- Privileges (`user_privileges`)
- Member dashboard offerings global flag (`member_portal_settings`)
- Logging tables (`activity_logs`, `user_login_sessions`)

### C) Critical reminder

Never share plaintext passwords in email.  
Use confirm-email + set-password flow for secure onboarding.

---

## 20) Final Sign-off Statement

This documentation package is intended to provide a complete operational and governance baseline for client ownership of the SDA Mt. Zion Church Management System.  
It should be stored in both:

- Internal church operations repository/folder
- Secure admin knowledge base (for continuity)

For best results, review and update this manual quarterly as workflows evolve.

