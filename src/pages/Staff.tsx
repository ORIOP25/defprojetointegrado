import { useState, useEffect, useRef } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Loader2, Pencil, Trash2, X, Search, Filter, Download, Upload, FileSpreadsheet, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// --- INTERFACES ---
interface StaffMember {
  id: number;
  email: string;
  Nome: string;
  Cargo: string;
  role: string;
  Telefone?: string;
  Morada?: string;
  Salario?: number;
  Escalao?: string;
  Departamento?: string;
}

// Interface para a lista dinâmica de escalões
interface EscalaoData {
  Escalao_id: number;
  Nome: string;
  Valor_Base: number;
}

interface StaffForm {
  Nome: string;
  email: string;
  Cargo: string;
  role: string;
  Telefone: string;
  Morada: string;
  Escalao?: string;
  Salario?: string;
  Area?: string;
}

const departamentosOpcoes = [
  "Ciências", "Línguas", "Desporto", "Artes", "Ciências Sociais", "Outro"
];

const ITEMS_PER_PAGE = 50; // CONSTANTE DE PAGINAÇÃO

const StaffPage = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [escaloesList, setEscaloesList] = useState<EscalaoData[]>([]); // Lista dinâmica
  const [isLoading, setIsLoading] = useState(true);
  
  // --- FILTROS & PAGINAÇÃO ---
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); 
  const [currentPage, setCurrentPage] = useState(1); // ESTADO DA PÁGINA

  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState<StaffMember | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<StaffForm>({
    Nome: "", email: "", Cargo: "", role: "staff", 
    Telefone: "", Morada: "", Escalao: "", Salario: "", Area: ""
  });

  // REF para Input de Ficheiro
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FETCH DADOS (Staff + Escalões)
  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Pedimos limit=1000 para garantir que trazemos todos os dados para filtrar no frontend
      const [staffRes, escRes] = await Promise.all([
        api.get("/staff/?limit=1000"),
        api.get("/staff/aux/escaloes") 
      ]);
      setStaffList(staffRes.data);
      setEscaloesList(escRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Resetar para a página 1 sempre que os filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  // --- LÓGICA DE FILTRAGEM ---
  const filteredStaff = staffList.filter(person => {
    const matchesSearch = person.Nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          person.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || person.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // --- LÓGICA DE PAGINAÇÃO (Calculada sobre a lista filtrada) ---
  const totalPages = Math.ceil(filteredStaff.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedStaff = filteredStaff.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  // --- IMPORT / EXPORT ---
  const handleDownloadTemplate = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    window.open(`${baseUrl}/staff/data/template`, "_blank");
  };

  const handleExportData = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    window.open(`${baseUrl}/staff/data/export`, "_blank");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      setIsLoading(true);
      await api.post("/staff/data/import", uploadData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      alert("Importação concluída com sucesso!");
      fetchData(); // Recarrega a lista
    } catch (error: any) {
      console.error("Erro ao importar:", error);
      const msg = error.response?.data?.detail || "Erro ao importar ficheiro.";
      alert(msg);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- PROFILE LOGIC ---
  const handleOpenProfile = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setEditProfileData({ ...staff });
    setIsEditingProfile(false);
    setIsProfileOpen(true);
  };

  const handleStartEditingProfile = () => {
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!editProfileData || !selectedStaff) return;

    const salarioVal = editProfileData.role !== "teacher" && editProfileData.Salario ? Number(editProfileData.Salario) : 0;
    if (salarioVal > 999999.99) {
      alert("Vencimento demasiado grande");
      return;
    }

    try {
      const isTeacher = editProfileData.role === "teacher";
      
      let cargoFinal = editProfileData.Cargo;
      if (isTeacher && editProfileData.Departamento) {
        cargoFinal = `Docente ${editProfileData.Departamento}`;
      }

      const payload = {
        Nome: editProfileData.Nome,
        email: editProfileData.email,
        Telefone: editProfileData.Telefone,
        Morada: editProfileData.Morada,
        role: editProfileData.role,
        Cargo: cargoFinal,
        Escalao: isTeacher ? editProfileData.Escalao : null,
        Salario: salarioVal
      };

      const response = await api.put(`/staff/${selectedStaff.id}`, payload);

      if (response.status === 200) {
        const updatedMember = {
          ...editProfileData,
          ...response.data, 
          Departamento: isTeacher ? editProfileData.Departamento : undefined
        };
        
        setStaffList(staffList.map(s => 
          (s.id === selectedStaff.id && s.role === selectedStaff.role) ? updatedMember : s
        ));
        
        setSelectedStaff(updatedMember);
        setIsEditingProfile(false);
        alert("Perfil atualizado com sucesso!");
      }
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Erro ao guardar alterações.";
      alert(msg);
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;

    try {
      await api.delete(`/staff/${selectedStaff.id}?role=${selectedStaff.role}`);
      setStaffList(staffList.filter(s => 
        !(s.id === selectedStaff.id && s.role === selectedStaff.role)
      ));
      setDeleteAlertOpen(false);
      setIsProfileOpen(false);
    } catch (error) {
      alert("Erro ao eliminar. Tente atualizar a página.");
    }
  };

  const handleCreateSubmit = async () => {
    const isTeacher = formData.role === "teacher";

    if (!formData.Nome) { alert("O nome é obrigatório."); return; }
    if (!isTeacher && !formData.Cargo) { alert("Por favor, preencha o Cargo."); return; }
    if (isTeacher && !formData.Area) { alert("Por favor, selecione a Área."); return; }

    const salarioVal = !isTeacher && formData.Salario ? parseFloat(formData.Salario) : 0;
    if (salarioVal > 999999.99) {
      alert("Vencimento demasiado grande");
      return;
    }

    const nomes = formData.Nome.trim().split(/\s+/);
    const limpar = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const emailGerado = `${limpar(nomes[0])}.${nomes.length > 1 ? limpar(nomes[nomes.length-1]) : 'user'}@escola.pt`;

    try {
      const cargoFinal = isTeacher ? `Docente ${formData.Area}` : formData.Cargo;
      const payload = {
        Nome: formData.Nome,
        email: emailGerado,
        Cargo: cargoFinal,
        Telefone: formData.Telefone,
        Morada: formData.Morada,
        role: formData.role,
        Salario: salarioVal,
        Escalao: isTeacher ? formData.Escalao : null 
      };

      const response = await api.post("/staff/", payload);

      if (response.status === 200 || response.status === 201) {
        const newMember = {
          ...response.data,
          id: response.data.Staff_id || response.data.id,
          Departamento: isTeacher ? formData.Area : undefined
        };

        setStaffList([...staffList, newMember]);
        setCreateDialogOpen(false);
        setFormData({ Nome: "", email: "", Cargo: "", role: "staff", Telefone: "", Morada: "", Escalao: "", Salario: "", Area: "" });
        alert(`Sucesso! Email: ${emailGerado}`);
      }
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Erro desconhecido";
      alert(`Erro: ${msg}`);
    }
  };

  const roleLabels: Record<string, string> = { admin: "Admin", teacher: "Professor", staff: "Staff" };
  const roleVariants: Record<string, "default" | "secondary"> = { admin: "default", teacher: "secondary", staff: "secondary" };

  return (
    <div className="space-y-6 fade-in p-6">
      {/* HEADER */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Staff</h1>
          <p className="text-muted-foreground">Equipa docente e administrativa.</p>
        </div>
        
        {/* BOTÕES DE AÇÃO (IMPORT/EXPORT/NOVO) */}
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
            {/* Input escondido para o upload */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".xlsx, .xls" 
                className="hidden" 
            />
            
            <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                <FileSpreadsheet size={16} /> Template
            </Button>
            
            <Button variant="outline" onClick={handleImportClick} className="gap-2">
                <Upload size={16} /> Importar
            </Button>
            
            <Button variant="outline" onClick={handleExportData} className="gap-2">
                <Download size={16} /> Exportar
            </Button>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex gap-2 bg-blue-600 hover:bg-blue-700"><Plus size={18} /> Novo Staff</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Adicionar Novo Staff</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-1"><Label>Role</Label>
                    <Select value={formData.role} onValueChange={val => setFormData({...formData, role: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="teacher">Professor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Nome</Label><Input value={formData.Nome} onChange={e => setFormData({...formData, Nome: e.target.value})} placeholder="Nome completo"/></div>
                  
                  {formData.role === "teacher" ? (
                    <div className="space-y-1 fade-in"><Label>Área / Departamento</Label>
                      <Select value={formData.Area} onValueChange={val => setFormData({...formData, Area: val})}>
                        <SelectTrigger><SelectValue placeholder="Selecione a área" /></SelectTrigger>
                        <SelectContent>{departamentosOpcoes.map((dept) => (<SelectItem key={dept} value={dept}>{dept}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-1 fade-in"><Label>Cargo</Label><Input value={formData.Cargo} onChange={e => setFormData({...formData, Cargo: e.target.value})} placeholder="Ex: Secretário..."/></div>
                  )}
                  
                  <div className="space-y-1"><Label>Telefone</Label><Input value={formData.Telefone} onChange={e => setFormData({...formData, Telefone: e.target.value})} /></div>
                  <div className="space-y-1"><Label>Morada</Label><Input value={formData.Morada} onChange={e => setFormData({...formData, Morada: e.target.value})} /></div>
                  
                  {formData.role === "teacher" && (
                    <div className="space-y-1 fade-in"><Label>Escalão Docente</Label>
                      <Select value={formData.Escalao} onValueChange={val => setFormData({...formData, Escalao: val})}>
                        <SelectTrigger><SelectValue placeholder="Selecione o escalão" /></SelectTrigger>
                        <SelectContent>
                          {/* LISTA DINÂMICA DE ESCALÕES NA CRIAÇÃO */}
                          {escaloesList.map((esc) => (
                            <SelectItem key={esc.Escalao_id} value={esc.Nome}>
                              {esc.Nome} ({esc.Valor_Base}€)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {formData.role !== "teacher" && (
                    <div className="space-y-1 fade-in"><Label>Salário Mensal (€)</Label><Input type="number" value={formData.Salario} onChange={e => setFormData({...formData, Salario: e.target.value})} placeholder="Ex: 1200.00"/></div>
                  )}
                </div>
                <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button><Button onClick={handleCreateSubmit}>Guardar</Button></div>
              </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* TABLE SECTION */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Listagem Geral</CardTitle>
            
            {/* FILTROS */}
            <div className="flex gap-2 w-full sm:w-auto">
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px] h-9">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="teacher">Professores</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
                <Input 
                  placeholder="Procurar staff..." 
                  className="pl-8 h-9" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (<div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>) : (
            <div className="space-y-4">
              <Table> 
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Cargo</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {paginatedStaff.length === 0 ? (<TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum registo encontrado.</TableCell></TableRow>) : (
                    paginatedStaff.map(staff => (
                      <TableRow key={`${staff.role}-${staff.id}`}>
                        <TableCell className="font-medium">{staff.Nome}</TableCell>
                        <TableCell className="text-muted-foreground">{staff.email}</TableCell>
                        <TableCell>{staff.Cargo || "-"}</TableCell>
                        <TableCell><Badge variant={roleVariants[staff.role] || "secondary"}>{roleLabels[staff.role] || staff.role}</Badge></TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleOpenProfile(staff)}>Ver Perfil</Button></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* PAGINATION CONTROLS */}
              {filteredStaff.length > 0 && (
                <div className="flex items-center justify-between px-2">
                  <div className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages || 1} — Total: {filteredStaff.length}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={currentPage === 1}>
                      <ChevronLeft className="h-4 w-4" /> Anterior
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages || totalPages === 0}>
                      Próxima <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PROFILE DIALOG */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-xl max-h-[95vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-xl"><Users className="h-6 w-6 text-primary" />{isEditingProfile ? "Editar Perfil" : "Perfil do Colaborador"}</DialogTitle></DialogHeader>
          {selectedStaff && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border">
                <div className="w-full mr-4">
                  {isEditingProfile && editProfileData ? (
                    <Input value={editProfileData.Nome} onChange={e => setEditProfileData({...editProfileData, Nome: e.target.value})} className="font-bold text-lg bg-white"/>
                  ) : (<h3 className="font-bold text-lg">{selectedStaff.Nome}</h3>)}
                </div>
              </div>

              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-1 mb-6"><TabsTrigger value="info">Informações</TabsTrigger></TabsList>
                <TabsContent value="info" className="space-y-4">
                  <div className="grid gap-3">
                    
                    <div><Label className="text-xs">Email</Label>
                      {isEditingProfile ? (
                        <Input value={editProfileData?.email} onChange={e => setEditProfileData({...editProfileData!, email: e.target.value})} />
                      ) : <p className="text-sm">{selectedStaff.email}</p>}
                    </div>
                    
                    <div><Label className="text-xs">Role</Label>
                      <div><Badge variant="outline">{roleLabels[selectedStaff.role] || selectedStaff.role}</Badge></div>
                    </div>

                    {(selectedStaff.role === "teacher" || (isEditingProfile && editProfileData?.role === "teacher")) && (
                      <div>
                        <Label className="text-xs">Departamento</Label>
                        {isEditingProfile ? (
                          <Select value={editProfileData?.Departamento} onValueChange={val => setEditProfileData({...editProfileData!, Departamento: val})}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>{departamentosOpcoes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : <p className="text-sm font-semibold">{selectedStaff.Departamento || "Geral"}</p>}
                      </div>
                    )}

                    {(selectedStaff.role === "teacher" || (isEditingProfile && editProfileData?.role === "teacher")) && (
                      <div>
                        <Label className="text-xs">Escalão</Label>
                        {isEditingProfile ? (
                          <Select value={editProfileData?.Escalao} onValueChange={val => setEditProfileData({...editProfileData!, Escalao: val})}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {/* LISTA DINÂMICA TAMBÉM NA EDIÇÃO */}
                              {escaloesList.map((esc) => (
                                <SelectItem key={esc.Escalao_id} value={esc.Nome}>
                                  {esc.Nome} ({esc.Valor_Base}€)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : <Badge variant="outline">{selectedStaff.Escalao || "Sem escalão"}</Badge>}
                      </div>
                    )}
                    
                    {((selectedStaff.role !== "teacher" && !isEditingProfile) || (isEditingProfile && editProfileData?.role !== "teacher")) && (
                      <div><Label className="text-xs">Cargo</Label>
                        {isEditingProfile ? (
                          <Input value={editProfileData?.Cargo} onChange={e => setEditProfileData({...editProfileData!, Cargo: e.target.value})} />
                        ) : <p className="text-sm">{selectedStaff.Cargo}</p>}
                      </div>
                    )}
                    
                    {(selectedStaff.role !== "teacher" || (isEditingProfile && editProfileData?.role !== "teacher")) && (
                      <div><Label className="text-xs">Salário Mensal</Label>
                        {isEditingProfile ? (
                          <Input type="number" value={editProfileData?.Salario} onChange={e => setEditProfileData({...editProfileData!, Salario: parseFloat(e.target.value)})} />
                        ) : <p className="text-sm font-mono">{selectedStaff.Salario ? `${selectedStaff.Salario.toFixed(2)} €` : "N/A"}</p>}
                      </div>
                    )}

                    {!isEditingProfile && selectedStaff.role === "teacher" && (
                        <div><Label className="text-xs">Salário Mensal</Label>
                          <p className="text-sm font-mono">{selectedStaff.Salario ? `${selectedStaff.Salario.toFixed(2)} €` : "N/A"}</p>
                        </div>
                     )}

                    <div><Label className="text-xs">Telefone</Label>
                      {isEditingProfile ? (
                        <Input value={editProfileData?.Telefone || ""} onChange={e => setEditProfileData({...editProfileData!, Telefone: e.target.value})} />
                      ) : <p className="text-sm">{selectedStaff.Telefone || "-"}</p>}
                    </div>
                    <div><Label className="text-xs">Morada</Label>
                      {isEditingProfile ? (
                        <Input value={editProfileData?.Morada || ""} onChange={e => setEditProfileData({...editProfileData!, Morada: e.target.value})} />
                      ) : <p className="text-sm">{selectedStaff.Morada || "-"}</p>}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-6 mt-2 border-t">
                    {isEditingProfile ? (
                      <>
                        <Button variant="ghost" onClick={() => setIsEditingProfile(false)}><X size={16} className="mr-2"/>Cancelar</Button>
                        <Button onClick={handleSaveProfile} className="bg-green-600 hover:bg-green-700"><Pencil size={16} className="mr-2"/>Guardar</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteAlertOpen(true)}><Trash2 size={16} className="mr-2"/>Eliminar</Button>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setIsProfileOpen(false)}>Fechar</Button>
                          <Button onClick={handleStartEditingProfile}><Pencil size={16} className="mr-2" /> Editar Dados</Button>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Tem a certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteStaff} className="bg-destructive">Sim, eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StaffPage;