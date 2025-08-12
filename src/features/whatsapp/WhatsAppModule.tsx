import { useState } from "react";
import { IntegrationSettings } from "./IntegrationSettings";
import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";

interface WhatsAppModuleProps {
  condominioId: string;
}

export function WhatsAppModule({ condominioId }: WhatsAppModuleProps) {
  const [activeMorador, setActiveMorador] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">WhatsApp - Atendimento</h2>
        <p className="text-muted-foreground">Gerencie conversas e integrações do condomínio</p>
      </header>

      <IntegrationSettings condominioId={condominioId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <ConversationList
            condominioId={condominioId}
            activeMoradorId={activeMorador}
            onSelect={(id) => setActiveMorador(id)}
          />
        </div>
        <div className="lg:col-span-2 min-h-[640px]">
          {activeMorador ? (
            <MessageThread condominioId={condominioId} moradorId={activeMorador} />
          ) : (
            <div className="h-full grid place-items-center border rounded-md">
              <p className="text-muted-foreground">Selecione uma conversa para visualizar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
