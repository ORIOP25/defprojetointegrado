import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, isLoading } = useContext(AuthContext);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se não houver utilizador logado, redireciona para o login
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Se a rota exigir Admin e o user não for Admin
  if (requireAdmin && user.role !== 'global_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};