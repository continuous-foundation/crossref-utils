import { Command } from 'commander';
import inquirer from 'inquirer';
import type { ISession } from 'myst-cli-utils';
import { clirun, getSession } from 'myst-cli-utils';
import { generateDoi } from '../utils.js';
import { plural } from 'myst-common';

const PREFIX: Record<string, string> = {
  curvenote: '10.62329',
  msa: '10.69761',
  scipy: '10.25080',
  physiome: '10.36903',
};

export async function selectNewDois(count: number, prefix: string) {
  const dois: string[] = [];
  while (dois.length < count) {
    const resp = await inquirer.prompt([
      {
        name: 'dois',
        message: `Select ${plural('%s DOI(s)', count - dois.length)}`,
        type: 'checkbox',
        choices: [...Array(count * 2)].map(() => generateDoi(PREFIX[prefix] || prefix)),
      },
    ]);
    dois.push(...resp.dois);
  }
  return dois;
}

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
