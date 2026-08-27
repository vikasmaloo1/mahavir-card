ALTER TABLE "artworks" ADD COLUMN "artworkSlotId" uuid;--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN "artworkSlotKey" text DEFAULT 'MAIN' NOT NULL;--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_artworkSlotId_artwork_slots_id_fk" FOREIGN KEY ("artworkSlotId") REFERENCES "public"."artwork_slots"("id") ON DELETE set null ON UPDATE no action;