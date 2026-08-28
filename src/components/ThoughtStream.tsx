import { useEffect, useRef } from "react";

export function ThoughtStream({ text, active }: { text: string; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text]);

  if (!text && !active) return null;

  return (
    <div className="panel p-4">
      <div className="mb-2 flex items-center gap-2 text-xs tracking-[0.2em] text-primary uppercase">
        <span className="inline-block size-2 rounded-full bg-primary caret" />
        Thought stream
      </div>
      <div
        ref={ref}
        className="max-h-56 overflow-y-auto font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-muted-foreground"
      >
        {text || "Booting architect agent..."}
        {active && <span className="caret text-primary">▍</span>}
      </div>
    </div>
  );
}
