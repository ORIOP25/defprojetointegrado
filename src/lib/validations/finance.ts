import { z } from "zod";

export const financeSchema = z.object({
  type: z.enum(["revenue", "expense"], {
    errorMap: () => ({ message: "Tipo inválido" })
  }),
  category: z.string()
    .min(1, "Categoria é obrigatória")
    .max(100, "Categoria não pode ter mais de 100 caracteres")
    .trim(),
  amount: z.string()
    .refine((val) => !isNaN(parseFloat(val)), "Valor inválido")
    .refine((val) => parseFloat(val) > 0, "Valor deve ser maior que zero"),
  description: z.string()
    .max(500, "Descrição não pode ter mais de 500 caracteres")
    .optional()
    .or(z.literal("")),
  transaction_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});

export type FinanceFormData = z.infer<typeof financeSchema>;
