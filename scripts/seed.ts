const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);
  const adminPassword = await bcrypt.hash('adminpassword', 10);

  // Original Admin (preserve existing logic)
  const originalAdmin = await prisma.user.upsert({
    where: { email: 'admin@monster.com' },
    update: {
      password: adminPassword,
      role: 'admin',
      is_approved: true,
    },
    create: {
      email: 'admin@monster.com',
      name: 'Admin Monster',
      password: adminPassword,
      role: 'admin',
      is_approved: true,
    },
  });

  // Test Admin (for E2E tests)
  const testAdmin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      password,
      role: 'admin',
      is_approved: true,
    },
    create: {
      email: 'admin@example.com',
      name: 'Test Admin',
      password,
      role: 'admin',
      is_approved: true,
    },
  });

  // Test User (for E2E tests)
  const testUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {
      password,
      role: 'user',
      is_approved: true,
    },
    create: {
      email: 'user@example.com',
      name: 'Test User',
      password,
      role: 'user',
      is_approved: true,
    },
  });

  // Seed Master Data for E2E tests
  const seedTemplate = await prisma.masterData.upsert({
    where: { id: 'seed-master-template-1' },
    update: {},
    create: {
      id: 'seed-master-template-1',
      type: 'template',
      name: 'Default Assessment Template',
      data: { version: 1, fields: ['leadership', 'communication'] },
      isActive: true,
    },
  });

  const seedCompetency = await prisma.masterData.upsert({
    where: { id: 'seed-master-competency-1' },
    update: {},
    create: {
      id: 'seed-master-competency-1',
      type: 'competency',
      name: 'Leadership Competency',
      data: { level: 'senior', skills: ['decision-making', 'team-building'] },
      isActive: true,
    },
  });

  const seedDictionary = await prisma.masterData.upsert({
    where: { id: 'seed-master-dictionary-1' },
    update: {},
    create: {
      id: 'seed-master-dictionary-1',
      type: 'dictionary',
      name: 'Assessment Dictionary',
      data: { terms: ['competency', 'assessment', 'evaluation'] },
      isActive: true,
    },
  });

  // Seed Project for E2E tests
  const seedProject = await prisma.project.upsert({
    where: { id: 'seed-project-1' },
    update: {},
    create: {
      id: 'seed-project-1',
      name: 'Seed Project Alpha',
      description: 'A seed project for E2E testing',
      configuration: { template: 'default' },
      status: 'active',
      createdById: testAdmin.id,
    },
  });

  // Seed Batch for E2E tests
  const seedBatch = await prisma.batch.upsert({
    where: { id: 'seed-batch-1' },
    update: {},
    create: {
      id: 'seed-batch-1',
      name: 'Batch 1',
      projectId: 'seed-project-1',
    },
  });

  // Seed Invitations for E2E tests
  const seedInvitationPending = await prisma.invitation.upsert({
    where: { id: 'seed-invitation-pending-1' },
    update: {},
    create: {
      id: 'seed-invitation-pending-1',
      batchId: 'seed-batch-1',
      email: 'participant1@example.com',
      name: 'Participant One',
      status: 'pending',
    },
  });

  const seedInvitationSent = await prisma.invitation.upsert({
    where: { id: 'seed-invitation-sent-1' },
    update: {},
    create: {
      id: 'seed-invitation-sent-1',
      batchId: 'seed-batch-1',
      email: 'participant2@example.com',
      name: 'Participant Two',
      status: 'sent',
      sentAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const seedInvitationExpired = await prisma.invitation.upsert({
    where: { id: 'seed-invitation-expired-1' },
    update: {},
    create: {
      id: 'seed-invitation-expired-1',
      batchId: 'seed-batch-1',
      email: 'participant3@example.com',
      name: 'Participant Three',
      status: 'expired',
      sentAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // Seed SubmitProject event
  const seedEvent = await prisma.domainEvent.upsert({
    where: { id: 'seed-event-submit-1' },
    update: {},
    create: {
      id: 'seed-event-submit-1',
      type: 'SubmitProject',
      projectId: 'seed-project-1',
      payload: { projectName: 'Seed Project Alpha', createdBy: testAdmin.id },
    },
  });

  console.log({
    originalAdmin,
    testAdmin,
    testUser,
    seedTemplate,
    seedCompetency,
    seedDictionary,
    seedProject,
    seedBatch,
    seedInvitationPending,
    seedInvitationSent,
    seedInvitationExpired,
    seedEvent,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
