import React, { useMemo, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface MonacoCodeEditorProps {
  fileName: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  isDiff?: boolean;
  originalValue?: string;
}

export function MonacoCodeEditor({
  fileName,
  value,
  onChange,
  readOnly = false,
  isDiff = false,
  originalValue = "",
}: MonacoCodeEditorProps) {
  const [isClient, setIsClient] = useState(false);
  const [MonacoComponent, setMonacoComponent] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    let mounted = true;

    // Dynamically load Monaco on client side only to avoid SSR window/document crashes
    import("@monaco-editor/react")
      .then((mod) => {
        if (mounted) {
          setMonacoComponent({
            Editor: mod.default || mod.Editor,
            DiffEditor: mod.DiffEditor,
          });
        }
      })
      .catch((err) => {
        console.warn("Monaco dynamic load fallback:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Determine language based on file extension
  const language = useMemo(() => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return "typescript";
    if (lower.endsWith(".js") || lower.endsWith(".jsx")) return "javascript";
    if (lower.endsWith(".sql")) return "sql";
    if (lower.endsWith(".json")) return "json";
    if (lower.endsWith(".md")) return "markdown";
    if (lower.endsWith(".css")) return "css";
    if (lower.endsWith(".html")) return "html";
    if (lower.endsWith(".yml") || lower.endsWith(".yaml")) return "yaml";
    return "markdown";
  }, [fileName]);

  const handleEditorWillMount = (monaco: any) => {
    if (!monaco?.editor) return;
    try {
      monaco.editor.defineTheme("pocket-cto-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "64748b", fontStyle: "italic" },
          { token: "keyword", foreground: "2dd4bf", fontStyle: "bold" },
          { token: "string", foreground: "a5b4fc" },
          { token: "number", foreground: "38bdf8" },
          { token: "type", foreground: "c084fc" },
          { token: "identifier", foreground: "e2e8f0" },
        ],
        colors: {
          "editor.background": "#090d16",
          "editor.foreground": "#e2e8f0",
          "editor.lineHighlightBackground": "#0f172a80",
          "editorCursor.foreground": "#2dd4bf",
          "editorWhitespace.foreground": "#334155",
          "editorIndentGuide.background": "#1e293b",
          "editorIndentGuide.activeBackground": "#334155",
          "editorLineNumber.foreground": "#475569",
          "editorLineNumber.activeForeground": "#2dd4bf",
          "editorGutter.background": "#070b14",
        },
      });
    } catch {
      /* ignore theme define error */
    }
  };

  // SSR or Loading Fallback: Beautiful native code textarea
  if (!isClient || !MonacoComponent?.Editor) {
    const lines = value.split("\n");
    return (
      <div className="flex h-full w-full font-mono text-xs leading-relaxed bg-[#090d16] text-slate-200 overflow-auto border-0">
        <div className="w-12 select-none border-r border-border/50 bg-[#060913] py-3 text-right pr-3 text-muted-foreground/40 space-y-0.5 shrink-0">
          {lines.map((_, i) => (
            <div key={i} className="text-[11px] h-5 leading-5">
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          readOnly={readOnly}
          className="flex-1 p-3 bg-transparent font-mono text-xs leading-5 text-slate-200 resize-none outline-none border-0 focus:ring-0 whitespace-pre"
          spellCheck={false}
        />
      </div>
    );
  }

  const { Editor, DiffEditor } = MonacoComponent;

  if (isDiff && DiffEditor) {
    return (
      <div className="h-full w-full overflow-hidden rounded-md bg-[#090d16]">
        <DiffEditor
          height="100%"
          language={language}
          original={originalValue}
          modified={value}
          theme="pocket-cto-dark"
          beforeMount={handleEditorWillMount}
          loading={
            <div className="flex h-full items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" /> Loading Diff...
            </div>
          }
          options={{
            readOnly: true,
            fontSize: 12.5,
            fontFamily: "JetBrains Mono, Menlo, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderSideBySide: true,
            smoothScrolling: true,
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-[#090d16]">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={(val: string | undefined) => {
          if (onChange && val !== undefined) {
            onChange(val);
          }
        }}
        theme="pocket-cto-dark"
        beforeMount={handleEditorWillMount}
        loading={
          <div className="flex h-full items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" /> Initializing Editor...
          </div>
        }
        options={{
          readOnly,
          fontSize: 12.5,
          fontFamily: "JetBrains Mono, Menlo, monospace",
          fontLigatures: true,
          minimap: { enabled: true, scale: 0.75 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          lineNumbers: "on",
          renderLineHighlight: "all",
          wordWrap: "on",
          tabSize: 2,
          automaticLayout: true,
          cursorBlinking: "smooth",
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}
