-- CreateTable
CREATE TABLE "channel_snapshots" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "subscribers" INTEGER NOT NULL,
    "views" DOUBLE PRECISION NOT NULL,
    "videos_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_snapshots_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "channel_snapshots" ADD CONSTRAINT "channel_snapshots_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
