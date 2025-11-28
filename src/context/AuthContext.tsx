import { createContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import { toast } from 'sonner';

// Define o formato do nosso Utilizador (baseado no Token)
interface User {
  email: string;
  role: 'global_admin' | 'staff' | 'professor';
  // Podes adicionar mais campos aqui se o token os trouxer (ex: nome, id)
}

// O que o token JWT traz lá dentro
interface JwtPayload {
  sub: string;  // email
  role: 'global_admin' | 'staff' | 'professor';
  exp: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Ao iniciar a app, verifica se já existe um token guardado
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');

    if (storedToken) {
      try {
        const decoded = jwtDecode<JwtPayload>(storedToken);
        
        // Verificar se o token expirou
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          logout();
        } else {
          setToken(storedToken);
          setUser({
            email: decoded.sub,
            role: decoded.role
          });
        }
      } catch (error) {
        console.error("Token inválido", error);
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  // 2. Função de Login
  async function login(email: string, password: string) {
    try {
      // O FastAPI espera dados como form-data por defeito para OAuth2
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const response = await api.post('/auth/token', params);
      
      const { access_token } = response.data;

      // Guardar e Descodificar
      localStorage.setItem('authToken', access_token);
      const decoded = jwtDecode<JwtPayload>(access_token);

      setToken(access_token);
      setUser({
        email: decoded.sub,
        role: decoded.role
      });
      
      toast.success("Login efetuado com sucesso!");

    } catch (error: any) {
      console.error("Erro no login:", error);
      if (error.response?.status === 401) {
        throw new Error("Credenciais inválidas.");
      } else if (error.code === "ERR_NETWORK") {
         // Mock temporário para testes se o backend não estiver a correr
         // REMOVER EM PRODUÇÃO
         /*
         console.warn("Backend offline. A usar login simulado.");
         const mockRole = email.includes("admin") ? "global_admin" : "staff";
         const mockUser = { email, role: mockRole as any };
         setUser(mockUser);
         setToken("mock_token");
         localStorage.setItem('authToken', "mock_token");
         return;
         */
         throw new Error("Não foi possível conectar ao servidor.");
      }
      throw new Error("Erro ao tentar entrar.");
    }
  }

  // 3. Função de Logout
  function logout() {
    localStorage.removeItem('authToken');
    setUser(null);
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}