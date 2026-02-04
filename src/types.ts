import type { ParsedCommandLine } from 'typescript';

export type Config = Pick<ParsedCommandLine, 'fileNames' | 'options'> & {
  configPath: string;
  tsLoader: { skipCheck: boolean };
};

export interface InitializeHookData {
  port: string;
}
