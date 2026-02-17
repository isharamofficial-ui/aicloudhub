
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    _referral_code TEXT;
    _referrer_id UUID;
    _referrer_referrer_id UUID;
    _tier2_referrer_id UUID;
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, display_name, referral_code)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), public.generate_referral_code());

    -- Create wallet
    INSERT INTO public.wallets (user_id)
    VALUES (NEW.id);

    -- Create user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');

    -- Process referral code
    _referral_code := NEW.raw_user_meta_data->>'referral_code';
    IF _referral_code IS NOT NULL AND _referral_code != '' THEN
        -- Find referrer by their referral_code
        SELECT user_id INTO _referrer_id
        FROM public.profiles
        WHERE referral_code = _referral_code
        LIMIT 1;

        IF _referrer_id IS NOT NULL THEN
            -- Set referred_by on the new user's profile
            UPDATE public.profiles SET referred_by = _referrer_id WHERE user_id = NEW.id;

            -- Insert tier 1 referral
            INSERT INTO public.referrals (referrer_id, referred_id, tier)
            VALUES (_referrer_id, NEW.id, 1);

            -- Check for tier 2 (referrer's referrer)
            SELECT referred_by INTO _referrer_referrer_id
            FROM public.profiles
            WHERE user_id = _referrer_id;

            IF _referrer_referrer_id IS NOT NULL THEN
                INSERT INTO public.referrals (referrer_id, referred_id, tier)
                VALUES (_referrer_referrer_id, NEW.id, 2);

                -- Check for tier 3
                SELECT referred_by INTO _tier2_referrer_id
                FROM public.profiles
                WHERE user_id = _referrer_referrer_id;

                IF _tier2_referrer_id IS NOT NULL THEN
                    INSERT INTO public.referrals (referrer_id, referred_id, tier)
                    VALUES (_tier2_referrer_id, NEW.id, 3);
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;
