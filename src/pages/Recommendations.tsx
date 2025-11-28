import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Loader2 } from "lucide-react";

const Recommendations = () => {
  return (
    <div className="space-y-6 fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Recomendações IA</h1>
        <p className="text-muted-foreground">
          Análise inteligente e sugestões para otimização da gestão
        </p>
      </div>
      
      <Card className="border-dashed border-2 bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Lightbulb className="h-5 w-5" />
            Motor de IA em Configuração
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <div className="bg-background p-4 rounded-full mb-4 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Módulo Gemini a ser integrado</h3>
          <p className="max-w-sm mt-2 text-sm">
            A lógica de IA está a ser movida das Edge Functions para o novo Backend Python.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Recommendations;