import fs from 'node:fs';
import { Command } from 'commander';
import chalk from 'chalk';
import { clirun, getSession } from 'myst-cli-utils';
import type { ISession } from 'myst-cli-utils';
import { validateDeposit } from 'crossref-utils';
import { schemaBundleForDepositXml } from './schemas.js';

export async function validateAgainstXsdWrapper(session: ISession, file: string) {
  if (!fs.existsSync(file)) throw new Error(`File does not exist: ${file}`);
  const xml = fs.readFileSync(file, 'utf8');
  const { version, schema } = await schemaBundleForDepositXml(xml, session.log);
  session.log.info(`🧐 Validating against Crossref schema ${version} (caller-supplied bundle)`);
  const result = await validateDeposit(xml, schema);
  if (result.ok) {
    session.log.info(chalk.greenBright('XML validation passed!'));
    return;
  }
  result.errors.forEach((err) => {
    const loc =
      err.line != null ? ` (line ${err.line}${err.column != null ? `:${err.column}` : ''})` : '';
    session.log.error(`${err.message}${loc}`);
  });
  throw new Error('XML validation failed.');
}

function makeValidateCLI(program: Command) {
  const command = new Command('validate')
    .description('Validate a crossref deposit file against the XSD')
    .argument('<file>', 'Crossref deposit file to validate')
    .action(clirun(validateAgainstXsdWrapper, { program, getSession }));
  return command;
}

export function addValidateCLI(program: Command) {
  program.addCommand(makeValidateCLI(program));
}
