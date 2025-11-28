import { isAxiosError } from 'axios';
import { z } from 'zod';

/**
 * Sanitizes error messages from various sources (Axios, Zod, JS Errors)
 */
export const getErrorMessage = (error: unknown): string => {
  // 1. Tratamento de Erros do Axios (Backend API)
  if (isAxiosError(error)) {
    // Se a API enviou uma mensagem específica (ex: "Credenciais inválidas")
    if (error.response?.data?.detail) {
      // O FastAPI às vezes envia array de erros (ex: validação) ou string
      const detail = error.response.data.detail;
      
      if (typeof detail === 'string') {
        return detail;
      }
      if (Array.isArray(detail)) {
        // Erros de validação do Pydantic vêm como array
        return detail.map((err: any) => err.msg).join(', ');
      }
    }
    
    // Erros de rede ou servidor sem mensagem
    if (error.code === "ERR_NETWORK") return "Erro de conexão ao servidor.";
    if (error.response?.status === 401) return "Não autorizado. Por favor faça login novamente.";
    if (error.response?.status === 403) return "Não tem permissão para realizar esta ação.";
    if (error.response?.status === 500) return "Erro interno do servidor.";
    
    return error.message || "Erro de comunicação com o servidor.";
  }

  // 2. Tratamento de Erros do Zod (Validação de Frontend)
  if (error instanceof z.ZodError) {
    return error.errors[0].message;
  }

  // 3. Erros genéricos de JS
  if (error instanceof Error) {
    return error.message;
  }

  // 4. Fallback
  return "Ocorreu um erro desconhecido.";
};