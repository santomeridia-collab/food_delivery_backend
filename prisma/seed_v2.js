'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function minutesAgo(n) {
  return new Date(Date.now() - n * 60 * 1000);
}

async function main() {
  console.log('🚀 Seeding comprehensive test data for all Delivery module routes (v2)...');

  // 1. Clear existing database collections
  console.log('🧹 Clearing existing database collections...');

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

  const customer1 = await prisma.user.create({
    data: {
      name: 'Sarah Connor',
      email: 'sarah@example.com',
      phone: '+919811111111',
      password: hashedPassword,
      role: 'customer',
      is_verified: true,
      status: 'active',
      approvalStatus: 'approved',
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      name: 'Michael Scott',
      email: 'michael@example.com',
      phone: '+919822222222',
      password: hashedPassword,
      role: 'customer',
      is_verified: true,
      status: 'active',
      approvalStatus: 'approved',
    },
  });

  const restaurantOwner = await prisma.user.create({
    data: {
      name: 'Chef Gordon',
      email: 'gordon@example.com',
      phone: '+919833333333',
      password: hashedPassword,
      role: 'restaurant_owner',
      is_verified: true,
      status: 'active',
      approvalStatus: 'approved',
    },
  });

  // Primary Delivery Agent for testing all delivery endpoints
  const deliveryAgent1 = await prisma.user.create({
    data: {
      name: 'David Express',
      email: 'david.rider@example.com',
      phone: '+919844444444',
      password: hashedPassword,
      role: 'delivery',
      is_verified: true,
      status: 'active',
      approvalStatus: 'approved',
    },
  });

  const deliveryAgent2 = await prisma.user.create({
    data: {
      name: 'Priya Fast',
      email: 'priya.rider@example.com',
      phone: '+919855555555',
      password: hashedPassword,
      role: 'delivery',
      is_verified: true,
      status: 'active',
      approvalStatus: 'approved',
    },
  });

  const seller = await prisma.user.create({
    data: {
      name: 'Elena Mart',
      email: 'elena@example.com',
      phone: '+919866666666',
      password: hashedPassword,
      role: 'seller',
      is_verified: true,
      status: 'active',
      approvalStatus: 'approved',
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'admin.v2@example.com',
      phone: '+919877777777',
      password: hashedPassword,
      role: 'admin',
      is_verified: true,
      status: 'active',
      approvalStatus: 'approved',
    },
  });

  console.log('✅ Users created.');

  // 4. Create Delivery Agent Profile Records (Vehicle, 5 Documents, Bank Details)
  console.log('🛵 Creating complete delivery agent profile records...');

  await prisma.agentVehicle.create({
    data: {
      agentId: deliveryAgent1.id,
      vehicleType: 'Scooter',
      vehicleNumber: 'MH-03-EK-9988',
      vehicleModel: 'TVS Ntorq 125',
      vehicleColor: 'Matte Red',
      insuranceExpiry: '2027-12-31',
      permitNumber: 'PERMIT-MH-2025',
      rcNumber: 'RC-9988776655',
    },
  });

  await prisma.agentDocument.createMany({
    data: [
      {
        agentId: deliveryAgent1.id,
        type: 'driving_license',
        fileUrl: 'https://example.com/docs/dl_david.pdf',
        status: 'verified',
        expiryDate: '2031-08-15',
      },
      {
        agentId: deliveryAgent1.id,
        type: 'vehicle_registration',
        fileUrl: 'https://example.com/docs/rc_david.pdf',
        status: 'verified',
        expiryDate: '2030-01-01',
      },
      {
        agentId: deliveryAgent1.id,
        type: 'insurance_certificate',
        fileUrl: 'https://example.com/docs/insurance_david.pdf',
        status: 'pending',
        expiryDate: '2027-12-31',
      },
      {
        agentId: deliveryAgent1.id,
        type: 'aadhar_card',
        fileUrl: 'https://example.com/docs/aadhar_david.pdf',
        status: 'verified',
      },
      {
        agentId: deliveryAgent1.id,
        type: 'pan_card',
        fileUrl: 'https://example.com/docs/pan_david.pdf',
        status: 'verified',
      },
    ],
  });

  await prisma.agentBankDetail.create({
    data: {
      agentId: deliveryAgent1.id,
      accountHolderName: 'David Express',
      bankName: 'ICICI Bank',
      accountNumber: '67891234567',
      ifscCode: 'ICIC0006789',
      upiId: 'david@icici',
      isVerified: true,
    },
  });

  console.log('✅ Delivery agent profile populated (Vehicle, 5 Documents, Bank Details).');

  // 5. Create Agent Sessions (for Online Hours and Online Status)
  console.log('⏱️ Creating agent online sessions...');

  // Completed session earlier today (3 hours = 180 mins)
  await prisma.agentSession.create({
    data: {
      agentId: deliveryAgent1.id,
      goOnlineAt: minutesAgo(300),
      goOfflineAt: minutesAgo(120),
      durationMinutes: 180,
    },
  });

  // Current Active open session (Agent is ONLINE)
  await prisma.agentSession.create({
    data: {
      agentId: deliveryAgent1.id,
      goOnlineAt: minutesAgo(60),
      goOfflineAt: null,
    },
  });

  console.log('✅ Agent sessions created (isOnline = true).');

  // 6. Create Restaurants & Menu Items
  console.log('🍔 Creating restaurants and menus...');

  const r1 = await prisma.restaurant.create({
    data: {
      name: 'Taco Fiesta',
      description: 'Sizzling Mexican Tacos, Loaded Burritos, and Spicy Nachos.',
      address: 'Shop 3, Versova Beach Road, Andheri West, Mumbai',
      email: 'hola@tacofiesta.com',
      phone: '+919988776601',
      cuisineType: 'Mexican, Fast Food',
      category: 'Mexican',
      imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=1000&auto=format&fit=crop',
      rating: 4.7,
      ratingCount: 310,
      deliveryTimeMin: 20,
      deliveryTimMax: 35,
      deliveryFee: 35,
      minOrderAmount: 150,
      latitude: 19.1310,
      longitude: 72.8120,
      isOpen: true,
      isFeatured: true,
      offerTag: 'Flat ₹100 OFF',
      approvalStatus: 'approved',
      ownerId: restaurantOwner.id,
    },
  });

  const r2 = await prisma.restaurant.create({
    data: {
      name: 'Dragon Wok Bar',
      description: 'Authentic Pan-Asian Dim Sums, Hakka Noodles, and Schezwan Delights.',
      address: 'Ground Floor, Infiniti Mall, Malad West, Mumbai',
      email: 'order@dragonwok.com',
      phone: '+919988776602',
      cuisineType: 'Chinese, Asian',
      category: 'Asian',
      imageUrl: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=1000&auto=format&fit=crop',
      rating: 4.6,
      ratingCount: 420,
      deliveryTimeMin: 25,
      deliveryTimMax: 40,
      deliveryFee: 40,
      minOrderAmount: 200,
      latitude: 19.1840,
      longitude: 72.8340,
      isOpen: true,
      isFeatured: true,
      offerTag: 'Free Spring Rolls',
      approvalStatus: 'approved',
      ownerId: restaurantOwner.id,
    },
  });

  const r3 = await prisma.restaurant.create({
    data: {
      name: 'Royal Biryani House',
      description: 'Slow-cooked Dum Biryanis, Succulent Kebabs, and Rich Mughlai Gravies.',
      address: 'Plot 45, S.V. Road, Khar West, Mumbai',
      email: 'royal@biryanihouse.com',
      phone: '+919988776603',
      cuisineType: 'Biryani, North Indian',
      category: 'Indian',
      imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop',
      bannerUrl: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=1000&auto=format&fit=crop',
      rating: 4.8,
      ratingCount: 890,
      deliveryTimeMin: 30,
      deliveryTimMax: 45,
      deliveryFee: 30,
      minOrderAmount: 250,
      latitude: 19.0700,
      longitude: 72.8380,
      isOpen: true,
      isFeatured: true,
      offerTag: '20% OFF on Hyderabadi Biryani',
      approvalStatus: 'approved',
      ownerId: restaurantOwner.id,
    },
  });

  const m1 = await prisma.menuItem.create({
    data: {
      restaurantId: r1.id,
      name: 'Loaded Chicken Tacos (3 Pcs)',
      description: 'Soft corn tortillas filled with grilled chicken and guacamole.',
      price: 279.0,
      category: 'Tacos',
      imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300&auto=format&fit=crop',
      isAvailable: true,
    },
  });

  const m2 = await prisma.menuItem.create({
    data: {
      restaurantId: r1.id,
      name: 'Cheesy Bean Burrito',
      description: 'Flour tortilla stuffed with Mexican rice and melted queso.',
      price: 229.0,
      category: 'Burritos',
      imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=300&auto=format&fit=crop',
      isAvailable: true,
    },
  });

  const m3 = await prisma.menuItem.create({
    data: {
      restaurantId: r2.id,
      name: 'Steamed Chicken Momos (8 Pcs)',
      description: 'Juicy chicken dumplings with spicy red chili sauce.',
      price: 189.0,
      category: 'Dim Sum',
      imageUrl: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=300&auto=format&fit=crop',
      isAvailable: true,
    },
  });

  const m4 = await prisma.menuItem.create({
    data: {
      restaurantId: r3.id,
      name: 'Hyderabadi Dum Chicken Biryani',
      description: 'Long-grain basmati rice cooked with tender chicken and saffron.',
      price: 349.0,
      category: 'Biryani',
      imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&auto=format&fit=crop',
      isAvailable: true,
    },
  });

  console.log('✅ Restaurants and menus created.');

  // 7. Create Mock Orders for Delivery Workflow
  console.log('📦 Creating mock orders (Available, Active, and History)...');

  // --------------------------------------------------------------------------
  // AVAILABLE ORDERS FOR PICKUP (`GET /delivery/orders/available`)
  // Status MUST be "CONFIRMED" and tracking MUST be null
  // --------------------------------------------------------------------------

  // Available Order 1
  const avail1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-AVAIL-101',
      userId: customer1.id,
      restaurantId: r1.id,
      status: 'CONFIRMED',
      totalAmount: 543.0,
      deliveryAddress: 'Tower A, Flat 1204, Horizon Heights, Lokhandwala, Andheri West, Mumbai - 400053',
      deliveryLat: 19.1363,
      deliveryLng: 72.8277,
      createdAt: minutesAgo(10),
      updatedAt: minutesAgo(5),
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: avail1.id,
      menuItemId: m1.id,
      quantity: 2,
      price: 279.0,
    },
  });

  // Available Order 2
  const avail2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-AVAIL-102',
      userId: customer2.id,
      restaurantId: r2.id,
      status: 'CONFIRMED',
      totalAmount: 229.0,
      deliveryAddress: 'Villa 7, Palm Grove Estate, Juhu Tara Road, Mumbai - 400049',
      deliveryLat: 19.1024,
      deliveryLng: 72.8262,
      createdAt: minutesAgo(7),
      updatedAt: minutesAgo(4),
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: avail2.id,
      menuItemId: m3.id,
      quantity: 1,
      price: 189.0,
    },
  });

  // Available Order 3
  const avail3 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-AVAIL-103',
      userId: customer1.id,
      restaurantId: r3.id,
      status: 'CONFIRMED',
      totalAmount: 379.0,
      deliveryAddress: 'Tower A, Flat 1204, Horizon Heights, Lokhandwala, Andheri West, Mumbai - 400053',
      deliveryLat: 19.1363,
      deliveryLng: 72.8277,
      createdAt: minutesAgo(2),
      updatedAt: minutesAgo(1),
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: avail3.id,
      menuItemId: m4.id,
      quantity: 1,
      price: 349.0,
    },
  });

  console.log('✅ 3 Available Orders for pickup created.');

  // --------------------------------------------------------------------------
  // ACTIVE DELIVERY (`GET /delivery/orders/active`)
  // Status MUST be "OUT_FOR_DELIVERY" with DeliveryTracking assigned to David Express
  // --------------------------------------------------------------------------

  const activeOrder = await prisma.order.create({
    data: {
      orderNumber: 'ORD-ACTIVE-201',
      userId: customer2.id,
      restaurantId: r1.id,
      status: 'OUT_FOR_DELIVERY',
      totalAmount: 508.0,
      deliveryAddress: 'Villa 7, Palm Grove Estate, Juhu Tara Road, Mumbai - 400049',
      deliveryLat: 19.1024,
      deliveryLng: 72.8262,
      createdAt: minutesAgo(30),
      updatedAt: minutesAgo(10),
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: activeOrder.id,
      menuItemId: m2.id,
      quantity: 2,
      price: 229.0,
    },
  });

  await prisma.deliveryTracking.create({
    data: {
      orderId: activeOrder.id,
      agentId: deliveryAgent1.id,
      riderName: String(deliveryAgent1.id),
      riderPhone: deliveryAgent1.phone,
      currentLat: 19.1150,
      currentLng: 72.8210,
      earnings: 45.0,
      deliveryFee: 35.0,
      distanceKm: 3.5,
      estimatedMinutes: 15,
      updatedAt: new Date(),
    },
  });

  console.log('✅ Active order created (ID: ' + activeOrder.id + ').');

  // --------------------------------------------------------------------------
  // DELIVERY HISTORY (`GET /delivery/orders/history`)
  // Completed deliveries (`status: "DELIVERED"`) for Dashboard stats and History
  // --------------------------------------------------------------------------

  // Delivery 1 (Completed Today)
  const hist1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-HIST-301',
      userId: customer1.id,
      restaurantId: r3.id,
      status: 'DELIVERED',
      totalAmount: 379.0,
      deliveryAddress: 'Tower A, Flat 1204, Horizon Heights, Lokhandwala, Andheri West, Mumbai - 400053',
      deliveryLat: 19.1363,
      deliveryLng: 72.8277,
      createdAt: minutesAgo(180),
      updatedAt: minutesAgo(150),
    },
  });

  await prisma.deliveryTracking.create({
    data: {
      orderId: hist1.id,
      agentId: deliveryAgent1.id,
      riderName: String(deliveryAgent1.id),
      riderPhone: deliveryAgent1.phone,
      currentLat: 19.1363,
      currentLng: 72.8277,
      earnings: 50.0,
      deliveryFee: 30.0,
      distanceKm: 4.2,
      estimatedMinutes: 22,
      completedAt: minutesAgo(150),
      updatedAt: minutesAgo(150),
    },
  });

  // Delivery 2 (Completed Today)
  const hist2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-HIST-302',
      userId: customer2.id,
      restaurantId: r2.id,
      status: 'DELIVERED',
      totalAmount: 229.0,
      deliveryAddress: 'Villa 7, Palm Grove Estate, Juhu Tara Road, Mumbai - 400049',
      deliveryLat: 19.1024,
      deliveryLng: 72.8262,
      createdAt: minutesAgo(120),
      updatedAt: minutesAgo(90),
    },
  });

  await prisma.deliveryTracking.create({
    data: {
      orderId: hist2.id,
      agentId: deliveryAgent1.id,
      riderName: String(deliveryAgent1.id),
      riderPhone: deliveryAgent1.phone,
      currentLat: 19.1024,
      currentLng: 72.8262,
      earnings: 40.0,
      deliveryFee: 40.0,
      distanceKm: 2.8,
      estimatedMinutes: 18,
      completedAt: minutesAgo(90),
      updatedAt: minutesAgo(90),
    },
  });

  console.log('✅ Delivery history records created.');

  console.log('\n🎉 Comprehensive database seeding complete!');
  console.log('📌 Test Credentials for Delivery Agent:');
  console.log('   Email: david.rider@example.com');
  console.log('   Phone: +919844444444');
  console.log('   Password: password123');
  console.log('   Active Order ID (for location/complete): ' + activeOrder.id);
  console.log('   Available Order IDs (for accept/reject): ' + avail1.id + ', ' + avail2.id + ', ' + avail3.id);
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
