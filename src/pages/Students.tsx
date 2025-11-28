import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2 } from "lucide-react";

const Students = () => {
  return (
    <div className="space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Alunos</h1>
      </div>
      
      <Card className="border-dashed border-2 bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="h-5 w-5" />
            Módulo em Migração
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <div className="bg-background p-4 rounded-full mb-4 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">A aguardar conexão à API</h3>
          <p className="max-w-sm mt-2 text-sm">
            A lista de alunos e os formulários estão a ser reconstruídos para comunicar com o novo backend MySQL.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Students;