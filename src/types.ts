import type { ParsedCommandLine } from 'typescript';

export interface LoaderConfig extends Pick<ParsedCommandLine, 'fileNames' | 'options'> {
  configPath: string;
  tsLoader: { skipCheck: boolean };
}

export interface InitializeHookData {
  port: string;
}
