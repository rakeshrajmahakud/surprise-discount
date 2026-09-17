-- The Offer column was removed before SQLite reported the original migration
-- failure while dropping the indexed Redemption column.
DROP INDEX "Redemption_offerId_customerId_idx";
ALTER TABLE "Redemption" DROP COLUMN "customerId";