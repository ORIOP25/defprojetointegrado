import { z } from "zod";

export const feedbackSchema = z.object({
  category: z.enum(["bug", "suggestion", "other"], {
    errorMap: () => ({ message: "Por favor, selecione uma categoria" })
  }),
  message: z.string()
    .min(1, "Mensagem é obrigatória")
    .max(2000, "Mensagem não pode ter mais de 2000 caracteres")
    .trim(),
});

export type FeedbackFormData = z.infer<typeof feedbackSchema>;
