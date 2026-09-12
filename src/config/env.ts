import * as z from "zod";

// The app is offline-only: env is for build-time toggles, never for endpoints or secrets.
const EnvSchema = z.object({
  APP_TITLE: z.string().default("Dofus Market Calculator"),
});

function createEnv() {
  const envVars = Object.entries(import.meta.env).reduce<
    Record<string, string>
  >((acc, [key, value]) => {
    if (key.startsWith("VITE_"))
      acc[key.replace("VITE_", "")] = value as string;
    return acc;
  }, {});

  const parsed = EnvSchema.safeParse(envVars);

  if (!parsed.success) {
    throw new Error(
      `Invalid env provided.\n${Object.entries(
        z.flattenError(parsed.error).fieldErrors,
      )
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")}`,
    );
  }

  return parsed.data;
}

export const env = createEnv();
