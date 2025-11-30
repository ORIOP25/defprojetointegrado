import { useState, useContext, useRef, useEffect } from "react";
import { AuthContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, Loader2, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "ai";
  content: string;
}

const Chat = () => {
  const { token } = useContext(AuthContext);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Olá! Sou o assistente do SIGE. Tenho acesso aos dados financeiros e pedagógicos. Em que posso ajudar?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para o fundo
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/chat/message", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: userMsg })
      });

      if (!response.ok) throw new Error("Erro");
      const data = await response.json();
      
      setMessages(prev => [...prev, { role: "ai", content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "ai", content: "Desculpe, não consegui contactar o servidor." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-4 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            Chat Assistente
          </h1>
          <p className="text-muted-foreground">Faça perguntas sobre os dados da escola.</p>
        </div>
        <Button variant="outline" onClick={() => setMessages([])} title="Limpar conversa">
          <Eraser className="h-4 w-4 mr-2" /> Limpar
        </Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-2">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "flex w-full",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "flex gap-3 max-w-[80%] rounded-lg p-4 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start w-full">
                <div className="bg-muted rounded-lg p-4 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs text-muted-foreground">A analisar dados...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: Quais são os alunos com piores notas?"
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default Chat;