// Ambient declarations for Pyodide. One source of truth so per-component
// `declare global` blocks don't conflict.

declare global {
  interface PyodideInstance {
    runPython: (code: string) => unknown;
    runPythonAsync: (code: string) => Promise<unknown>;
    loadPackage: (pkg: string | string[]) => Promise<void>;
    globals: {
      get: (name: string) => unknown;
      set: (name: string, value: unknown) => void;
    };
    FS: {
      writeFile: (path: string, data: string | Uint8Array) => void;
      readFile: (path: string) => Uint8Array;
      mkdir: (path: string) => void;
    };
  }

  interface PyodideLoadOptions {
    indexURL?: string;
    fullStdLib?: boolean;
    stdout?: (s: string) => void;
    stderr?: (s: string) => void;
  }

  interface Window {
    loadPyodide?: (options?: PyodideLoadOptions) => Promise<PyodideInstance>;
    pyodide?: PyodideInstance;
  }
}

export {};
