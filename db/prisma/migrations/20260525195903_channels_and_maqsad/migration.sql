-- CreateEnum
CREATE TYPE "Who" AS ENUM ('MEN', 'RAQIB');

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "channel_url" TEXT NOT NULL,
    "channel_name" TEXT NOT NULL,
    "who" "Who" NOT NULL,
    "subscribers" INTEGER NOT NULL DEFAULT 0,
    "views" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "videos_count" INTEGER NOT NULL DEFAULT 0,
    "last_sync" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maqsad" (
    "id" TEXT NOT NULL,
    "target_subscribers" INTEGER NOT NULL,
    "target_date" TIMESTAMP(3) NOT NULL,
    "main_channel_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maqsad_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "maqsad" ADD CONSTRAINT "maqsad_main_channel_id_fkey" FOREIGN KEY ("main_channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
