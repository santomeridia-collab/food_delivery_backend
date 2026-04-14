# Postman API Testing Guide — Food Delivery Backend

> This document is updated after each task is completed. It shows which endpoints are live, how to test them, and what to expect. Endpoints marked **[STUB]** exist on the router but return no response yet (implemented in a later task).

---

## Setup

### Base URL
```
http://localhost:3000
```

### Environment Variables (Postman)
Create a Postman Environment called `food-delivery-local` with these variables:

| Variable          | Initial Value             | Notes                          |
|-------------------|---------------------------|--------------------------------|
| `base_url`        | `http://localhost:3000`   |                                |
| `access_token`    | _(empty)_                 | Set automatically after login  |
| `refresh_token`   | _(empty)_                 | Set automatically after login  |
| `user_id`         | _(empty)_                 | Set after registration         |
| `restaurant_id`   | _(empty)_                 | Set after fetching restaurants |
| `address_id`      | _(empty)_                 | Set after adding address       |
| `order_id`        | _(empty)_                 | Set after order creation       |
| `payment_id`      | _(empty)_                 | Set after payment creation     |

### Authorization Header
For all protected endpoints, add this header:
```
Authorization: Bearer {{access_token}}
```

---

## Starting the Server

Before testing, make sure your `.env` file exists in `Backend/` with:
```env
DATABASE_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/food_delivery?retryWrites=true&w=majority
REDIS_URL=rediss://default:<password>@<host>.upstash.io:6379
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
PORT=3000
FCM_SERVER_KEY=your_fcm_key_here
```

Then start the server:
```bash
cd Backend
npm run dev
```

Expected console output:
```
info: Server running on port 3000
[Redis] Connected successfully
```

---

## Task 1 — Project Scaffolding (Completed ✅)

Task 1 sets up the project skeleton. No business endpoints are live yet, but the server boots and the infrastructure is in place.

### Health Check — Server is Running

**Request**
```
GET {{base_url}}/api/auth
```

**Expected Response** — `404 Not Found` (router is mounted but no routes defined yet)
```json
Cannot GET /api/auth
```

This confirms the server is running and Express is routing correctly. A 404 here is expected — it means the router is mounted but the actual route handlers haven't been implemented yet (Task 3+).

### Verify All Route Prefixes Are Mounted

Run these requests — all should return `404` (not a connection error), confirming each module router is registered:

| # | Method | URL                          | Expected |
|---|--------|------------------------------|----------|
| 1 | GET    | `{{base_url}}/api/auth`      | 404      |
| 2 | GET    | `{{base_url}}/api/users`     | 404      |
| 3 | GET    | `{{base_url}}/api/restaurants` | 404    |
| 4 | GET    | `{{base_url}}/api/orders`    | 404      |
| 5 | GET    | `{{base_url}}/api/delivery`  | 404      |
| 6 | GET    | `{{base_url}}/api/payments`  | 404      |
| 7 | GET    | `{{base_url}}/api/notifications` | 404  |
| 8 | GET    | `{{base_url}}/api/admin`     | 404      |

> A `404` response (not `ECONNREFUSED`) means the server is up and routing is wired correctly.

### Verify Error Envelope on Unknown Route

**Request**
```
GET {{base_url}}/api/does-not-exist
```

**Expected Response** — `404` with Express default HTML (global error handler is stubbed, full implementation in Task 2.5)

---

## Task 2 — Shared Middleware ✅

Once Task 2 is complete, these middleware behaviors will be testable:

### 2.1 JWT Authentication
- Hit any protected endpoint without a token → expect `401 Unauthorized`
- Response shape: `{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "..." } }`

### 2.2 RBAC Authorization
- Hit a role-restricted endpoint with the wrong role → expect `403 Forbidden`
- Response shape: `{ "success": false, "error": { "code": "FORBIDDEN", "message": "..." } }`

### 2.3 Validation
- Send a malformed request body → expect `422 Unprocessable Entity`
- Response shape: `{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }`

### 2.4 Rate Limiter
- Send 101+ requests/min to `/api/auth/*` from the same IP → expect `429 Too Many Requests`

---

## Task 3 — Auth Module ✅

### POST /api/auth/register

**Request**
```
POST {{base_url}}/api/auth/register
Content-Type: application/json
```
```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "password": "SecurePass123",
  "role": "customer"
}
```

**Expected Success — 201 Created**
```json
{
  "success": true,
  "data": {
    "message": "Registration successful. OTP sent to your phone."
  }
}
```

**Error Cases**

| Scenario              | Status | Code        | Message                    |
|-----------------------|--------|-------------|----------------------------|
| Phone already exists  | 409    | `CONFLICT`  | Phone already registered   |
| Missing fields        | 422    | `VALIDATION_ERROR` | Field-level errors  |
| Invalid role          | 422    | `VALIDATION_ERROR` | role must be one of...  |

---

### POST /api/auth/verify-otp

**Request**
```
POST {{base_url}}/api/auth/verify-otp
Content-Type: application/json
```
```json
{
  "phone": "+1234567890",
  "otp": "123456"
}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "message": "Phone verified successfully."
  }
}
```

**Error Cases**

| Scenario          | Status | Code          | Message              |
|-------------------|--------|---------------|----------------------|
| Wrong OTP         | 400    | `BAD_REQUEST` | Invalid or expired OTP |
| Expired OTP       | 400    | `BAD_REQUEST` | Invalid or expired OTP |

---

### POST /api/auth/login

**Request**
```
POST {{base_url}}/api/auth/login
Content-Type: application/json
```
```json
{
  "phone": "+1234567890",
  "password": "SecurePass123",
  "role": "customer"
}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<uuid>"
  }
}
```

**Postman Test Script** (auto-save tokens):
```javascript
const body = pm.response.json();
if (body.success) {
  pm.environment.set("access_token", body.data.accessToken);
  pm.environment.set("refresh_token", body.data.refreshToken);
}
```

**Error Cases**

| Scenario           | Status | Code        | Message          |
|--------------------|--------|-------------|------------------|
| Wrong password     | 401    | `UNAUTHORIZED` | Invalid credentials |
| Role mismatch      | 403    | `FORBIDDEN` | Role mismatch    |
| Unverified user    | 403    | `FORBIDDEN` | Account not verified |

---

### POST /api/auth/refresh

**Request**
```
POST {{base_url}}/api/auth/refresh
Content-Type: application/json
```
```json
{
  "refreshToken": "{{refresh_token}}"
}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "accessToken": "<new_jwt>"
  }
}
```

---

### POST /api/auth/logout

**Request**
```
POST {{base_url}}/api/auth/logout
Authorization: Bearer {{access_token}}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully."
  }
}
```

---

## Task 4 — User Module _(not yet implemented)_

### GET /api/users/me

**Request**
```
GET {{base_url}}/api/users/me
Authorization: Bearer {{access_token}}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "6617a2f3e4b0c12d3f4e5a6b",
    "name": "John Doe",
    "phone": "+1234567890",
    "role": "customer",
    "is_verified": true
  }
}
```

---

### PATCH /api/users/me

**Request**
```
PATCH {{base_url}}/api/users/me
Authorization: Bearer {{access_token}}
Content-Type: application/json
```
```json
{
  "name": "Jane Doe"
}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "6617a2f3e4b0c12d3f4e5a6b",
    "name": "Jane Doe",
    "phone": "+1234567890",
    "role": "customer",
    "is_verified": true
  }
}
```

---

### POST /api/users/addresses

**Request**
```
POST {{base_url}}/api/users/addresses
Authorization: Bearer {{access_token}}
Content-Type: application/json
```
```json
{
  "address": "123 Main St, New York, NY",
  "lat": 40.7128,
  "lng": -74.0060
}
```

**Expected Success — 201 Created**
```json
{
  "success": true,
  "data": {
    "id": "6617a3c1e4b0c12d3f4e5a7c",
    "address": "123 Main St, New York, NY",
    "lat": 40.7128,
    "lng": -74.0060
  }
}
```

---

### DELETE /api/users/addresses/:id

**Request**
```
DELETE {{base_url}}/api/users/addresses/6617a3c1e4b0c12d3f4e5a7c
Authorization: Bearer {{access_token}}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "message": "Address deleted."
  }
}
```

**Error Cases**

| Scenario              | Status | Code       | Message                    |
|-----------------------|--------|------------|----------------------------|
| Address not yours     | 403    | `FORBIDDEN` | Access denied              |
| Address not found     | 404    | `NOT_FOUND` | Address not found          |

---

## Task 5 — Restaurant Module _(not yet implemented)_

### GET /api/restaurants

**Request**
```
GET {{base_url}}/api/restaurants?page=1&limit=10
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "restaurants": [
      {
        "id": "6617a4d2e4b0c12d3f4e5a8d",
        "name": "Pizza Palace",
        "rating": 4.5,
        "is_open": true
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

### GET /api/restaurants/:id

**Request**
```
GET {{base_url}}/api/restaurants/6617a4d2e4b0c12d3f4e5a8d
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "6617a4d2e4b0c12d3f4e5a8d",
    "name": "Pizza Palace",
    "rating": 4.5,
    "is_open": true,
    "menu": {
      "Pizzas": [
        { "id": "6617a5e3e4b0c12d3f4e5a9e", "name": "Margherita", "price": 12.99, "is_available": true }
      ],
      "Drinks": [
        { "id": "6617a5e3e4b0c12d3f4e5a9f", "name": "Cola", "price": 2.50, "is_available": true }
      ]
    }
  }
}
```

---

### POST /api/restaurants/:id/menu

**Request**
```
POST {{base_url}}/api/restaurants/6617a4d2e4b0c12d3f4e5a8d/menu
Authorization: Bearer {{access_token}}
Content-Type: application/json
```
```json
{
  "name": "Pepperoni Pizza",
  "price": 14.99,
  "category": "Pizzas"
}
```

**Expected Success — 201 Created**
```json
{
  "success": true,
  "data": {
    "id": "6617a6f4e4b0c12d3f4e5aa0",
    "name": "Pepperoni Pizza",
    "price": 14.99,
    "category": "Pizzas",
    "is_available": true
  }
}
```

---

## Task 6 — Order Module ✅

### POST /api/orders
_(Requires `customer` role)_

**Request**
```
POST {{base_url}}/api/orders
Authorization: Bearer {{access_token}}
Content-Type: application/json
```
```json
{
  "restaurant_id": "6617a4d2e4b0c12d3f4e5a8d",
  "address_id": "6617a3c1e4b0c12d3f4e5a7c",
  "items": [
    { "menu_item_id": "6617a5e3e4b0c12d3f4e5a9e", "quantity": 2 },
    { "menu_item_id": "6617a5e3e4b0c12d3f4e5a9f", "quantity": 1 }
  ]
}
```

**Expected Success — 201 Created**
```json
{
  "success": true,
  "data": {
    "id": "6617b1a2e4b0c12d3f4e5ab1",
    "customer_id": "6617a2f3e4b0c12d3f4e5a6b",
    "restaurant_id": "6617a4d2e4b0c12d3f4e5a8d",
    "address_id": "6617a3c1e4b0c12d3f4e5a7c",
    "total": 28.48,
    "status": "pending",
    "payment_status": "pending",
    "items": [
      { "id": "6617b2b3e4b0c12d3f4e5ac2", "menu_item_id": "6617a5e3e4b0c12d3f4e5a9e", "quantity": 2, "unit_price": 12.99 },
      { "id": "6617b2b3e4b0c12d3f4e5ac3", "menu_item_id": "6617a5e3e4b0c12d3f4e5a9f", "quantity": 1, "unit_price": 2.50 }
    ]
  }
}
```

**Postman Test Script** (save order_id):
```javascript
const body = pm.response.json();
if (body.success) {
  pm.environment.set("order_id", body.data.id);
}
```

**Error Cases**

| Scenario                              | Status | Code            | Message                                              |
|---------------------------------------|--------|-----------------|------------------------------------------------------|
| Item belongs to different restaurant  | 400    | `INVALID_ITEMS` | One or more items do not belong to the specified restaurant |
| Missing required fields               | 422    | `VALIDATION_ERROR` | Field-level errors                                |
| Not a customer role                   | 403    | `FORBIDDEN`     | Access denied: requires one of [customer]            |

---

### GET /api/orders
_(Requires `customer` role — returns only the authenticated customer's orders)_

**Request**
```
GET {{base_url}}/api/orders?page=1&limit=10
Authorization: Bearer {{access_token}}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "6617b1a2e4b0c12d3f4e5ab1",
        "status": "pending",
        "payment_status": "pending",
        "total": 28.48,
        "created_at": "2026-04-06T10:00:00.000Z",
        "items": [
          { "id": "6617b2b3e4b0c12d3f4e5ac2", "menu_item_id": "6617a5e3e4b0c12d3f4e5a9e", "quantity": 2, "unit_price": 12.99 }
        ]
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

### POST /api/orders/:id/cancel
_(Requires `customer` role — only the order owner can cancel)_

**Request**
```
POST {{base_url}}/api/orders/{{order_id}}/cancel
Authorization: Bearer {{access_token}}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "6617b1a2e4b0c12d3f4e5ab1",
    "status": "cancelled"
  }
}
```

**Error Cases**

| Scenario                        | Status | Code               | Message                                              |
|---------------------------------|--------|--------------------|------------------------------------------------------|
| Order in `preparing` state      | 400    | `INVALID_STATUS`   | Order cannot be cancelled in status: preparing       |
| Order already `delivered`       | 400    | `INVALID_STATUS`   | Order cannot be cancelled in status: delivered       |
| Order belongs to another user   | 403    | `FORBIDDEN`        | You do not own this order                            |
| Order not found                 | 404    | `NOT_FOUND`        | Order not found                                      |

---

### PATCH /api/orders/:id/status
_(Requires `restaurant_owner` or `delivery` role)_

Valid status transitions:
- `pending` → `confirmed` or `cancelled`
- `confirmed` → `preparing` or `cancelled`
- `preparing` → `out_for_delivery`
- `out_for_delivery` → `delivered`

Emits a `order_status_update` Socket.IO event to the customer's room (`user:<customerId>`).

**Request**
```
PATCH {{base_url}}/api/orders/{{order_id}}/status
Authorization: Bearer {{access_token}}
Content-Type: application/json
```
```json
{
  "status": "confirmed"
}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "6617b1a2e4b0c12d3f4e5ab1",
    "status": "confirmed"
  }
}
```

**Error Cases**

| Scenario                              | Status | Code                 | Message                                          |
|---------------------------------------|--------|----------------------|--------------------------------------------------|
| Invalid transition (e.g. pending → delivered) | 400 | `INVALID_TRANSITION` | Cannot transition from pending to delivered  |
| Invalid status value                  | 422    | `VALIDATION_ERROR`   | Field-level errors                               |
| Wrong role (e.g. customer)            | 403    | `FORBIDDEN`          | Access denied: requires one of [restaurant_owner, delivery] |
| Order not found                       | 404    | `NOT_FOUND`          | Order not found                                  |

---

## Task 7 — Delivery Module _(not yet implemented)_

### POST /api/delivery/:orderId/accept

**Request**
```
POST {{base_url}}/api/delivery/{{order_id}}/accept
Authorization: Bearer {{access_token}}
```
_(Requires `delivery` role JWT)_

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "message": "Order accepted.",
    "status": "out_for_delivery"
  }
}
```

**Error Cases**

| Scenario                  | Status | Code       | Message                    |
|---------------------------|--------|------------|----------------------------|
| Already assigned to agent | 409    | `CONFLICT` | Order already assigned     |

---

### POST /api/delivery/:orderId/location

**Request**
```
POST {{base_url}}/api/delivery/{{order_id}}/location
Authorization: Bearer {{access_token}}
Content-Type: application/json
```
```json
{
  "lat": 40.7128,
  "lng": -74.0060
}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "message": "Location updated."
  }
}
```

---

### POST /api/delivery/:orderId/complete

**Request**
```
POST {{base_url}}/api/delivery/{{order_id}}/complete
Authorization: Bearer {{access_token}}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "message": "Order delivered.",
    "status": "delivered"
  }
}
```

---

## Task 8 — Payment Module _(not yet implemented)_

### POST /api/payments

**Request**
```
POST {{base_url}}/api/payments
Authorization: Bearer {{access_token}}
Content-Type: application/json
```
```json
{
  "order_id": "6617b1a2e4b0c12d3f4e5ab1",
  "method": "card"
}
```

**Expected Success — 201 Created**
```json
{
  "success": true,
  "data": {
    "id": "6617c3d4e4b0c12d3f4e5ad4",
    "reference": "uuid-v4-here",
    "status": "pending"
  }
}
```

**Postman Test Script** (save payment_id):
```javascript
const body = pm.response.json();
if (body.success) {
  pm.environment.set("payment_id", body.data.id);
}
```

---

### POST /api/payments/verify

**Request**
```
POST {{base_url}}/api/payments/verify
Authorization: Bearer {{access_token}}
Content-Type: application/json
```
```json
{
  "reference": "uuid-v4-here",
  "gateway_status": "success"
}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "status": "paid"
  }
}
```

---

### POST /api/payments/:id/refund

**Request**
```
POST {{base_url}}/api/payments/{{payment_id}}/refund
Authorization: Bearer {{access_token}}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "status": "refunded"
  }
}
```

**Error Cases**

| Scenario                        | Status | Code          | Message                        |
|---------------------------------|--------|---------------|--------------------------------|
| Payment not in `paid` state     | 400    | `BAD_REQUEST` | Payment not eligible for refund |

---

## Task 9 — Notification Module _(not yet implemented)_

### GET /api/notifications

**Request**
```
GET {{base_url}}/api/notifications?page=1&limit=20
Authorization: Bearer {{access_token}}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "6617d5e6e4b0c12d3f4e5ae5",
        "message": "Your order has been confirmed.",
        "type": "order_update",
        "is_read": false,
        "created_at": "2026-04-06T10:05:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

---

## Task 10 — Admin Module _(not yet implemented)_

### POST /api/admin/restaurants/:id/approve

**Request**
```
POST {{base_url}}/api/admin/restaurants/6617a4d2e4b0c12d3f4e5a8d/approve
Authorization: Bearer {{access_token}}
```
_(Requires `admin` role JWT)_

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "message": "Restaurant approved.",
    "approval_status": "approved"
  }
}
```

---

### POST /api/admin/agents/:id/approve

**Request**
```
POST {{base_url}}/api/admin/agents/6617a2f3e4b0c12d3f4e5a6b/approve
Authorization: Bearer {{access_token}}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "message": "Delivery agent approved.",
    "status": "active"
  }
}
```

---

### GET /api/admin/analytics

**Request**
```
GET {{base_url}}/api/admin/analytics?from=2026-01-01&to=2026-04-06
Authorization: Bearer {{access_token}}
```

**Expected Success — 200 OK**
```json
{
  "success": true,
  "data": {
    "total_orders": 150,
    "total_revenue": 4523.75,
    "active_restaurants": 12,
    "active_agents": 8
  }
}
```

---

## Standard Response Envelopes

All API responses follow this shape:

**Success**
```json
{ "success": true, "data": { ... } }
```

**Error**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### HTTP Status Code Reference

| Status | Code              | When                                          |
|--------|-------------------|-----------------------------------------------|
| 200    | —                 | Successful GET / action                       |
| 201    | —                 | Resource created                              |
| 400    | `BAD_REQUEST`     | Invalid business logic (cancel, cross-item)   |
| 401    | `UNAUTHORIZED`    | Missing/expired/invalid JWT                   |
| 403    | `FORBIDDEN`       | Unverified user, role mismatch, not owner     |
| 404    | `NOT_FOUND`       | Resource does not exist                       |
| 409    | `CONFLICT`        | Duplicate phone, already-assigned delivery    |
| 422    | `VALIDATION_ERROR`| Request body fails schema validation          |
| 429    | `RATE_LIMITED`    | Auth endpoint rate limit exceeded (100/min)   |
| 500    | `INTERNAL_ERROR`  | Unhandled exception                           |

---

## Socket.IO Testing

Use the [Socket.IO Client Tool](https://amritb.github.io/socketio-client-tool/) or write a test client.

### Connection

```javascript
const { io } = require("socket.io-client");

const socket = io("http://localhost:3000", {
  auth: { token: "<access_token>" }
});

socket.on("connect", () => console.log("Connected:", socket.id));
socket.on("connect_error", (err) => console.log("Auth error:", err.message));
```

### Events to Listen For

| Event                  | Emitted When                              | Payload                                      |
|------------------------|-------------------------------------------|----------------------------------------------|
| `order_status_update`  | Order status changes                      | `{ order_id, status, updated_at }`           |
| `delivery_location`    | Delivery agent updates location           | `{ order_id, lat, lng }`                     |
| `new_order`            | New order placed (to restaurant owner)    | `{ order_id, items, total }`                 |
| `new_delivery_request` | Order confirmed (to all delivery agents)  | `{ order_id, restaurant, address }`          |

---

## Complete Flow — End-to-End Test Sequence

Once all tasks are implemented, run these in order:

```
1.  POST /api/auth/register          → register customer
2.  POST /api/auth/verify-otp        → verify phone
3.  POST /api/auth/login             → get tokens (save to env)
4.  POST /api/users/addresses        → add delivery address (save address_id)
5.  GET  /api/restaurants            → browse restaurants
6.  GET  /api/restaurants/:id        → view menu
7.  POST /api/orders                 → place order (save order_id)
8.  POST /api/payments               → create payment (save payment_id)
9.  POST /api/payments/verify        → confirm payment
10. POST /api/delivery/:id/accept    → agent accepts (delivery role token)
11. POST /api/delivery/:id/location  → agent updates location
12. POST /api/delivery/:id/complete  → order delivered
13. GET  /api/notifications          → check notifications
14. POST /api/auth/logout            → end session
```

---

## Task Completion Status

| Task | Module                  | Status      | Endpoints Live |
|------|-------------------------|-------------|----------------|
| 1    | Scaffolding             | ✅ Complete | Server boots, all prefixes mounted (stubs) |
| 2    | Shared Middleware        | ✅ Complete | authenticate, authorize, validate, rateLimiter, errorHandler |
| 3    | Auth                    | ✅ Complete | POST /api/auth/register, /verify-otp, /login, /refresh, /logout |
| 4    | User                    | ⏳ Pending  | — |
| 5    | Restaurant              | ⏳ Pending  | — |
| 6    | Order                   | ✅ Complete | POST /api/orders, GET /api/orders, POST /api/orders/:id/cancel, PATCH /api/orders/:id/status |
| 7    | Delivery                | ⏳ Pending  | — |
| 8    | Payment                 | ⏳ Pending  | — |
| 9    | Notification            | ⏳ Pending  | — |
| 10   | Admin                   | ⏳ Pending  | — |
| 11   | Socket.IO               | ⏳ Pending  | — |
| 12   | Background Jobs         | ⏳ Pending  | — |
| 13   | Documentation           | ⏳ Pending  | — |
| 14   | Unit/Integration Tests  | ⏳ Pending  | — |
| 15   | Property-Based Tests    | ⏳ Pending  | — |
