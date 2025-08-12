
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface CRMFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  allTags: string[];
}

export function CRMFilters({
  search,
  onSearchChange,
  selectedTags,
  onToggleTag,
  allTags,
}: CRMFiltersProps) {
  const sortedTags = useMemo(
    () => [...allTags].sort((a, b) => a.localeCompare(b)),
    [allTags]
  );

  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar por descrição, tipo, telefone..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-md"
        />
      </div>
      {sortedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sortedTags.map((tag) => {
            const active = selectedTags.includes(tag);
            return (
              <Badge
                key={tag}
                variant={active ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => onToggleTag(tag)}
              >
                #{tag}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
