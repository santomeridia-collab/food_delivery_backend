'use strict';

const prisma = require('../../config/db');

async function getOrCreateWallet(userId) {
  return prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0 },
    include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
}

async function getBalance(userId) {
  const wallet = await prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0 },
  });
  return { balance: wallet.balance };
}

async function getTransactions(userId, { page = 1, limit = 20 } = {}) {
  const wallet = await getOrCreateWallet(userId);
  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      skip, take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
  ]);
  return { balance: wallet.balance, transactions, total, page, limit };
}

module.exports = { getOrCreateWallet, getBalance, getTransactions };
