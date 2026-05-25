-- CreateEnum
CREATE TYPE "KanbanStatus" AS ENUM ('NAVBATDA', 'ISHDA', 'JAVOB_KUTILMOQDA', 'TEKSHIRUVDA', 'TASDIQLANGAN', 'BEKOR_QILINDI');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('YOUTUBE', 'TELEGRAM', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "ContentPlanStatus" AS ENUM ('REJALASHTIRILGAN', 'TAYYORLANOQDA', 'NASHR_QILINDI', 'BEKOR_QILINDI');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "kanban_status" "KanbanStatus" NOT NULL DEFAULT 'NAVBATDA';

-- CreateTable
CREATE TABLE "content_plans" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "planned_date" TIMESTAMP(3) NOT NULL,
    "status" "ContentPlanStatus" NOT NULL DEFAULT 'REJALASHTIRILGAN',
    "run_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_plans_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "content_plans" ADD CONSTRAINT "content_plans_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
