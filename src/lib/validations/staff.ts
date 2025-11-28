import { z } from "zod";

export const staffSchema = z.object({
  name: z.string()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome não pode ter mais de 100 caracteres")
    .trim(),
  email: z.string()
    .email("Email inválido")
    .max(255, "Email não pode ter mais de 255 caracteres"),
  phone: z.string()
    .max(20, "Telefone não pode ter mais de 20 caracteres")
    .optional()
    .or(z.literal("")),
  position: z.string()
    .min(1, "Cargo é obrigatório")
    .max(100, "Cargo não pode ter mais de 100 caracteres")
    .trim(),
  department_id: z.string().optional().or(z.literal("")),
  salary: z.string()
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || !isNaN(parseFloat(val)), "Salário inválido")
    .refine((val) => !val || parseFloat(val) >= 0, "Salário não pode ser negativo"),
  status: z.enum(["active", "inactive", "terminated"], {
    errorMap: () => ({ message: "Estado inválido" })
  }),
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .optional()
    .or(z.literal("")),
});

export type StaffFormData = z.infer<typeof staffSchema>;
