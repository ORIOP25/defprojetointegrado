import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, Loader2, Plus, Search, User, 
  Pencil, Trash2, Save, X, BookOpen 
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- INTERFACES ---
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
    Turma_Letra: string;
    EE_Nome: string;
}

interface Nota {
  Nota_id: number;
  Disc_id: number;
  Disciplina_Nome: string;
  Nota_1P?: number;
  Nota_2P?: number;
  Nota_3P?: number;
  Nota_Ex?: number;
  Nota_Final?: number;
  Ano_letivo: string;
}

interface Disciplina {
    Disc_id: number;
    Nome: string;
}

const Students = () => {
  // --- ESTADOS GERAIS ---
  const [alunos, setAlunos] = useState<AlunoListagem[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // --- ESTADOS DO PERFIL E EDIÇÃO DE ALUNO ---
  const [selectedStudent, setSelectedStudent] = useState<AlunoListagem | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState<AlunoListagem | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  // --- ESTADOS DAS NOTAS ---
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [anoLetivoFiltro, setAnoLetivoFiltro] = useState<string>("Todos");
  const [anosDisponiveis, setAnosDisponiveis] = useState<string[]>([]);
  
  const [isNotaDialogOpen, setIsNotaDialogOpen] = useState(false);
  const [isEditingNota, setIsEditingNota] = useState(false);
  const [notaForm, setNotaForm] = useState({
    Nota_id: 0,
    Disc_id: "", 
    Nota_1P: "", Nota_2P: "", Nota_3P: "", Nota_Ex: "", Nota_Final: "",
    Ano_letivo: "2024/2025"
  });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<AlunoForm>({
      Nome: "", Data_Nasc: "", Telefone: "", Morada: "", Genero: "M",
      Ano: new Date().getFullYear(), Turma_Letra: "A", EE_Nome: "",
  });

  // --- FETCH DADOS ---
  const fetchStudents = async () => {
    setLoading(true); 
    try {
      const baseUrl = "http://127.0.0.1:8000/students/";
      const url = searchTerm ? `${baseUrl}?search=${encodeURIComponent(searchTerm)}` : baseUrl;
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

  const fetchDisciplines = async () => {
      try {
          const response = await fetch("http://127.0.0.1:8000/students/disciplinas/list");
          if (response.ok) {
              const data = await response.json();
              setDisciplinas(data);
          }
      } catch (error) {
          console.error("Erro ao buscar disciplinas", error);
      }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => fetchStudents(), 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
      fetchDisciplines();
  }, []);

  const fetchGrades = async (studentId: number) => {
    setLoadingNotas(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/students/${studentId}/grades`);
      if (response.ok) {
        const data: Nota[] = await response.json();
        setNotas(data);
        const anos = Array.from(new Set(data.map(n => n.Ano_letivo))).sort().reverse();
        setAnosDisponiveis(anos);
      }
    } catch (error) {
      console.error("Erro ao buscar notas:", error);
    } finally {
      setLoadingNotas(false);
    }
  };

  const handleOpenProfile = (aluno: AlunoListagem) => {
    setSelectedStudent(aluno);
    setIsEditingProfile(false);
    setIsProfileOpen(true);
    setNotas([]);
    fetchGrades(aluno.Aluno_id);
  };

  const handleCreateSubmit = () => {
      console.log("A criar aluno:", formData);
      setCreateDialogOpen(false);
      setFormData({
        Nome: "", Data_Nasc: "", Telefone: "", Morada: "", Genero: "M",
        Ano: new Date().getFullYear(), Turma_Letra: "A", EE_Nome: "",
      });
  };

  const handleStartEditingProfile = () => {
    if (selectedStudent) {
        setEditProfileData({...selectedStudent});
        setIsEditingProfile(true);
    }
  };

  const handleSaveProfile = async () => {
      if (!editProfileData || !selectedStudent) return;
      try {
          const payload = {
              Nome: editProfileData.Nome,
              Telefone: editProfileData.Telefone,
              Data_Nasc: editProfileData.Data_Nasc,
              Genero: editProfileData.Genero,
              EE_Nome: editProfileData.EE_Nome
          };
          const response = await fetch(`http://127.0.0.1:8000/students/${selectedStudent.Aluno_id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          if (response.ok) {
              const updatedAluno = await response.json();
              setSelectedStudent(updatedAluno);
              setAlunos(alunos.map(a => a.Aluno_id === updatedAluno.Aluno_id ? updatedAluno : a));
              setIsEditingProfile(false);
          } else {
              alert("Erro ao atualizar o perfil.");
          }
      } catch (error) {
          console.error("Erro ao salvar perfil:", error);
      }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    setAlunos(alunos.filter(a => a.Aluno_id !== selectedStudent.Aluno_id));
    setDeleteAlertOpen(false);
    setIsProfileOpen(false);
  };

  const handleOpenAddNota = () => {
      setIsEditingNota(false);
      setNotaForm({
        Nota_id: 0,
        Disc_id: "", Nota_1P: "", Nota_2P: "", Nota_3P: "", Nota_Ex: "", Nota_Final: "",
        Ano_letivo: "2024/2025"
      });
      setIsNotaDialogOpen(true);
  };

  const handleOpenEditNota = (nota: Nota) => {
      setIsEditingNota(true);
      setNotaForm({
          Nota_id: nota.Nota_id,
          Disc_id: nota.Disc_id.toString(),
          Nota_1P: nota.Nota_1P?.toString() || "",
          Nota_2P: nota.Nota_2P?.toString() || "",
          Nota_3P: nota.Nota_3P?.toString() || "",
          Nota_Ex: nota.Nota_Ex?.toString() || "",
          Nota_Final: nota.Nota_Final?.toString() || "",
          Ano_letivo: nota.Ano_letivo
      });
      setIsNotaDialogOpen(true);
  };

  // --- NOVA FUNÇÃO DE ELIMINAR NOTA ---
  const handleDeleteGrade = async () => {
      if (!isEditingNota || notaForm.Nota_id === 0) return;

      if (!confirm("Tem a certeza que deseja eliminar esta nota?")) return;

      try {
          const response = await fetch(`http://127.0.0.1:8000/students/grades/${notaForm.Nota_id}`, {
              method: 'DELETE',
          });

          if (response.ok) {
              setIsNotaDialogOpen(false);
              if (selectedStudent) fetchGrades(selectedStudent.Aluno_id);
          } else {
              alert("Erro ao eliminar nota.");
          }
      } catch (error) {
          console.error("Erro:", error);
      }
  };

  const handleSaveNota = async () => {
    if (!selectedStudent) return;
    const payload = {
        Disc_id: parseInt(notaForm.Disc_id),
        Nota_1P: notaForm.Nota_1P ? parseInt(notaForm.Nota_1P) : null,
        Nota_2P: notaForm.Nota_2P ? parseInt(notaForm.Nota_2P) : null,
        Nota_3P: notaForm.Nota_3P ? parseInt(notaForm.Nota_3P) : null,
        Nota_Ex: notaForm.Nota_Ex ? parseInt(notaForm.Nota_Ex) : null,
        Nota_Final: notaForm.Nota_Final ? parseInt(notaForm.Nota_Final) : null,
        Ano_letivo: notaForm.Ano_letivo
    };

    try {
        let url, method;
        if (isEditingNota) {
            url = `http://127.0.0.1:8000/students/grades/${notaForm.Nota_id}`;
            method = "PUT";
        } else {
            url = `http://127.0.0.1:8000/students/${selectedStudent.Aluno_id}/grades`;
            method = "POST";
        }
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            setIsNotaDialogOpen(false);
            fetchGrades(selectedStudent.Aluno_id); 
        } else {
            alert("Erro ao salvar nota.");
        }
    } catch (error) {
        console.error("Erro:", error);
    }
  };

  const notasFiltradas = anoLetivoFiltro === "Todos" 
    ? notas 
    : notas.filter(n => n.Ano_letivo === anoLetivoFiltro);

  return (
    <div className="space-y-6 fade-in p-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Alunos</h1>
          <p className="text-muted-foreground">Listagem e gestão de matrículas escolar.</p>
        </div>

        {/* DIALOG DE CRIAR NOVO ALUNO */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex gap-2"><Plus size={18} /> Novo Aluno</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
             <DialogHeader><DialogTitle>Adicionar Novo Aluno</DialogTitle></DialogHeader>
             <div className="grid gap-4 py-4">
                <div className="space-y-1">
                   <Label>Nome Completo</Label>
                   <Input value={formData.Nome} onChange={(e) => setFormData({...formData, Nome: e.target.value})} placeholder="Ex: João Silva" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <Label>Data de Nascimento</Label>
                       <Input type="date" value={formData.Data_Nasc} onChange={(e) => setFormData({...formData, Data_Nasc: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                       <Label>Género</Label>
                       <Select value={formData.Genero} onValueChange={(val: "M"|"F") => setFormData({...formData, Genero: val})}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem></SelectContent>
                       </Select>
                    </div>
                </div>

                {/* ANO E TURMA */}
                <div className="flex items-end gap-4 bg-muted/30 p-3 rounded-md border">
                    <div className="space-y-1 flex-1">
                       <Label>Ano Escolar</Label>
                       <Input type="number" value={formData.Ano} onChange={(e) => setFormData({...formData, Ano: parseInt(e.target.value) || 0})} placeholder="Ex: 10" />
                    </div>
                    <div className="space-y-1 flex-1">
                       <Label>Turma (Letra)</Label>
                       <Input value={formData.Turma_Letra} onChange={(e) => setFormData({...formData, Turma_Letra: e.target.value})} className="uppercase" maxLength={1} placeholder="Ex: A" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <Label>Enc. Educação</Label>
                       <Input value={formData.EE_Nome} onChange={(e) => setFormData({...formData, EE_Nome: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                       <Label>Telefone</Label>
                       <Input value={formData.Telefone} onChange={(e) => setFormData({...formData, Telefone: e.target.value})} />
                    </div>
                </div>
             </div>
             <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateSubmit}>Criar Ficha</Button>
             </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABELA */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Listagem Geral
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Procurar aluno..." className="pl-8 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alunos.map((aluno) => (
                    <TableRow key={aluno.Aluno_id}>
                      <TableCell>#{aluno.Aluno_id}</TableCell>
                      <TableCell>
                          <div className="font-medium">{aluno.Nome}</div>
                          <div className="text-xs text-muted-foreground">{aluno.Data_Nasc}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{aluno.Turma_Desc}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenProfile(aluno)}>Ver Perfil</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* --- MODAL DE PERFIL --- */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-xl max-h-[95vh] overflow-y-auto"> 
          
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <User className="h-6 w-6 text-primary" />
              {isEditingProfile ? "A Editar Perfil" : "Perfil do Aluno"}
            </DialogTitle>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-6">
              
              {/* CARTÃO CABEÇALHO */}
              <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border">
                <div className="w-full mr-4">
                  {isEditingProfile && editProfileData ? (
                      <Input 
                        value={editProfileData.Nome} 
                        onChange={(e) => setEditProfileData({...editProfileData, Nome: e.target.value})}
                        className="font-bold text-lg bg-white"
                        placeholder="Nome do Aluno"
                      />
                  ) : (
                    <>
                      <h3 className="font-bold text-lg">{selectedStudent.Nome}</h3>
                      <p className="text-sm text-muted-foreground">ID: #{selectedStudent.Aluno_id}</p>
                    </>
                  )}
                </div>
                {!isEditingProfile && (
                  <Badge className="text-base px-3 py-1" variant={selectedStudent.Turma_Desc === "Sem Turma" ? "secondary" : "default"}>
                    {selectedStudent.Turma_Desc}
                  </Badge>
                )}
              </div>

              {/* TABS */}
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="info">Informações</TabsTrigger>
                    <TabsTrigger value="notas">Notas & Avaliações</TabsTrigger>
                </TabsList>

                {/* ABA INFO */}
                <TabsContent value="info" className="space-y-6">
                    <div className="space-y-3">
                        <h4 className="font-semibold border-b pb-2 text-sm text-muted-foreground uppercase tracking-wide">Dados Pessoais</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-xs font-medium text-muted-foreground">Data de Nascimento</Label>
                                {isEditingProfile && editProfileData ? (
                                    <Input type="date" value={editProfileData.Data_Nasc} onChange={e => setEditProfileData({...editProfileData, Data_Nasc: e.target.value})} className="h-8"/>
                                ) : (
                                    <div className="text-sm">{selectedStudent.Data_Nasc}</div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-medium text-muted-foreground">Género</Label>
                                {isEditingProfile && editProfileData ? (
                                    <Select value={editProfileData.Genero} onValueChange={(val: any) => setEditProfileData({...editProfileData, Genero: val})}>
                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem></SelectContent>
                                    </Select>
                                ) : (
                                    <div className="text-sm">{selectedStudent.Genero === 'M' ? 'Masculino' : 'Feminino'}</div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <h4 className="font-semibold border-b pb-2 text-sm text-muted-foreground uppercase tracking-wide">Contactos & Família</h4>
                        <div className="grid gap-3">
                            <div>
                                <Label className="text-xs font-medium text-muted-foreground">Encarregado de Educação</Label>
                                {isEditingProfile && editProfileData ? (
                                    <Input value={editProfileData.EE_Nome} onChange={e => setEditProfileData({...editProfileData, EE_Nome: e.target.value})} className="h-8"/>
                                ) : (
                                    <p className="text-sm font-medium">{selectedStudent.EE_Nome}</p>
                                )}
                            </div>
                            <div>
                                <Label className="text-xs font-medium text-muted-foreground">Telefone</Label>
                                {isEditingProfile && editProfileData ? (
                                    <Input value={editProfileData.Telefone || ""} onChange={e => setEditProfileData({...editProfileData, Telefone: e.target.value})} className="h-8"/>
                                ) : (
                                    <p className="text-sm font-medium">{selectedStudent.Telefone || "N/A"}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-6 mt-2 border-t">
                        {isEditingProfile ? (
                            <>
                                <Button variant="ghost" onClick={() => setIsEditingProfile(false)}>
                                    <X size={16} className="mr-2" /> Cancelar
                                </Button>
                                <Button onClick={handleSaveProfile} className="bg-green-600 hover:bg-green-700">
                                    <Save size={16} className="mr-2" /> Guardar Alterações
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="destructive" size="sm" onClick={() => setDeleteAlertOpen(true)}>
                                    <Trash2 size={16} className="mr-2" /> Eliminar
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setIsProfileOpen(false)}>Fechar</Button>
                                    <Button onClick={handleStartEditingProfile}><Pencil size={16} className="mr-2" /> Editar Dados</Button>
                                </div>
                            </>
                        )}
                    </div>
                </TabsContent>

                {/* ABA NOTAS */}
                <TabsContent value="notas" className="space-y-4">
                    <div className="flex justify-between items-center bg-muted/30 p-2 rounded-md border">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs">Ano Letivo:</Label>
                            <Select value={anoLetivoFiltro} onValueChange={setAnoLetivoFiltro}>
                                <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Todos">Todos</SelectItem>
                                    {anosDisponiveis.map(ano => <SelectItem key={ano} value={ano}>{ano}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button size="sm" onClick={handleOpenAddNota} className="gap-2"><Plus size={14} /> Adicionar Nota</Button>
                    </div>

                    <div className="border rounded-md">
                        {loadingNotas ? (
                            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
                        ) : notas.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">Sem registos de notas.</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Disciplina</TableHead>
                                        <TableHead className="w-[100px]">Ano</TableHead>
                                        <TableHead className="text-center w-[50px]">1ºP</TableHead>
                                        <TableHead className="text-center w-[50px]">2ºP</TableHead>
                                        <TableHead className="text-center w-[50px]">3ºP</TableHead>
                                        <TableHead className="text-center w-[50px] font-bold">Final</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {notasFiltradas.map((nota) => (
                                        <TableRow key={nota.Nota_id}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <BookOpen size={14} className="text-muted-foreground"/>{nota.Disciplina_Nome}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{nota.Ano_letivo}</TableCell>
                                            <TableCell className="text-center">{nota.Nota_1P ?? "-"}</TableCell>
                                            <TableCell className="text-center">{nota.Nota_2P ?? "-"}</TableCell>
                                            <TableCell className="text-center">{nota.Nota_3P ?? "-"}</TableCell>
                                            <TableCell className="text-center font-bold bg-muted/50">{nota.Nota_Final ?? "-"}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditNota(nota)}>
                                                    <Pencil size={14} className="text-muted-foreground" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG NOTA (COM BOTÃO ELIMINAR) */}
      <Dialog open={isNotaDialogOpen} onOpenChange={setIsNotaDialogOpen}>
        <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{isEditingNota ? "Editar Nota" : "Nova Nota"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
                <div className="space-y-1">
                    <Label>Disciplina</Label>
                    <Select value={notaForm.Disc_id} onValueChange={val => setNotaForm({...notaForm, Disc_id: val})} disabled={isEditingNota}>
                        <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>
                            {disciplinas.map((disc) => (<SelectItem key={disc.Disc_id} value={disc.Disc_id.toString()}>{disc.Nome}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1"><Label>1º Período</Label><Input type="number" value={notaForm.Nota_1P} onChange={e => setNotaForm({...notaForm, Nota_1P: e.target.value})}/></div>
                    <div className="space-y-1"><Label>2º Período</Label><Input type="number" value={notaForm.Nota_2P} onChange={e => setNotaForm({...notaForm, Nota_2P: e.target.value})}/></div>
                    <div className="space-y-1"><Label>3º Período</Label><Input type="number" value={notaForm.Nota_3P} onChange={e => setNotaForm({...notaForm, Nota_3P: e.target.value})}/></div>
                </div>
                <div className="space-y-1"><Label>Nota Final</Label><Input type="number" className="font-bold" value={notaForm.Nota_Final} onChange={e => setNotaForm({...notaForm, Nota_Final: e.target.value})}/></div>
                <div className="space-y-1"><Label>Ano Letivo</Label><Input value={notaForm.Ano_letivo} onChange={e => setNotaForm({...notaForm, Ano_letivo: e.target.value})}/></div>
            </div>
            
            {/* BOTÕES COM OPÇÃO ELIMINAR */}
            <div className="flex justify-between items-center mt-2">
                {isEditingNota ? (
                    <Button variant="destructive" size="sm" onClick={handleDeleteGrade}>
                        Eliminar
                    </Button>
                ) : (
                    <div></div> // Espaço vazio para manter o layout
                )}
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsNotaDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveNota}>Guardar</Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* ALERT DELETE STUDENT */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O aluno será eliminado permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive hover:bg-destructive/90">Sim, eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Students;