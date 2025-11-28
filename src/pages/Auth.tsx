import { useState, useContext, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorHandler";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Verificar se o user foi redirecionado de uma página protegida
  const from = location.state?.from?.pathname || "/dashboard";

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Agora chamamos a função do nosso Contexto, não o Supabase
      await login(loginEmail, loginPassword);
      
      // Se não deu erro, redireciona
      navigate(from, { replace: true });
      
    } catch (error: unknown) {
      console.error("Erro de Login:", error);
      // Nota: O AuthContext já lança erros tratados, mas usamos o getErrorMessage por segurança
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-xl">
              <GraduationCap className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Sistema de Gestão Escolar</CardTitle>
          <CardDescription>Insira as suas credenciais para aceder (Versão Local)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="seu@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Palavra-passe</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showLoginPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 px-0"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  aria-label={showLoginPassword ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
                  disabled={loading}
                >
                  {showLoginPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                   A entrar...
                </>
               ) : (
                 "Entrar"
               )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;