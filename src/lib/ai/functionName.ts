// The deployed Supabase Edge Function slug — el nombre real con el que hay que
// invocarla, no el de la carpeta del repo (aunque ahora coincidan).
//
// Durante un mes fue "bright-function": el editor del panel le puso ese nombre
// automáticamente al desplegarla desde ahí la primera vez, y no había forma de
// renombrarla. La consecuencia es que cada `supabase functions deploy ai-coach`
// subía el código a una función que nadie invocaba, mientras el coach y Veltra
// Food seguían sirviéndose de aquella copia vieja — sin que se notara, porque
// el cliente se traga el fallo y responde con el fallback local.
//
// El código vive en supabase/functions/ai-coach/index.ts y enruta el chat del
// entrenador y el analizador de comida por el campo `type` del cuerpo.
export const AI_FUNCTION_NAME = "ai-coach";
