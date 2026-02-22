-- Run this in your Supabase SQL Editor
-- Replace 'admin@barber.shop' with your email if different

-- 1. Confirm the email (so you can log in without checking inbox)
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = [EMAIL_ADDRESS]';

-- 2. Make user an admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = [EMAIL_ADDRESS]'
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Verify the change
SELECT 
    u.email,
    u.email_confirmed_at,
    ur.role
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = [EMAIL_ADDRESS]';
