/**
 * The Supabase project URL.
 *
 * The generated client in `src/integrations/supabase/client.ts` hardcodes the same
 * URL but does not export it, and that file is generated. Keeping the value here
 * means the edge-function URL has one addressable home without editing generated
 * code. If the project moves, both places need updating.
 */
export const SUPABASE_URL = "https://izpffjklhgwulczoirce.supabase.co";

/** The AI review proxy deployed from `supabase/functions/ai-review`. */
export const AI_REVIEW_URL = `${SUPABASE_URL}/functions/v1/ai-review`;
