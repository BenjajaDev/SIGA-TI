-- CreateTable
CREATE TABLE "brand_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "institutionName" VARCHAR(80) NOT NULL,
    "primaryColor" CHAR(7) NOT NULL,
    "secondaryColor" CHAR(7) NOT NULL,
    "gradientAngle" INTEGER NOT NULL,
    "logoDataUrl" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "brand_settings_pkey" PRIMARY KEY ("id")
);
