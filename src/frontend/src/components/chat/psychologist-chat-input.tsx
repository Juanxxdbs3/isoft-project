"use client";

import { useState } from "react";
import { SendHorizonal, CalendarPlus, FileText } from "lucide-react";

interface PsychologistChatInputProps {
  onSend: (text: string, messageType: string) => void;
}

export function PsychologistChatInput({ onSend }: PsychologistChatInputProps) {
  const [text, setText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed, "STANDARD_TEXT");
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function sendAppointmentProposal() {
    onSend("📅 Propuesta de cita: [fecha y hora por definir]", "APPOINTMENT_PROPOSAL");
  }

  function sendCharacterizationLink() {
    onSend("📋 Completa tu ficha de caracterización:", "CHARACTERIZATION_LINK");
  }

  return (
    <div className="border-t border-border">
      {/* Action buttons */}
      <div className="flex gap-1 px-3 pt-2">
        <button
          type="button"
          onClick={sendAppointmentProposal}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          title="Proponer cita"
        >
          <CalendarPlus size={12} />
          Proponer cita
        </button>
        <button
          type="button"
          onClick={sendCharacterizationLink}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          title="Enviar ficha de caracterización"
        >
          <FileText size={12} />
          Ficha caracterización
        </button>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3 pt-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje…"
          maxLength={2000}
          rows={1}
          className="flex-1 px-3 py-2 bg-background border border-input rounded-xl text-sm
                     text-foreground placeholder:text-muted/50 resize-none
                     focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                     min-h-[38px] max-h-24"
          aria-label="Mensaje"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90
                     transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          aria-label="Enviar mensaje"
        >
          <SendHorizonal size={18} />
        </button>
      </form>
    </div>
  );
}
