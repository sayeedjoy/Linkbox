-- AlterTable
ALTER TABLE "ApiToken" ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "tokenPrefix" TEXT,
ADD COLUMN     "tokenSuffix" TEXT;
