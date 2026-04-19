function OutputPanel({ output }) {
  return (
    <div className="h-full bg-[#171214] flex flex-col">
      <div className="px-4 py-2 bg-[#21181c] border-b border-[#34282c] font-semibold text-sm text-[#f2ece7]">
        Output
      </div>
      <div className="flex-1 overflow-auto p-4">
        {output === null ? (
          <p className="text-sm text-[#a49891]">Click "Run Code" to see the output here...</p>
        ) : output.success ? (
          <pre className="text-sm font-mono text-success whitespace-pre-wrap">{output.output}</pre>
        ) : (
          <div>
            {output.output && (
              <pre className="mb-2 whitespace-pre-wrap text-sm font-mono text-[#ddd3cc]">
                {output.output}
              </pre>
            )}
            <pre className="text-sm font-mono text-error whitespace-pre-wrap">{output.error}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
export default OutputPanel;
