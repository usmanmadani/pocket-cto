import React, { useMemo } from "react";
import Editor, { DiffEditor, loader } from "@monaco-editor/react";
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

  const handleEditorWillMount = (monaco: typeof import("monaco-editor")) => {
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
  };

  if (isDiff) {
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
              <Loader2 className="size-4 animate-spin text-primary" /> Loading Diff Editor...
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
        onChange={(val) => {
          if (onChange && val !== undefined) {
            onChange(val);
          }
        }}
        theme="pocket-cto-dark"
        beforeMount={handleEditorWillMount}
        loading={
          <div className="flex h-full items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" /> Initializing Monaco Editor...
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
