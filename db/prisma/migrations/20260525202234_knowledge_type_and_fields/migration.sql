-- CreateEnum
CREATE TYPE "KnowledgeType" AS ENUM ('HUJJAT', 'RASM', 'STIL_REFERENS');

-- AlterTable
ALTER TABLE "knowledge_items" ADD COLUMN     "summary" TEXT,
ADD COLUMN     "type" "KnowledgeType" NOT NULL DEFAULT 'HUJJAT',
ADD COLUMN     "visible_to" TEXT[] DEFAULT ARRAY[]::TEXT[];
