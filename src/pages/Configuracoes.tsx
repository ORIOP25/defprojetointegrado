import { useState, useEffect } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Adicionado Select
import { Settings, BookOpen, Building2, TrendingUp, Plus, Pencil, Trash2, Loader2, Save } from "lucide-react";

const ConfiguracoesPage = () => {
  const [activeTab, setActiveTab] = useState("disciplinas");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]); // Estado para a lista de departamentos
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ Nome: "", Categoria: "", Valor_Base: 0, Descricao: "" });

  const fetchData = async () => {
    setLoading(true);
    setData([]); 
    try {
      const res = await api.get(`/config-escolar/${activeTab}/`);
      setData(res.data);
    } catch (error) { 
      console.error(error);
      setData([]);
    } finally { setLoading(false); }
  };

  // Função para carregar departamentos quando necessário
  const fetchDepartamentos = async () => {
    try {
      const res = await api.get("/config-escolar/departamentos/");
      setDepartamentos(res.data);
    } catch (error) {
      console.error("Erro ao carregar departamentos:", error);
    }
  };

  useEffect(() => { 
    fetchData();
    // Sempre que estivermos na aba de disciplinas, garantimos que temos os departamentos para o dropdown
    if (activeTab === "disciplinas") {
      fetchDepartamentos();
    }
  }, [activeTab]);

  const handleOpenDialog = (item: any = null) => {
    setEditingItem(item);
    setFormData(item || { Nome: "", Categoria: "", Valor_Base: 0, Descricao: "" });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const baseUrl = `/config-escolar/${activeTab}/`;
      if (editingItem) {
        const id = editingItem.Disc_id || editingItem.Depart_id || editingItem.Escalao_id;
        await api.put(`${baseUrl}${id}`, formData);
      } else {
        await api.post(baseUrl, formData);
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error) { alert("Erro ao guardar dados."); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Aviso: Isto pode afetar registos vinculados. Deseja eliminar?")) return;
    try {
      await api.delete(`/config-escolar/${activeTab}/${id}`);
      fetchData();
    } catch (error) { alert("Erro ao eliminar. Verifique se existem dependências."); }
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Settings className="text-primary"/> Configurações</h1>
          <p className="text-muted-foreground">Gestão da estrutura base da escola.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2"><Plus size={18}/> Novo</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-[500px] grid-cols-3">
          <TabsTrigger value="disciplinas"><BookOpen size={16} className="mr-2"/> Disciplinas</TabsTrigger>
          <TabsTrigger value="departamentos"><Building2 size={16} className="mr-2"/> Departamentos</TabsTrigger>
          <TabsTrigger value="escaloes"><TrendingUp size={16} className="mr-2"/> Escalões</TabsTrigger>
        </TabsList>

        <Card className="mt-4 border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={40} /></div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="pl-6">Nome</TableHead>
                    <TableHead>{activeTab === "escaloes" ? "Vencimento" : "Informação"}</TableHead>
                    <TableHead className="text-right pr-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-10">Vazio</TableCell></TableRow>
                  ) : (
                    data.map((item) => {
                      const id = item.Disc_id || item.Depart_id || item.Escalao_id;
                      return (
                        <TableRow key={`${activeTab}-${id}`} className="hover:bg-muted/30">
                          <TableCell className="pl-6 font-semibold">{item.Nome}</TableCell>
                          <TableCell>{activeTab === "escaloes" ? `${item.Valor_Base} €` : (item.Categoria || item.Descricao || "-")}</TableCell>
                          <TableCell className="text-right pr-6 flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}><Pencil size={14}/></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(id)}><Trash2 size={14}/></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingItem ? "Editar" : "Criar"} {activeTab}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={formData.Nome || ""} onChange={e => setFormData({...formData, Nome: e.target.value})} />
            </div>
            
            {/* ALTERAÇÃO AQUI: Menu Dropdown para Departamentos na aba de Disciplinas */}
            {activeTab === "disciplinas" && (
              <div className="space-y-2">
                <Label>Departamento (Categoria)</Label>
                <Select 
                  value={formData.Categoria || ""} 
                  onValueChange={(val) => setFormData({...formData, Categoria: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o departamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departamentos.map((dep) => (
                      <SelectItem key={dep.Depart_id} value={dep.Nome}>
                        {dep.Nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {activeTab === "escaloes" && (
              <div className="space-y-2"><Label>Valor Base (€)</Label><Input type="number" value={formData.Valor_Base || ""} onChange={e => setFormData({...formData, Valor_Base: e.target.value})} /></div>
            )}
          </div>
          <DialogFooter><Button onClick={handleSave} className="w-full">Gravar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConfiguracoesPage;