import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2, Plus, Search, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AlunoListagem {
  Aluno_id: number;
  Nome: string;
  Data_Nasc: string;
  Genero: string;
  Turma_Desc: string;
  EE_Nome: string;
  Telefone: string;
}

interface AlunoForm {
  Nome: string;
  Data_Nasc: string;
  Telefone: string;
  Morada: string;
  Genero: "M" | "F";
  Ano: number;
  Turma_id?: number;
  Escalao: string;
  EE_id?: number;
}

const Students = () => {
  const [alunos, setAlunos] = useState<AlunoListagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); // Estado da pesquisa

  const [formData, setFormData] = useState<AlunoForm>({
    Nome: "",
    Data_Nasc: "",
    Telefone: "",
    Morada: "",
    Genero: "M",
    Ano: new Date().getFullYear(),
    Turma_id: undefined,
    Escalao: "",
    EE_id: undefined,
  });

  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchStudents = async () => {
    // Opção: Podes comentar o setLoading(true) se não quiseres que a tabela pisque
    // mas a estrutura abaixo já resolve o problema do foco.
    setLoading(true); 
    try {
      const baseUrl = "http://127.0.0.1:8000/students/";
      const url = searchTerm 
        ? `${baseUrl}?search=${encodeURIComponent(searchTerm)}` 
        : baseUrl;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao buscar alunos");
      const data = await response.json();
      setAlunos(data);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStudents();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSubmit = () => {
    console.log("A enviar para API:", formData);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 fade-in p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Alunos</h1>
          <p className="text-muted-foreground">
            Listagem e gestão de matrículas escolar.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex gap-2">
              <Plus size={18} />
              Novo Aluno
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Aluno</DialogTitle>
            </DialogHeader>
            {/* Formulário (Resumido para poupar espaço, mantém o teu igual) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
               {/* ... Os teus inputs do formulário aqui ... */}
               <div className="col-span-2">
                 <Label>Nome (Exemplo)</Label>
                 <Input 
                    value={formData.Nome} 
                    onChange={(e) => setFormData({...formData, Nome: e.target.value})} 
                 />
               </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit}>Guardar Ficha</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        {/* CORREÇÃO: O Header com o Input está AGORA FORA do bloco condicional do loading */}
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Listagem Geral
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Procurar aluno..." 
                className="pl-8 h-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Só o conteúdo da tabela é que muda para loading */}
          {loading ? (
             <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p>A atualizar lista...</p>
             </div>
          ) : (
            alunos.length === 0 ? (
               <div className="text-center py-10 text-muted-foreground">
                 {searchTerm ? `Nenhum aluno encontrado para "${searchTerm}".` : "Nenhum aluno na base de dados."}
               </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Encarregado Educação</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alunos.map((aluno) => (
                    <TableRow key={aluno.Aluno_id}>
                      <TableCell className="font-medium">#{aluno.Aluno_id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{aluno.Nome}</span>
                          <span className="text-xs text-muted-foreground">{aluno.Genero === 'M' ? 'Masculino' : 'Feminino'} | {aluno.Data_Nasc}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={aluno.Turma_Desc === "Sem Turma" ? "secondary" : "outline"}>
                          {aluno.Turma_Desc}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <User size={14} className="text-muted-foreground"/>
                            {aluno.EE_Nome}
                        </div>
                      </TableCell>
                      <TableCell>{aluno.Telefone || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">Ver Perfil</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Students;