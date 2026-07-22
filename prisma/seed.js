'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log(' Starting database seeding...');

  // 1. Clear existing data
  console.log(' Clearing existing database collections...');

  await prisma.orderRequest.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.deliveryTracking.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.searchHistory.deleteMany({});
  await prisma.banner.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.restaurant.deleteMany({});
  await prisma.groceryProduct.deleteMany({});
  await prisma.store.deleteMany({});
  await prisma.agentSession.deleteMany({});
  await prisma.agentVehicle.deleteMany({});
  await prisma.agentDocument.deleteMany({});
  await prisma.agentBankDetail.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.oTP.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✅ Database cleared.');

  // 2. Create Password Hash
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 3. Create Users
  console.log('👥 Creating mock users...');

  const customer = await prisma.user.create({
    data: {
      name: 'John Customer',
      email: 'customer@example.com',
      phone: '+1111111111',
      password: hashedPassword,
      role: 'customer',
      is_verified: true,
      status: 'active',
      approvalStatus: 'approved',
    },
  });

  const restaurantOwner = await prisma.user.create({
    data: {
      name: 'Alice Restaurant Owner',
      email: 'owner@example.com',
      phone: '+2222222222',
      password: hashedPassword,
      role: 'restaurant_owner',
      is_verified: true,
      status: 'active',
      approvalStatus: 'approved',
    },
  });

  const deliveryAgent = await prisma.user.create({
    data: {
      name: 'Bob Rider',
      email: 'delivery@example.com',
      phone: '+3333333333',
      password: hashedPassword,
      role: 'delivery',
      is_verified: true,
      status: 'active',
      approvalStatus: 'approved',
    },
  });

  const seller = await prisma.user.create({
    data: {
      name: 'Charlie Seller',
      email: 'seller@example.com',
      phone: '+4444444444',
      password: hashedPassword,
      role: 'seller',
      is_verified: true,
      status: 'active',
      approvalStatus: 'approved',
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      phone: '+5555555555',
      password: hashedPassword,
      role: 'admin',
      is_verified: true,
      status: 'active',
      approvalStatus: 'approved',
    },
  });

  console.log('✅ Users created.');

  // 4. Create Addresses
  console.log('📍 Creating addresses...');

  const customerAddress1 = await prisma.address.create({
    data: {
      userId: customer.id,
      line1: 'Flat 402, Sunshine Apartments',
      line2: 'Park Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      latitude: 19.0760,
      longitude: 72.8777,
    },
  });

  const customerAddress2 = await prisma.address.create({
    data: {
      userId: customer.id,
      line1: 'Building No. 12, Sector 4',
      line2: 'Hiranandani Meadows',
      city: 'Thane',
      state: 'Maharashtra',
      pincode: '400610',
      latitude: 19.2183,
      longitude: 72.9781,
    },
  });

  const ownerAddress = await prisma.address.create({
    data: {
      userId: restaurantOwner.id,
      line1: '12 Main Road, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      latitude: 19.0607,
      longitude: 72.8362,
    },
  });

  console.log('✅ Addresses created.');

  // 5. Create Wallets
  console.log(' Creating user wallets...');

  const customerWallet = await prisma.wallet.create({
    data: {
      userId: customer.id,
      balance: 500.0,
    },
  });

  await prisma.walletTransaction.createMany({
    data: [
      {
        walletId: customerWallet.id,
        type: 'credit',
        amount: 1000.0,
        description: 'Initial deposit via UPI',
      },
      {
        walletId: customerWallet.id,
        type: 'debit',
        amount: 500.0,
        description: 'Payment for order #1003',
      },
    ],
  });

  console.log('✅ Wallets created.');

  // 6. Create Delivery Agent Details
  console.log(' Creating delivery agent details...');

  await prisma.agentVehicle.create({
    data: {
      agentId: deliveryAgent.id,
      vehicleType: 'Bike',
      vehicleNumber: 'MH-02-CD-5678',
      vehicleModel: 'Hero Splendor Plus',
      vehicleColor: 'Black',
    },
  });

  await prisma.agentDocument.createMany({
    data: [
      {
        agentId: deliveryAgent.id,
        type: 'driving_license',
        fileUrl: 'https://example.com/documents/dl_bob.pdf',
        status: 'verified',
        expiryDate: '2030-12-31',
      },
      {
        agentId: deliveryAgent.id,
        type: 'aadhar_card',
        fileUrl: 'https://example.com/documents/aadhar_bob.pdf',
        status: 'verified',
      },
    ],
  });

  await prisma.agentBankDetail.create({
    data: {
      agentId: deliveryAgent.id,
      accountHolderName: 'Bob Rider',
      bankName: 'State Bank of India',
      accountNumber: '32109876543',
      ifscCode: 'SBIN0001234',
      upiId: 'bob.rider@sbi',
      isVerified: true,
    },
  });

  console.log('✅ Delivery agent details created.');

  // 7. Create Restaurants & Menu Items
  console.log(' Creating restaurants and menu items...');

  const r1 = await prisma.restaurant.create({
    data: {
      name: 'Burger Palace',
      description: 'Juicy customized burgers, crispy fries, and premium thick milkshakes.',
      address: 'Shop 5, Link Square Mall, Bandra West, Mumbai',
      email: 'contact@burgerpalace.com',
      phone: '+919999999901',
      cuisineType: 'Burgers, Fast Food',
      category: 'Fast Food',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1000&auto=format&fit=crop',
      rating: 4.5,
      ratingCount: 180,
      deliveryTimeMin: 15,
      deliveryTimMax: 30,
      deliveryFee: 39,
      minOrderAmount: 100,
      latitude: 19.0620,
      longitude: 72.8340,
      isOpen: true,
      isFeatured: true,
      offerTag: 'Flat 50% OFF',
      approvalStatus: 'approved',
      ownerId: restaurantOwner.id,
      workingHours: {
        monday: { open: '10:00', close: '23:00' },
        tuesday: { open: '10:00', close: '23:00' },
        wednesday: { open: '10:00', close: '23:00' },
        thursday: { open: '10:00', close: '23:00' },
        friday: { open: '10:00', close: '23:00' },
        saturday: { open: '10:00', close: '00:00' },
        sunday: { open: '10:00', close: '00:00' },
      },
    },
  });

  const r2 = await prisma.restaurant.create({
    data: {
      name: 'Sushi Zen',
      description: 'Authentic Japanese Sushi, Sashimi, and flavorful Tonkotsu Ramen.',
      address: '2nd Floor, Phoenix Palladium, Lower Parel, Mumbai',
      email: 'info@sushizen.com',
      phone: '+919999999902',
      cuisineType: 'Japanese, Sushi, Seafood',
      category: 'Asian',
      imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=1000&auto=format&fit=crop',
      rating: 4.8,
      ratingCount: 95,
      deliveryTimeMin: 30,
      deliveryTimMax: 50,
      deliveryFee: 49,
      minOrderAmount: 250,
      latitude: 19.0010,
      longitude: 72.8250,
      isOpen: true,
      isFeatured: true,
      offerTag: 'Free Delivery above ₹500',
      approvalStatus: 'approved',
      ownerId: restaurantOwner.id,
      workingHours: {
        all: { open: '12:00', close: '23:00' },
      },
    },
  });

  const r3 = await prisma.restaurant.create({
    data: {
      name: 'Pizza Paradiso',
      description: 'Traditional wood-fired Italian pizzas and handcrafted pastas.',
      address: 'Hiranandani Business Park, Powai, Mumbai',
      email: 'hello@pizzaparadiso.com',
      phone: '+919999999903',
      cuisineType: 'Italian, Pizza, Pasta',
      category: 'Italian',
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=1000&auto=format&fit=crop',
      rating: 4.2,
      ratingCount: 240,
      deliveryTimeMin: 20,
      deliveryTimMax: 40,
      deliveryFee: 29,
      minOrderAmount: 150,
      latitude: 19.1170,
      longitude: 72.9060,
      isOpen: true,
      isFeatured: false,
      offerTag: '20% OFF on Margherita',
      approvalStatus: 'approved',
      ownerId: restaurantOwner.id,
      workingHours: {
        all: { open: '11:00', close: '23:00' },
      },
    },
  });

  // Menu items for Burger Palace
  const m1 = await prisma.menuItem.create({
    data: {
      restaurantId: r1.id,
      name: 'Classic Cheeseburger',
      description: 'Flame-grilled tender beef patty, double melted cheddar cheese, pickles, and house sauce on a toasted brioche bun.',
      price: 189.0,
      originalPrice: 249.0,
      category: 'Burgers',
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop',
      prepTimeMin: 12,
      rating: 4.6,
      soldCount: 520,
      isAvailable: true,
    },
  });

  const m2 = await prisma.menuItem.create({
    data: {
      restaurantId: r1.id,
      name: 'Crispy Veggie Delight',
      description: 'Crispy vegetable patty, lettuce, tomatoes, sliced onions, and mayonnaise sauce.',
      price: 129.0,
      originalPrice: 159.0,
      category: 'Burgers',
      imageUrl: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=300&auto=format&fit=crop',
      prepTimeMin: 10,
      rating: 4.3,
      soldCount: 340,
      isAvailable: true,
    },
  });

  const m3 = await prisma.menuItem.create({
    data: {
      restaurantId: r1.id,
      name: 'Spicy Chicken Zinger',
      description: 'Crispy double-breaded chicken breast fillet topped with spicy mayo and shredded lettuce.',
      price: 219.0,
      category: 'Burgers',
      imageUrl: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=300&auto=format&fit=crop',
      prepTimeMin: 15,
      rating: 4.7,
      soldCount: 410,
      isAvailable: true,
    },
  });

  const m4 = await prisma.menuItem.create({
    data: {
      restaurantId: r1.id,
      name: 'Salted French Fries',
      description: 'Golden, crispy, thinly cut potato fries tossed in salt.',
      price: 89.0,
      category: 'Sides',
      imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=300&auto=format&fit=crop',
      prepTimeMin: 8,
      rating: 4.4,
      soldCount: 890,
      isAvailable: true,
    },
  });

  const m5 = await prisma.menuItem.create({
    data: {
      restaurantId: r1.id,
      name: 'Double Chocolate Milkshake',
      description: 'Rich Belgian chocolate blended with creamy ice cream, topped with chocolate shavings.',
      price: 149.0,
      originalPrice: 189.0,
      category: 'Beverages',
      imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=300&auto=format&fit=crop',
      prepTimeMin: 8,
      rating: 4.5,
      soldCount: 230,
      isAvailable: true,
    },
  });

  // Menu items for Sushi Zen
  const m6 = await prisma.menuItem.create({
    data: {
      restaurantId: r2.id,
      name: 'Salmon Nigiri (4 Pcs)',
      description: 'Slices of premium fresh raw salmon served over hand-pressed vinegared sushi rice.',
      price: 349.0,
      category: 'Sushi',
      imageUrl: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=300&auto=format&fit=crop',
      prepTimeMin: 15,
      rating: 4.9,
      soldCount: 150,
      isAvailable: true,
    },
  });

  const m7 = await prisma.menuItem.create({
    data: {
      restaurantId: r2.id,
      name: 'California Roll (8 Pcs)',
      description: 'Classic inside-out sushi roll with crab stick, ripe avocado, cucumber, and orange tobiko (fish roe).',
      price: 399.0,
      category: 'Sushi',
      imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&auto=format&fit=crop',
      prepTimeMin: 18,
      rating: 4.7,
      soldCount: 220,
      isAvailable: true,
    },
  });

  const m8 = await prisma.menuItem.create({
    data: {
      restaurantId: r2.id,
      name: 'Spicy Ramen (Chicken)',
      description: 'Flavorful, rich pork-free ramen broth topped with grilled chicken, bamboo shoots, soft-boiled egg, and nori.',
      price: 449.0,
      originalPrice: 499.0,
      category: 'Ramen',
      imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300&auto=format&fit=crop',
      prepTimeMin: 20,
      rating: 4.8,
      soldCount: 180,
      isAvailable: true,
    },
  });

  // Menu items for Pizza Paradiso
  const m9 = await prisma.menuItem.create({
    data: {
      restaurantId: r3.id,
      name: 'Classic Margherita Pizza (Medium)',
      description: 'San Marzano tomato sauce, fresh mozzarella cheese, extra virgin olive oil, and fresh basil leaves.',
      price: 249.0,
      originalPrice: 299.0,
      category: 'Pizzas',
      imageUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=300&auto=format&fit=crop',
      prepTimeMin: 15,
      rating: 4.4,
      soldCount: 650,
      isAvailable: true,
    },
  });

  const m10 = await prisma.menuItem.create({
    data: {
      restaurantId: r3.id,
      name: 'Farmhouse Pizza (Medium)',
      description: 'Delightful combination of fresh onions, crisp capsicum, juicy tomatoes, and sliced mushrooms.',
      price: 349.0,
      category: 'Pizzas',
      imageUrl: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=300&auto=format&fit=crop',
      prepTimeMin: 15,
      rating: 4.5,
      soldCount: 480,
      isAvailable: true,
    },
  });

  const m11 = await prisma.menuItem.create({
    data: {
      restaurantId: r3.id,
      name: 'Garlic Breadsticks with Cheese',
      description: 'Freshly baked buttery breadsticks infused with garlic and stuffed with mozzarella cheese, served with dip.',
      price: 129.0,
      category: 'Sides',
      imageUrl: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?w=300&auto=format&fit=crop',
      prepTimeMin: 10,
      rating: 4.6,
      soldCount: 710,
      isAvailable: true,
    },
  });

  console.log('✅ Restaurants and menu items created.');

  // 8. Create Stores & Products
  console.log(' Creating grocery and other stores and products...');

  const s1 = await prisma.store.create({
    data: {
      ownerId: seller.id,
      storeType: 'GROCERY',
      name: 'Fresh & Fast Grocery',
      description: 'Your neighborhood daily store for organic veggies, fresh dairy, and grocery staples.',
      address: 'Shop 12, Ground Floor, Central Plaza, Bandra West, Mumbai',
      email: 'support@freshnfast.com',
      phone: '+919999999904',
      category: 'Supermarket',
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1000&auto=format&fit=crop',
      rating: 4.4,
      ratingCount: 140,
      deliveryFee: 25.0,
      minOrderAmount: 150.0,
      latitude: 19.0635,
      longitude: 72.8355,
      isOpen: true,
      isFeatured: true,
      offerTag: 'Daily Essentials Discount',
      approvalStatus: 'approved',
      workingHours: {
        all: { open: '08:00', close: '22:00' },
      },
    },
  });

  const s2 = await prisma.store.create({
    data: {
      ownerId: seller.id,
      storeType: 'OTHER',
      name: 'SuperMart Pharmacy',
      description: 'Licensed pharmacy offering prescription medicines, vitamins, first aid, and wellness products.',
      address: 'Shop 1A, Hill Road, Bandra West, Mumbai',
      email: 'pharmacy@supermart.com',
      phone: '+919999999905',
      category: 'Pharmacy',
      imageUrl: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=500&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1631549916768-4119b255f946?w=1000&auto=format&fit=crop',
      rating: 4.6,
      ratingCount: 65,
      deliveryFee: 35.0,
      minOrderAmount: 100.0,
      latitude: 19.0585,
      longitude: 72.8315,
      isOpen: true,
      isFeatured: false,
      offerTag: 'Genuine Medicines 24/7',
      approvalStatus: 'approved',
      workingHours: {
        all: { open: '00:00', close: '23:59' }, // 24 Hours
      },
    },
  });

  // Products for Grocery Store
  const p1 = await prisma.groceryProduct.create({
    data: {
      storeId: s1.id,
      name: 'Organic Cavendish Bananas',
      description: 'Sweet and nutritious yellow bananas, organically grown without chemical pesticides.',
      category: 'Fruits',
      brand: 'FreshFarm',
      price: 60.0,
      originalPrice: 80.0,
      unit: 'kg',
      quantity: 1.0,
      imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300&auto=format&fit=crop',
      stock: 120,
      isAvailable: true,
      rating: 4.5,
      ratingCount: 88,
      soldCount: 420,
    },
  });

  const p2 = await prisma.groceryProduct.create({
    data: {
      storeId: s1.id,
      name: 'Fresh Whole Milk (Pasteurized)',
      description: 'Pure, fresh cow milk rich in calcium and vitamins, packaged with hygiene safety.',
      category: 'Dairy & Eggs',
      brand: 'Amul',
      price: 32.0,
      unit: 'L',
      quantity: 0.5,
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop',
      stock: 80,
      isAvailable: true,
      rating: 4.7,
      ratingCount: 154,
      soldCount: 960,
    },
  });

  const p3 = await prisma.groceryProduct.create({
    data: {
      storeId: s1.id,
      name: 'Whole Wheat Brown Bread',
      description: 'Soft, high-fiber brown bread loaf made with 100% whole wheat grains.',
      category: 'Bakery',
      brand: 'Modern',
      price: 45.0,
      originalPrice: 50.0,
      unit: 'pcs',
      quantity: 1.0,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop',
      stock: 45,
      isAvailable: true,
      rating: 4.3,
      ratingCount: 65,
      soldCount: 310,
    },
  });

  const p4 = await prisma.groceryProduct.create({
    data: {
      storeId: s1.id,
      name: 'Farm Fresh Tomatoes (Local)',
      description: 'Plump, ripe red tomatoes locally sourced from sustainable farms.',
      category: 'Vegetables',
      brand: 'FreshFarm',
      price: 40.0,
      unit: 'kg',
      quantity: 1.0,
      imageUrl: 'https://images.unsplash.com/photo-1595855759920-86582396756a?w=300&auto=format&fit=crop',
      stock: 200,
      isAvailable: true,
      rating: 4.2,
      ratingCount: 120,
      soldCount: 780,
    },
  });

  // Products for Pharmacy Store
  const p5 = await prisma.groceryProduct.create({
    data: {
      storeId: s2.id,
      name: 'Paracetamol 650mg (Strip of 15 Tablets)',
      description: 'Used for temporary relief of fever, headache, body aches, and muscle pain.',
      category: 'Medicines',
      brand: 'Dolo',
      price: 30.0,
      unit: 'pcs',
      quantity: 15.0,
      imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop',
      stock: 500,
      isAvailable: true,
      rating: 4.8,
      ratingCount: 230,
      soldCount: 2200,
    },
  });

  const p6 = await prisma.groceryProduct.create({
    data: {
      storeId: s2.id,
      name: 'Multivitamin Supplements (30 Capsules)',
      description: 'Supports daily immunity, metabolism, and overall energy levels. Contains essential vitamins and minerals.',
      category: 'Vitamins & Supplements',
      brand: 'Revital',
      price: 180.0,
      originalPrice: 220.0,
      unit: 'pcs',
      quantity: 30.0,
      imageUrl: 'https://images.unsplash.com/photo-1616671276441-2f2c277b8bf4?w=300&auto=format&fit=crop',
      stock: 120,
      isAvailable: true,
      rating: 4.6,
      ratingCount: 78,
      soldCount: 340,
    },
  });

  console.log('✅ Stores and grocery products created.');

  // 9. Create Banners for Homepage
  console.log(' Creating promo banners...');

  await prisma.banner.createMany({
    data: [
      {
        title: '50% Off on Juicy Burgers!',
        imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop',
        linkType: 'restaurant',
        linkValue: r1.id,
        isActive: true,
        sortOrder: 1,
      },
      {
        title: 'Fresh Organic Groceries at Your Doorstep',
        imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop',
        linkType: 'category',
        linkValue: 'GROCERY',
        isActive: true,
        sortOrder: 2,
      },
      {
        title: 'Get 24/7 Essential Medical Supplies',
        imageUrl: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=800&auto=format&fit=crop',
        linkType: 'url',
        linkValue: 'https://example.com/pharmacy-rules',
        isActive: true,
        sortOrder: 3,
      },
    ],
  });

  console.log('✅ Promo banners created.');

  // 10. Create Favorites
  console.log('Creating user favorites...');

  await prisma.favorite.create({
    data: {
      userId: customer.id,
      restaurantId: r1.id,
    },
  });

  console.log('✅ Favorites created.');

  // 11. Create Orders
  console.log('📦 Creating mock orders and payments...');

  // Order 1: Completed Food Delivery Order
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-FOOD-001',
      userId: customer.id,
      restaurantId: r1.id,
      status: 'delivered',
      totalAmount: 467.0, // 2x m1 (189*2) + 1x m4 (89) + delivery fee (39) - discount / tax = 467.0
      deliveryAddress: 'Flat 402, Sunshine Apartments, Park Street, Mumbai - 400001',
      deliveryLat: 19.0760,
      deliveryLng: 72.8777,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      updatedAt: new Date(Date.now() - 23.5 * 60 * 60 * 1000),
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order1.id,
        menuItemId: m1.id,
        quantity: 2,
        price: 189.0,
      },
      {
        orderId: order1.id,
        menuItemId: m4.id,
        quantity: 1,
        price: 89.0,
      },
    ],
  });

  await prisma.payment.create({
    data: {
      orderId: order1.id,
      amount: 467.0,
      status: 'completed',
      method: 'razorpay',
      reference: 'pay_rzp_mock_001',
      razorpayOrderId: 'order_rzp_mock_001',
      razorpayPaymentId: 'pay_rzp_mock_001',
      razorpaySignature: 'sig_rzp_mock_001',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });

  await prisma.deliveryTracking.create({
    data: {
      orderId: order1.id,
      agentId: deliveryAgent.id,
      riderName: 'Bob Rider',
      riderPhone: '+3333333333',
      currentLat: 19.0760,
      currentLng: 72.8777,
      earnings: 45.0,
      deliveryFee: 39.0,
      distanceKm: 2.8,
      estimatedMinutes: 25,
      completedAt: new Date(Date.now() - 23.5 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 23.5 * 60 * 60 * 1000),
    },
  });

  // Order 2: Active (Accepted) Food Delivery Order
  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-FOOD-002',
      userId: customer.id,
      restaurantId: r2.id,
      status: 'accepted',
      totalAmount: 847.0, // m7 (399) + m8 (449) + delivery fee (49) - taxes etc. = 847.0
      deliveryAddress: 'Flat 402, Sunshine Apartments, Park Street, Mumbai - 400001',
      deliveryLat: 19.0760,
      deliveryLng: 72.8777,
      createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      updatedAt: new Date(Date.now() - 10 * 60 * 1000),
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order2.id,
        menuItemId: m7.id,
        quantity: 1,
        price: 399.0,
      },
      {
        orderId: order2.id,
        menuItemId: m8.id,
        quantity: 1,
        price: 449.0,
      },
    ],
  });

  await prisma.payment.create({
    data: {
      orderId: order2.id,
      amount: 847.0,
      status: 'completed',
      method: 'razorpay',
      reference: 'pay_rzp_mock_002',
      razorpayOrderId: 'order_rzp_mock_002',
      razorpayPaymentId: 'pay_rzp_mock_002',
      razorpaySignature: 'sig_rzp_mock_002',
      createdAt: new Date(Date.now() - 15 * 60 * 1000),
    },
  });

  await prisma.deliveryTracking.create({
    data: {
      orderId: order2.id,
      agentId: deliveryAgent.id,
      riderName: 'Bob Rider',
      riderPhone: '+3333333333',
      currentLat: 19.0010, // currently at Sushi Zen restaurant location
      currentLng: 72.8250,
      earnings: 55.0,
      deliveryFee: 49.0,
      distanceKm: 8.2,
      estimatedMinutes: 35,
      updatedAt: new Date(),
    },
  });

  // Order 3: Completed Grocery Order
  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-GROC-001',
      userId: customer.id,
      storeId: s1.id,
      status: 'delivered',
      totalAmount: 134.0, // 2x p2 (32*2) + 1x p3 (45) + delivery fee (25) = 134.0
      deliveryAddress: 'Flat 402, Sunshine Apartments, Park Street, Mumbai - 400001',
      deliveryLat: 19.0760,
      deliveryLng: 72.8777,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      updatedAt: new Date(Date.now() - 1.5 * 60 * 1000),
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order3.id,
        groceryProductId: p2.id,
        quantity: 2,
        price: 32.0,
      },
      {
        orderId: order3.id,
        groceryProductId: p3.id,
        quantity: 1,
        price: 45.0,
      },
    ],
  });

  await prisma.payment.create({
    data: {
      orderId: order3.id,
      amount: 134.0,
      status: 'completed',
      method: 'wallet',
      reference: 'pay_wallet_mock_001',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  });

  await prisma.deliveryTracking.create({
    data: {
      orderId: order3.id,
      agentId: deliveryAgent.id,
      riderName: 'Bob Rider',
      riderPhone: '+3333333333',
      currentLat: 19.0760,
      currentLng: 72.8777,
      earnings: 30.0,
      deliveryFee: 25.0,
      distanceKm: 1.5,
      estimatedMinutes: 15,
      completedAt: new Date(Date.now() - 1.5 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1.5 * 60 * 1000),
    },
  });

  console.log('✅ Orders and payments created.');

  console.log('🎉 Database seeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
