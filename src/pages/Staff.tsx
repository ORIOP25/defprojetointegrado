import { useState, useEffect } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Users, Plus, Loader2, MoreHorizontal, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Interface igual ao que vem do backend
interface StaffMember {
  id: number;
  email: string;
  Nome: string;
  Cargo: string;
  role: string;
}

const StaffPage = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Estado do Formulário
  const [formData, setFormData] = useState({
    email: "",
    hashed_password: "",
    role: "staff",
    Nome: "",
    Cargo: "",
    Depart_id: undefined,
    Telefone: "",
    Morada: "",
  });

  // 1. Carregar dados da API
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setIsLoading(true);
        const response = await api.get("/staff");
        setStaffList(response.data);
      } catch (error) {
        console.error("Erro ao carregar staff:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, []);

  const handleCreateSubmit = () => {
    // A lógica de POST será adicionada na Fase 4
    console.log("Dados a enviar:", formData);
    setDialogOpen(false);
  };

  const filteredStaff = staffList.filter(person =>
    person.Nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Gestão de Staff
          </h1>
          <p className="text-muted-foreground">
            Equipa docente e administrativa.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Colaborador
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Ficha de Funcionário</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input 
                  value={formData.Nome}
                  onChange={(e) => setFormData({ ...formData, Nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input 
                  value={formData.Cargo}
                  onChange={(e) => setFormData({ ...formData, Cargo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input 
                  value={formData.Telefone}
                  onChange={(e) => setFormData({ ...formData, Telefone: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Morada</Label>
                <Input 
                  value={formData.Morada}
                  onChange={(e) => setFormData({ ...formData, Morada: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateSubmit}>Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">Diretório</CardTitle>
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Pesquisar..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        <div className="flex justify-center items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> A carregar...
                        </div>
                    </TableCell>
                  </TableRow>
                ) : filteredStaff.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Nenhum registo encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">{staff.Nome}</TableCell>
                      <TableCell>{staff.Cargo || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{staff.email}</TableCell>
                      <TableCell>
                        <Badge variant={staff.role === 'global_admin' ? 'default' : 'secondary'}>
                            {staff.role === 'global_admin' ? 'Admin' : 'Staff'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffPage;