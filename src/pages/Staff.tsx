import { useState, useEffect } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Loader2, Pencil, Trash2, X, MoreHorizontal, Search } from "lucide-react";
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
}

interface StaffForm {
  Nome: string;
  email: string;
  Cargo: string;
  role: string;
  Telefone: string;
  Morada: string;
}

const StaffPage = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState<StaffMember | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<StaffForm>({
    Nome: "", email: "", Cargo: "", role: "staff", Telefone: "", Morada: ""
  });

  // --- FETCH STAFF ---
  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/staff");
      console.log(response.data); // para debug
      setStaffList(response.data);
    } catch (error) {
      console.error("Erro ao carregar staff:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const filteredStaff = staffList.filter(person =>
    person.Nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenProfile = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setEditProfileData({ ...staff });
    setIsEditingProfile(false);
    setIsProfileOpen(true);
  };

  const handleStartEditingProfile = () => {
    setIsEditingProfile(true);
  };

  const handleSaveProfile = () => {
    if (!editProfileData || !selectedStaff) return;
    // Aqui você faria PUT para a API
    setStaffList(staffList.map(s => s.id === selectedStaff.id ? editProfileData : s));
    setSelectedStaff(editProfileData);
    setIsEditingProfile(false);
  };

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return;

    try {
      await api.delete(`/staff/${selectedStaff.id}`);
      setStaffList(staffList.filter(s => s.id !== selectedStaff.id));
      setDeleteAlertOpen(false);
      setIsProfileOpen(false);
    } catch (error) {
      console.error("Erro ao eliminar staff:", error);
      alert("Erro ao eliminar staff. Verifique o backend.");
    }
  };

  const handleCreateSubmit = () => {
    // A lógica de POST será adicionada na Fase 4
    console.log("Dados a enviar:", formData);
    setCreateDialogOpen(false);
  };

  // Para os professores aparecerem na lista de staff"
  const roleLabels: Record<string, string> = {
    global_admin: "Admin",
    teacher: "Professor",
    staff: "Staff",
  };

  const roleVariants: Record<string, "default" | "secondary"> = {
    global_admin: "default",
    teacher: "secondary",
    staff: "secondary",
  };

  return (
    <div className="space-y-6 fade-in p-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Staff</h1>
          <p className="text-muted-foreground">Equipa docente e administrativa.</p>
        </div>

        {/* DIALOG DE CRIAR NOVO STAFF */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex gap-2"><Plus size={18} /> Novo Staff</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Adicionar Novo Staff</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1"><Label>Nome</Label><Input value={formData.Nome} onChange={e => setFormData({...formData, Nome: e.target.value})} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
              <div className="space-y-1"><Label>Cargo</Label><Input value={formData.Cargo} onChange={e => setFormData({...formData, Cargo: e.target.value})} /></div>
              <div className="space-y-1"><Label>Telefone</Label><Input value={formData.Telefone} onChange={e => setFormData({...formData, Telefone: e.target.value})} /></div>
              <div className="space-y-1"><Label>Morada</Label><Input value={formData.Morada} onChange={e => setFormData({...formData, Morada: e.target.value})} /></div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={val => setFormData({...formData, role: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="global_admin">Admin</SelectItem>
                    <SelectItem value="teacher">Professor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateSubmit}>Guardar Ficha</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABELA */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Listagem Geral
            </CardTitle>
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
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table> 
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Nenhum registo encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map(staff => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.Nome}</TableCell>
                      <TableCell className="text-muted-foreground">{staff.email}</TableCell>
                      <TableCell>{staff.Cargo || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={roleVariants[staff.role] || "secondary"}>
                          {roleLabels[staff.role] || staff.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenProfile(staff)}>Ver Perfil</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* MODAL DE PERFIL */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="h-6 w-6 text-primary" />
              {isEditingProfile ? "Editar Perfil" : "Perfil do Colaborador"}
            </DialogTitle>
          </DialogHeader>

          {selectedStaff && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border">
                <div className="w-full mr-4">
                  {isEditingProfile && editProfileData ? (
                    <Input 
                      value={editProfileData.Nome} 
                      onChange={e => setEditProfileData({...editProfileData, Nome: e.target.value})}
                      className="font-bold text-lg bg-white"
                    />
                  ) : (
                    <h3 className="font-bold text-lg">{selectedStaff.Nome}</h3>
                  )}
                </div>
              </div>

              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-1 mb-6">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4">
                  <div className="grid gap-3">
                    <div>
                      <Label className="text-xs">Email</Label>
                      {isEditingProfile ? (
                        <Input value={editProfileData?.email} onChange={e => setEditProfileData({...editProfileData!, email: e.target.value})} />
                      ) : <p className="text-sm">{selectedStaff.email}</p>}
                    </div>
                    <div>
                      <Label className="text-xs">Cargo</Label>
                      {isEditingProfile ? (
                        <Input value={editProfileData?.Cargo} onChange={e => setEditProfileData({...editProfileData!, Cargo: e.target.value})} />
                      ) : <p className="text-sm">{selectedStaff.Cargo || "-"}</p>}
                    </div>
                    <div>
                      <Label className="text-xs">Telefone</Label>
                      {isEditingProfile ? (
                        <Input value={editProfileData?.Telefone || ""} onChange={e => setEditProfileData({...editProfileData!, Telefone: e.target.value})} />
                      ) : <p className="text-sm">{selectedStaff.Telefone || "-"}</p>}
                    </div>
                    <div>
                      <Label className="text-xs">Morada</Label>
                      {isEditingProfile ? (
                        <Input value={editProfileData?.Morada || ""} onChange={e => setEditProfileData({...editProfileData!, Morada: e.target.value})} />
                      ) : <p className="text-sm">{selectedStaff.Morada || "-"}</p>}
                    </div>
                    <div>
                      <Label className="text-xs">Role  </Label>
                      {isEditingProfile ? (
                        <Select value={editProfileData?.role || "staff"} onValueChange={val => setEditProfileData({...editProfileData!, role: val})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="global_admin">Admin</SelectItem>
                            <SelectItem value="teacher">Professor</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={roleVariants[selectedStaff.role] || "secondary"}>
                          {roleLabels[selectedStaff.role] || selectedStaff.role}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-6 mt-2 border-t">
                    {isEditingProfile ? (
                      <>
                        <Button variant="ghost" onClick={() => setIsEditingProfile(false)}>
                          <X size={16} className="mr-2"/>Cancelar
                        </Button>
                        <Button onClick={handleSaveProfile} className="bg-green-600 hover:bg-green-700">
                          <Pencil size={16} className="mr-2"/>Guardar Alterações</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteAlertOpen(true)}>
                          <Trash2 size={16} className="mr-2"/>Eliminar
                        </Button>
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

      {/* ALERT DELETE */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O colaborador será eliminado permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStaff} className="bg-destructive hover:bg-destructive/90">Sim, eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StaffPage;
