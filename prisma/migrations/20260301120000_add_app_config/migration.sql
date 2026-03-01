-- CreateTable
CREATE TABLE "AppConfig" (
    "id" INTEGER NOT NULL,
    "publicSignupEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);
