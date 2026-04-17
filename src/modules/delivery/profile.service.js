'use strict';

const prisma = require('../../config/db');
const AppError = require('../../common/utils/AppError');

const DOCUMENT_TYPES = [
  'driving_license',
  'vehicle_registration',
  'insurance_certificate',
  'aadhar_card',
  'pan_card',
];

// ─── Vehicle ──────────────────────────────────────────────────────────────────

async function getVehicle(agentId) {
  return prisma.agentVehicle.findUnique({ where: { agentId } });
}

async function upsertVehicle(agentId, data) {
  return prisma.agentVehicle.upsert({
    where: { agentId },
    update: data,
    create: { agentId, ...data },
  });
}

// ─── Documents ────────────────────────────────────────────────────────────────

async function getDocuments(agentId) {
  const existing = await prisma.agentDocument.findMany({ where: { agentId } });

  // Return all 5 document types, filling in defaults for missing ones
  return DOCUMENT_TYPES.map((type) => {
    const doc = existing.find((d) => d.type === type);
    return doc || { agentId, type, fileUrl: null, status: 'not_uploaded', expiryDate: null };
  });
}

async function upsertDocument(agentId, type, data) {
  if (!DOCUMENT_TYPES.includes(type)) {
    throw new AppError(400, 'INVALID_TYPE', `Invalid document type: ${type}`);
  }

  const existing = await prisma.agentDocument.findFirst({ where: { agentId, type } });

  if (existing) {
    return prisma.agentDocument.update({
      where: { id: existing.id },
      data: { ...data, status: 'pending' },
    });
  }

  return prisma.agentDocument.create({
    data: { agentId, type, status: 'pending', ...data },
  });
}

// ─── Bank Details ─────────────────────────────────────────────────────────────

async function getBankDetail(agentId) {
  return prisma.agentBankDetail.findUnique({ where: { agentId } });
}

async function upsertBankDetail(agentId, data) {
  return prisma.agentBankDetail.upsert({
    where: { agentId },
    update: { ...data, isVerified: false }, // re-verify on update
    create: { agentId, ...data },
  });
}

// ─── Full profile (all tabs) ──────────────────────────────────────────────────

async function getFullProfile(agentId) {
  const [vehicle, documents, bank] = await Promise.all([
    getVehicle(agentId),
    getDocuments(agentId),
    getBankDetail(agentId),
  ]);
  return { vehicle, documents, bank };
}

module.exports = { getVehicle, upsertVehicle, getDocuments, upsertDocument, getBankDetail, upsertBankDetail, getFullProfile };
