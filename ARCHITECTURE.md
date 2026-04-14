# Architecture

This document describes the purpose of each folder under `src/` in the food delivery backend.

## src/config/

Singleton initialisation for external services and validated environment variables.

| File | Purpose |
|------|---------|
| `db.js` | Prisma client singleton — single shared database connection used across the app |
| `redis.js` | Redis client singleton — single shared Redis connection used for caching, rate limiting, and OTP storage |
| `env.js` | Validated environment variables — reads and validates all required env vars at startup, failing fast if any are missing or malformed |

## src/common/middleware/

Express middleware that is shared across multiple modules.

| File | Purpose |
|------|---------|
| `authenticate.js` | JWT verification — extracts and verifies the Bearer token from incoming requests, attaches the decoded user payload to `req.user` |
| `authorize.js` | RBAC role-guard — checks that the authenticated user holds one of the required roles before allowing access to a route |
| `errorHandler.js` | Global error handler — catches all errors propagated via `next(err)` and returns a consistent JSON error response |
| `rateLimiter.js` | Redis-backed rate limiter — limits the number of requests a client can make within a time window, using Redis for distributed state |
| `validate.js` | Joi request validation wrapper — validates `req.body`, `req.params`, or `req.query` against a Joi schema and returns 422 on failure |

## src/common/utils/

Stateless helper functions shared across the codebase.

| File | Purpose |
|------|---------|
| `response.js` | Success/error response helpers — standardises the JSON response shape for all API responses |
| `jwt.js` | `signToken` / `verifyToken` — thin wrappers around the JWT library for issuing and verifying tokens |
| `otp.js` | OTP generation and TTL — generates one-time passwords and manages their expiry metadata |
| `logger.js` | Winston logger — structured application logger used throughout the codebase |

## src/common/constants/

Shared constant values and lookup tables used across modules.

| File | Purpose |
|------|---------|
| `roles.js` | User role identifiers (e.g. `CUSTOMER`, `RESTAURANT_OWNER`, `DELIVERY_DRIVER`, `ADMIN`) |
| `orderStatus.js` | Enumeration of all valid order status values (e.g. `PENDING`, `CONFIRMED`, `DELIVERED`) |
| `paymentStatus.js` | Enumeration of all valid payment status values (e.g. `PENDING`, `PAID`, `FAILED`) |
| `rbac.js` | Role-based access control map — defines which roles are permitted to access which resources |

## src/modules/

Feature modules, each encapsulating its own routes, controller, service, and validation logic. Every module follows the same internal structure:

| File | Purpose |
|------|---------|
| `routes.js` | Express router — declares the HTTP endpoints for the module and wires middleware |
| `controller.js` | Request/response layer — parses the request, calls the service, and sends the response |
| `service.js` | Business logic layer — contains all domain logic and database interactions |
| `validation.js` | Joi schemas — defines the expected shape of request payloads for the module |

### Modules

| Module | Responsibility |
|--------|---------------|
| `auth` | Registration, login, token refresh, and OTP-based verification |
| `user` | User profile management |
| `restaurant` | Restaurant and menu management |
| `order` | Order placement, status transitions, and order history |
| `delivery` | Delivery assignment, tracking, and status updates |
| `payment` | Payment initiation and webhook handling |
| `notification` | In-app and push notification dispatch |
| `admin` | Administrative operations — user management, platform oversight |

## src/sockets/

Socket.IO server setup and real-time event handlers.

| File | Purpose |
|------|---------|
| `index.js` | Socket.IO server initialisation — attaches Socket.IO to the HTTP server and registers a JWT authentication middleware for socket connections |
| `orderHandlers.js` | Order real-time events — handles `order_status_update` (broadcasts status changes to relevant clients) and `new_order` (notifies restaurants of incoming orders) |
| `deliveryHandlers.js` | Delivery real-time events — handles `delivery_location` (streams driver GPS coordinates) and `new_delivery_request` (notifies available drivers of a new job) |

## src/jobs/

Background job scheduler and periodic task definitions.

| File | Purpose |
|------|---------|
| `index.js` | Job scheduler bootstrap — initialises the scheduler and registers all background jobs on application startup |
| `otpCleanup.js` | Expired OTP cleanup — runs on a schedule to remove expired OTP records from the database, keeping the table lean |
