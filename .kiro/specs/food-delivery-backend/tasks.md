# Tasks

## Task List

- [x] 1. Project Scaffolding and Configuration
  - [x] 1.1 Initialize Node.js project with package.json, install all dependencies (express, prisma, @prisma/client, socket.io, redis, ioredis, jsonwebtoken, bcryptjs, joi, winston, morgan, express-rate-limit, uuid, fast-check, jest, supertest)
  - [x] 1.2 Create folder structure: src/config, src/common/middleware, src/common/utils, src/common/constants, src/modules/{auth,user,restaurant,order,delivery,payment,notification,admin}, src/sockets, src/jobs, prisma/
  - [x] 1.3 Create src/config/env.js — load and validate environment variables (DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, PORT, FCM_SERVER_KEY)
  - [x] 1.4 Create src/config/db.js — Prisma client singleton
  - [x] 1.5 Create src/config/redis.js — ioredis client singleton
  - [x] 1.6 Create src/common/constants/roles.js (customer, restaurant_owner, delivery, admin), orderStatus.js, paymentStatus.js, rbac.js (access matrix mapping each route group to allowed roles)
  - [x] 1.7 Create src/common/utils/response.js — success() and error() response helpers
  - [x] 1.8 Create src/common/utils/logger.js — Winston logger with console and file transports
  - [x] 1.9 Create src/common/utils/jwt.js — signAccessToken (payload: id, phone, email, role, is_verified), signRefreshToken, verifyToken helpers
  - [x] 1.10 Create src/common/utils/otp.js — generateOTP (6-digit), storeOTP in Redis (5 min TTL) keyed by identifier (phone or email), verifyOTP helpers
  - [x] 1.11 Create prisma/schema.prisma with all models: User (name, email?, phone?, password, role, is_verified, status), OTP (identifier field for phone or email), Address, Restaurant, MenuItem, Order, OrderItem, Payment, DeliveryTracking, Notification
  - [x] 1.12 Create server.js — boot Express app, attach Socket.IO, register all module routers, start HTTP server

- [x] 2. Shared Middleware
  - [x] 2.1 Create src/common/middleware/authenticate.js — verify JWT signature and expiry, attach req.user = { id, phone, email, role, is_verified }; return 401 on failure
  - [x] 2.2 Create src/common/middleware/authorize.js — factory function authorize(...roles) that (1) blocks unverified users with 403, (2) checks req.user.role against allowed roles; return 403 with message listing required roles on mismatch
  - [x] 2.3 Create src/common/middleware/validate.js — Joi/Zod schema validation wrapper; return 422 with per-field errors on failure
  - [x] 2.4 Create src/common/middleware/rateLimiter.js — Redis-backed sliding window limiter, 100 req/min per IP; return 429 on breach
  - [x] 2.5 Create src/common/middleware/errorHandler.js — global Express error handler; log full stack via Winston; map AppError to status codes; return standard error envelope; never expose internals on 500
  - [x] 2.6 Create src/common/utils/AppError.js — custom error class with statusCode, code, message fields

- [x] 3. Auth Module
  - [x] 3.1 Create src/modules/auth/validation.js — Joi schemas for: register (name, email?, phone?, password, role — at least one of email/phone required), verifyOtp (identifier, otp), loginPassword (identifier, password, role), loginOtpRequest (identifier, role), loginOtpVerify (identifier, otp, role), refresh, logout
  - [x] 3.2 Create src/modules/auth/service.js — register (check email+phone uniqueness, hash password, create user, send OTP to identifier), verifyOtp (check Redis OTP by identifier, set is_verified=true), loginWithPassword (lookup by phone or email, role match, bcrypt compare, issue tokens), requestLoginOtp (lookup user, send OTP to identifier), verifyLoginOtp (verify OTP, auto-verify user if needed, issue tokens), refresh (validate Redis refresh token, issue new access token), logout (delete refresh token from Redis)
  - [x] 3.3 Create src/modules/auth/controller.js — thin handlers for register, verifyOtp, loginWithPassword, requestLoginOtp, verifyLoginOtp, refresh, logout
  - [x] 3.4 Create src/modules/auth/routes.js — POST /register, /verify-otp, /login/password, /login/otp/request, /login/otp/verify, /refresh (all public with rateLimiter); POST /logout (authenticate middleware)

- [x] 4. User Module
  - [x] 4.1 Create src/modules/user/validation.js — schemas for updateProfile (name, email, phone, password), addAddress
  - [x] 4.2 Create src/modules/user/service.js — getProfile (returns name, email, phone, role, is_verified), updateProfile (hash new password if provided, update email/phone with uniqueness check), addAddress, deleteAddress (ownership check → 403 if mismatch)
  - [x] 4.3 Create src/modules/user/controller.js
  - [x] 4.4 Create src/modules/user/routes.js — GET /me, PATCH /me (authenticate); POST /addresses (authenticate + authorize customer); DELETE /addresses/:id (authenticate + authorize customer)

- [x] 5. Restaurant Module
  - [x] 5.1 Create src/modules/restaurant/validation.js — schemas for listRestaurants (pagination), addMenuItem, updateMenuItem
  - [x] 5.2 Create src/modules/restaurant/service.js — listRestaurants (paginated), getRestaurantDetails (with menu grouped by category, 404 if not found), addMenuItem (ownership check → 403), updateMenuItem (ownership + existence checks → 403/404)
  - [x] 5.3 Create src/modules/restaurant/controller.js
  - [x] 5.4 Create src/modules/restaurant/routes.js — GET /restaurants, GET /restaurants/:id (public); POST /restaurants/:id/menu, PATCH /restaurants/:id/menu/:itemId (authenticate + authorize restaurant_owner)

- [x] 6. Order Module
  - [x] 6.1 Create src/modules/order/validation.js — schemas for createOrder, updateOrderStatus
  - [x] 6.2 Create src/modules/order/service.js — createOrder (validate items belong to restaurant → 400, compute total, create Order + OrderItems with pending statuses), cancelOrder (status machine check → 400 if non-cancellable), getOrders (paginated, customer-scoped), updateOrderStatus (validate next status, emit order_status_update socket event)
  - [x] 6.3 Create src/modules/order/controller.js
  - [x] 6.4 Create src/modules/order/routes.js — POST /orders, GET /orders (authenticate + authorize customer); POST /orders/:id/cancel (authenticate + authorize customer); PATCH /orders/:id/status (authenticate + authorize restaurant_owner, delivery)

- [x] 7. Delivery Module
  - [x] 7.1 Create src/modules/delivery/validation.js — schemas for acceptOrder, updateLocation, completeOrder
  - [x] 7.2 Create src/modules/delivery/service.js — acceptOrder (check unassigned → 409 if taken, assign agent, set out_for_delivery), updateLocation (persist DeliveryTracking, emit delivery_location socket event), completeOrder (set delivered, emit order_status_update)
  - [x] 7.3 Create src/modules/delivery/controller.js
  - [x] 7.4 Create src/modules/delivery/routes.js — POST /delivery/:orderId/accept, POST /delivery/:orderId/location, POST /delivery/:orderId/complete (all authenticate + authorize delivery)

- [x] 8. Payment Module
  - [x] 8.1 Create src/modules/payment/validation.js — schemas for createPayment, verifyPayment, refund
  - [x] 8.2 Create src/modules/payment/service.js — createPayment (create record with pending status + UUID reference), verifyPayment (call gateway mock, set paid/failed on payment and order), refund (check payment_status=paid + order status=cancelled → 400 otherwise, set refunded)
  - [x] 8.3 Create src/modules/payment/controller.js
  - [x] 8.4 Create src/modules/payment/routes.js — POST /payments, POST /payments/verify (authenticate + authorize customer); POST /payments/:id/refund (authenticate + authorize customer)

- [x] 9. Notification Module
  - [x] 9.1 Create src/modules/notification/service.js — createNotification (store record with user_id, message, type, is_read=false), sendPushNotification (FCM dispatch), getNotifications (paginated, ordered by created_at desc)
  - [x] 9.2 Create src/modules/notification/controller.js
  - [x] 9.3 Create src/modules/notification/routes.js — GET /notifications (authenticate)

- [x] 10. Admin Module
  - [x] 10.1 Create src/modules/admin/validation.js — schema for analytics (date range)
  - [x] 10.2 Create src/modules/admin/service.js — approveRestaurant (set approval_status=approved), approveDeliveryAgent (set status=active), getAnalytics (aggregate total orders, revenue, active restaurants, active agents for date range)
  - [x] 10.3 Create src/modules/admin/controller.js
  - [x] 10.4 Create src/modules/admin/routes.js — POST /admin/restaurants/:id/approve, POST /admin/agents/:id/approve, GET /admin/analytics (all authenticate + authorize admin)

- [x] 11. Socket.IO Server
  - [x] 11.1 Create src/sockets/index.js — initialize Socket.IO on the HTTP server, register JWT auth middleware (reject connection with auth error if JWT invalid/missing), join user to room `user:<userId>`, join delivery agents to room `delivery_agents`
  - [x] 11.2 Create src/sockets/orderHandlers.js — export emitOrderStatusUpdate(io, customerId, payload) and emitNewOrder(io, ownerId, payload) helpers
  - [x] 11.3 Create src/sockets/deliveryHandlers.js — export emitDeliveryLocation(io, customerId, payload) and emitNewDeliveryRequest(io, payload) helpers

- [x] 12. Background Jobs
  - [x] 12.1 Create src/jobs/otpCleanup.js — periodic job (e.g., every 10 minutes) that deletes OTP records with expires_at in the past
  - [x] 12.2 Create src/jobs/index.js — bootstrap and start all scheduled jobs

- [x] 13. Documentation
  - [x] 13.1 Create ARCHITECTURE.md at project root describing the purpose of each folder under src/ (config, common/middleware, common/utils, common/constants, modules/*, sockets, jobs)

- [-] 14. Tests — Unit and Integration
  - [x] 14.1 Configure Jest with test environment, setup/teardown for Prisma test database and Redis test instance
  - [x] 14.2 Write integration tests for auth flows: register → verify OTP → login (password + OTP paths) → refresh → logout (happy path and error cases: duplicate email/phone, wrong OTP, role mismatch, wrong password, unverified user blocked)
  - [x] 14.3 Write integration tests for RBAC: verify each role-restricted endpoint returns 403 for all non-permitted roles (customer, restaurant_owner, delivery, admin cross-tested)
  - [x] 14.4 Write integration tests for order lifecycle: create → cancel (valid and invalid statuses), status update flow
  - [x] 14.5 Write integration tests for payment lifecycle: create → verify (success and failure) → refund (eligible and ineligible)
  - [x] 14.6 Write unit tests for response envelope: verify all success and error responses match the standard shape
  - [x] 14.7 Write unit tests for validation middleware: verify 422 responses include per-field error details

- [ ] 15. Tests — Property-Based
  - [ ] 15.1 Write PBT for Property 1: Registration always creates is_verified=false, status=active
  - [ ] 15.2 Write PBT for Property 2: Duplicate email or phone always returns 409
  - [ ] 15.3 Write PBT for Property 3: OTP round-trip for both phone and email identifiers (correct OTP → verified; wrong/expired → 400)
  - [ ] 15.4 Write PBT for Property 4: Unverified user always blocked on protected endpoints
  - [ ] 15.5 Write PBT for Property 5: Login JWT (password and OTP paths) always contains matching id, phone/email, role, is_verified claims
  - [ ] 15.6 Write PBT for Property 6: Role mismatch at login always returns 403
  - [ ] 15.7 Write PBT for Property 7: Refresh token always preserves role claim
  - [ ] 15.8 Write PBT for Property 8: Post-logout refresh always returns 401
  - [ ] 15.9 Write PBT for Property 9: Invalid JWT always rejected on protected endpoints
  - [ ] 15.10 Write PBT for Property 10: Profile GET/PATCH round-trip always consistent
  - [ ] 15.11 Write PBT for Property 11: Address delete by non-owner always returns 403
  - [ ] 15.12 Write PBT for Property 12: Address add/delete round-trip always consistent
  - [ ] 15.13 Write PBT for Property 13: Pagination invariants and closed restaurant inclusion
  - [ ] 15.14 Write PBT for Property 14: Menu always grouped by category in restaurant details
  - [ ] 15.15 Write PBT for Property 15: Non-owner menu operations always return 403
  - [ ] 15.16 Write PBT for Property 16: Menu item add/update round-trip always consistent
  - [ ] 15.17 Write PBT for Property 17: Order creation always sets pending status with correct total
  - [ ] 15.18 Write PBT for Property 18: Cross-restaurant item always returns 400
  - [ ] 15.19 Write PBT for Property 19: Cancellation state machine always enforced
  - [ ] 15.20 Write PBT for Property 20: Order list always isolated to requesting customer
  - [ ] 15.21 Write PBT for Property 21: Status update always emits socket event to customer room
  - [ ] 15.22 Write PBT for Property 22: Delivery acceptance assigns agent; double-accept always 409
  - [ ] 15.23 Write PBT for Property 23: Location update always persists and emits to customer
  - [ ] 15.24 Write PBT for Property 24: Order completion always sets delivered and emits event
  - [ ] 15.25 Write PBT for Property 25: Payment lifecycle always transitions correctly
  - [ ] 15.26 Write PBT for Property 26: Refund eligibility always enforced
  - [ ] 15.27 Write PBT for Property 27: Notification round-trip always stores required fields, ordered desc
  - [ ] 15.28 Write PBT for Property 28: Socket events always isolated to correct user rooms
  - [ ] 15.29 Write PBT for Property 29: new_delivery_request always broadcast to all delivery agents
  - [ ] 15.30 Write PBT for Property 30: RBAC always returns 403 for wrong-role requests across all four roles (customer, restaurant_owner, delivery, admin)
  - [ ] 15.31 Write PBT for Property 31: Response envelope always matches success/error shape
  - [ ] 15.32 Write PBT for Property 32: Validation failure always returns 422 with field errors
  - [ ] 15.33 Write PBT for Property 33: Rate limiting always rejects beyond 100 req/min per IP
  - [ ] 15.34 Write PBT for Property 34: Analytics always returns correct aggregates for date range
