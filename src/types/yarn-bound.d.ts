declare module 'yarn-bound' {
  export interface DialogueOption {
    text: string;
    isAvailable?: boolean;
    metadata?: any;
  }

  export interface TextResult {
    text: string;
  }

  export interface OptionsResult {
    options: DialogueOption[];
  }

  export interface CommandResult {
    command: string;
    args: any[];
  }

  export type DialogueResult = TextResult | OptionsResult | CommandResult | null;

  export class Runner {
    constructor();
    load(content: string): void;
    setVariableStorage(storage: any): void;
    registerFunction(name: string, fn: Function): void;
    run(startNode?: string): Generator<any>;
    variables: Map<string, any>;
    registerCommand(name: string, callback: (...args: any[]) => void): void;
    startDialogue(nodeName: string): void;
    advance(): DialogueResult;
    choose(optionIndex: number): void;
  }

  export class BuiltinTypeParser {
    constructor();
  }
}
