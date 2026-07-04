# 🛠️ System Hardening & Bug Fixes

This document tracks the security and performance optimizations for the Crime Location Reporting System.

## 🛡️ Phase 1: Security Hardening (High Priority)
- [ ] **API Rate Limiting**: Prevent DoS attacks and spam by limiting reports per IP/User.
- [ ] **Strict File Validation**: Implement MIME-type checks and size limits (10MB) for media uploads.
- [ ] **XSS Sanitization**: Sanitize report content rendered in Leaflet map popups.
- [ ] **Input Validation**: Tighten Zod schemas to prevent injection attempts.

## 🚀 Phase 2: Performance Optimization (Scaling)
- [ ] **Geospatial Indexing**: Implement MongoDB `2dsphere` index for `location` field.
- [ ] **Optimized Similarity Engine**: Replace JS loop with MongoDB `$near` queries for faster clustering.
- [ ] **BBox Map Filtering**: Fetch only reports within the current map viewport.
- [ ] **Lazy Loading**: Optimize admin dashboard components to reduce initial load time.

## 🎨 Phase 3: UX & Feature Gaps (Polishing)
- [ ] **Account Recovery**: Implement "Forgot Password" flow.
- [ ] **Security Settings**: Add "Change Password" and "Two-Factor Authentication" options.
- [ ] **Real-time Notifications**: Implement polling or WebSockets for Admin verification alerts.
- [ ] **Advanced Search**: Add filters for Crime Type, Date Range, and Risk Level on the public map.

---
*Last Updated: 2026-07-03*
