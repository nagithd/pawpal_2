-- Create stories table
CREATE TABLE IF NOT EXISTS "public"."stories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "media_url" "text" NOT NULL,
    "media_type" "text" DEFAULT 'image' NOT NULL,
    "caption" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + interval '24 hours') NOT NULL,
    CONSTRAINT "stories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "stories_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE,
    CONSTRAINT "stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

-- Create story_views table
CREATE TABLE IF NOT EXISTS "public"."story_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "story_id" "uuid" NOT NULL,
    "viewer_user_id" "uuid" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "story_views_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "story_views_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE,
    CONSTRAINT "story_views_viewer_user_id_fkey" FOREIGN KEY ("viewer_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "story_views_story_id_viewer_user_id_key" UNIQUE ("story_id", "viewer_user_id")
);

-- Enable RLS
ALTER TABLE "public"."stories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."story_views" ENABLE ROW LEVEL SECURITY;

-- Stories policies
CREATE POLICY "Anyone can view active stories" ON "public"."stories"
    FOR SELECT USING (expires_at > now());

CREATE POLICY "Users can insert own stories" ON "public"."stories"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" ON "public"."stories"
    FOR DELETE USING (auth.uid() = user_id);

-- Story views policies
CREATE POLICY "Anyone can view story_views" ON "public"."story_views"
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own views" ON "public"."story_views"
    FOR INSERT WITH CHECK (auth.uid() = viewer_user_id);

-- Storage bucket for stories
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view stories storage" ON storage.objects
    FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "Authenticated users can upload stories" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own story files" ON storage.objects
    FOR DELETE USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);
