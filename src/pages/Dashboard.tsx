import { useEffect, useState } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users, Euro, TrendingUp, Loader2, School } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DashboardStats {
  total_students: number;
  total_staff: number;
  financial_balance: number;
  monthly_revenue: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/dashboard/stats");
        setStats(response.data);
      } catch (err) {
        console.error(err);
        setError("Não foi possível conectar à API.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        {!isLoading && !error && (
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            Dados em tempo real
          </span>
        )}
      </div>

      {/* Estado de Carregamento (Design da Sara) */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-dashed border-2 bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="h-4 w-24 bg-muted-foreground/20 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm">A sincronizar dados...</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Estado de Erro */}
      {!isLoading && error && (
        <div className="p-6 text-center border rounded-lg bg-destructive/10 text-destructive">
          <p>{error}</p>
        </div>
      )}

      {/* Dados Reais (Lógica da Fase 2 + Design Limpo) */}
      {!isLoading && !error && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Alunos */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alunos</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_students}</div>
              <p className="text-xs text-muted-foreground">Matriculados</p>
            </CardContent>
          </Card>

          {/* Staff */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_staff}</div>
              <p className="text-xs text-muted-foreground">Professores e Admin</p>
            </CardContent>
          </Card>

          {/* Turmas (Placeholder Inteligente - Usamos dados financeiros por enquanto) */}
          {/* Nota: Quando o João adicionar active_classes ao backend, mudamos isto */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.monthly_revenue)}</div>
              <p className="text-xs text-muted-foreground">Total acumulado</p>
            </CardContent>
          </Card>

           {/* Saldo */}
           <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.financial_balance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                {formatCurrency(stats.financial_balance)}
              </div>
              <p className="text-xs text-muted-foreground">Balanço atual</p>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
};

export default Dashboard;