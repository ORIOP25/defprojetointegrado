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

// Interface baseada no Schema AlunoListagem do backend
interface AlunoListagem {
  Aluno_id: number;
  Nome: string;
  Data_Nasc: string;
  Genero: string;
  Turma_Desc: string;
  EE_Nome: string;
  Telefone: string;
}

// Interface para o formulário de criação
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
  // Estado para a lista de alunos vinda da API
  const [alunos, setAlunos] = useState<AlunoListagem[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado do formulário (Design da Sara)
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

  // 1. Função para carregar dados da API
  const fetchStudents = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/students/");
      if (!response.ok) throw new Error("Erro ao buscar alunos");
      const data = await response.json();
      setAlunos(data);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados ao iniciar
  useEffect(() => {
    fetchStudents();
  }, []);

  // 2. Função de guardar (Placeholder para POST futuro)
  const handleSubmit = () => {
    console.log("A enviar para API:", formData);
    // Aqui adicionarias o fetch POST para /students/
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

        {/* Botão Adicionar Aluno (Design da Sara) */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="col-span-2 md:col-span-1">
                <Label>Nome Completo</Label>
                <Input
                  value={formData.Nome}
                  onChange={(e) => setFormData({ ...formData, Nome: e.target.value })}
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={formData.Data_Nasc}
                  onChange={(e) => setFormData({ ...formData, Data_Nasc: e.target.value })}
                />
              </div>

              <div>
                <Label>Género</Label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.Genero}
                  onChange={(e) => setFormData({ ...formData, Genero: e.target.value as "M" | "F" })}
                >
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>

              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.Telefone}
                  onChange={(e) => setFormData({ ...formData, Telefone: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label>Morada</Label>
                <Input
                  value={formData.Morada}
                  onChange={(e) => setFormData({ ...formData, Morada: e.target.value })}
                />
              </div>
              
              {/* Campos adicionais para estrutura */}
              <div>
                <Label>Ano Letivo</Label>
                <Input
                  type="number"
                  value={formData.Ano}
                  onChange={(e) => setFormData({ ...formData, Ano: Number(e.target.value) })}
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

      {/* 3. Área de Conteúdo: Tabela ou Loading */}
      {loading ? (
        <Card className="border-dashed border-2 bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">A carregar alunos...</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Listagem Geral
              </CardTitle>
              <div className="relative w-64">
                 {/* Placeholder de pesquisa visual */}
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Procurar aluno..." className="pl-8 h-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {alunos.length === 0 ? (
               <div className="text-center py-10 text-muted-foreground">
                 Nenhum aluno encontrado na base de dados.
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Students;