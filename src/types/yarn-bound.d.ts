declare module 'yarn-bound' {
  export interface DialogueOption {
    text: string;
    isAvailable?: boolean;
    metadata?: unknown;
  }

  export interface TextResult {
    text: string;
  }

  export interface OptionsResult {
    options: DialogueOption[];
  }

  export interface CommandResult {
    command: string;
    args: unknown[];
  }

  export type DialogueResult = TextResult | OptionsResult | CommandResult | null;

  export class Runner {
    constructor();
    load(content: string): void;
    setVariableStorage(storage: unknown): void;
    registerFunction(name: string, fn: Function): void;
    run(startNode?: string): Generator<unknown>;
    variables: Map<string, unknown>;
    registerCommand(name: string, callback: (...args: unknown[]) => void): void;
    startDialogue(nodeName: string): void;
    advance(): DialogueResult;
    choose(optionIndex: number): void;
  }

  export class BuiltinTypeParser {
    constructor();
  }
}
