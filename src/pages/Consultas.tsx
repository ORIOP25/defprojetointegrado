import { useState, useEffect } from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, Award, CalendarDays } from "lucide-react";

const ConsultasPage = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [anosLetivos, setAnosLetivos] = useState<string[]>([]);
  const [selectedAno, setSelectedAno] = useState<string>("");

  useEffect(() => {
    // Carregar a lista de anos letivos disponíveis
    api.get("/students/anos-letivos").then(res => {
      setAnosLetivos(res.data);
      if (res.data.length > 0) setSelectedAno(res.data[0]);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedAno) return;
    setLoading(true);
    api.get(`/consultas/?ano_letivo=${selectedAno}`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedAno]);

  if (loading && !data) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Consultas e Desempenho</h1>
          <p className="text-muted-foreground">Estatísticas detalhadas para o ano {selectedAno}</p>
        </div>
        <div className="w-48">
          <Select value={selectedAno} onValueChange={setSelectedAno}>
            <SelectTrigger className="bg-card"><CalendarDays className="w-4 h-4 mr-2" /><SelectValue placeholder="Ano..." /></SelectTrigger>
            <SelectContent>{anosLetivos.map(ano => <SelectItem key={ano} value={ano}>{ano}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="alunos-top">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alunos-top"><Award className="mr-2" size={16}/> Melhores Alunos</TabsTrigger>
          <TabsTrigger value="reprovacoes"><AlertTriangle className="mr-2" size={16}/> Alunos Reprovados</TabsTrigger>
          <TabsTrigger value="profs-top"><TrendingUp className="mr-2" size={16}/> Melhores Resultados (Profs)</TabsTrigger>
          <TabsTrigger value="profs-bottom"><TrendingDown className="mr-2" size={16}/> Piores Resultados (Profs)</TabsTrigger>
        </TabsList>

        <TabsContent value="alunos-top">
          <Card>
            <CardHeader><CardTitle>Melhores Alunos</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Turma</TableHead>
                    <TableHead>Nome do Aluno</TableHead>
                    <TableHead className="text-right">Média Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.top_alunos_turma.map((a: any, index: number) => {
                    const isNewTurma = index === 0 || a.turma !== data.top_alunos_turma[index - 1].turma;
                    return (
                      <TableRow key={a.aluno_id} className={isNewTurma ? "border-t-2 border-primary/20 bg-muted/30" : ""}>
                        <TableCell className="font-bold text-primary">{isNewTurma ? a.turma : ""}</TableCell>
                        <TableCell>{a.nome}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">{a.media.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reprovacoes">
          <Card>
            <CardHeader><CardTitle className="text-destructive">Alunos Reprovados</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Turma</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead className="text-center">Negativas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.alunos_reprovacao.map((a: any, index: number) => {
                    const isNewTurma = index === 0 || a.turma !== data.alunos_reprovacao[index - 1].turma;
                    return (
                      <TableRow key={a.aluno_id} className={isNewTurma ? "border-t-2 border-red-100 bg-red-50/30" : ""}>
                        <TableCell className="font-bold text-red-700">{isNewTurma ? a.turma : ""}</TableCell>
                        <TableCell>{a.nome}</TableCell>
                        <TableCell className="text-center text-red-600 font-bold">{a.negativas}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profs-top">
          <Card>
            <CardHeader><CardTitle>Professores com Melhores Resultados</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Professor</TableHead><TableHead>Disciplina</TableHead><TableHead className="text-right">Média Turma</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data?.top_professores.map((p: any) => (
                    <TableRow key={p.professor_id + p.disciplina}><TableCell className="font-medium">{p.nome}</TableCell><TableCell>{p.disciplina}</TableCell><TableCell className="text-right font-bold text-blue-600">{p.media_alunos.toFixed(2)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profs-bottom">
          <Card>
            <CardHeader><CardTitle className="text-red-600">Professores com Piores Resultados</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Professor</TableHead><TableHead>Disciplina</TableHead><TableHead className="text-right">Média Turma</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data?.bottom_professores.map((p: any) => (
                    <TableRow key={p.professor_id + p.disciplina} className="bg-red-50/50">
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{p.disciplina}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">{p.media_alunos.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConsultasPage;