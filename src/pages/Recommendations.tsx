import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/context/AuthContext"; // <--- Importante
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  ArrowRight,
  Loader2
} from "lucide-react";

interface Recomendacao {
  id: number;
  titulo: string;
  descricao: string;
  area: string;
  prioridade: "Alta" | "Média" | "Baixa";
  acao_sugerida: string;
}

const Recommendations = () => {
  // Vamos buscar o TOKEN ao contexto de autenticação
  const { token } = useContext(AuthContext); 
  
  const [insights, setInsights] = useState<Recomendacao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      
      // Enviamos o Token no cabeçalho (Authorization)
      const response = await fetch("http://127.0.0.1:8000/ai/insights", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) throw new Error("Erro ao carregar insights");
      const data = await response.json();
      setInsights(data);
    } catch (error) {
      console.error(error);
    } finally {
      // Pequeno delay para UX
      setTimeout(() => setLoading(false), 800);
    }
  };

  // O useEffect só corre quando existe um token
  useEffect(() => {
    if (token) {
        fetchInsights();
    }
  }, [token]);

  // Funções de Estilo
  const getPriorityColor = (p: string) => {
    switch(p) {
      case "Alta": return "bg-red-100 text-red-800 hover:bg-red-200 border-red-200";
      case "Média": return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200";
      case "Baixa": return "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200";
      default: return "bg-gray-100";
    }
  };

  const getIcon = (area: string) => {
    switch(area) {
      case "Financeira": return <TrendingUp className="h-5 w-5 text-green-600" />;
      case "Pedagógica": return <Lightbulb className="h-5 w-5 text-yellow-600" />;
      case "Infraestrutura": return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      default: return <Sparkles className="h-5 w-5 text-purple-600" />;
    }
  };

  return (
    <div className="space-y-6 fade-in p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            Assistente Inteligente
          </h1>
          <p className="text-muted-foreground">
            Análise automática de dados escolares e sugestões de otimização.
          </p>
        </div>
        
        <Button onClick={fetchInsights} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Gerar Nova Análise
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
           {[1,2,3].map(i => (
             <Card key={i} className="h-48 flex items-center justify-center bg-muted/50 border-dashed">
               <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
             </Card>
           ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {insights.map((item) => (
            <Card key={item.id} className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-muted rounded-full">
                      {getIcon(item.area)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.titulo}</CardTitle>
                      <CardDescription>{item.area}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={getPriorityColor(item.prioridade)}>
                    {item.prioridade}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  {item.descricao}
                </p>
                {item.acao_sugerida && (
                  <div className="bg-muted/50 p-3 rounded-md border text-sm flex gap-3 items-start">
                    <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <span className="font-semibold block text-primary mb-1">Sugestão de Ação:</span>
                      {item.acao_sugerida}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Recommendations;