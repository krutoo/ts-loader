import type { ParsedCommandLine } from 'typescript';

export interface LoaderConfig {
  configPath?: string;
  configParsed?: Pick<ParsedCommandLine, 'fileNames' | 'options'>;
  tsLoader: {
    skipCheck: boolean;
  };
}

export interface InitializeHookData {
  port: string;
}

export interface ResolveActionPayload {
  specifier: string;
  parentUrl?: string;
}

export interface TranspileActionPayload {
  fileUrl: string;
}

export interface Api {
  resolve(payload: ResolveActionPayload): Promise<string | null>;
  transpile(payload: TranspileActionPayload): Promise<string | null>;
}
