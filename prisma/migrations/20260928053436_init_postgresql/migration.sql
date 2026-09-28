-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountMethod" TEXT NOT NULL DEFAULT 'coupon',
    "discountValue" DOUBLE PRECISION NOT NULL,
    "appliesTo" TEXT NOT NULL,
    "productIds" TEXT NOT NULL DEFAULT '[]',
    "collectionIds" TEXT NOT NULL DEFAULT '[]',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalUsageLimit" INTEGER,
    "combinesWithOther" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "shopifyPriceRuleId" TEXT,
    "shopifyDiscountCodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "orderValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStat" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Offer_shop_status_idx" ON "Offer"("shop", "status");

-- CreateIndex
CREATE INDEX "Redemption_createdAt_idx" ON "Redemption"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Redemption_offerId_orderId_key" ON "Redemption"("offerId", "orderId");

-- CreateIndex
CREATE INDEX "DailyStat_shop_date_idx" ON "DailyStat"("shop", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStat_shop_offerId_date_key" ON "DailyStat"("shop", "offerId", "date");

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
