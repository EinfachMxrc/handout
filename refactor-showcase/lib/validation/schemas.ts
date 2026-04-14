import { z } from "zod";

/**
 * Single Source of Truth für Input-Validierung.
 *
 * Diese Schemas werden clientseitig vor Form-Submit verwendet. Serverseitig validiert
 * Convex zusätzlich über seine eigenen `v.*`-Validatoren — Defense in Depth gegen manipulierte
 * Clients und direkte HTTP-Calls gegen Convex-Mutations.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(3, "E-Mail zu kurz")
  .max(254, "E-Mail zu lang")
  .email("Ungültige E-Mail-Adresse");

export const passwordSchema = z
  .string()
  .min(8, "Passwort muss mindestens 8 Zeichen lang sein")
  .max(256, "Passwort zu lang");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name darf nicht leer sein")
  .max(80, "Name zu lang");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const handoutSchema = z.object({
  title: z.string().trim().min(1, "Titel darf nicht leer sein").max(160),
  description: z.string().trim().max(2000).optional(),
});
export type HandoutInput = z.infer<typeof handoutSchema>;

export const blockSchema = z.object({
  title: z.string().trim().min(1, "Titel darf nicht leer sein").max(160),
  content: z.string().max(50_000, "Inhalt zu groß"),
  order: z.number().int().nonnegative(),
  fontSize: z.enum(["sm", "base", "lg", "xl"]).optional(),
  layout: z.enum(["default", "centered", "wide", "compact"]).optional(),
  imagePosition: z
    .enum(["above", "below", "left", "right", "full-width", "background"])
    .optional(),
  imageCaption: z.string().max(400).optional(),
});
export type BlockInput = z.infer<typeof blockSchema>;

/** Hilfs-Parser, der das erste Validation-Error-Issue als deutsche Nachricht zurückgibt. */
export function firstError<T>(result: z.SafeParseReturnType<unknown, T>): string | null {
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Ungültige Eingabe";
}
