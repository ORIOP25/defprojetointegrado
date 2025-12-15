import { useState, useContext, useRef, useEffect } from "react";
import { AuthContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, Loader2, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: "user" | "ai";
  content: string;
}

const Chat = () => {
  const { token } = useContext(AuthContext);
  
  // --- 1. MUDANÇA: Inicializar estado lendo do LocalStorage ---
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("chat_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Erro ao ler histórico", e);
      }
    }
    // Valor por defeito se não houver histórico
    return [{ role: "ai", content: "Olá! Sou o assistente do SIGE. Tenho acesso aos dados financeiros e pedagógicos. Em que posso ajudar?" }];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- 2. MUDANÇA: Guardar no LocalStorage sempre que houver mensagens novas ---
  useEffect(() => {
    localStorage.setItem("chat_history", JSON.stringify(messages));
  }, [messages]);

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

  // --- 3. MUDANÇA: Limpar também o LocalStorage ---
  const handleClear = () => {
    const initialMsg: Message[] = [{ role: "ai", content: "Conversa limpa. Em que posso ajudar agora?" }];
    setMessages(initialMsg);
    localStorage.removeItem("chat_history");
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
        
        {/* Atualizado para usar a função handleClear */}
        <Button variant="outline" onClick={handleClear} title="Limpar conversa">
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
                    "flex gap-3 max-w-[85%] rounded-lg p-4 text-sm shadow-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  
                  {/* Markdown Renderer (Mantido da correção anterior) */}
                  <div className="leading-relaxed w-full overflow-hidden">
                    {msg.role === "user" ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({node, ...props}) => (
                            <div className="overflow-x-auto my-3 border rounded-md bg-white">
                              <table className="min-w-full divide-y divide-gray-200" {...props} />
                            </div>
                          ),
                          thead: ({node, ...props}) => <thead className="bg-gray-100" {...props} />,
                          th: ({node, ...props}) => (
                            <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider" {...props} />
                          ),
                          tr: ({node, ...props}) => <tr className="even:bg-gray-50" {...props} />,
                          td: ({node, ...props}) => (
                            <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap border-t border-gray-100" {...props} />
                          ),
                          strong: ({node, ...props}) => <span className="font-bold text-black" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 mb-2" {...props} />,
                          li: ({node, ...props}) => <li className="pl-1" {...props} />,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
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
              placeholder="Ex: Identifica os 3 piores alunos e as suas faltas."
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