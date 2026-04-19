import Editor from "@monaco-editor/react";
import { LayoutPanelTop, Loader2Icon, PanelLeft, PlayIcon } from "lucide-react";
import { LANGUAGE_CONFIG } from "../data/problems";

function CodeEditorPanel({
  selectedLanguage,
  code,
  isRunning,
  onLanguageChange,
  onCodeChange,
  onRunCode,
  toggleSidebar,
  toggleOutput,
}) {
  return (
    <div className="h-full bg-[#171214] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-[#21181c] border-b border-[#34282c]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="btn btn-ghost btn-sm btn-square text-[#d7ccc5]"
              title="Toggle Sidebar"
            >
              <PanelLeft className="size-4" />
            </button>
            <button
              onClick={toggleOutput}
              className="btn btn-ghost btn-sm btn-square text-[#d7ccc5]"
              title="Toggle Output"
            >
              <LayoutPanelTop className="size-4" />
            </button>
          </div>

          <div className="h-5 w-px bg-[#3a2f33]"></div>

          <div className="flex items-center gap-3">
            <img
              src={LANGUAGE_CONFIG[selectedLanguage].icon}
              alt={LANGUAGE_CONFIG[selectedLanguage].name}
              className="size-6"
            />
            <select
              className="select select-sm border-[#3a2f33] bg-[#171214] text-[#f2ece7]"
              value={selectedLanguage}
              onChange={onLanguageChange}
            >
              {Object.entries(LANGUAGE_CONFIG).map(([key, lang]) => (
                <option key={key} value={key}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button className="btn btn-success btn-sm gap-2 text-black" disabled={isRunning} onClick={onRunCode}>
          {isRunning ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <PlayIcon className="size-4" />
              Run Code
            </>
          )}
        </button>
      </div>

      <div className="flex-1 bg-[#171214]">
        <Editor
          height={"100%"}
          language={LANGUAGE_CONFIG[selectedLanguage].monacoLang}
          value={code}
          onChange={onCodeChange}
          theme="vs-dark"
          options={{
            fontSize: 16,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            minimap: { enabled: false },
          }}
        />
      </div>
    </div>
  );
}
export default CodeEditorPanel;
