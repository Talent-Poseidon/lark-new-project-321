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

  // Seed Kamus items for E2E tests
  const seedKamus1 = await prisma.kamus.upsert({
    where: { id: 'seed-kamus-1' },
    update: {},
    create: {
      id: 'seed-kamus-1',
      code: 'KMP-SEED-001',
      name: 'Berpikir Analitis',
      type: 'kompetensi',
      description: 'Kemampuan menganalisis masalah secara sistematis dan logis',
      behavioralIndicators: 'Mampu mengidentifikasi akar masalah; Menggunakan data untuk pengambilan keputusan',
      createdBy: testAdmin.id,
      updatedBy: testAdmin.id,
    },
  });

  const seedKamus2 = await prisma.kamus.upsert({
    where: { id: 'seed-kamus-2' },
    update: {},
    create: {
      id: 'seed-kamus-2',
      code: 'POT-SEED-001',
      name: 'Daya Tahan Stres',
      type: 'potensi',
      description: 'Kemampuan mengelola tekanan kerja dan tetap produktif',
      behavioralIndicators: 'Tetap tenang dalam situasi tekanan; Mampu memprioritaskan tugas',
      createdBy: testAdmin.id,
      updatedBy: testAdmin.id,
    },
  });

  const seedKamus3 = await prisma.kamus.upsert({
    where: { id: 'seed-kamus-3' },
    update: {},
    create: {
      id: 'seed-kamus-3',
      code: 'KMP-SEED-002',
      name: 'Kepemimpinan',
      type: 'kompetensi',
      description: 'Kemampuan memimpin dan mengarahkan tim',
      behavioralIndicators: 'Mampu memotivasi anggota tim; Mengambil keputusan strategis',
      createdBy: testAdmin.id,
      updatedBy: testAdmin.id,
    },
  });

  // Seed KamusSubmitted event for E2E tests
  const seedKamusEvent = await prisma.domainEvent.upsert({
    where: { id: 'seed-event-kamus-1' },
    update: {},
    create: {
      id: 'seed-event-kamus-1',
      type: 'KamusSubmitted',
      payload: { itemCount: 3, uploadedBy: testAdmin.id, timestamp: new Date().toISOString() },
    },
  });

  // Seed Standar Jabatan for E2E tests
  const seedStandar1 = await prisma.standarJabatan.upsert({
    where: { id: 'seed-standar-1' },
    update: {},
    create: {
      id: 'seed-standar-1',
      name: 'Manager IT',
      level: 'Senior',
      description: 'Standar kompetensi untuk posisi Manager IT',
      createdBy: testAdmin.id,
      updatedBy: testAdmin.id,
    },
  });

  // Seed StandarJabatan Kompetensi mappings
  await prisma.standarJabatanKompetensi.upsert({
    where: { id: 'seed-standar-komp-1' },
    update: {},
    create: {
      id: 'seed-standar-komp-1',
      standarJabatanId: 'seed-standar-1',
      kamusId: 'seed-kamus-1',
      expectedLevel: 4,
    },
  });

  await prisma.standarJabatanKompetensi.upsert({
    where: { id: 'seed-standar-komp-2' },
    update: {},
    create: {
      id: 'seed-standar-komp-2',
      standarJabatanId: 'seed-standar-1',
      kamusId: 'seed-kamus-3',
      expectedLevel: 5,
    },
  });

  const seedStandar2 = await prisma.standarJabatan.upsert({
    where: { id: 'seed-standar-2' },
    update: {},
    create: {
      id: 'seed-standar-2',
      name: 'Staff Administrasi',
      level: 'Junior',
      description: 'Standar kompetensi untuk posisi Staff Administrasi',
      createdBy: testAdmin.id,
      updatedBy: testAdmin.id,
    },
  });

  await prisma.standarJabatanKompetensi.upsert({
    where: { id: 'seed-standar-komp-3' },
    update: {},
    create: {
      id: 'seed-standar-komp-3',
      standarJabatanId: 'seed-standar-2',
      kamusId: 'seed-kamus-1',
      expectedLevel: 2,
    },
  });

  // Seed StandarSubmitted event
  const seedStandarEvent = await prisma.domainEvent.upsert({
    where: { id: 'seed-event-standar-1' },
    update: {},
    create: {
      id: 'seed-event-standar-1',
      type: 'StandarSubmitted',
      payload: { standarId: 'seed-standar-1', name: 'Manager IT', createdBy: testAdmin.id, timestamp: new Date().toISOString() },
    },
  });

  // Seed Scenario for E2E tests
  const seedScenario1 = await prisma.scenario.upsert({
    where: { id: 'seed-scenario-1' },
    update: {},
    create: {
      id: 'seed-scenario-1',
      name: 'Simulasi Presentasi',
      type: 'simulasi',
      description: 'Peserta melakukan presentasi topik yang ditentukan',
      duration: 30,
      instructions: 'Persiapkan presentasi selama 15 menit. Presentasi akan dilakukan di depan panel assessor.',
      createdBy: testAdmin.id,
      updatedBy: testAdmin.id,
    },
  });

  await prisma.scenarioKompetensi.upsert({
    where: { id: 'seed-scenario-komp-1' },
    update: {},
    create: {
      id: 'seed-scenario-komp-1',
      scenarioId: 'seed-scenario-1',
      kamusId: 'seed-kamus-1',
    },
  });

  await prisma.scenarioKompetensi.upsert({
    where: { id: 'seed-scenario-komp-2' },
    update: {},
    create: {
      id: 'seed-scenario-komp-2',
      scenarioId: 'seed-scenario-1',
      kamusId: 'seed-kamus-3',
    },
  });

  const seedScenario2 = await prisma.scenario.upsert({
    where: { id: 'seed-scenario-2' },
    update: {},
    create: {
      id: 'seed-scenario-2',
      name: 'Wawancara Kompetensi',
      type: 'wawancara',
      description: 'Wawancara terstruktur untuk mengukur kompetensi peserta',
      duration: 60,
      instructions: 'Assessor akan mengajukan pertanyaan berbasis kompetensi. Jawab berdasarkan pengalaman nyata.',
      createdBy: testAdmin.id,
      updatedBy: testAdmin.id,
    },
  });

  await prisma.scenarioKompetensi.upsert({
    where: { id: 'seed-scenario-komp-3' },
    update: {},
    create: {
      id: 'seed-scenario-komp-3',
      scenarioId: 'seed-scenario-2',
      kamusId: 'seed-kamus-2',
    },
  });

  // Seed ScenarioSubmitted event
  const seedScenarioEvent = await prisma.domainEvent.upsert({
    where: { id: 'seed-event-scenario-1' },
    update: {},
    create: {
      id: 'seed-event-scenario-1',
      type: 'ScenarioSubmitted',
      payload: { scenarioId: 'seed-scenario-1', name: 'Simulasi Presentasi', createdBy: testAdmin.id, timestamp: new Date().toISOString() },
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
    seedKamus1,
    seedKamus2,
    seedKamus3,
    seedKamusEvent,
    seedStandar1,
    seedStandar2,
    seedStandarEvent,
    seedScenario1,
    seedScenario2,
    seedScenarioEvent,
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
