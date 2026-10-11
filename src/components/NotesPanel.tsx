import { FloatingPanel, PanelItem } from "@/components/FloatingPanel";
import type { Focus } from "@/graph/highlight";
import { type Note, noteLeaves } from "@/model/architecture";
import type { DiagramView } from "@/model/views";

/** 领域视图只列涉及本领域组件的要点，序号沿用全图编号。 */
export function scopedNotes({ source, scope }: DiagramView): [Note, number][] {
  return source.notes
    .map((note, index): [Note, number] => [note, index])
    .filter(
      ([note]) =>
        !scope || noteLeaves(source, note).some((leaf) => source.domainOf.get(leaf) === scope),
    );
}

/** 架构要点：点击高亮涉及的组件并在详情中展开说明。 */
export function NotesPanel({
  view,
  focus,
  onFocus,
  onClose,
}: {
  view: DiagramView;
  focus: Focus;
  onFocus: (focus: Focus) => void;
  onClose: () => void;
}) {
  return (
    <FloatingPanel title="要点" onClose={onClose} className="w-80">
      {scopedNotes(view).map(([note, index]) => {
        const id = String(index);
        const active = focus?.type === "note" && focus.id === id;
        return (
          <PanelItem
            key={note.title}
            active={active}
            onClick={() => onFocus(active ? null : { type: "note", id })}
          >
            <span className="flex gap-2">
              <span className="w-4 shrink-0 text-right text-muted-foreground">{index + 1}</span>
              <span className="min-w-0">
                <span className="block font-medium">{note.title}</span>
                <span className="line-clamp-2 text-muted-foreground">{note.description}</span>
              </span>
            </span>
          </PanelItem>
        );
      })}
    </FloatingPanel>
  );
}
