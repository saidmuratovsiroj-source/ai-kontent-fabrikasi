-- CreateEnum
CREATE TYPE "IdeaPriority" AS ENUM ('YUQORI', 'ORTA', 'PAST');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('YANGI', 'REJALASHTIRILDI', 'AMALGA_OSHIRILDI');

-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "project_id" TEXT;

-- AlterTable
ALTER TABLE "knowledge_items" ADD COLUMN     "project_id" TEXT;

-- AlterTable
ALTER TABLE "runs" ADD COLUMN     "project_id" TEXT;

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '📁',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ideas" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "platform" "Platform" NOT NULL DEFAULT 'YOUTUBE',
    "priority" "IdeaPriority" NOT NULL DEFAULT 'ORTA',
    "status" "IdeaStatus" NOT NULL DEFAULT 'YANGI',
    "project_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_folders" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "script" TEXT,
    "report" TEXT,
    "thumbnail" TEXT,
    "plan" TEXT,
    "project_id" TEXT,
    "run_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_folders_run_id_key" ON "video_folders"("run_id");

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_folders" ADD CONSTRAINT "video_folders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_folders" ADD CONSTRAINT "video_folders_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
