import { z } from "zod";

export const loginSchema = z.object({
  email: z.string()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .max(255, "Email não pode ter mais de 255 caracteres"),
  password: z.string()
    .min(1, "Palavra-passe é obrigatória")
    .min(6, "Palavra-passe deve ter pelo menos 6 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
