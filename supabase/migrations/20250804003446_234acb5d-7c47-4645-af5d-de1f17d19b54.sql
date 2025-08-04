-- Create a profile for the current user (since they signed up before automatic profile creation)
INSERT INTO public.profiles (user_id, username, theme_preference)
VALUES ('624828f3-004f-420e-863d-4300b75a50a6', 'User', 'system')
ON CONFLICT (user_id) DO NOTHING;