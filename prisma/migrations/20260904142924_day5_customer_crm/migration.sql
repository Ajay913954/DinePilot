-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "dietaryPreference" TEXT,
ADD COLUMN     "isVip" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "preferredSeating" TEXT,
ADD COLUMN     "specialOccasion" TEXT;

-- CreateTable
CREATE TABLE "CustomerTag" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerTagAssignment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerTagAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerTag_restaurantId_idx" ON "CustomerTag"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTag_restaurantId_name_key" ON "CustomerTag"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "CustomerTagAssignment_customerId_idx" ON "CustomerTagAssignment"("customerId");

-- CreateIndex
CREATE INDEX "CustomerTagAssignment_tagId_idx" ON "CustomerTagAssignment"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTagAssignment_customerId_tagId_key" ON "CustomerTagAssignment"("customerId", "tagId");

-- CreateIndex
CREATE INDEX "Customer_restaurantId_name_idx" ON "Customer"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "Customer_restaurantId_email_idx" ON "Customer"("restaurantId", "email");

-- CreateIndex
CREATE INDEX "Customer_isVip_idx" ON "Customer"("isVip");

-- AddForeignKey
ALTER TABLE "CustomerTag" ADD CONSTRAINT "CustomerTag_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerTagAssignment" ADD CONSTRAINT "CustomerTagAssignment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerTagAssignment" ADD CONSTRAINT "CustomerTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CustomerTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
