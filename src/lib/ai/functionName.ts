// The deployed Supabase Edge Function slug. The dashboard editor auto-assigned
// "bright-function" instead of "ai-coach" when it was first deployed, and there
// was no rename option — the source of truth lives in
// supabase/functions/ai-coach/index.ts, which now routes both the coach chat
// and the food analyzer by a `type` field in the request body.
export const AI_FUNCTION_NAME = "bright-function";
