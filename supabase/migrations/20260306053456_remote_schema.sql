


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."accept_match_request"("request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_from_pet_id UUID;
  v_to_pet_id UUID;
  v_status TEXT;
BEGIN
  -- Lấy thông tin request
  SELECT from_pet_id, to_pet_id, status
  INTO v_from_pet_id, v_to_pet_id, v_status
  FROM match_requests
  WHERE id = request_id;
  
  -- Kiểm tra status
  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Match request already processed';
  END IF;
  
  -- Update status thành accepted
  UPDATE match_requests
  SET status = 'accepted', updated_at = NOW()
  WHERE id = request_id;
  
  -- Tạo match
  INSERT INTO matches (pet_1_id, pet_2_id)
  VALUES (
    LEAST(v_from_pet_id, v_to_pet_id),
    GREATEST(v_from_pet_id, v_to_pet_id)
  )
  ON CONFLICT DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."accept_match_request"("request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_match_request_on_like"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Chỉ tạo match request khi action = 'like'
  IF NEW.action = 'like' THEN
    -- Kiểm tra xem 2 pets có cùng owner không
    IF EXISTS (
      SELECT 1 FROM pets p1, pets p2
      WHERE p1.id = NEW.from_pet_id
        AND p2.id = NEW.to_pet_id
        AND p1.owner_id = p2.owner_id
    ) THEN
      -- Không cho match với pets cùng owner
      RETURN NEW;
    END IF;
    
    -- Tạo match request
    INSERT INTO match_requests (from_pet_id, to_pet_id, status)
    VALUES (NEW.from_pet_id, NEW.to_pet_id, 'pending')
    ON CONFLICT (from_pet_id, to_pet_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_match_request_on_like"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_match_last_message"("p_match_id" "uuid") RETURNS TABLE("id" "uuid", "sender_pet_id" "uuid", "content" "text", "image_url" "text", "is_read" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.sender_pet_id,
    m.content,
    m.image_url,
    m.is_read,
    m.created_at
  FROM messages m
  WHERE m.match_id = p_match_id
  ORDER BY m.created_at DESC
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_match_last_message"("p_match_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_online"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id
      AND last_active > NOW() - INTERVAL '5 minutes'
  );
END;
$$;


ALTER FUNCTION "public"."is_user_online"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_messages_as_read"("p_match_id" "uuid", "p_receiver_pet_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE messages
  SET is_read = true
  WHERE match_id = p_match_id
    AND sender_pet_id != p_receiver_pet_id
    AND is_read = false;
END;
$$;


ALTER FUNCTION "public"."mark_messages_as_read"("p_match_id" "uuid", "p_receiver_pet_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_last_active"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE users
  SET last_active = NOW()
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."update_user_last_active"("p_user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "product_id" "uuid",
    "quantity" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_pet_id" "uuid" NOT NULL,
    "to_pet_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "match_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."match_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_1_id" "uuid" NOT NULL,
    "pet_2_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reaction" character varying(10) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "sender_pet_id" "uuid" NOT NULL,
    "content" "text",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "image_url" "text",
    "reply_to_message_id" "uuid",
    CONSTRAINT "message_has_content_or_image" CHECK ((("content" IS NOT NULL) OR ("image_url" IS NOT NULL)))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "product_id" "uuid",
    "price" numeric NOT NULL,
    "quantity" integer NOT NULL
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "total_price" numeric NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "order_code" "text",
    "payment_method" "text",
    "payment_status" "text" DEFAULT 'pending'::"text",
    "paid_at" timestamp with time zone,
    "shipping_address" "text",
    "phone" "text"
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "species" "text" NOT NULL,
    "breed" "text",
    "age" integer,
    "gender" "text",
    "size" "text",
    "bio" "text",
    "avatar_url" "text",
    "photos" "text"[],
    "vaccination_status" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "parent_comment_id" "uuid"
);


ALTER TABLE "public"."post_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pet_id" "uuid" NOT NULL,
    "content" "text",
    "images" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "video" "text"
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."posts"."video" IS 'URL to uploaded video for this post (max 60 seconds)';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric NOT NULL,
    "category" "text",
    "stock" integer DEFAULT 0,
    "images" "text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."swipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_pet_id" "uuid" NOT NULL,
    "to_pet_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."swipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid",
    "transaction_code" "text",
    "gateway" "text" DEFAULT 'PAYOS'::"text",
    "amount" numeric NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text",
    "avatar_url" "text",
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_active" timestamp with time zone DEFAULT "now"(),
    "address" "text",
    "role" "text" DEFAULT 'user'::"text",
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_requests"
    ADD CONSTRAINT "match_requests_from_pet_id_to_pet_id_key" UNIQUE ("from_pet_id", "to_pet_id");



ALTER TABLE ONLY "public"."match_requests"
    ADD CONSTRAINT "match_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pet_1_id_pet_2_id_key" UNIQUE ("pet_1_id", "pet_2_id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_user_id_key" UNIQUE ("message_id", "user_id");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_code_key" UNIQUE ("order_code");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_user_id_key" UNIQUE ("post_id", "user_id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."swipes"
    ADD CONSTRAINT "swipes_from_pet_id_to_pet_id_key" UNIQUE ("from_pet_id", "to_pet_id");



ALTER TABLE ONLY "public"."swipes"
    ADD CONSTRAINT "swipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_message_reactions_message_id" ON "public"."message_reactions" USING "btree" ("message_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_messages_match_id" ON "public"."messages" USING "btree" ("match_id");



CREATE INDEX "idx_messages_reply_to" ON "public"."messages" USING "btree" ("reply_to_message_id");



CREATE INDEX "idx_pets_created_at" ON "public"."pets" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_pets_is_active" ON "public"."pets" USING "btree" ("is_active");



CREATE INDEX "idx_pets_owner_id" ON "public"."pets" USING "btree" ("owner_id");



CREATE INDEX "idx_pets_species" ON "public"."pets" USING "btree" ("species");



CREATE INDEX "idx_post_comments_post_id" ON "public"."post_comments" USING "btree" ("post_id");



CREATE INDEX "idx_post_comments_user_id" ON "public"."post_comments" USING "btree" ("user_id");



CREATE INDEX "idx_post_likes_post_id" ON "public"."post_likes" USING "btree" ("post_id");



CREATE INDEX "idx_post_likes_user_id" ON "public"."post_likes" USING "btree" ("user_id");



CREATE INDEX "idx_posts_created_at" ON "public"."posts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_posts_pet_id" ON "public"."posts" USING "btree" ("pet_id");



CREATE INDEX "idx_users_last_active" ON "public"."users" USING "btree" ("last_active");



CREATE OR REPLACE TRIGGER "on_swipe_create_match_request" AFTER INSERT ON "public"."swipes" FOR EACH ROW EXECUTE FUNCTION "public"."create_match_request_on_like"();



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_requests"
    ADD CONSTRAINT "match_requests_from_pet_id_fkey" FOREIGN KEY ("from_pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_requests"
    ADD CONSTRAINT "match_requests_to_pet_id_fkey" FOREIGN KEY ("to_pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pet_1_id_fkey" FOREIGN KEY ("pet_1_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pet_2_id_fkey" FOREIGN KEY ("pet_2_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_reply_to_message_id_fkey" FOREIGN KEY ("reply_to_message_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_pet_id_fkey" FOREIGN KEY ("sender_pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."pets"
    ADD CONSTRAINT "pets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."post_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."swipes"
    ADD CONSTRAINT "swipes_from_pet_id_fkey" FOREIGN KEY ("from_pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."swipes"
    ADD CONSTRAINT "swipes_to_pet_id_fkey" FOREIGN KEY ("to_pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Enable delete for users based on user_id" ON "public"."post_likes" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable insert for authenticated users" ON "public"."post_likes" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Enable read access for all users" ON "public"."post_likes" FOR SELECT USING (true);



CREATE POLICY "Owners can manage pets" ON "public"."pets" USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Pet owners can manage posts" ON "public"."posts" USING ((EXISTS ( SELECT 1
   FROM "public"."pets"
  WHERE (("pets"."id" = "posts"."pet_id") AND ("pets"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Public can read active pets" ON "public"."pets" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can read comments" ON "public"."post_comments" FOR SELECT USING (true);



CREATE POLICY "Public can read likes" ON "public"."post_likes" FOR SELECT USING (true);



CREATE POLICY "Public can read posts" ON "public"."posts" FOR SELECT USING (true);



CREATE POLICY "Users can add reactions to messages they can access" ON "public"."message_reactions" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."messages" "m"
     JOIN "public"."matches" "mt" ON (("m"."match_id" = "mt"."id")))
  WHERE (("m"."id" = "message_reactions"."message_id") AND (("mt"."pet_1_id" IN ( SELECT "pets"."id"
           FROM "public"."pets"
          WHERE ("pets"."owner_id" = "auth"."uid"()))) OR ("mt"."pet_2_id" IN ( SELECT "pets"."id"
           FROM "public"."pets"
          WHERE ("pets"."owner_id" = "auth"."uid"()))))))) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can create comments" ON "public"."post_comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create match requests" ON "public"."match_requests" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets"
  WHERE (("pets"."id" = "match_requests"."from_pet_id") AND ("pets"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their comments" ON "public"."post_comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own reactions" ON "public"."message_reactions" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert matches for their pets" ON "public"."matches" FOR INSERT WITH CHECK ((("auth"."uid"() = ( SELECT "pets"."owner_id"
   FROM "public"."pets"
  WHERE ("pets"."id" = "matches"."pet_1_id"))) OR ("auth"."uid"() = ( SELECT "pets"."owner_id"
   FROM "public"."pets"
  WHERE ("pets"."id" = "matches"."pet_2_id")))));



CREATE POLICY "Users can insert own data" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can manage their comments" ON "public"."post_comments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their likes" ON "public"."post_likes" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read match messages" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."matches" "m"
     JOIN "public"."pets" "p" ON ((("p"."id" = "m"."pet_1_id") OR ("p"."id" = "m"."pet_2_id"))))
  WHERE (("m"."id" = "messages"."match_id") AND ("p"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can read own data" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can send messages" ON "public"."messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."pets"
  WHERE (("pets"."id" = "messages"."sender_pet_id") AND ("pets"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can update match requests for their pets" ON "public"."match_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."pets"
  WHERE (("pets"."id" = "match_requests"."to_pet_id") AND ("pets"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can update messages in their matches" ON "public"."messages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."matches" "m"
     JOIN "public"."pets" "p" ON ((("p"."id" = "m"."pet_1_id") OR ("p"."id" = "m"."pet_2_id"))))
  WHERE (("m"."id" = "messages"."match_id") AND ("p"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own data" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their received match requests" ON "public"."match_requests" FOR UPDATE USING (("auth"."uid"() = ( SELECT "pets"."owner_id"
   FROM "public"."pets"
  WHERE ("pets"."id" = "match_requests"."to_pet_id"))));



CREATE POLICY "Users can view all users" ON "public"."users" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Users can view match requests for their pets" ON "public"."match_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pets"
  WHERE ((("pets"."id" = "match_requests"."from_pet_id") OR ("pets"."id" = "match_requests"."to_pet_id")) AND ("pets"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can view messages in their matches" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."matches" "m"
     JOIN "public"."pets" "p" ON ((("p"."id" = "m"."pet_1_id") OR ("p"."id" = "m"."pet_2_id"))))
  WHERE (("m"."id" = "messages"."match_id") AND ("p"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users can view reactions on messages they can access" ON "public"."message_reactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."messages" "m"
     JOIN "public"."matches" "mt" ON (("m"."match_id" = "mt"."id")))
  WHERE (("m"."id" = "message_reactions"."message_id") AND (("mt"."pet_1_id" IN ( SELECT "pets"."id"
           FROM "public"."pets"
          WHERE ("pets"."owner_id" = "auth"."uid"()))) OR ("mt"."pet_2_id" IN ( SELECT "pets"."id"
           FROM "public"."pets"
          WHERE ("pets"."owner_id" = "auth"."uid"()))))))));



CREATE POLICY "Users can view their matches" ON "public"."matches" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pets"
  WHERE ((("pets"."id" = "matches"."pet_1_id") OR ("pets"."id" = "matches"."pet_2_id")) AND ("pets"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Users manage swipes of their pets" ON "public"."swipes" USING ((EXISTS ( SELECT 1
   FROM "public"."pets"
  WHERE (("pets"."id" = "swipes"."from_pet_id") AND ("pets"."owner_id" = "auth"."uid"())))));



ALTER TABLE "public"."match_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."swipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."message_reactions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."accept_match_request"("request_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_match_request"("request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_match_request"("request_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_match_request_on_like"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_match_request_on_like"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_match_request_on_like"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_match_last_message"("p_match_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_match_last_message"("p_match_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_match_last_message"("p_match_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_online"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_online"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_online"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("p_match_id" "uuid", "p_receiver_pet_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("p_match_id" "uuid", "p_receiver_pet_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("p_match_id" "uuid", "p_receiver_pet_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_last_active"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_last_active"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_last_active"("p_user_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."match_requests" TO "anon";
GRANT ALL ON TABLE "public"."match_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."match_requests" TO "service_role";



GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON TABLE "public"."message_reactions" TO "anon";
GRANT ALL ON TABLE "public"."message_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."message_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."pets" TO "anon";
GRANT ALL ON TABLE "public"."pets" TO "authenticated";
GRANT ALL ON TABLE "public"."pets" TO "service_role";



GRANT ALL ON TABLE "public"."post_comments" TO "anon";
GRANT ALL ON TABLE "public"."post_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."post_comments" TO "service_role";



GRANT ALL ON TABLE "public"."post_likes" TO "anon";
GRANT ALL ON TABLE "public"."post_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."post_likes" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."swipes" TO "anon";
GRANT ALL ON TABLE "public"."swipes" TO "authenticated";
GRANT ALL ON TABLE "public"."swipes" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


  create policy "Allow authenticated uploads to messages"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'messages'::text));



  create policy "Anyone can view post videos"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'post-videos'::text));



  create policy "Auth modify 1y4g5bx_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'product-image'::text));



  create policy "Auth modify 1y4g5bx_1"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'product-image'::text));



  create policy "Auth modify 1y4g5bx_2"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'product-image'::text));



  create policy "Authenticated users can upload post videos"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'post-videos'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Authenticated users can upload"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = ANY (ARRAY['post-image'::text, 'avatar'::text])));



  create policy "Public Access"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = ANY (ARRAY['post-image'::text, 'avatar'::text])));



  create policy "Public read 1y4g5bx_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'product-image'::text));



  create policy "Public read access to messages"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'messages'::text));



  create policy "Users can delete own images"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'post-image'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete own post videos"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'post-videos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete own uploads"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'messages'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



