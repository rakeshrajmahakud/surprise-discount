-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" REAL NOT NULL,
    "appliesTo" TEXT NOT NULL,
    "productIds" TEXT NOT NULL DEFAULT '[]',
    "collectionIds" TEXT NOT NULL DEFAULT '[]',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "usageLimitPerCustomer" INTEGER NOT NULL DEFAULT 1,
    "totalUsageLimit" INTEGER,
    "combinesWithOther" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "shopifyPriceRuleId" TEXT,
    "shopifyDiscountCodeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "offerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "discountAmount" REAL NOT NULL,
    "orderValue" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Redemption_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Offer_shop_status_idx" ON "Offer"("shop", "status");

-- CreateIndex
CREATE INDEX "Redemption_offerId_customerId_idx" ON "Redemption"("offerId", "customerId");

-- CreateIndex
CREATE INDEX "Redemption_createdAt_idx" ON "Redemption"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Redemption_offerId_orderId_key" ON "Redemption"("offerId", "orderId");
