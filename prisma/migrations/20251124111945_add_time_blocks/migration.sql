-- CreateEnum
CREATE TYPE "TimeBlockType" AS ENUM ('DAY_OFF', 'VACATION', 'BREAK');

-- CreateTable
CREATE TABLE "time_blocks" (
    "id" TEXT NOT NULL,
    "type" "TimeBlockType" NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "time_blocks_startDateTime_endDateTime_idx" ON "time_blocks"("startDateTime", "endDateTime");

-- CreateIndex
CREATE INDEX "time_blocks_type_idx" ON "time_blocks"("type");
