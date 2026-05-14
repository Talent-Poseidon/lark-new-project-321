-- CreateTable
CREATE TABLE "StandarJabatan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "StandarJabatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandarJabatanKompetensi" (
    "id" TEXT NOT NULL,
    "standarJabatanId" TEXT NOT NULL,
    "kamusId" TEXT NOT NULL,
    "expectedLevel" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "StandarJabatanKompetensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "instructions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioKompetensi" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "kamusId" TEXT NOT NULL,

    CONSTRAINT "ScenarioKompetensi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StandarJabatan_name_key" ON "StandarJabatan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StandarJabatanKompetensi_standarJabatanId_kamusId_key" ON "StandarJabatanKompetensi"("standarJabatanId", "kamusId");

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_name_key" ON "Scenario"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioKompetensi_scenarioId_kamusId_key" ON "ScenarioKompetensi"("scenarioId", "kamusId");

-- AddForeignKey
ALTER TABLE "StandarJabatanKompetensi" ADD CONSTRAINT "StandarJabatanKompetensi_standarJabatanId_fkey" FOREIGN KEY ("standarJabatanId") REFERENCES "StandarJabatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandarJabatanKompetensi" ADD CONSTRAINT "StandarJabatanKompetensi_kamusId_fkey" FOREIGN KEY ("kamusId") REFERENCES "Kamus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioKompetensi" ADD CONSTRAINT "ScenarioKompetensi_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioKompetensi" ADD CONSTRAINT "ScenarioKompetensi_kamusId_fkey" FOREIGN KEY ("kamusId") REFERENCES "Kamus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
