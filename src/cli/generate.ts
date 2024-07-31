import { Command } from 'commander';
import type { ISession } from 'myst-cli-utils';
import { clirun, getSession } from 'myst-cli-utils';
import { generateDoi } from '../utils.js';

const PREFIX: Record<string, string> = {
  curvenote: '10.62329',
  msa: '10.69761',
  scipy: '10.25080',
  physiome: '10.36903',
};

export async function generate(session: ISession, prefix: string) {
  const doi = generateDoi(PREFIX[prefix] || prefix);
  session.log.info(doi);
}

function makeGenerateCLI(program: Command) {
  const command = new Command('generate')
    .description('Generates an new DOI')
    .argument('[prefix]', 'The DOI prefix', PREFIX.curvenote)
    .action(clirun(generate, { program, getSession }));
  return command;
}

export function addGenerateCLI(program: Command) {
  program.addCommand(makeGenerateCLI(program));
}
