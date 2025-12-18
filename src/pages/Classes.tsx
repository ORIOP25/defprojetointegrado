import { useState, useEffect, useMemo } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Users, BookOpen, GraduationCap, School, CalendarDays, Edit, Plus, Trash2, Save, X, Loader2, Sparkles, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // Importado o hook de notificações

// --- TYPES ATUALIZADOS ---
interface TurmaBasic { id: number; nome: string; ano_letivo: string; }
interface ProfessorDisc { disciplina_id: number; disciplina: string; professor: string; professor_id: number; }
interface Aluno { id: number; nome: string; }

interface Nota { 
    aluno_id: number; 
    aluno_nome: string; 
    disciplina_id: number; 
    disciplina_nome: string; 
    p1: number; 
    p2: number; 
    p3: number; 
    exame: number; 
    final: number; 
}

interface TurmaDetails { info: { id: number; nome: string; ano_letivo: string; diretor: string }; professores: ProfessorDisc[]; alunos: Aluno[]; notas: Nota[]; }
interface DisciplinaOption { Disc_id: number; Nome: string; Categoria: string; }
interface StaffOption { id: number; Nome: string; Departamento: string; }

const ClassesPage = () => {
  const { toast } = useToast();
  const [turmasList, setTurmasList] = useState<TurmaBasic[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>("");
  const [details, setDetails] = useState<TurmaDetails | null>(null);
  
  // Estados de Notas
  const [selectedDiscForGrades, setSelectedDiscForGrades] = useState<string>("all");
  const [isEditingGrades, setIsEditingGrades] = useState(false);
  const [tempGrades, setTempGrades] = useState<Nota[]>([]);
  const [isSavingGrades, setIsSavingGrades] = useState(false);

  // Estados Profs
  const [isEditingProfs, setIsEditingProfs] = useState(false);
  const [allDisciplinas, setAllDisciplinas] = useState<DisciplinaOption[]>([]);
  const [allProfessores, setAllProfessores] = useState<StaffOption[]>([]);
  const [editedProfs, setEditedProfs] = useState<ProfessorDisc[]>([]);

  // Estados Transição
  const [isGlobalTransitionOpen, setIsGlobalTransitionOpen] = useState(false);
  const [isProcessingGlobal, setIsProcessingGlobal] = useState(false);

  // Init
  useEffect(() => {
    api.get("/turmas/").then(res => setTurmasList(res.data)).catch(console.error);
    api.get("/disciplinas/").then(res => setAllDisciplinas(res.data)).catch(console.error);
    api.get("/staff/?limit=1000").then(res => {
        const teachers = res.data.filter((s:any) => s.role === 'teacher');
        setAllProfessores(teachers);
    }).catch(console.error);
  }, []);

  const availableYears = useMemo(() => Array.from(new Set(turmasList.map(t => t.ano_letivo))).sort().reverse(), [turmasList]);
  const availableClasses = useMemo(() => selectedYear ? turmasList.filter(t => t.ano_letivo === selectedYear) : [], [selectedYear, turmasList]);

  // Load Details
  const loadDetails = () => {
    if (!selectedTurmaId) return;
    setLoading(true);
    api.get(`/turmas/${selectedTurmaId}/details`).then(res => {
        setDetails(res.data);
        const currentDiscStillExists = res.data.professores.some((p:any) => p.disciplina_id.toString() === selectedDiscForGrades);
        if (res.data.professores.length > 0) {
            if (selectedDiscForGrades === "all" || !currentDiscStillExists) {
                 setSelectedDiscForGrades(res.data.professores[0].disciplina_id.toString());
            }
        } else { setSelectedDiscForGrades("all"); }
        setEditedProfs(res.data.professores); 
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadDetails(); }, [selectedTurmaId]);
  const handleYearChange = (year: string) => { setSelectedYear(year); setSelectedTurmaId(""); setDetails(null); };

  // EXPORT
  const handleExportTurma = () => {
      if (!selectedTurmaId) return;
      window.open(`http://127.0.0.1:8000/turmas/${selectedTurmaId}/export`, "_blank");
  };

  // GLOBAL TRANSITION ATUALIZADO
  const handleGlobalTransition = async () => {
    setIsProcessingGlobal(true);
    try {
        const res = await api.post("/turmas/transitar-global", {}); 
        setIsGlobalTransitionOpen(false);
        
        toast({
            title: "Sucesso!",
            description: `Transição concluída. Novo Ano: ${res.data.novo_ano}. Transitados: ${res.data.detalhes.transitados}`,
        });

        setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
        // Captura a mensagem de erro do backend (ex: notas em falta)
        const errorMessage = error.response?.data?.detail || "Falha na transição de ano.";
        toast({
            variant: "destructive",
            title: "Transição Bloqueada",
            description: errorMessage,
        });
    } finally {
        setIsProcessingGlobal(false);
    }
  };

  // --- GRADES LOGIC ---
  const viewGrades = useMemo(() => details?.notas.filter(n => n.disciplina_id.toString() === selectedDiscForGrades) || [], [details, selectedDiscForGrades]);
  
  const startEditingGrades = () => { setTempGrades(JSON.parse(JSON.stringify(viewGrades))); setIsEditingGrades(true); };
  const cancelEditingGrades = () => { setIsEditingGrades(false); setTempGrades([]); };
  
  const handleTempGradeChange = (alunoId: number, field: keyof Nota, value: string) => {
    const valInt = value === "" ? 0 : parseInt(value);
    if (isNaN(valInt) || valInt < 0 || valInt > 20) return;
    setTempGrades(prev => prev.map(n => n.aluno_id === alunoId ? { ...n, [field]: valInt } : n));
  };
  
  const saveGrades = async () => {
    setIsSavingGrades(true);
    try {
        const promises = tempGrades.map(n => api.post(`/turmas/${selectedTurmaId}/notas`, { 
            aluno_id: n.aluno_id, 
            disciplina_id: parseInt(selectedDiscForGrades), 
            p1: n.p1, p2: n.p2, p3: n.p3, 
            exame: n.exame,
            final: n.final 
        }));
        await Promise.all(promises); 
        toast({ title: "Sucesso", description: "Pauta guardada corretamente." });
        setIsEditingGrades(false); 
        loadDetails(); 
    } catch (e) { 
        toast({ variant: "destructive", title: "Erro", description: "Erro ao guardar notas." });
    } finally { setIsSavingGrades(false); }
  };

  // --- PROFS LOGIC ---
  const addDisciplinaToEdit = () => { setEditedProfs([...editedProfs, { disciplina_id: 0, disciplina: "", professor: "", professor_id: 0 }]); };
  const removeDisciplinaFromEdit = (index: number) => { const l = [...editedProfs]; l.splice(index, 1); setEditedProfs(l); };
  const updateEditedProfRow = (index: number, field: 'disciplina_id' | 'professor_id', value: string) => {
    const l = [...editedProfs]; const v = parseInt(value);
    if (field === 'disciplina_id') {
        const d = allDisciplinas.find(i => i.Disc_id === v);
        l[index] = { ...l[index], disciplina_id: v, disciplina: d?.Nome || "", professor_id: 0, professor: "" };
    } else {
        const p = allProfessores.find(i => i.id === v);
        l[index] = { ...l[index], professor_id: v, professor: p?.Nome || "" };
    }
    setEditedProfs(l);
  };
  const handleSaveProfs = async () => {
    if (editedProfs.some(p => p.disciplina_id === 0 || p.professor_id === 0)) { 
        toast({ variant: "destructive", title: "Aviso", description: "Por favor, preencha todos os campos." });
        return; 
    }
    try { 
        await api.put(`/turmas/${selectedTurmaId}/professores`, { professores: editedProfs.map(p => ({ disciplina_id: p.disciplina_id, professor_id: p.professor_id })) }); 
        toast({ title: "Sucesso", description: "Equipa docente atualizada." });
        setIsEditingProfs(false); 
        loadDetails(); 
    } catch (e) { 
        toast({ variant: "destructive", title: "Erro", description: "Erro ao atualizar professores." });
    }
  };
  
  const getEligibleProfessors = (dId: number) => { const d = allDisciplinas.find(x => x.Disc_id === dId); return d ? allProfessores.filter(p => p.Departamento?.toLowerCase().includes(d.Categoria.toLowerCase())) : []; };
  const getAvailableDisciplinas = (idx: number) => allDisciplinas.filter(d => !editedProfs.filter((_, i) => i !== idx).map(p => p.disciplina_id).includes(d.Disc_id));
  const getAvailableTeachers = (idx: number, dId: number) => getEligibleProfessors(dId).filter(p => !editedProfs.filter((_, i) => i !== idx).map(x => x.professor_id).includes(p.id));
  
  const activeGradesList = isEditingGrades ? tempGrades : viewGrades;
  const mediaDisciplina = activeGradesList.length > 0 ? (activeGradesList.reduce((acc, curr) => acc + (curr.final || 0), 0) / activeGradesList.length).toFixed(1) : "N/A";

  return (
    <div className="space-y-6 fade-in p-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Turmas</h1>
          <p className="text-muted-foreground">Consulte professores, alunos e pautas.</p>
        </div>
        
        {/* GLOBAL TRANSITION BTN */}
        <Dialog open={isGlobalTransitionOpen} onOpenChange={setIsGlobalTransitionOpen}>
            <DialogTrigger asChild><Button className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-sm"><Sparkles size={18} /> Novo Ano Letivo</Button></DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Abertura Automática</DialogTitle><DialogDescription>O sistema analisará todas as notas e criará turmas para o próximo ano.</DialogDescription></DialogHeader>
                <div className="py-4 space-y-3 text-sm">
                    <p className="font-semibold text-amber-600 italic">Atenção: Todos os alunos devem ter notas finais lançadas para processar a transição.</p>
                    <p>Regras: 3+ negativas reprova (5-8º); 2+ (9º); Exames contam.</p>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setIsGlobalTransitionOpen(false)}>Cancelar</Button><Button onClick={handleGlobalTransition} disabled={isProcessingGlobal}>{isProcessingGlobal ? <Loader2 className="animate-spin"/> : "Processar"}</Button></DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
      
      {/* FILTROS */}
      <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto p-4 bg-card border rounded-lg shadow-sm">
          <div className="w-full sm:w-48 space-y-1"><label className="text-xs font-medium text-muted-foreground ml-1">Ano Letivo</label>
              <Select onValueChange={handleYearChange} value={selectedYear}><SelectTrigger><div className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-muted-foreground"/><SelectValue placeholder="Ano..." /></div></SelectTrigger><SelectContent>{availableYears.map(y => (<SelectItem key={y} value={y}>{y}</SelectItem>))}</SelectContent></Select>
          </div>
          <div className="w-full sm:w-64 space-y-1"><label className="text-xs font-medium text-muted-foreground ml-1">Turma</label>
              <Select onValueChange={setSelectedTurmaId} value={selectedTurmaId} disabled={!selectedYear}><SelectTrigger><div className="flex items-center gap-2"><School className="w-4 h-4 text-muted-foreground"/><SelectValue placeholder={selectedYear ? "Turma..." : "Ano primeiro"} /></div></SelectTrigger><SelectContent>{availableClasses.map(t => (<SelectItem key={t.id} value={t.id.toString()}>{t.nome}</SelectItem>))}</SelectContent></Select>
          </div>
      </div>

      {!selectedTurmaId && <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border border-dashed"><School className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Selecione uma turma.</p></div>}
      {loading && selectedTurmaId && <div className="text-center py-20 flex justify-center items-center gap-2"><Loader2 className="animate-spin"/> Carregando...</div>}

      {!loading && selectedTurmaId && details && (
        <div className="space-y-6 fade-in">
          
          <div className="flex flex-col sm:flex-row justify-between items-end border-b pb-2 gap-4">
             <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg text-primary"><GraduationCap size={24} /></div>
                <div><h2 className="text-2xl font-bold">Turma {details.info.nome}</h2><p className="text-sm text-muted-foreground">Ano Letivo {details.info.ano_letivo}</p></div>
             </div>
             <Button variant="outline" className="gap-2 border-green-200 hover:bg-green-50 text-green-700" onClick={handleExportTurma}><Download size={16} /> Exportar Dossier</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Diretor</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{details.info.diretor}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Alunos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{details.alunos.length}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Ano</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{details.info.nome.split("º")[0]}º Ano</div></CardContent></Card>
          </div>

          <Tabs defaultValue="professores" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4"><TabsTrigger value="professores">Equipa</TabsTrigger><TabsTrigger value="alunos">Alunos</TabsTrigger><TabsTrigger value="notas">Pautas</TabsTrigger></TabsList>

            <TabsContent value="professores">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5"/> Professores</CardTitle><Dialog open={isEditingProfs} onOpenChange={setIsEditingProfs}><DialogTrigger asChild><Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-2"/> Editar</Button></DialogTrigger><DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Editar Equipa</DialogTitle></DialogHeader><div className="space-y-2 py-4">{editedProfs.map((p, idx) => (<div key={idx} className="grid grid-cols-12 gap-2 items-center"><div className="col-span-5"><Select value={p.disciplina_id.toString()} onValueChange={(v) => updateEditedProfRow(idx, 'disciplina_id', v)}><SelectTrigger><SelectValue placeholder="Disciplina"/></SelectTrigger><SelectContent>{getAvailableDisciplinas(idx).concat(p.disciplina_id !== 0 && !getAvailableDisciplinas(idx).some(d => d.Disc_id === p.disciplina_id) ? [allDisciplinas.find(d => d.Disc_id === p.disciplina_id)!] : []).map(d => d && <SelectItem key={d.Disc_id} value={d.Disc_id.toString()}>{d.Nome}</SelectItem>)}</SelectContent></Select></div><div className="col-span-6"><Select value={p.professor_id ? p.professor_id.toString() : ""} onValueChange={(v) => updateEditedProfRow(idx, 'professor_id', v)} disabled={p.disciplina_id === 0}><SelectTrigger><SelectValue placeholder="Professor" /></SelectTrigger><SelectContent>{getAvailableTeachers(idx, p.disciplina_id).map(pf => (<SelectItem key={pf.id} value={pf.id.toString()}>{pf.Nome}</SelectItem>))}{p.professor_id !== 0 && !getAvailableTeachers(idx, p.disciplina_id).some(pf => pf.id === p.professor_id) && <SelectItem key={p.professor_id} value={p.professor_id.toString()}>{p.professor} (Atual)</SelectItem>}</SelectContent></Select></div><div className="col-span-1 flex justify-center"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeDisciplinaFromEdit(idx)}><Trash2 className="w-4 h-4"/></Button></div></div>))}<Button variant="outline" className="w-full mt-4" onClick={addDisciplinaToEdit}><Plus className="w-4 h-4 mr-2"/> Adicionar Disciplina</Button></div><div className="flex justify-end gap-2 mt-4 pt-4 border-t"><Button variant="ghost" onClick={() => setIsEditingProfs(false)}>Cancelar</Button><Button onClick={handleSaveProfs} className="bg-green-600 hover:bg-green-700">Guardar</Button></div></DialogContent></Dialog></CardHeader>
                <CardContent><Table><TableHeader><TableRow><TableHead>Disciplina</TableHead><TableHead>Professor</TableHead></TableRow></TableHeader><TableBody>{details.professores.map((p, idx) => (<TableRow key={idx}><TableCell>{p.disciplina}</TableCell><TableCell>{p.professor}</TableCell></TableRow>))}</TableBody></Table></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alunos">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5"/> Lista de Alunos</CardTitle></CardHeader>
                <CardContent><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{details.alunos.map((aluno) => (<div key={aluno.id} className="flex items-center gap-3 p-3 border rounded-lg"><div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{aluno.nome.charAt(0)}</div><div className="font-medium">{aluno.nome}</div></div>))}</div></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notas">
              <Card>
                <CardHeader>
                  <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                    <CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5"/> Pauta da Turma</CardTitle>
                    <div className="flex flex-wrap items-center gap-4">
                        <span className="text-sm font-bold bg-muted px-3 py-1 rounded">Média: {mediaDisciplina}</span>
                        <Select value={selectedDiscForGrades} onValueChange={setSelectedDiscForGrades} disabled={isEditingGrades}><SelectTrigger className="w-[200px]"><SelectValue placeholder="Disciplina" /></SelectTrigger><SelectContent>{details.professores.map(p => (<SelectItem key={p.disciplina_id} value={p.disciplina_id.toString()}>{p.disciplina}</SelectItem>))}</SelectContent></Select>
                        {!isEditingGrades ? (<Button onClick={startEditingGrades} variant="outline" className="gap-2"><Edit size={16}/> Editar Pauta</Button>) : (<div className="flex gap-2"><Button variant="ghost" onClick={cancelEditingGrades} disabled={isSavingGrades}><X size={16} className="mr-2"/> Cancelar</Button><Button onClick={saveGrades} disabled={isSavingGrades} className="bg-green-600 hover:bg-green-700">{isSavingGrades ? <Loader2 className="animate-spin mr-2"/> : <Save size={16} className="mr-2"/>} Guardar</Button></div>)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead className="text-center w-20">1º P</TableHead><TableHead className="text-center w-20">2º P</TableHead><TableHead className="text-center w-20">3º P</TableHead><TableHead className="text-center w-20 bg-blue-50/50 text-blue-800">Exame</TableHead><TableHead className="text-center w-20">Final</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {activeGradesList.length === 0 ? (<TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Sem dados.</TableCell></TableRow>) : (
                        activeGradesList.map((n) => (
                          <TableRow key={n.aluno_id}>
                            <TableCell className="font-medium">{n.aluno_nome}</TableCell>
                            {['p1', 'p2', 'p3', 'exame', 'final'].map((field) => {
                                const val = n[field as keyof Nota] as number;
                                const isFinal = field === 'final';
                                const isExam = field === 'exame';
                                
                                return (
                                    <TableCell key={field} className={`p-1 text-center ${isExam ? 'bg-blue-50/30' : ''}`}>
                                        {isEditingGrades ? (
                                            <Input className={`h-8 text-center ${isFinal ? 'font-bold border-primary' : ''} ${isExam ? 'border-blue-300' : ''}`} type="number" min="0" max="20" value={val || 0} onChange={(e) => handleTempGradeChange(n.aluno_id, field as keyof Nota, e.target.value)} />
                                        ) : (
                                            <span className={`${isFinal ? (n.final >= 10 ? "text-green-600 font-bold" : "text-red-500 font-bold") : ""} ${isExam && val > 0 ? "text-blue-700 font-medium" : "text-muted-foreground"}`}>
                                                {isExam && val === 0 ? "-" : (val > 0 ? val : "-")}
                                            </span>
                                        )}
                                    </TableCell>
                                );
                            })}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default ClassesPage;