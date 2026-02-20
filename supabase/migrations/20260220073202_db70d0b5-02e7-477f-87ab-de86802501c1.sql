
ALTER TABLE public.slider_banners ADD COLUMN link_url text DEFAULT NULL;
ALTER TABLE public.slider_banners ADD COLUMN offer_text text DEFAULT NULL;
ALTER TABLE public.slider_banners ADD COLUMN offer_expires_at timestamp with time zone DEFAULT NULL;
