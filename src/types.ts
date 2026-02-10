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
