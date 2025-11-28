import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Loader2 } from "lucide-react";

const Dashboard = () => {
  return (
    <div className="space-y-6 fade-in">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      
      <Card className="border-dashed border-2 bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <LayoutDashboard className="h-5 w-5" />
            Visão Geral em Migração
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <div className="bg-background p-4 rounded-full mb-4 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">A carregar estatísticas...</h3>
          <p className="max-w-sm mt-2 text-sm">
            O novo endpoint de estatísticas (<code>/api/dashboard/stats</code>) será conectado em breve para mostrar os dados em tempo real.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;