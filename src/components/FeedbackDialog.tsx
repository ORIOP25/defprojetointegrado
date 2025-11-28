import { useState, useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export function FeedbackDialog() {
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Por favor, atribua uma classificação.");
      return;
    }

    setIsSubmitting(true);

    try {
      // SIMULAÇÃO: Como o backend de feedback ainda não está pronto (Fase 4),
      // vamos apenas simular o envio com sucesso por agora.
      
      console.log("Feedback enviado (Simulado):", {
        user_email: user?.email,
        rating,
        feedback
      });

      // Quando o backend estiver pronto, usarias:
      // await api.post('/feedback', { rating, feedback });

      await new Promise(resolve => setTimeout(resolve, 1000)); // Fake delay

      toast.success("Obrigado pelo seu feedback!");
      setOpen(false);
      setRating(0);
      setFeedback("");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enviar Feedback</DialogTitle>
          <DialogDescription>
            Ajude-nos a melhorar o SIGE. A sua opinião é importante.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Classificação</label>
            <div className="flex justify-center py-2">
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="feedback" className="text-sm font-medium">
              Comentários
            </label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Diga-nos o que podemos melhorar..."
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}