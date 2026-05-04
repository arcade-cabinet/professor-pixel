// Ambient declarations for the Pyodide CDN script that gets injected at runtime.
// One source of truth so per-component `declare global` blocks don't conflict.

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

declare global {
  interface Window {
    loadPyodide?: (options?: PyodideLoadOptions) => Promise<PyodideInstance>;
    pyodide?: PyodideInstance;
  }
}

export {};
