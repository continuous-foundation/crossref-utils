import { Command } from 'commander';
import type { ISession } from 'myst-cli-utils';
import { clirun, getSession } from 'myst-cli-utils';

export async function parseInvFile(session: ISession, path: string) {
  console.log(path);
}

function makeParseCLI(program: Command) {
  const command = new Command('parse')
    .description('Parse a local objects.inv')
    .argument('<path>', 'A path to local objects.inv or remote URL')
    .action(clirun(parseInvFile, { program, getSession }));
  return command;
}

export function addParseCLI(program: Command) {
  program.addCommand(makeParseCLI(program));
}
