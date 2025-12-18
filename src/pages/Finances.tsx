import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  Wallet, 
  Loader2, 
  AlertCircle,
  Pencil, // CORREÇÃO: Adicionado o import do Pencil para resolver o erro
  Trash2
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

// Definição dos Tipos (Igual ao Schema do Python)
interface Investimento {
  id: number;
  tipo_investimento: string;
  ano_financiamento: number;
  valor_aprovado: number;
  total_receita_periodo: number;
  total_despesa_periodo: number;
  total_gasto_acumulado: number;
  saldo_restante: number;
}

interface BalancoGeral {
  periodo: string;
  total_receita: number;
  total_despesa: number;
  saldo: number;
  detalhe_investimentos: Investimento[];
}

interface Despesa {
  id: number;
  descricao: string;
  valor: number;
  investimento_id: number;
  investimento_nome: string;
}

interface InvestimentoHistorico {
  Fin_id: number;
  Tipo: string;
  Ano: number;
  Valor: number;
}

const Finances = () => {
  const [data, setData] = useState<BalancoGeral | null>(null);
  const [historico, setHistorico] = useState<Despesa[]>([]);
  const [historicoInvestimentos, setHistoricoInvestimentos] = useState<InvestimentoHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  
  // Form Despesa
  const [openDespesaModal, setOpenDespesaModal] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState<number | "">("");
  const [investimentoId, setInvestimentoId] = useState<string>("");

  // Form Investimento
  const [openInvestimentoModal, setOpenInvestimentoModal] = useState(false);
  const [tipoInvestimento, setTipoInvestimento] = useState("");
  const [anoInvestimento, setAnoInvestimento] = useState<number | "">("");
  const [valorInvestimento, setValorInvestimento] = useState<number | "">("");

  // Para saber se estamos a editar uma despesa ou investimento
  const [editDespesaId, setEditDespesaId] = useState<number | null>(null);
  const [editInvestimentoId, setEditInvestimentoId] = useState<number | null>(null);

  // Por defeito vamos buscar o ano atual
  const anoAtual = new Date().getFullYear();

  // Função centralizada para carregar dados do backend
  const fetchFinances = async () => {
    try {
      // Nota: O endpoint está em /financas no main.py
      const response = await fetch(`http://127.0.0.1:8000/financas/balanco/anual?ano=${anoAtual}`);
      if (!response.ok) throw new Error("Falha ao carregar dados financeiros.");
      const result = await response.json();
      setData(result);

      // Buscar histórico de despesas
      const histResponse = await fetch(`http://127.0.0.1:8000/financas/despesas`);
      if (histResponse.ok) setHistorico(await histResponse.json());

      // Histórico de investimentos
      const histInvestRes = await fetch(`http://127.0.0.1:8000/financas/investimentos`);
      if (histInvestRes.ok) setHistoricoInvestimentos(await histInvestRes.json());

    } catch (err) {
      console.error(err);
      setError("Não foi possível conectar ao servidor financeiro.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinances();
  }, [anoAtual]);

  // Função para formatar dinheiro (Euro)
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  // --- Adicionar despesa (LIGADO À API) ---
  const handleAddDespesa = async () => {
    if (!descricao.trim() || valor === "" || valor <= 0 || investimentoId === "") {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const method = editDespesaId ? "PUT" : "POST";
      const url = editDespesaId 
        ? `http://127.0.0.1:8000/financas/despesas/${editDespesaId}` 
        : "http://127.0.0.1:8000/financas/despesas";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: descricao.trim(),
          valor: Number(valor),
          investimento_id: Number(investimentoId)
        })
      });

      if (response.ok) {
        setDescricao(""); setValor(""); setInvestimentoId(""); setEditDespesaId(null);
        setOpenDespesaModal(false);
        fetchFinances(); // Recarrega os dados reais e atualiza os saldos
      }
    } catch (e) {
      alert("Erro ao comunicar com o servidor.");
    }
  };
  
  // Adicionar Investimento (LIGADO À API)
  const handleAddInvestimento = async () => {
    if (!tipoInvestimento || !anoInvestimento || !valorInvestimento) {
      alert("Preencha todos os campos do investimento!");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/financas/investimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Tipo: tipoInvestimento,
          Valor: Number(valorInvestimento),
          Ano: Number(anoInvestimento)
        })
      });

      if (response.ok) {
        setOpenInvestimentoModal(false);
        setTipoInvestimento(""); setAnoInvestimento(""); setValorInvestimento(""); setEditInvestimentoId(null);
        fetchFinances();
      }
    } catch (e) {
      alert("Erro ao gravar investimento.");
    }
  };

  const handleDeleteDespesa = async (id: number) => {
    if (!confirm("Deseja eliminar esta despesa permanentemente?")) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/financas/despesas/${id}`, { method: 'DELETE' });
      if (res.ok) fetchFinances();
    } catch (e) { alert("Erro ao eliminar."); }
  };

  const handleEditDespesa = (despesa: Despesa) => {
    setDescricao(despesa.descricao);
    setValor(despesa.valor);
    setInvestimentoId(despesa.investimento_id.toString());
    setEditDespesaId(despesa.id);
    setOpenDespesaModal(true);
  };

  const handleEditInvestimento = (inv: InvestimentoHistorico) => {
    setTipoInvestimento(inv.Tipo);
    setAnoInvestimento(inv.Ano);
    setValorInvestimento(inv.Valor);
    setEditInvestimentoId(inv.Fin_id);
    setOpenInvestimentoModal(true);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center fade-in">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">A carregar contabilidade...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 fade-in">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Gestão Financeira</h1>
      </div>

      {/* Cartões de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data ? formatMoney(data.total_receita) : "€0,00"}
            </div>
            <p className="text-xs text-muted-foreground">Acumulado deste ano</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesa Total</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data ? formatMoney(data.total_despesa) : "€0,00"}
            </div>
            <p className="text-xs text-muted-foreground">Acumulado deste ano</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data && data.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {data ? formatMoney(data.saldo) : "€0,00"}
            </div>
            <p className="text-xs text-muted-foreground">Liquidez disponível</p>
          </CardContent>
        </Card>

        <Button 
          onClick={() => {
            setDescricao("");
            setValor("");
            setInvestimentoId(""); 
            setEditDespesaId(null);
            setOpenDespesaModal(true);
          }}>
          
          + Adicionar Despesa
        </Button>

        <Button onClick={() => {
            setTipoInvestimento("");
            setAnoInvestimento("");
            setValorInvestimento("");
            setEditInvestimentoId(null);
            setOpenInvestimentoModal(true);
        }}>
          + Adicionar Investimento
        </Button>

        <Dialog open={openDespesaModal} onOpenChange={setOpenDespesaModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editDespesaId ? "Editar Despesa" : "Adicionar Despesa"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                placeholder="Descrição da despesa"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />

              <Input
                type="text"
                placeholder="Valor (€)"
                value={valor}
                onChange={(e) => {
                  const value = e.target.value;
                    if (!/^\d*([.,]\d{0,2})?$/.test(value)) return;
                    const num = Number(value.replace(",", "."));
                    if (num >= 0 || value === "") {
                      setValor(value === "" ? "" : num);
                  }
                }}
              />

              <Select
                key={investimentoId}
                value={investimentoId}
                onValueChange={(value) => setInvestimentoId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar investimento *" />
                </SelectTrigger>

                <SelectContent>
                  {data?.detalhe_investimentos.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id.toString()}>
                      {inv.tipo_investimento} ({inv.ano_financiamento})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setOpenDespesaModal(false)}
                >
                  Cancelar
                </Button>

                <Button
                  onClick={handleAddDespesa}
                  disabled={!descricao.trim() || valor === "" || valor <= 0 || !investimentoId}
                >
                  {editDespesaId ? "Guardar Alterações" : "Guardar Despesa"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openInvestimentoModal} onOpenChange={setOpenInvestimentoModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Financiamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Nome do investimento"
                value={tipoInvestimento}
                onChange={(e) => setTipoInvestimento(e.target.value)}
              />
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Ano de financiamento"
                value={anoInvestimento}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!/^\d*$/.test(value)) return;
                  const num = Number(value);
                  if (num >= 0 || value === "") {
                    setAnoInvestimento(value === "" ? "" : num);
                  }
                }}
              />
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Valor aprovado (€)"
                value={valorInvestimento}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!/^\d*([.,]\d{0,2})?$/.test(value)) return;
                  const num = Number(value.replace(",", "."));
                  if (num >= 0 || value === "") {
                    setValorInvestimento(value === "" ? "" : num);
                  }
                }}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOpenInvestimentoModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddInvestimento}
                  disabled={!tipoInvestimento || !anoInvestimento || !valorInvestimento}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Detalhe por Centro de Custo / Projeto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto / Fonte</TableHead>
                <TableHead>Ano Origem</TableHead>
                <TableHead className="text-right">Orçamento Inicial</TableHead>
                <TableHead className="text-right">Gasto Acumulado (Total)</TableHead>
                <TableHead className="text-right">Saldo Restante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.detalhe_investimentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Não existem registos financeiros para este ano.
                  </TableCell>
                </TableRow>
              ) : (
                data?.detalhe_investimentos.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.tipo_investimento}</TableCell>
                    <TableCell>{item.ano_financiamento}</TableCell>
                    <TableCell className="text-right">{formatMoney(item.valor_aprovado)}</TableCell>
                    <TableCell className="text-right text-red-500">
                      -{formatMoney(item.total_gasto_acumulado)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatMoney(item.saldo_restante)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Históricos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-md flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Histórico de Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Investimento</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                      Vazio
                    </TableCell>
                  </TableRow>
                ) : (
                  historico.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs">{d.descricao}</TableCell>
                      <TableCell className="font-semibold">{formatMoney(d.valor)}</TableCell>
                      <TableCell className="text-xs">{d.investimento_nome}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditDespesa(d)}>
                          <Pencil size={14}/>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteDespesa(d.id)}>
                          <Trash2 size={14}/>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-md flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Histórico de Financiamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicoInvestimentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                      Vazio
                    </TableCell>
                  </TableRow>
                ) : (
                  historicoInvestimentos.map(inv => (
                    <TableRow key={inv.Fin_id}>
                      <TableCell className="text-xs font-medium">{inv.Tipo}</TableCell>
                      <TableCell className="text-xs">{inv.Ano}</TableCell>
                      <TableCell className="text-right font-bold">{formatMoney(inv.Valor)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleEditInvestimento(inv)}>
                          <Pencil size={14}/>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Finances;