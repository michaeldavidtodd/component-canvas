-- Create trigger to automatically create profiles for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a profile for the current user (since they signed up before the trigger existed)
INSERT INTO public.profiles (user_id, username, theme_preference)
VALUES ('624828f3-004f-420e-863d-4300b75a50a6', 'User', 'system')
ON CONFLICT (user_id) DO NOTHING;