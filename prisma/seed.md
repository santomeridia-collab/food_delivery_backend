# Walkthrough - Prisma Database Seeding

So I have successfully added a Prisma database seeding script to populate database mock data for local development and testing.

## Changes Made

### 1. Created Seed Script

- **Role**: Drops all existing collections and populates mock data using Prisma Client and `bcryptjs` for password hashing. All users are seeded with the password `password123`.

## Seed Data Summary

The script populates:

1. **Users**:
   - **Customer**: `customer@example.com` (phone: `+1111111111`, name: `John Customer`)
   - **Restaurant Owner**: `owner@example.com` (phone: `+2222222222`, name: `Alice Restaurant Owner`)
   - **Delivery Agent**: `delivery@example.com` (phone: `+3333333333`, name: `Bob Rider`)
   - **Seller**: `seller@example.com` (phone: `+4444444444`, name: `Charlie Seller`)
   - **Admin**: `admin@example.com` (phone: `+5555555555`, name: `Admin User`)
2. **Addresses & Wallets**:
   - Sample delivery addresses for Customer and Restaurant Owner.
   - Customer Wallet with a balance of ₹500.00 and a log of initial wallet transactions.
3. **Delivery Agent Details**:
   - A registered vehicle (`Bike`), verified documents (`driving_license`, `aadhar_card`), and verified bank details.
4. **Restaurants & Menu Items**:
   - **Burger Palace**: Fast-food category featuring items like _Classic Cheeseburger_, _Crispy Veggie Delight_, _French Fries_, etc.
   - **Sushi Zen**: Asian/Japanese category featuring items like _Salmon Nigiri_, _California Roll_, and _Spicy Ramen_.
   - **Pizza Paradiso**: Italian category featuring items like _Classic Margherita Pizza_, _Farmhouse Pizza_, and _Garlic Breadsticks_.
5. **Grocery/Multi-Category Stores & Products**:
   - **Fresh & Fast Grocery**: Grocery store with _Organic Bananas_, _Fresh Whole Milk_, _Whole Wheat Brown Bread_, and _Tomatoes_.
   - **SuperMart Pharmacy**: Pharmacy store with _Paracetamol_ and _Multivitamin Supplements_.
6. **Promo Banners**:
   - 3 home screen banners promoting Burger Palace, grocery products, and medical supplies.
7. **Mock Orders & Delivery Tracking**:
   - **Order #1**: A completed food delivery order from _Burger Palace_ containing item items, completed payment via Razorpay, and completed delivery tracking logs by delivery agent _Bob Rider_.
   - **Order #2**: An active/pending food order from _Sushi Zen_ that has been accepted, marked as paid, and assigned to delivery agent _Bob Rider_.
   - **Order #3**: A completed grocery order from _Fresh & Fast Grocery_ paid using the customer's wallet.

## Verification

The database was successfully seeded. Below are the verified counts of seeded documents:

| Collection / Model     | Seeded Count |
| :--------------------- | :----------- |
| **Users**              | 5            |
| **Addresses**          | 3            |
| **Wallets**            | 1            |
| **Agent Vehicles**     | 1            |
| **Agent Documents**    | 2            |
| **Agent Bank Details** | 1            |
| **Restaurants**        | 3            |
| **Menu Items**         | 11           |
| **Stores**             | 2            |
| **Grocery Products**   | 6            |
| **Promo Banners**      | 3            |
| **Favorites**          | 1            |
| **Orders**             | 3            |
| **Order Items**        | 6            |
| **Payments**           | 3            |
| **Delivery Tracking**  | 3            |

All mock data is available for use. You can clear and re-seed the database at any time by running:

```powershell
npm run prisma:seed
```
