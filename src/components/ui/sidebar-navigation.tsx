import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, Users, Calendar, MessageSquare, BarChart3, FileText, Settings, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Condominio {
  id: string;
  nome: string;
  endereco: string;
  status: string;
}

interface SidebarNavigationProps {
  condominios: Condominio[];
  selectedCondominio: string | null;
  onCondominioSelect: (condominioId: string) => void;
  selectedPage: string;
  onPageSelect: (page: string) => void;
  userPermissions: string[];
}

const pageConfig = {
  crm: { label: 'CRM', icon: MessageSquare },
  moradores: { label: 'Moradores', icon: Users },
  reservas: { label: 'Reserva de Espaço', icon: Calendar },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare },
  dashboard: { label: 'Dashboard', icon: BarChart3 },
  faq: { label: 'FAQ / Documentos', icon: FileText },
  configuracoes: { label: 'Configurações', icon: Settings },
};

export function SidebarNavigation({
  condominios,
  selectedCondominio,
  onCondominioSelect,
  selectedPage,
  onPageSelect,
  userPermissions
}: SidebarNavigationProps) {
  const availablePages = Object.entries(pageConfig).filter(([key]) => 
    userPermissions.includes(key)
  );

  return (
    <div className="w-80 border-r bg-background/50 backdrop-blur">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Condomínios</h2>
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {condominios.map((condominio) => (
              <Card 
                key={condominio.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-accent",
                  selectedCondominio === condominio.id && "bg-accent border-primary"
                )}
                onClick={() => onCondominioSelect(condominio.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{condominio.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {condominio.endereco}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={condominio.status === 'ativo' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {condominio.status}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {selectedCondominio && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
              PÁGINAS DISPONÍVEIS
            </h3>
            <div className="space-y-1">
              {availablePages.map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={key}
                    variant={selectedPage === key ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => onPageSelect(key)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {config.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}