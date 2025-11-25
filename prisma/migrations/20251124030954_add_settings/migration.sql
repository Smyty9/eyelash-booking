-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "workStartHour" INTEGER NOT NULL DEFAULT 10,
    "workEndHour" INTEGER NOT NULL DEFAULT 18,
    "timeSlotIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);
