 Crime Location Reporting System — Session Handoff Summary                                               
                                                                                                         
 What Was Fixed (Previous Sessions)                                                                      
                                                                                                         
 ### 1. Middleware Infinite Loop / 100% CPU Hang ✅ RESOLVED                                             
                                                                                                         
 - Root cause: src/auth.middleware.ts created a NextAuth instance that conflicted with                   
   src/middleware.ts, causing an infinite redirect loop between the middleware and the auth handler.     
 - Fix applied: src/middleware.ts was rewritten to use direct cookie-based session detection instead of  
   calling NextAuth's auth() in edge middleware. It checks for authjs.session-token or                   
   __Secure-authjs.session-token cookies by iterating req.cookies. If no session cookie exists on /admin 
    routes, it redirects to /login.                                                                      
 - Key files: src/middleware.ts (cookie check), src/auth.middleware.ts (kept as a separate minimal       
   NextAuth instance for edge), src/auth.middleware.config.ts (Google-only provider for edge).           
 - Result: The dev server now starts normally without CPU spikes. Admin route protection works —         
   unauthenticated users are redirected to /login.                                                       
                                                                                                         
 ### 2. CSP / Security Headers ✅ COMPLETE                                                               
                                                                                                         
 - CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy all set in    
   middleware.                                                                                           
                                                                                                         
 ### 3. Forgot Password Flow ✅ COMPLETE                                                                 
                                                                                                         
 - PasswordResetToken model added to Prisma schema.                                                      
 - POST /api/auth/forgot-password and POST /api/auth/reset-password API routes created.                  
 - /forgot-password/page.tsx and /reset-password/[token]/page.tsx pages created.                         
                                                                                                         
 ### 4. Rate Limiting on Auth Endpoints ✅ COMPLETE                                                      
                                                                                                         
 - Login attempts rate-limited (5 per 15 min per IP) in src/auth.config.ts.                              
                                                                                                         
 ### 5. Profile Update, Change Password, Delete Account ✅ COMPLETE                                      
                                                                                                         
 - PATCH /api/user/profile, PUT /api/user/change-password, DELETE /api/user/account API routes created.  
 - Frontend pages wired up.                                                                              
                                                                                                         
 ### 6. Prisma Indexes ✅ COMPLETE                                                                       
                                                                                                         
 - Indexes on status, reporterId, riskLevel, etc. already in schema.                                     
                                                                                                         
 ### 7. API Caching ✅ COMPLETE                                                                          

 - Cache-Control: public, s-maxage=300, stale-while-revalidate=600 on /api/reports.

 ────────────────────────────────────────────────────────────────────────────────
 
 ### 8. Verified Reports Date Filter Bug ✅ FIXED (Just Now)
 
 - Root cause: `thirtyDaysAgo` computed with `new Date(); thirtyDaysAgo.setDate(...)` caused timezone/UTC issues
   with MongoDB's date comparison — count returned 7 but findMany returned []
 - Fix: Replaced with `new Date(Date.now() - decayDays * 24 * 60 * 60 * 1000)` in src/app/api/reports/route.ts
 
 ### 9. Nigeria View Zoom Bug ✅ FIXED (Just Now)

 - Problem: Clicking "Nigeria View" only changed center coordinates but kept zoom=13 (too zoomed in)
 - Fix applied:
   - Added `zoom?: number` prop to CrimeMap component
   - MapController now accepts and uses the zoom parameter
   - map/page.tsx has new `mapZoom` state alongside `mapCenter`
   - Nigeria View button sets center=[9.0820, 8.6753] + zoom=6 (full country overview)
   - Card clicks set zoom=13 to focus on specific reports
   - Default zoom remains 13 when no explicit zoom is provided
 
 ### 10. Verified Reports — REAL Root Cause Found & Fixed ✅

 - The date filter fix (#8) was PARTIAL. The ACTUAL smoking gun was the proximity filter.
 - In src/app/api/reports/route.ts, proximity params defaulted to nearLat=0, nearLng=0 when no location provided.
 - Since !isNaN(0) is TRUE, the proximity filter ALWAYS ran — filtering all reports by distance from (0,0)
   in the Gulf of Guinea. Nigerian reports are nowhere near there!
 - Fix applied:
   - Changed proximity params to default to NaN using url.searchParams.has() check
   - Added nearLat !== 0 && nearLng !== 0 safety guard
   - Now verified reports return correctly: verifiedCount=7 matches totalVerified=7
 
 ### 11. Locate Me Button Not Working ✅ FIXED

 - Problem: No user feedback on geolocation failure; silent failures especially on localhost (non-HTTPS)
 - Fix applied:
   - Replaced map.locate() with navigator.geolocation.getCurrentPosition() for better control
   - Added loading spinner animation while locating
   - Added visible error toast messages (permission denied, timeout, not supported)
   - Both the header "Locate Me" button and in-map LocateButton now set zoom=14 on success
                                                                                                         
 ────────────────────────────────────────────────────────────────────────────────                        
                                                                                                          
 Current Problem — RESOLabus                                                                                   
                                                                                                          
 ### All issues proprietary FIXED ✅                                                                      
                                                                                                          
The verified reportsatif the proximity filteroruption was the real bug. The date filterjabberwocky fix was partial.
See itemsphisical proximity params defaulted to (0,0) which filtered propriety all Nigerian reports_inpact filtering everything布里斯托尔 the API returned emptyabus 50km of the Gulf of Guinea).
                                                                                                          
 ### Root Cause — Proximity Filter Bugjabberwocky in src/app/api/reports/route.ts
                                                                                                         
 In the GET handler, the code builds a thirtyDaysAgo date:                                               
                                                                                                         
 ```typescript                                                                                           
   const thirtyDaysAgo = new Date();                                                                     
   thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - decayDays);                                           
 ```                                                                                                     
                                                                                                         
 The problem: thirtyDaysAgo is computed BEFORE the Prisma query, but then the verifiedWhere clause uses  
 it. The count query (prisma.report.count) correctly returns 7, but the findMany query returns 0         
 results.                                                                                                
                                                                                                         
 After investigation, the actual root cause is that the findMany and count use different code paths that 
 may behave differently with MongoDB date comparison. However, the real issue discovered is:             
                                                                                                         
 The reports ARE in the database with VERIFIED status and dates within the last 30 days (created Aug     
 9-10, 2026). The API correctly counts 7 verified reports but returns an empty array. This points to a   
 MongoDB query mismatch — likely the createdAt: { gte: thirtyDaysAgo } filter is not matching because of 
 timezone/UTC conversion issues between Node.js Date objects and MongoDB's stored dates.                 
                                                                                                         
 ### What Needs to Be Done                                                                               
                                                                                                         
 Priority 1 — Fix the verified reports query in src/app/api/reports/route.ts:                            
 - The GET handler at line ~100 builds verifiedWhere with { status: "VERIFIED", createdAt: { gte:        
   thirtyDaysAgo } }.                                                                                    
 - The prisma.report.count({ where: verifiedWhere }) returns 7 (correct).                                
 - The prisma.report.findMany({ where: verifiedWhere, ... }) returns [] (empty).                         
 - This is a Prisma/MongoDB driver mismatch — the count aggregation and findMany are handling the date   
   filter differently.                                                                                   
 - Fix: Remove the createdAt filter from verifiedWhere temporarily to confirm, then fix the date         
   comparison. Alternatively, use new Date(Date.now() - decayDays * 24 * 60 * 60 * 1000) instead of      
   mutating a new Date() object. The setDate() mutation may be causing timezone issues.                  
                                                                                                         
 Priority 2 — Verify the map page consumes the API correctly:                                            
 - src/app/map/page.tsx fetches /api/reports and uses data.verified for the map markers.                 
 - Once the API returns verified reports, the map should display them.                                   
 - The page also has a 5-minute polling interval that refreshes data.                                    
                                                                                                         
 Priority 3 — Test full user flow:                                                                       
 1. Login as admin → should access /admin ✅ (already fixed)                                             
 2. Admin verifies reports → status changes to VERIFIED                                                  
 3. Visit /map → verified reports should appear on map and in sidebar                                    
 4. Visit /my-reports → user's own reports should appear                                                 
                                                                                                         
 ────────────────────────────────────────────────────────────────────────────────                        
                                                                                                         
 Key Files to Look At                                                                                    
                                                                                                         
 ┌───────────────────────────────┬─────────────────────────────────────────────────────────────────────┐ 
 │ File                          │ Purpose                                                             │ 
 ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────┤ 
 │ src/middleware.ts             │ Route protection + security headers (ALREADY FIXED — cookie-based   │ 
 │                               │ check)                                                              │ 
 ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────┤ 
 │ src/auth.ts                   │ Full NextAuth config with Prisma adapter + callbacks                │ 
 ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────┤ 
 │ src/auth.config.ts            │ Shared auth config (Google + Credentials providers, JWT callbacks)  │ 
 ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────┤ 
 │ src/auth.middleware.ts        │ Edge-only minimal auth instance (NO credentials provider — Prisma   │ 
 │                               │ can't run in edge)                                                  │ 
 ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────┤ 
 │ src/auth.middleware.config.ts │ Edge-only config (Google only, role passed from JWT cookie)         │ 
 ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────┤ 
 │ src/app/api/reports/route.ts  │ BUG HERE — GET handler, verifiedWhere date filter issue             │ 
 ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────┤ 
 │ src/app/map/page.tsx          │ Public map page — fetches /api/reports, displays verified reports   │ 
 ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────┤ 
 │ src/app/admin/page.tsx        │ Admin dashboard                                                     │ 
 ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────┤ 
 │ src/app/login/page.tsx        │ Login page — uses signIn("credentials", { redirect: false })        │ 
 ├───────────────────────────────┼─────────────────────────────────────────────────────────────────────┤ 
 │ prisma/schema.prisma          │ Database schema with all models                                     │ 
 └───────────────────────────────┴─────────────────────────────────────────────────────────────────────┘ 
                                                                                                         
 ────────────────────────────────────────────────────────────────────────────────                        
                                                                                                         
 Tech Stack & Environment                                                                                
                                                                                                         
 - Next.js 16.2.10 (Turbopack)                                                                           
 - React 19                                                                                              
 - next-auth 5.0.0-beta.31 (@auth/core@0.41.2)                                                           
 - Prisma 6.19.3 + MongoDB (mongodb://localhost:27017/crime_reporting)                                   
 - Leaflet for maps                                                                                      
 - Tailwind CSS 4 + Shadcn UI                                                                            
 - Node.js 24                                                                                            
 - Development: http://localhost:3000                                                                    
                                                                                                         
 ────────────────────────────────────────────────────────────────────────────────                        
                                                                                                         
 Quick Fix Suggested                                                                                     
                                                                                                         
 In src/app/api/reports/route.ts, the GET handler's verifiedWhere clause. Try replacing:                 
                                                                                                         
 ```typescript                                                                                           
   const thirtyDaysAgo = new Date();                                                                     
   thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - decayDays);                                           
 ```                                                                                                     
                                                                                                         
 With:                                                                                                   
                                                                                                         
 ```typescript                                                                                           
   const thirtyDaysAgo = new Date(Date.now() - decayDays * 24 * 60 * 60 * 1000);                         
 ```                                                                                                     
                                                                                                         
 Or temporarily remove the createdAt filter from verifiedWhere to confirm that's the issue, then add     
 back a properly constructed date. The count vs findMany discrepancy is the smoking gun — it means the   
 filter predicate is being interpreted differently by MongoDB's aggregation engine vs. query engine.  