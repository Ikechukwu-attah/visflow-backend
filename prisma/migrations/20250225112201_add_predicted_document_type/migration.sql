/*
  Warnings:

  - A unique constraint covering the columns `[filePath]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "predictedDocumentType" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Document_filePath_key" ON "Document"("filePath");
