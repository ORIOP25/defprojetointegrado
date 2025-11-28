import { z } from "zod";

export const studentSchema = z.object({
  name: z.string()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome não pode ter mais de 100 caracteres")
    .trim(),
  email: z.string()
    .max(255, "Email não pode ter mais de 255 caracteres")
    .optional()
    .refine((val) => !val || z.string().email().safeParse(val).success, "Email inválido")
    .or(z.literal("")),
  phone: z.string()
    .max(20, "Telefone não pode ter mais de 20 caracteres")
    .optional()
    .or(z.literal("")),
  course: z.string()
    .max(100, "Curso não pode ter mais de 100 caracteres")
    .optional()
    .or(z.literal("")),
  status: z.enum(["active", "inactive", "graduated"], {
    errorMap: () => ({ message: "Estado inválido" })
  }),
});

export type StudentFormData = z.infer<typeof studentSchema>;
