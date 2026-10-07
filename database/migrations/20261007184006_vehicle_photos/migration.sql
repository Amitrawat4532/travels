-- AlterEnum
ALTER TYPE "VehicleType" ADD VALUE 'MINI_BUS';

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "photoKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];
