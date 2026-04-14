# Food Delivery Backend — API Documentation

> Base URL: `http://localhost:3000/api`
> All protected endpoints require `Authorization: Bearer <access_token>` header.
> All responses follow the envelope: `{ success, data }` or `{ success, error: { code, message } }`

---

## Table of Contents

- [Authentication](#authentication)
- [User](#user)
- [Restaurant](#restaurant)
- [Order](#order)
- [Delivery](#delivery)
- [Payment](#payment)
- [Notification](#notification)
- [Admin](#admin)
- [Socket.IO Events](#socketio-events)
- [Error Codes Reference](#error-codes-reference)

---

## Authentication

> Rate limited: 100 requests/min per IP on all auth endpoints.

### POST /auth/register

Register a new user account. Triggers an OTP to the provided phone number.

**Access:** Public

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "password": "secret123",
  "role": "customer"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| name | string | yes | min 1 char |
| phone | string | yes | must be unique |
| password | string | yes | min 8 chars |
| role | string | yes | `customer` \| `restaurant_owner` \| `delivery` \| `admin` |

**Success Response — 201:**
```json
{
  "success": true,
  "data": {
    "message": "Registration successful. OTP sent to your phone.",
    "userId": 1
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 409 | `CONFLICT` | Phone number already registered |
| 422 | `VALIDATION_ERROR` | Missing or invalid fields |

---

### POST /auth/verify-otp

Verify the OTP sent after registration. Sets `is_verified = true` on success.

**Access:** Public

**Request Body:**
```json
{
  "phone": "+1234567890",
  "otp": "482910"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| phone | string | yes | registered phone |
| otp | string | yes | 6-digit code, valid for 5 minutes |

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "message": "Phone verified successfully."
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 400 | `BAD_REQUEST` | OTP expired or incorrect |
| 422 | `VALIDATION_ERROR` | Missing fields |

---

### POST /auth/login

Login with phone, password, and role. Role must match the registered role — mismatches are rejected.

**Access:** Public

**Request Body:**
```json
{
  "phone": "+1234567890",
  "password": "secret123",
  "role": "customer"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| phone | string | yes | |
| password | string | yes | |
| role | string | yes | must match stored role |

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<uuid>",
    "user": {
      "id": 1,
      "name": "John Doe",
      "phone": "+1234567890",
      "role": "customer"
    }
  }
}
```

**JWT Payload:**
```json
{ "id": 1, "phone": "+1234567890", "role": "customer", "iat": 0, "exp": 0 }
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 401 | `UNAUTHORIZED` | Wrong password or phone not found |
| 403 | `FORBIDDEN` | Role mismatch — provided role doesn't match stored role |
| 403 | `FORBIDDEN` | Account not verified |
| 422 | `VALIDATION_ERROR` | Missing fields |

---

### POST /auth/refresh

Exchange a valid refresh token for a new access token. Role claim is preserved.

**Access:** Public

**Request Body:**
```json
{
  "refreshToken": "<uuid>"
}
```

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "<new_jwt>"
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 401 | `UNAUTHORIZED` | Refresh token expired or revoked |
| 422 | `VALIDATION_ERROR` | Missing refreshToken |

---

### POST /auth/logout

Revoke the current refresh token. Subsequent refresh attempts with the same token will fail.

**Access:** Authenticated (any role)

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:** _(none)_

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully."
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 401 | `UNAUTHORIZED` | Invalid or missing access token |

---

## User

### GET /users/me

Get the authenticated user's profile.

**Access:** Authenticated (any role)

**Headers:** `Authorization: Bearer <access_token>`

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "phone": "+1234567890",
    "role": "customer",
    "is_verified": true,
    "status": "active"
  }
}
```

---

### PATCH /users/me

Update the authenticated user's profile. Only provided fields are updated.

**Access:** Authenticated (any role)

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "name": "Jane Doe",
  "password": "newpassword123"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| name | string | no | |
| password | string | no | min 8 chars, will be hashed |

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Jane Doe",
    "phone": "+1234567890",
    "role": "customer",
    "is_verified": true
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Invalid field values |

---

### POST /users/addresses

Add a delivery address for the authenticated customer.

**Access:** `customer` role only

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "address": "123 Main St, Springfield",
  "lat": 37.7749,
  "lng": -122.4194
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| address | string | yes | human-readable address |
| lat | float | yes | latitude |
| lng | float | yes | longitude |

**Success Response — 201:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "address": "123 Main St, Springfield",
    "lat": 37.7749,
    "lng": -122.4194
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 403 | `FORBIDDEN` | Not a customer role |
| 422 | `VALIDATION_ERROR` | Missing or invalid fields |

---

### DELETE /users/addresses/:id

Delete a saved address. Only the owner of the address can delete it.

**Access:** `customer` role only

**Headers:** `Authorization: Bearer <access_token>`

**Path Params:** `id` — address ID

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "message": "Address deleted."
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 403 | `FORBIDDEN` | Address belongs to a different user |
| 404 | `NOT_FOUND` | Address ID does not exist |

---

## Restaurant

### GET /restaurants

List all restaurants with pagination. Includes open and closed restaurants.

**Access:** Public

**Query Params:**

| Param | Type | Default | Notes |
|---|---|---|---|
| page | integer | 1 | |
| limit | integer | 10 | max 50 |

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "restaurants": [
      {
        "id": 1,
        "name": "Burger Palace",
        "rating": 4.5,
        "is_open": true
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 10
  }
}
```

---

### GET /restaurants/:id

Get full restaurant details including menu grouped by category.

**Access:** Public

**Path Params:** `id` — restaurant ID

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Burger Palace",
    "description": "Best burgers in town",
    "rating": 4.5,
    "is_open": true,
    "menu": {
      "Burgers": [
        { "id": 10, "name": "Classic Burger", "price": 8.99, "is_available": true }
      ],
      "Drinks": [
        { "id": 11, "name": "Cola", "price": 1.99, "is_available": true }
      ]
    }
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 404 | `NOT_FOUND` | Restaurant ID does not exist |

---

### POST /restaurants/:id/menu

Add a new menu item to a restaurant. Only the restaurant owner can do this.

**Access:** `restaurant_owner` role only

**Headers:** `Authorization: Bearer <access_token>`

**Path Params:** `id` — restaurant ID

**Request Body:**
```json
{
  "name": "Veggie Burger",
  "price": 7.49,
  "category": "Burgers"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| name | string | yes | |
| price | float | yes | must be > 0 |
| category | string | yes | |

**Success Response — 201:**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "name": "Veggie Burger",
    "price": 7.49,
    "category": "Burgers",
    "is_available": true
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 403 | `FORBIDDEN` | User does not own this restaurant |
| 404 | `NOT_FOUND` | Restaurant not found |
| 422 | `VALIDATION_ERROR` | Missing or invalid fields |

---

### PATCH /restaurants/:id/menu/:itemId

Update an existing menu item. Only the restaurant owner can do this.

**Access:** `restaurant_owner` role only

**Headers:** `Authorization: Bearer <access_token>`

**Path Params:** `id` — restaurant ID, `itemId` — menu item ID

**Request Body:**
```json
{
  "price": 8.99,
  "is_available": false
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| name | string | no | |
| price | float | no | must be > 0 |
| category | string | no | |
| is_available | boolean | no | |

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "name": "Veggie Burger",
    "price": 8.99,
    "category": "Burgers",
    "is_available": false
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 403 | `FORBIDDEN` | User does not own this restaurant |
| 404 | `NOT_FOUND` | Menu item not found |
| 422 | `VALIDATION_ERROR` | Invalid field values |

---

## Order

### POST /orders

Place a new order. All items must belong to the specified restaurant.

**Access:** `customer` role only

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "restaurantId": 1,
  "addressId": 5,
  "items": [
    { "menuItemId": 10, "quantity": 2 },
    { "menuItemId": 11, "quantity": 1 }
  ]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| restaurantId | integer | yes | |
| addressId | integer | yes | must belong to the customer |
| items | array | yes | min 1 item |
| items[].menuItemId | integer | yes | must belong to restaurantId |
| items[].quantity | integer | yes | min 1 |

**Success Response — 201:**
```json
{
  "success": true,
  "data": {
    "orderId": 101,
    "status": "pending",
    "paymentStatus": "pending",
    "total": 19.97
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 400 | `BAD_REQUEST` | Menu item does not belong to the restaurant |
| 403 | `FORBIDDEN` | Not a customer role |
| 422 | `VALIDATION_ERROR` | Missing or invalid fields |

---

### GET /orders

Get the authenticated customer's order history with pagination.

**Access:** `customer` role only

**Headers:** `Authorization: Bearer <access_token>`

**Query Params:**

| Param | Type | Default | Notes |
|---|---|---|---|
| page | integer | 1 | |
| limit | integer | 10 | |

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 101,
        "status": "delivered",
        "paymentStatus": "paid",
        "total": 19.97,
        "createdAt": "2026-04-01T10:00:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 10
  }
}
```

---

### POST /orders/:id/cancel

Cancel an order. Only allowed when status is `pending` or `confirmed`.

**Access:** `customer` role only

**Headers:** `Authorization: Bearer <access_token>`

**Path Params:** `id` — order ID

**Request Body:** _(none)_

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "orderId": 101,
    "status": "cancelled"
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 400 | `BAD_REQUEST` | Order is in a non-cancellable status (`preparing`, `out_for_delivery`, `delivered`) |
| 403 | `FORBIDDEN` | Order does not belong to this customer |
| 404 | `NOT_FOUND` | Order not found |

---

### PATCH /orders/:id/status

Update the status of an order. Restaurant owners and delivery agents use this to progress the order through its lifecycle.

**Access:** `restaurant_owner` or `delivery` role

**Headers:** `Authorization: Bearer <access_token>`

**Path Params:** `id` — order ID

**Request Body:**
```json
{
  "status": "confirmed"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| status | string | yes | valid next status in the state machine |

**Valid Status Transitions:**

| From | To | Who |
|---|---|---|
| `pending` | `confirmed` | restaurant_owner |
| `confirmed` | `preparing` | restaurant_owner |
| `preparing` | `out_for_delivery` | delivery |
| `out_for_delivery` | `delivered` | delivery |

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "orderId": 101,
    "status": "confirmed"
  }
}
```

**Side Effect:** Emits `order_status_update` Socket.IO event to the customer.

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 400 | `BAD_REQUEST` | Invalid status transition |
| 403 | `FORBIDDEN` | Role not permitted for this transition |
| 404 | `NOT_FOUND` | Order not found |

---

## Delivery

### POST /delivery/:orderId/accept

Accept a delivery request for a confirmed, unassigned order.

**Access:** `delivery` role only

**Headers:** `Authorization: Bearer <access_token>`

**Path Params:** `orderId` — order ID

**Request Body:** _(none)_

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "orderId": 101,
    "status": "out_for_delivery",
    "agentId": 7
  }
}
```

**Side Effect:** Emits `order_status_update` to the customer.

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 409 | `CONFLICT` | Order already assigned to another agent |
| 404 | `NOT_FOUND` | Order not found |

---

### POST /delivery/:orderId/location

Update the delivery agent's current location for an active order.

**Access:** `delivery` role only

**Headers:** `Authorization: Bearer <access_token>`

**Path Params:** `orderId` — order ID

**Request Body:**
```json
{
  "lat": 37.7750,
  "lng": -122.4180
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| lat | float | yes | current latitude |
| lng | float | yes | current longitude |

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "orderId": 101,
    "lat": 37.7750,
    "lng": -122.4180,
    "updatedAt": "2026-04-02T12:30:00Z"
  }
}
```

**Side Effect:** Emits `delivery_location` Socket.IO event to the customer.

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 403 | `FORBIDDEN` | Agent is not assigned to this order |
| 404 | `NOT_FOUND` | Order not found |
| 422 | `VALIDATION_ERROR` | Missing lat/lng |

---

### POST /delivery/:orderId/complete

Mark an order as delivered.

**Access:** `delivery` role only (assigned agent only)

**Headers:** `Authorization: Bearer <access_token>`

**Path Params:** `orderId` — order ID

**Request Body:** _(none)_

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "orderId": 101,
    "status": "delivered"
  }
}
```

**Side Effect:** Emits `order_status_update` to the customer.

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 403 | `FORBIDDEN` | Agent is not assigned to this order |
| 404 | `NOT_FOUND` | Order not found |

---

## Payment

### POST /payments

Create a payment record for an order.

**Access:** `customer` role only

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "orderId": 101,
  "method": "card"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| orderId | integer | yes | must belong to the customer |
| method | string | yes | `card` \| `cash` \| `wallet` |

**Success Response — 201:**
```json
{
  "success": true,
  "data": {
    "paymentId": 55,
    "reference": "pay_abc123uuid",
    "status": "pending",
    "method": "card"
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 400 | `BAD_REQUEST` | Order already has a payment |
| 403 | `FORBIDDEN` | Order does not belong to this customer |
| 404 | `NOT_FOUND` | Order not found |
| 422 | `VALIDATION_ERROR` | Missing or invalid fields |

---

### POST /payments/verify

Verify a payment with the gateway. Updates payment and order status accordingly.

**Access:** `customer` role only

**Headers:** `Authorization: Bearer <access_token>`

**Request Body:**
```json
{
  "reference": "pay_abc123uuid",
  "gatewayResponse": {
    "status": "success",
    "transactionId": "txn_xyz"
  }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| reference | string | yes | payment reference from create step |
| gatewayResponse | object | yes | gateway confirmation payload |
| gatewayResponse.status | string | yes | `success` \| `failed` |

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "paymentId": 55,
    "status": "paid",
    "orderPaymentStatus": "paid"
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 400 | `BAD_REQUEST` | Payment already verified |
| 404 | `NOT_FOUND` | Payment reference not found |
| 422 | `VALIDATION_ERROR` | Missing fields |

---

### POST /payments/:id/refund

Initiate a refund for a paid, cancelled order.

**Access:** `customer` role only

**Headers:** `Authorization: Bearer <access_token>`

**Path Params:** `id` — payment ID

**Request Body:** _(none)_

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "paymentId": 55,
    "status": "refunded"
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 400 | `BAD_REQUEST` | Payment is not in `paid` status |
| 403 | `FORBIDDEN` | Payment does not belong to this customer |
| 404 | `NOT_FOUND` | Payment not found |

---

## Notification

### GET /notifications

Get the authenticated user's notifications, ordered by most recent first.

**Access:** Authenticated (any role)

**Headers:** `Authorization: Bearer <access_token>`

**Query Params:**

| Param | Type | Default | Notes |
|---|---|---|---|
| page | integer | 1 | |
| limit | integer | 20 | |

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 200,
        "message": "Your order #101 is out for delivery.",
        "type": "order_status",
        "is_read": false,
        "createdAt": "2026-04-02T12:00:00Z"
      }
    ],
    "total": 8,
    "page": 1,
    "limit": 20
  }
}
```

---

## Admin

> All admin endpoints require `admin` role. Any other role receives a 403.

### POST /admin/restaurants/:id/approve

Approve a pending restaurant registration.

**Access:** `admin` role only

**Headers:** `Authorization: Bearer <access_token>`

**Path Params:** `id` — restaurant ID

**Request Body:** _(none)_

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "restaurantId": 1,
    "approvalStatus": "approved"
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 404 | `NOT_FOUND` | Restaurant not found |

---

### POST /admin/agents/:id/approve

Approve a pending delivery agent account.

**Access:** `admin` role only

**Headers:** `Authorization: Bearer <access_token>`

**Path Params:** `id` — user ID of the delivery agent

**Request Body:** _(none)_

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "agentId": 7,
    "status": "active"
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 404 | `NOT_FOUND` | Agent not found |

---

### GET /admin/analytics

Get platform analytics for a specified date range.

**Access:** `admin` role only

**Headers:** `Authorization: Bearer <access_token>`

**Query Params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| from | string (ISO date) | yes | e.g. `2026-01-01` |
| to | string (ISO date) | yes | e.g. `2026-04-02` |

**Success Response — 200:**
```json
{
  "success": true,
  "data": {
    "totalOrders": 1240,
    "totalRevenue": 18450.75,
    "activeRestaurants": 34,
    "activeDeliveryAgents": 18,
    "dateRange": {
      "from": "2026-01-01",
      "to": "2026-04-02"
    }
  }
}
```

**Error Responses:**

| Status | Code | Reason |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Missing or invalid date range |

---

## Socket.IO Events

> Connect to: `ws://localhost:3000`
> Authentication: pass JWT in the handshake `auth` object.

**Connection:**
```js
const socket = io('http://localhost:3000', {
  auth: { token: '<access_token>' }
});
```

On connect, the server:
- Verifies the JWT (rejects with auth error if invalid)
- Joins the socket to room `user:<userId>`
- Delivery agents are also joined to room `delivery_agents`

---

### Customer Events (received)

#### `order_status_update`

Fired when an order's status changes.

```json
{
  "orderId": 101,
  "status": "confirmed",
  "updatedAt": "2026-04-02T12:05:00Z"
}
```

#### `delivery_location`

Fired when the delivery agent updates their location.

```json
{
  "orderId": 101,
  "lat": 37.7750,
  "lng": -122.4180,
  "updatedAt": "2026-04-02T12:30:00Z"
}
```

---

### Restaurant Owner Events (received)

#### `new_order`

Fired when a new order is placed at the restaurant.

```json
{
  "orderId": 101,
  "total": 19.97,
  "items": [
    { "name": "Classic Burger", "quantity": 2 },
    { "name": "Cola", "quantity": 1 }
  ],
  "createdAt": "2026-04-02T11:55:00Z"
}
```

---

### Delivery Agent Events (received)

#### `new_delivery_request`

Broadcast to all available delivery agents when an order is confirmed and ready for pickup.

```json
{
  "orderId": 101,
  "restaurantName": "Burger Palace",
  "restaurantLocation": { "lat": 37.7749, "lng": -122.4194 },
  "deliveryAddress": "123 Main St, Springfield"
}
```

---

## Error Codes Reference

| HTTP Status | Code | Description |
|---|---|---|
| 400 | `BAD_REQUEST` | Invalid business logic (non-cancellable order, cross-restaurant item, etc.) |
| 401 | `UNAUTHORIZED` | Missing, expired, or invalid JWT / wrong credentials |
| 403 | `FORBIDDEN` | Role mismatch at login, unverified account, wrong role for endpoint, ownership violation |
| 404 | `NOT_FOUND` | Requested resource does not exist |
| 409 | `CONFLICT` | Duplicate phone registration, order already assigned |
| 422 | `VALIDATION_ERROR` | Request body/params failed schema validation — includes per-field errors |
| 429 | `RATE_LIMITED` | Auth endpoint rate limit exceeded (100 req/min per IP) |
| 500 | `INTERNAL_ERROR` | Unhandled server error — details logged server-side only |

---

## Role Access Summary

| Endpoint Group | customer | restaurant_owner | delivery | admin | public |
|---|---|---|---|---|---|
| Auth (register, login, OTP, refresh) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Auth (logout) | ✓ | ✓ | ✓ | ✓ | — |
| User profile | ✓ | ✓ | ✓ | ✓ | — |
| Addresses | ✓ | — | — | — | — |
| Restaurants (list/detail) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Menu management | — | ✓ | — | — | — |
| Orders (create/cancel/list) | ✓ | — | — | — | — |
| Order status update | — | ✓ | ✓ | — | — |
| Delivery management | — | — | ✓ | — | — |
| Payments | ✓ | — | — | — | — |
| Notifications | ✓ | ✓ | ✓ | ✓ | — |
| Admin | — | — | — | ✓ | — |
