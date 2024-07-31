import { Command } from 'commander';
import { clirun, getSession } from 'myst-cli-utils';
import { validateAgainstXsdWrapper } from '../validate.js';

function makeValidateCLI(program: Command) {
  const command = new Command('validate')
    .description('Validate XML against crossref xsd schema')
    .argument('<path>', 'A path to local XML file')
    .action(clirun(validateAgainstXsdWrapper, { program, getSession }));
  return command;
}

export function addValidateCLI(program: Command) {
  program.addCommand(makeValidateCLI(program));
}
