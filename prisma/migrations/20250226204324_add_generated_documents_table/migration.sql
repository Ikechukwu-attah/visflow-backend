/*
  Warnings:

  - You are about to drop the column `predictedDocumentType` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "confidence" INTEGER,
ADD COLUMN     "fraudReasons" TEXT[],
ADD COLUMN     "predictedDocumentType" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "predictedDocumentType";

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "visaType" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedDocument_pdfPath_key" ON "GeneratedDocument"("pdfPath");

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
