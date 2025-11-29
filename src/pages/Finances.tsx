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

const Finances = () => {
  const [data, setData] = useState<BalancoGeral | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Por defeito vamos buscar o ano atual
  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        // Nota: O endpoint está em /financas no main.py
        const response = await fetch(`http://127.0.0.1:8000/financas/balanco/anual?ano=${anoAtual}`);
        
        if (!response.ok) {
          throw new Error("Falha ao carregar dados financeiros.");
        }
        
        const result = await response.json();
        setData(result);
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
    </div>
  );
};

export default Finances;