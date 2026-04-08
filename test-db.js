require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count()
  .then(c => { console.log('MongoDB connected! User count:', c); })
  .catch(e => { console.log('MongoDB error:', e.message.split('\n')[0]); })
  .finally(() => p.$disconnect());
