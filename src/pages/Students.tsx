import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, Loader2, Plus, Search, User, 
  Pencil, Trash2, Save, X, BookOpen, Mail, MapPin, Phone, School, 
  ChevronLeft, ChevronRight, Filter, ArrowUpDown, 
  Download, Upload, FileSpreadsheet, CalendarDays 
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
  Turma_Ano: number;
  Turma_Letra: string;
  Telefone: string;
  EE_Nome: string;
  EE_Telefone?: string;
  EE_Email?: string;
  EE_Morada?: string;
  EE_Relacao?: string;
}

interface AlunoForm {
    Nome: string;
    Data_Nasc: string;
    Telefone: string;
    Genero: "M" | "F";
    Turma_id: string; 
    EE_Nome: string;
    EE_Telefone: string;
    EE_Email: string;
    EE_Morada: string;
    EE_Relacao: string;
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

interface Turma {
    Turma_id: number;
    Ano: number;
    Turma: string;
    AnoLetivo?: string;
}

const Students = () => {
  // --- ESTADOS GERAIS ---
  const [alunos, setAlunos] = useState<AlunoListagem[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]); 
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [filtroTurma, setFiltroTurma] = useState<string>("Todas");
  const [filtroAnoLetivo, setFiltroAnoLetivo] = useState<string>(""); 
  const [anosLetivosDisponiveis, setAnosLetivosDisponiveis] = useState<string[]>([]); 
  const [sortBy, setSortBy] = useState<"id" | "name">("id");
  const limit = 100;

  const [selectedStudent, setSelectedStudent] = useState<AlunoListagem | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState<(AlunoListagem & { Turma_id?: string }) | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  const [notas, setNotas] = useState<Nota[]>([]);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [anoLetivoNotaFiltro, setAnoLetivoNotaFiltro] = useState<string>("Todos");
  const [anosDisponiveisNotas, setAnosDisponiveisNotas] = useState<string[]>([]);
  
  const [isNotaDialogOpen, setIsNotaDialogOpen] = useState(false);
  const [isEditingNota, setIsEditingNota] = useState(false);
  const [notaForm, setNotaForm] = useState({
    Nota_id: 0, Disc_id: "", Nota_1P: "", Nota_2P: "", Nota_3P: "", Nota_Ex: "", Nota_Final: "",
    Ano_letivo: "2024/2025"
  });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<AlunoForm>({
      Nome: "", Data_Nasc: "", Telefone: "", Genero: "M", Turma_id: "", 
      EE_Nome: "", EE_Telefone: "", EE_Email: "", EE_Morada: "", EE_Relacao: ""
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAnosLetivos = async () => {
      try {
          const response = await fetch("http://127.0.0.1:8000/students/anos-letivos");
          if (response.ok) {
              const data = await response.json();
              setAnosLetivosDisponiveis(data);
              if (data.length > 0 && !filtroAnoLetivo) setFiltroAnoLetivo(data[0]);
          }
      } catch (error) { console.error("Erro anos letivos", error); }
  };

  const fetchStudents = async () => {
    setLoading(true); 
    try {
      const skip = (page - 1) * limit;
      let url = `http://127.0.0.1:8000/students/?skip=${skip}&limit=${limit}&sort_by=${sortBy}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
      if (filtroTurma && filtroTurma !== "Todas") url += `&turma_id=${filtroTurma}`;
      if (filtroAnoLetivo) url += `&ano_letivo=${filtroAnoLetivo}`;

      const response = await fetch(url);
      setAlunos(await response.json());
    } catch (error) { console.error("Erro busca alunos", error); } finally { setLoading(false); }
  };

  const fetchDisciplines = async () => {
      try {
          const response = await fetch("http://127.0.0.1:8000/students/disciplinas/list");
          if (response.ok) setDisciplinas(await response.json());
      } catch (error) { console.error("Erro disciplinas", error); }
  };

  // MUDANÇA: Agora filtra as turmas pelo ano letivo para evitar duplicados e listas vazias
  const fetchTurmas = async (ano?: string) => {
      try {
          const url = ano && ano !== "Todos" 
            ? `http://127.0.0.1:8000/students/turmas/list?ano_letivo=${ano}` 
            : "http://127.0.0.1:8000/students/turmas/list";
          const response = await fetch(url);
          if (response.ok) setTurmas(await response.json());
      } catch (error) { console.error("Erro turmas", error); }
  };

  useEffect(() => {
      fetchDisciplines();
      fetchAnosLetivos(); 
  }, []);

  // Recarregar turmas quando o ano letivo mudar
  useEffect(() => {
      fetchTurmas(filtroAnoLetivo);
      setFiltroTurma("Todas"); 
  }, [filtroAnoLetivo]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => fetchStudents(), 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, page, filtroTurma, sortBy, filtroAnoLetivo]); 

  const fetchGrades = async (studentId: number) => {
    setLoadingNotas(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/students/${studentId}/grades`);
      if (response.ok) {
        const data: Nota[] = await response.json();
        setNotas(data);
        setAnosDisponiveisNotas(Array.from(new Set(data.map(n => n.Ano_letivo))).sort().reverse());
      }
    } catch (error) { console.error("Erro notas", error); } finally { setLoadingNotas(false); }
  };

  const handleOpenProfile = (aluno: AlunoListagem) => {
    setSelectedStudent(aluno);
    setIsEditingProfile(false);
    setIsProfileOpen(true);
    setNotas([]);
    fetchGrades(aluno.Aluno_id);
  };

  const handleNextPage = () => { if (alunos.length === limit) setPage(p => p + 1); };
  const handlePrevPage = () => { if (page > 1) setPage(p => p - 1); };

  const handleDownloadTemplate = () => { window.open("http://127.0.0.1:8000/students/data/template", "_blank"); };
  const handleExportData = () => {
      let url = "http://127.0.0.1:8000/students/data/export";
      if (filtroAnoLetivo && filtroAnoLetivo !== "Todos") url += `?ano_letivo=${encodeURIComponent(filtroAnoLetivo)}`;
      window.open(url, "_blank");
  };
  const handleImportClick = () => { fileInputRef.current?.click(); };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      try {
          setLoading(true);
          const response = await fetch("http://127.0.0.1:8000/students/data/import", { method: "POST", body: formDataUpload });
          const data = await response.json();
          alert(data.message);
          fetchStudents();
      } catch (error) { alert("Erro ao enviar ficheiro."); } finally {
          setLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
      }
  };

  // MUDANÇA: Lógica de criação corrigida para evitar erro 422 e garantir matrícula
  const handleCreateSubmit = async () => {
      if (!formData.Turma_id) { alert("Selecione uma turma."); return; }
      if (!formData.EE_Nome) { alert("Dados do EE obrigatórios."); return; }

      const turmaSelecionada = turmas.find(t => t.Turma_id.toString() === formData.Turma_id);
      
      const payload = {
          Nome: formData.Nome,
          Data_Nasc: formData.Data_Nasc,
          Telefone: formData.Telefone || null,
          Genero: formData.Genero,
          Ano: Number(turmaSelecionada?.Ano),
          Turma_Letra: turmaSelecionada?.Turma || "A",
          EE_Nome: formData.EE_Nome,
          EE_Telefone: formData.EE_Telefone,
          EE_Email: formData.EE_Email || null,
          EE_Morada: formData.EE_Morada || null,
          EE_Relacao: formData.EE_Relacao || "Pai/Mãe"
      };

      try {
        const response = await fetch("http://127.0.0.1:8000/students/", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        if (response.ok) {
            setCreateDialogOpen(false);
            fetchStudents(); 
            alert("Aluno matriculado com sucesso.");
            setFormData({ Nome: "", Data_Nasc: "", Telefone: "", Genero: "M", Turma_id: "", EE_Nome: "", EE_Telefone: "", EE_Email: "", EE_Morada: "", EE_Relacao: "" });
        } else { alert("Erro ao criar aluno. Verifique os dados."); }
      } catch (error) { console.error(error); }
  };

  const handleStartEditingProfile = () => {
    if (selectedStudent) {
        const turmaAtual = turmas.find(t => t.Ano === selectedStudent.Turma_Ano && t.Turma === selectedStudent.Turma_Letra);
        setEditProfileData({ ...selectedStudent, Turma_id: turmaAtual ? turmaAtual.Turma_id.toString() : "" });
        setIsEditingProfile(true);
    }
  };

  const handleSaveProfile = async () => {
      if (!editProfileData || !selectedStudent) return;
      const turmaSelecionada = turmas.find(t => t.Turma_id.toString() === editProfileData.Turma_id);
      try {
          const payload = {
              Nome: editProfileData.Nome, Telefone: editProfileData.Telefone, Data_Nasc: editProfileData.Data_Nasc, Genero: editProfileData.Genero,
              Ano: turmaSelecionada?.Ano, Turma_Letra: turmaSelecionada?.Turma,
              EE_Nome: editProfileData.EE_Nome, EE_Telefone: editProfileData.EE_Telefone, EE_Email: editProfileData.EE_Email, EE_Morada: editProfileData.EE_Morada, EE_Relacao: editProfileData.EE_Relacao
          };
          const response = await fetch(`http://127.0.0.1:8000/students/${selectedStudent.Aluno_id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (response.ok) {
              const updatedAluno = await response.json();
              setSelectedStudent(updatedAluno);
              setAlunos(alunos.map(a => a.Aluno_id === updatedAluno.Aluno_id ? updatedAluno : a));
              setIsEditingProfile(false);
          } else { alert("Erro ao atualizar."); }
      } catch (error) { console.error(error); }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    try {
        const response = await fetch(`http://127.0.0.1:8000/students/${selectedStudent.Aluno_id}`, { method: 'DELETE' });
        if (response.ok) {
            setAlunos(alunos.filter(a => a.Aluno_id !== selectedStudent.Aluno_id));
            setDeleteAlertOpen(false); setIsProfileOpen(false);
            alert("Aluno eliminado.");
        } else { alert("Erro ao eliminar."); }
    } catch (error) { console.error(error); }
  };

  const handleOpenAddNota = () => {
      setIsEditingNota(false);
      setNotaForm({ Nota_id: 0, Disc_id: "", Nota_1P: "", Nota_2P: "", Nota_3P: "", Nota_Ex: "", Nota_Final: "", Ano_letivo: filtroAnoLetivo || "2024/2025" });
      setIsNotaDialogOpen(true);
  };

  const handleOpenEditNota = (nota: Nota) => {
      setIsEditingNota(true);
      setNotaForm({ Nota_id: nota.Nota_id, Disc_id: nota.Disc_id.toString(), Nota_1P: nota.Nota_1P?.toString() || "", Nota_2P: nota.Nota_2P?.toString() || "", Nota_3P: nota.Nota_3P?.toString() || "", Nota_Ex: nota.Nota_Ex?.toString() || "", Nota_Final: nota.Nota_Final?.toString() || "", Ano_letivo: nota.Ano_letivo });
      setIsNotaDialogOpen(true);
  };

  const handleDeleteGrade = async () => {
      if (!isEditingNota || notaForm.Nota_id === 0) return;
      if (!confirm("Eliminar nota?")) return;
      try {
          const response = await fetch(`http://127.0.0.1:8000/students/grades/${notaForm.Nota_id}`, { method: 'DELETE' });
          if (response.ok) { setIsNotaDialogOpen(false); if (selectedStudent) fetchGrades(selectedStudent.Aluno_id); }
      } catch (error) { console.error(error); }
  };

  const handleSaveNota = async () => {
    if (!selectedStudent) return;
    const payload = {
        Disc_id: parseInt(notaForm.Disc_id), Nota_1P: notaForm.Nota_1P ? parseInt(notaForm.Nota_1P) : null, Nota_2P: notaForm.Nota_2P ? parseInt(notaForm.Nota_2P) : null, Nota_3P: notaForm.Nota_3P ? parseInt(notaForm.Nota_3P) : null,
        Nota_Ex: notaForm.Nota_Ex ? parseInt(notaForm.Nota_Ex) : null, Nota_Final: notaForm.Nota_Final ? parseInt(notaForm.Nota_Final) : null, Ano_letivo: notaForm.Ano_letivo
    };
    try {
        let url = isEditingNota ? `http://127.0.0.1:8000/students/grades/${notaForm.Nota_id}` : `http://127.0.0.1:8000/students/${selectedStudent.Aluno_id}/grades`;
        const method = isEditingNota ? "PUT" : "POST";
        const response = await fetch(url, { method: method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (response.ok) { setIsNotaDialogOpen(false); fetchGrades(selectedStudent.Aluno_id); } 
        else { alert("Erro ao salvar nota."); }
    } catch (error) { console.error(error); }
  };

  const notasFiltradas = anoLetivoNotaFiltro === "Todos" ? notas : notas.filter(n => n.Ano_letivo === anoLetivoNotaFiltro);

  return (
    <div className="space-y-6 fade-in p-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight">Gestão de Alunos</h1><p className="text-muted-foreground">Listagem e gestão de matrículas escolar.</p></div>
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />
            <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2"><FileSpreadsheet size={16} /> Template</Button>
            <Button variant="outline" onClick={handleImportClick} className="gap-2"><Upload size={16} /> Importar</Button>
            <Button variant="outline" onClick={handleExportData} className="gap-2"><Download size={16} /> Exportar</Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild><Button className="flex gap-2 bg-blue-600 hover:bg-blue-700"><Plus size={18} /> Novo Aluno</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                 <DialogHeader><DialogTitle>Ficha de Matrícula</DialogTitle></DialogHeader>
                 <div className="space-y-4 py-2">
                    <div className="bg-muted/30 p-3 rounded border">
                        <h3 className="font-semibold text-sm mb-2 text-primary">Dados do Aluno</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2"><Label>Nome Completo</Label><Input value={formData.Nome} onChange={(e) => setFormData({...formData, Nome: e.target.value})} /></div>
                            <div><Label>Data Nascimento</Label><Input type="date" value={formData.Data_Nasc} onChange={(e) => setFormData({...formData, Data_Nasc: e.target.value})} /></div>
                            <div><Label>Género</Label><Select value={formData.Genero} onValueChange={(val: "M"|"F") => setFormData({...formData, Genero: val})}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem></SelectContent></Select></div>
                            <div className="col-span-2"><Label>Turma (Inscrição Atual)</Label><Select value={formData.Turma_id} onValueChange={(v) => setFormData({...formData, Turma_id: v})}><SelectTrigger><SelectValue placeholder="Selecione a Turma" /></SelectTrigger><SelectContent>{turmas.map(t => (<SelectItem key={t.Turma_id} value={t.Turma_id.toString()}>{t.Ano}º {t.Turma}</SelectItem>))}</SelectContent></Select></div>
                        </div>
                    </div>
                    <div className="bg-muted/30 p-3 rounded border">
                        <h3 className="font-semibold text-sm mb-2 text-primary">Encarregado de Educação (Obrigatório)</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2"><Label>Nome Completo *</Label><Input value={formData.EE_Nome} onChange={(e) => setFormData({...formData, EE_Nome: e.target.value})} /></div>
                            <div><Label>Telefone *</Label><Input value={formData.EE_Telefone} onChange={(e) => setFormData({...formData, EE_Telefone: e.target.value})} /></div>
                            <div><Label>Relação *</Label><Input value={formData.EE_Relacao} onChange={(e) => setFormData({...formData, EE_Relacao: e.target.value})} /></div>
                            <div className="col-span-2"><Label>Email *</Label><Input value={formData.EE_Email} onChange={(e) => setFormData({...formData, EE_Email: e.target.value})} /></div>
                            <div className="col-span-2"><Label>Morada *</Label><Input value={formData.EE_Morada} onChange={(e) => setFormData({...formData, EE_Morada: e.target.value})} /></div>
                        </div>
                    </div>
                 </div>
                 <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button><Button onClick={handleCreateSubmit}>Confirmar Matrícula</Button></div>
              </DialogContent>
            </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle className="text-lg flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" />Listagem Geral</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                <div className="w-[160px]"><Select value={filtroAnoLetivo} onValueChange={(val) => { setFiltroAnoLetivo(val); setPage(1); }}><SelectTrigger className="h-9"><CalendarDays size={14} className="mr-2 text-muted-foreground"/><SelectValue placeholder="Ano Letivo"/></SelectTrigger><SelectContent>{anosLetivosDisponiveis.map(ano => (<SelectItem key={ano} value={ano}>{ano}</SelectItem>))}</SelectContent></Select></div>
                <div className="w-[140px]"><Select value={sortBy} onValueChange={(val: "id" | "name") => setSortBy(val)}><SelectTrigger className="h-9"><ArrowUpDown size={14} className="mr-2 text-muted-foreground"/><SelectValue placeholder="Ordenar" /></SelectTrigger><SelectContent><SelectItem value="id">Por ID</SelectItem><SelectItem value="name">Por Nome</SelectItem></SelectContent></Select></div>
                <div className="w-[160px]"><Select value={filtroTurma} onValueChange={(val) => { setFiltroTurma(val); setPage(1); }}><SelectTrigger className="h-9"><Filter size={14} className="mr-2 text-muted-foreground"/><SelectValue placeholder="Filtrar Turma" /></SelectTrigger><SelectContent><SelectItem value="Todas">Todas</SelectItem>{turmas.map(t => (<SelectItem key={t.Turma_id} value={t.Turma_id.toString()}>{t.Ano}º {t.Turma}</SelectItem>))}</SelectContent></Select></div>
                <div className="relative w-64"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Procurar aluno..." className="pl-8 h-9" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} /></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (<div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>) : (
            <><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Nome</TableHead><TableHead>Turma no Ano</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                <TableBody>{alunos.length === 0 ? (<TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Sem resultados encontrados.</TableCell></TableRow>) : (alunos.map((aluno) => (<TableRow key={aluno.Aluno_id}><TableCell>#{aluno.Aluno_id}</TableCell><TableCell><div className="font-medium">{aluno.Nome}</div><div className="text-xs text-muted-foreground">{aluno.Data_Nasc}</div></TableCell><TableCell><Badge variant="outline">{aluno.Turma_Desc}</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleOpenProfile(aluno)}>Ver Perfil</Button></TableCell></TableRow>)))}</TableBody>
            </Table>
            <div className="flex justify-between items-center mt-4 border-t pt-2"><div className="text-sm text-muted-foreground">Página {page}</div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page === 1}><ChevronLeft size={16} className="mr-1"/> Anterior</Button><Button variant="outline" size="sm" onClick={handleNextPage} disabled={alunos.length < limit}>Próximo <ChevronRight size={16} className="ml-1"/></Button></div></div></>)}
        </CardContent>
      </Card>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-xl max-h-[95vh] overflow-y-auto"> 
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-xl"><User className="h-6 w-6 text-primary" />{isEditingProfile ? "A Editar Perfil" : "Perfil do Aluno"}</DialogTitle></DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border">
                <div className="w-full mr-4">{isEditingProfile && editProfileData ? (<Input value={editProfileData.Nome} onChange={(e) => setEditProfileData({...editProfileData, Nome: e.target.value})} className="font-bold text-lg bg-white"/>) : (<><h3 className="font-bold text-lg">{selectedStudent.Nome}</h3><p className="text-sm text-muted-foreground">ID: #{selectedStudent.Aluno_id}</p></>)}</div>
                <Badge className="text-base px-3 py-1" variant={selectedStudent.Turma_Desc === "Sem Turma" ? "secondary" : "default"}>{selectedStudent.Turma_Desc}</Badge>
              </div>
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6"><TabsTrigger value="info">Informações</TabsTrigger><TabsTrigger value="notas">Notas & Avaliações</TabsTrigger></TabsList>
                <TabsContent value="info" className="space-y-6">
                    <div className="space-y-3"><h4 className="font-semibold border-b pb-2 text-sm text-muted-foreground uppercase tracking-wide">Dados Pessoais</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1"><Label className="text-xs font-medium text-muted-foreground">Data de Nascimento</Label>{isEditingProfile && editProfileData ? (<Input type="date" value={editProfileData.Data_Nasc} onChange={e => setEditProfileData({...editProfileData, Data_Nasc: e.target.value})} className="h-8"/>) : (<div className="text-sm">{selectedStudent.Data_Nasc}</div>)}</div>
                            <div className="space-y-1"><Label className="text-xs font-medium text-muted-foreground">Género</Label>{isEditingProfile && editProfileData ? (<Select value={editProfileData.Genero} onValueChange={(val: any) => setEditProfileData({...editProfileData, Genero: val})}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem></SelectContent></Select>) : (<div className="text-sm">{selectedStudent.Genero === 'M' ? 'Masculino' : 'Feminino'}</div>)}</div>
                        </div>
                    </div>
                    <div className="space-y-3"><h4 className="font-semibold border-b pb-2 text-sm text-muted-foreground uppercase flex items-center gap-2"><School size={14}/> Dados Escolares</h4>
                        <div>{isEditingProfile && editProfileData ? (<div className="space-y-1"><Label className="text-xs font-medium text-muted-foreground">Turma</Label><Select value={editProfileData.Turma_id || ""} onValueChange={(v) => setEditProfileData({...editProfileData, Turma_id: v})}><SelectTrigger className="h-8"><SelectValue placeholder="Selecione a Turma..." /></SelectTrigger><SelectContent>{turmas.map(t => (<SelectItem key={t.Turma_id} value={t.Turma_id.toString()}>{t.Ano}º {t.Turma}</SelectItem>))}</SelectContent></Select></div>) : (<div className="grid grid-cols-2 gap-4"><div className="space-y-1"><Label className="text-xs font-medium text-muted-foreground">Ano</Label><div className="text-sm">{selectedStudent.Turma_Ano ? `${selectedStudent.Turma_Ano}º` : "-"}</div></div><div className="space-y-1"><Label className="text-xs font-medium text-muted-foreground">Turma</Label><div className="text-sm">{selectedStudent.Turma_Letra || "-"}</div></div></div>)}</div>
                    </div>
                    <div className="space-y-3"><h4 className="font-semibold border-b pb-2 text-sm text-muted-foreground uppercase tracking-wide">Família & Contactos (EE)</h4>
                        <div className="grid gap-3">
                            <div><Label className="text-xs font-medium text-muted-foreground">Nome Encarregado Educação</Label>{isEditingProfile && editProfileData ? (<Input value={editProfileData.EE_Nome} onChange={e => setEditProfileData({...editProfileData, EE_Nome: e.target.value})} className="h-8"/>) : (<p className="text-sm font-medium">{selectedStudent.EE_Nome}</p>)}</div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><Label className="text-xs font-medium text-muted-foreground">Telefone EE</Label>{isEditingProfile && editProfileData ? (<Input value={editProfileData.EE_Telefone || ""} onChange={e => setEditProfileData({...editProfileData, EE_Telefone: e.target.value})} className="h-8"/>) : (<p className="text-sm flex items-center gap-2"><Phone size={12}/> {selectedStudent.EE_Telefone || "N/A"}</p>)}</div>
                                <div><Label className="text-xs font-medium text-muted-foreground">Relação</Label>{isEditingProfile && editProfileData ? (<Input value={editProfileData.EE_Relacao || ""} onChange={e => setEditProfileData({...editProfileData, EE_Relacao: e.target.value})} className="h-8"/>) : (<p className="text-sm">{selectedStudent.EE_Relacao || "N/A"}</p>)}</div>
                            </div>
                            <div><Label className="text-xs font-medium text-muted-foreground">Email EE</Label>{isEditingProfile && editProfileData ? (<Input value={editProfileData.EE_Email || ""} onChange={e => setEditProfileData({...editProfileData, EE_Email: e.target.value})} className="h-8"/>) : (<p className="text-sm flex items-center gap-2"><Mail size={12}/> {selectedStudent.EE_Email || "N/A"}</p>)}</div>
                            <div><Label className="text-xs font-medium text-muted-foreground">Morada</Label>{isEditingProfile && editProfileData ? (<Input value={editProfileData.EE_Morada || ""} onChange={e => setEditProfileData({...editProfileData, EE_Morada: e.target.value})} className="h-8"/>) : (<p className="text-sm flex items-center gap-2"><MapPin size={12}/> {selectedStudent.EE_Morada || "N/A"}</p>)}</div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-6 mt-2 border-t">{isEditingProfile ? (<><Button variant="ghost" onClick={() => setIsEditingProfile(false)}><X size={16} className="mr-2" /> Cancelar</Button><Button onClick={handleSaveProfile} className="bg-green-600 hover:bg-green-700"><Save size={16} className="mr-2" /> Guardar</Button></>) : (<><Button variant="destructive" size="sm" onClick={() => setDeleteAlertOpen(true)}><Trash2 size={16} className="mr-2" /> Eliminar</Button><div className="flex gap-2"><Button variant="outline" onClick={() => setIsProfileOpen(false)}>Fechar</Button><Button onClick={handleStartEditingProfile}><Pencil size={16} className="mr-2" /> Editar</Button></div></>)}</div>
                </TabsContent>
                <TabsContent value="notas" className="space-y-4">
                    <div className="flex justify-between items-center bg-muted/30 p-2 rounded-md border"><div className="flex items-center gap-2"><Label className="text-xs">Ano:</Label><Select value={anoLetivoNotaFiltro} onValueChange={setAnoLetivoNotaFiltro}><SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem>{anosDisponiveisNotas.map(ano => <SelectItem key={ano} value={ano}>{ano}</SelectItem>)}</SelectContent></Select></div><Button size="sm" onClick={handleOpenAddNota} className="gap-2"><Plus size={14} /> Nota</Button></div>
                    <div className="border rounded-md max-h-[400px] overflow-y-auto">{loadingNotas ? (<div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>) : notas.length === 0 ? (<div className="text-center py-10 text-muted-foreground">Sem registos de notas.</div>) : (
                            <Table><TableHeader><TableRow><TableHead>Disciplina</TableHead><TableHead className="w-[80px]">Ano</TableHead><TableHead className="text-center w-[40px]">1P</TableHead><TableHead className="text-center w-[40px]">2P</TableHead><TableHead className="text-center w-[40px]">3P</TableHead><TableHead className="text-center font-bold w-[40px]">Final</TableHead><TableHead className="w-[40px]"></TableHead></TableRow></TableHeader>
                                <TableBody>{notasFiltradas.map((nota) => (<TableRow key={nota.Nota_id}><TableCell className="font-medium flex items-center gap-2"><BookOpen size={14} className="text-muted-foreground"/>{nota.Disciplina_Nome}</TableCell><TableCell className="text-xs text-muted-foreground">{nota.Ano_letivo}</TableCell><TableCell className="text-center">{nota.Nota_1P ?? "-"}</TableCell><TableCell className="text-center">{nota.Nota_2P ?? "-"}</TableCell><TableCell className="text-center">{nota.Nota_3P ?? "-"}</TableCell><TableCell className="text-center font-bold bg-muted/50">{nota.Nota_Final ?? "-"}</TableCell><TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditNota(nota)}><Pencil size={14} className="text-muted-foreground" /></Button></TableCell></TableRow>))}</TableBody>
                            </Table>)}
                    </div>
                </TabsContent>
              </Tabs>
            </div>)}
        </DialogContent>
      </Dialog>

      <Dialog open={isNotaDialogOpen} onOpenChange={setIsNotaDialogOpen}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{isEditingNota ? "Editar Nota" : "Nova Nota"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
                <div className="space-y-1"><Label>Disciplina</Label><Select value={notaForm.Disc_id} onValueChange={val => setNotaForm({...notaForm, Disc_id: val})} disabled={isEditingNota}><SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger><SelectContent>{disciplinas.map((disc) => (<SelectItem key={disc.Disc_id} value={disc.Disc_id.toString()}>{disc.Nome}</SelectItem>))}</SelectContent></Select></div>
                <div className="grid grid-cols-3 gap-2"><div className="space-y-1"><Label>1ºP</Label><Input type="number" value={notaForm.Nota_1P} onChange={e => setNotaForm({...notaForm, Nota_1P: e.target.value})}/></div><div className="space-y-1"><Label>2ºP</Label><Input type="number" value={notaForm.Nota_2P} onChange={e => setNotaForm({...notaForm, Nota_2P: e.target.value})}/></div><div className="space-y-1"><Label>3ºP</Label><Input type="number" value={notaForm.Nota_3P} onChange={e => setNotaForm({...notaForm, Nota_3P: e.target.value})}/></div></div>
                <div className="space-y-1"><Label>Final</Label><Input type="number" className="font-bold" value={notaForm.Nota_Final} onChange={e => setNotaForm({...notaForm, Nota_Final: e.target.value})}/></div>
                <div className="space-y-1"><Label>Ano Letivo</Label><Input value={notaForm.Ano_letivo} onChange={e => setNotaForm({...notaForm, Ano_letivo: e.target.value})}/></div>
            </div>
            <div className="flex justify-between items-center mt-2">{isEditingNota ? (<Button variant="destructive" size="sm" onClick={handleDeleteGrade}>Apagar</Button>) : (<div></div>)}<div className="flex gap-2"><Button variant="outline" onClick={() => setIsNotaDialogOpen(false)}>Cancelar</Button><Button onClick={handleSaveNota}>Salvar</Button></div></div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Tem a certeza absoluta?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. O aluno será eliminado permanentemente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive hover:bg-destructive/90">Sim, eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
};

export default Students;