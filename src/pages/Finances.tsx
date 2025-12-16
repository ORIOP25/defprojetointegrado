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
  AlertCircle 
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  id: number;
  tipo_investimento: string;
  ano_financiamento: number;
  valor_aprovado: number;
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

  // Por defeito vamos buscar o ano atual
  const anoAtual = new Date().getFullYear();

  // carregar dados do backend
  useEffect(() => {
    const fetchFinances = async () => {
      try {
        // Nota: O endpoint está em /financas no main.py
        const response = await fetch(`http://127.0.0.1:8000/financas/balanco/anual?ano=${anoAtual}`);
        if (!response.ok) throw new Error("Falha ao carregar dados financeiros.");
        const result = await response.json();
        setData(result);

        // Buscar histórico de despesas
        const histResponse = await fetch(`http://127.0.0.1:8000/financas/despesas`);
        if (!histResponse.ok) throw new Error("Falha ao carregar histórico de despesas.");
        const histData = await histResponse.json();
        setHistorico(histData);

        // Histórico de investimentos
        const histInvestRes = await fetch(`http://127.0.0.1:8000/financas/investimentos`);
        if (!histInvestRes.ok) throw new Error("Falha ao carregar histórico de investimentos.");
        const histInvestData = await histInvestRes.json();
        setHistoricoInvestimentos(histInvestData);

      } catch (err) {
        console.error(err);
        setError("Não foi possível conectar ao servidor financeiro.");
      } finally {
        setLoading(false);
      }
    };

    fetchFinances();
  }, [anoAtual]);

  // Função para formatar dinheiro (Euro)
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  // --- Adicionar despesa ---
  const handleAddDespesa = async () => {
    if (!descricao.trim()) {
      alert("A descrição é obrigatória.");
      return;
    }

    if (valor === "" || valor <= 0) {
      alert("O valor da despesa deve ser superior a 0€.");
      return;
    }

    if (investimentoId === "") {
      alert("Selecione um investimento.");
      return;
    }

    const investimentoSelecionado = data?.detalhe_investimentos.find(
      inv => inv.id === Number(investimentoId)
    );

    if (!investimentoSelecionado) {
      alert("Investimento selecionado inválido.");
      return;
    }

    // criar despesa temporária
    const novaDespesa: Despesa = {
      id: editDespesaId ?? Date.now(), // mantém id se estiver a editar
      descricao: descricao.trim(),
      valor: Number(valor),
      investimento_id: Number(investimentoId),
      investimento_nome: data?.detalhe_investimentos.find(inv => inv.id === Number(investimentoId))?.tipo_investimento || ""
    };

    if (editDespesaId) {
      // atualizar despesa existente
      setHistorico(prev =>
        prev.map(d => (d.id === editDespesaId ? novaDespesa : d))
      );
    } else {
      // adicionar nova despesa
      setHistorico(prev => [...prev, novaDespesa]);
    }

    //limpar form
    setDescricao("");
    setValor("");
    setInvestimentoId("");
    setOpenDespesaModal(false);
  };
  
  // Adicionar Investimento
  const handleAddInvestimento = async () => {
    if (!tipoInvestimento || !anoInvestimento || !valorInvestimento) {
      alert("Preencha todos os campos do investimento!");
      return;
    }

    if (anoInvestimento < 1900 || anoInvestimento > 2100) {
      alert("O ano de financiamento deve estar entre 1900 e 2100.");
      return;
    }

    if (valorInvestimento <= 0) {
      alert("O valor do investimento deve ser superior a 0€.");
      return;
    }
    

    const novoInvestimento: InvestimentoHistorico = {
      id: editInvestimentoId ?? Date.now(),
      tipo_investimento: tipoInvestimento,
      ano_financiamento: Number(anoInvestimento),
      valor_aprovado: Number(valorInvestimento)
    };

    if (editInvestimentoId) {
      setHistoricoInvestimentos(prev =>
        prev.map(inv => (inv.id === editInvestimentoId ? novoInvestimento : inv))
      );
    } else {
      setHistoricoInvestimentos(prev => [...prev, novoInvestimento]);
    }

    // Aqui será chamada a API para POST
    setOpenInvestimentoModal(false);
    setTipoInvestimento("");
    setAnoInvestimento("");
    setValorInvestimento("");
  };


  // Para saber se estamos a editar uma despesa ou investimento
  const [editDespesaId, setEditDespesaId] = useState<number | null>(null);
  const [editInvestimentoId, setEditInvestimentoId] = useState<number | null>(null);

  // Abrir modal de edição de despesa
  const handleEditDespesa = (despesa: Despesa) => {
    setDescricao(despesa.descricao);
    setValor(despesa.valor);
    setInvestimentoId(despesa.investimento_id.toString());
    setEditDespesaId(despesa.id);
    setOpenDespesaModal(true);
  };

  // Abrir modal de edição de investimento
  const handleEditInvestimento = (inv: InvestimentoHistorico) => {
    setTipoInvestimento(inv.tipo_investimento);
    setAnoInvestimento(inv.ano_financiamento);
    setValorInvestimento(inv.valor_aprovado);
    setEditInvestimentoId(inv.id);
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
        <h1 className="text-3xl font-bold tracking-tight">Gestão Financeira {anoAtual}</h1>
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
            setInvestimentoId(""); // ← MUITO IMPORTANTE
            setOpenDespesaModal(true);
          }}>
          
          + Adicionar Despesa
        </Button>

        <Button onClick={() => setOpenInvestimentoModal(true)}>
          + Adicionar Investimento
        </Button>

        <Dialog open={openDespesaModal} onOpenChange={setOpenDespesaModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Despesa</DialogTitle>
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

                    // aceita apenas números e decimais
                    if (!/^\d*([.,]\d{0,2})?$/.test(value)) return;

                    const num = Number(value.replace(",", "."));
                    if (num >= 0 || value === "") {
                      setValor(value === "" ? "" : num);
                  }
                }}
              />

              <Select
                key={investimentoId}   // FIX
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
                  disabled={!descricao.trim() ||
                    valor === "" ||
                    valor <= 0 ||
                    !investimentoId
                  }
                >
                  Guardar Despesa
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* adicionar investimentos */}
        <Dialog open={openInvestimentoModal} onOpenChange={setOpenInvestimentoModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Investimento</DialogTitle>
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
                  // só aceita números
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
                min={0}
                step="0.01"
                value={valorInvestimento}
                onChange={(e) => {
                  const value = e.target.value;
                  // aceita números e decimal
                  if (!/^\d*([.,]\d{0,2})?$/.test(value)) return;

                  const num = Number(value.replace(",", "."));
                  if (num >= 0 || value === "") {
                    setValorInvestimento(value === "" ? "" : num);
                  }
                }}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  onClick={handleAddInvestimento}
                  disabled={
                    !tipoInvestimento ||
                    !anoInvestimento ||
                    anoInvestimento <= 0 ||
                    !valorInvestimento ||
                    valorInvestimento <= 0
                  }
                >
                  Guardar Investimento
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
      
      {/* Históricos lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Histórico de despesas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Histórico de Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor (€)</TableHead>
                  <TableHead>Investimento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                      Não existem despesas registadas.
                    </TableCell>
                  </TableRow>
                ) : (
                  historico.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>{d.descricao}</TableCell>
                      <TableCell>{formatMoney(d.valor)}</TableCell>
                      <TableCell>{d.investimento_nome}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleEditDespesa(d)}>
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Histórico de investimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Histórico de Investimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investimento</TableHead>
                  <TableHead>Ano Financiamento</TableHead>
                  <TableHead>Valor (€)</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicoInvestimentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                      Não existem investimentos registados.
                    </TableCell>
                  </TableRow>
                ) : (
                  historicoInvestimentos.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.tipo_investimento}</TableCell>
                      <TableCell>{inv.ano_financiamento}</TableCell>
                      <TableCell>{formatMoney(inv.valor_aprovado)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleEditInvestimento(inv)}>
                          Editar
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