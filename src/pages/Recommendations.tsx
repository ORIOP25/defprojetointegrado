import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Bot, Sparkles, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Loader2, Search
} from "lucide-react";

// Tipos adaptados à nova estrutura hierárquica
interface DetalheLinha {
  [key: string]: string | number;
}

interface Insight {
  tipo: "positivo" | "negativo" | "neutro";
  titulo: string;
  descricao: string;
  sugestao: string;
  detalhes: DetalheLinha[];
}

interface CategoriaInsight {
  categoria: string;
  cor: string;
  insights: Insight[];
}

const Recommendations = () => {
  const { token } = useContext(AuthContext);
  const [data, setData] = useState<CategoriaInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://127.0.0.1:8000/ai/insights", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Erro");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchInsights(); }, [token]);

  // Função para renderizar a tabela dinâmica dentro do Modal
  const renderDetailsTable = (rows: DetalheLinha[]) => {
    if (!rows || rows.length === 0) return <p className="text-sm text-muted-foreground">Sem dados detalhados.</p>;
    
    // Obter cabeçalhos dinamicamente das chaves do primeiro objeto
    const headers = Object.keys(rows[0]);

    return (
      <div className="border rounded-md mt-4 max-h-[300px] overflow-y-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              {headers.map((h) => (
                <TableHead key={h} className="capitalize">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx}>
                {headers.map((h) => (
                  <TableCell key={h}>{row[h]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-8 fade-in p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            Consultor AI
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise profunda de dados escolares e deteção de padrões.
          </p>
        </div>
        <Button onClick={fetchInsights} disabled={loading} size="lg" className="shadow-sm">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Gerar Nova Análise
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
          <p className="text-lg">A processar milhares de registos escolares...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {data.map((grupo, idx) => (
            <section key={idx} className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 border-l-4 border-primary pl-3">
                {grupo.categoria}
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {grupo.insights.map((insight, i) => (
                  <Card key={i} className={`border shadow-sm hover:shadow-md transition-all ${insight.tipo === 'negativo' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          {insight.tipo === 'negativo' 
                            ? <div className="p-2 bg-red-100 text-red-600 rounded-full"><TrendingDown size={20}/></div>
                            : <div className="p-2 bg-green-100 text-green-600 rounded-full"><TrendingUp size={20}/></div>
                          }
                          <div>
                            <CardTitle className="text-base">{insight.titulo}</CardTitle>
                            <CardDescription className="mt-1">{insight.descricao}</CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-3">
                      <div className="bg-muted/30 p-3 rounded-md border text-sm flex gap-3 items-start">
                        <AlertCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <div>
                          <span className="font-semibold text-primary block mb-1">Ação Recomendada:</span>
                          {insight.sugestao}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0">
                      {/* O MODAL DE DETALHES */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full gap-2 group">
                            <Search className="h-4 w-4 group-hover:text-primary" />
                            Ver Dados Detalhados ({insight.detalhes.length} registos)
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              {insight.titulo}
                              <Badge variant={insight.tipo === 'negativo' ? 'destructive' : 'default'}>
                                {insight.tipo === 'negativo' ? 'Crítico' : 'Mérito'}
                              </Badge>
                            </DialogTitle>
                            <DialogDescription>
                              Dados brutos extraídos do sistema que justificam esta análise.
                            </DialogDescription>
                          </DialogHeader>
                          
                          {renderDetailsTable(insight.detalhes)}

                          <div className="flex justify-end mt-4">
                            <Button type="submit">Exportar para PDF</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default Recommendations;