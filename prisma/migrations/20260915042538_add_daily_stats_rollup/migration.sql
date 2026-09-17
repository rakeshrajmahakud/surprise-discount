-- CreateTable
CREATE TABLE "DailyStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "orderValue" REAL NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "DailyStat_shop_date_idx" ON "DailyStat"("shop", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStat_shop_offerId_date_key" ON "DailyStat"("shop", "offerId", "date");
