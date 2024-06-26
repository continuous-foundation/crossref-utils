import path from 'node:path';
import fs from 'node:fs';
import { Command, Option } from 'commander';
import inquirer from 'inquirer';
import { v4 as uuid } from 'uuid';
import { Session, filterPages, getFileContent, processProject, selectors } from 'myst-cli';
import type { ISession } from 'myst-cli';
import { clirun } from 'myst-cli-utils';
import { extractPart } from 'myst-common';
import { JatsSerializer } from 'myst-to-jats';
import { VFile } from 'vfile';
import { u } from 'unist-builder';
import type { Element } from 'xast';
import { DoiBatch } from '../batch.js';
import { preprintFromMyst } from '../preprint.js';
import { element2JatsUnist } from '../utils.js';

export async function deposit(
  session: ISession,
  opts: {
    type?: 'conference' | 'preprint';
    file?: string;
    id?: string;
    name?: string;
    email?: string;
    registrant?: string;
    output?: string;
  },
) {
  let { type: depositType, name, email, registrant } = opts;
  if (!depositType) {
    const resp = await inquirer.prompt([
      {
        name: 'depositType',
        type: 'list',
        message: 'Deposit type:',
        choices: [
          { name: 'Posted Content / Preprint', value: 'preprint' },
          { name: 'Conference Proceeding', value: 'conference' },
        ],
      },
    ]);
    depositType = resp.depositType;
  }
  if (depositType !== 'preprint') {
    throw new Error('Conference Proceeding not yet implemented');
  }
  if (!name) {
    const resp = await inquirer.prompt([
      {
        name: 'name',
        type: 'string',
        message: 'Depositor name:',
      },
    ]);
    name = resp.name;
  }
  if (!email) {
    const resp = await inquirer.prompt([
      {
        name: 'email',
        type: 'string',
        message: 'Depositor email:',
      },
    ]);
    email = resp.email;
  }
  if (!name || !email) throw new Error('Depositor name/email not provided');
  if (!registrant) {
    const resp = await inquirer.prompt([
      {
        name: 'registrant',
        type: 'string',
        message: 'Registrant:',
      },
    ]);
    registrant = resp.registrant;
  }
  await session.reload();
  const projectPath = selectors.selectCurrentProjectPath(session.store.getState());
  if (!projectPath) {
    throw new Error('No MyST project found');
  }
  let depositFile: string;
  if (opts.file) {
    depositFile = path.resolve(opts.file);
  } else {
    const project = await processProject(
      session,
      { path: projectPath },
      {
        imageExtensions: [],
        writeFiles: false,
      },
    );
    const pages = filterPages(project);
    if (pages.length === 0) throw new Error('No MyST pages found');
    if (pages.length === 1) {
      depositFile = pages[0].file;
    } else {
      const resp = await inquirer.prompt([
        {
          name: 'depositFile',
          type: 'list',
          message: 'File:',
          choices: filterPages(project).map(({ file }) => {
            return { name: path.relative('.', file), value: file };
          }),
        },
      ]);
      depositFile = resp.depositFile;
    }
  }
  const content = await getFileContent(session, [depositFile], {
    projectPath,
    imageExtensions: [],
  });

  let abstract: Element | undefined;
  const abstractPart = extractPart(content[0].mdast, 'abstract');
  if (abstractPart) {
    const serializer = new JatsSerializer(new VFile(), abstractPart as any);
    const jats = serializer.render(true).elements();
    abstract = u(
      'element',
      { name: 'jats:abstract' },
      jats.map((e) => element2JatsUnist(e)),
    ) as Element;
  }

  const dois: Record<string, string> = {};
  content[0].references.cite?.order.forEach((key) => {
    const value = content[0].references.cite?.data[key].doi;
    if (value) dois[key] = value;
    else session.log.warn(`Citation without DOI excluded from crossref deposit: ${key}`);
  });

  const body = preprintFromMyst(content[0].frontmatter, dois, abstract);

  const batch = new DoiBatch(
    { id: opts.id ?? uuid(), depositor: { name, email }, registrant },
    body,
  );
  if (opts.output) {
    fs.writeFileSync(opts.output, batch.toXml());
  } else {
    console.log(batch.toXml());
  }
}

function makeDepositCLI(program: Command) {
  const command = new Command('deposit')
    .description('Create Crossref deposit XML from local MyST content')
    .addOption(new Option('--file <value>', 'File to deposit'))
    .addOption(
      new Option('--type <value>', 'Deposit type')
        .choices(['conference', 'preprint'])
        .default('preprint'),
    )
    .addOption(new Option('--id <value>', 'Deposit batch id'))
    .addOption(new Option('--name <value>', 'Depositor name').default('Curvenote'))
    .addOption(new Option('--email <value>', 'Depositor email').default('doi@curvenote.com'))
    .addOption(new Option('--registrant <value>', 'Registrant organization').default('Crossref'))
    .addOption(new Option('-o, --output <value>', 'Output file'))
    .action(clirun(deposit, { program, getSession: (logger) => new Session({ logger }) }));
  return command;
}

export function addDepositCLI(program: Command) {
  program.addCommand(makeDepositCLI(program));
}
