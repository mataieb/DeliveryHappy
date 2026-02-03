-- AlterEnum: Add new order statuses
-- This migration adds IN_KITCHEN and IN_DELIVERY statuses while preserving existing data

-- Step 1: Create new enum type with all statuses
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'IN_KITCHEN', 'IN_DELIVERY', 'DELIVERED', 'PAID', 'CANCELLED');

-- Step 2: Alter the Order table to use the new enum (with default mapping)
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"OrderStatus_new";

-- Step 3: Drop the old enum type
DROP TYPE "OrderStatus";

-- Step 4: Rename the new enum type to the original name
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
