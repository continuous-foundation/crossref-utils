import path from 'node:path';
import fs from 'node:fs';
import { Command, Option } from 'commander';
import inquirer from 'inquirer';
import { v4 as uuid } from 'uuid';
import {
  Session,
  filterPages,
  getFileContent,
  loadProject,
  parseMyst,
  processProject,
  selectors,
} from 'myst-cli';
import type { ISession } from 'myst-cli';
import { clirun } from 'myst-cli-utils';
import type { GenericParent } from 'myst-common';
import { extractPart } from 'myst-common';
import { JatsSerializer } from 'myst-to-jats';
import { VFile } from 'vfile';
import { u } from 'unist-builder';
import type { Element } from 'xast';
import { DoiBatch } from '../batch.js';
import { journalArticleFromMyst, journalXml } from '../journal.js';
import { preprintFromMyst } from '../preprint.js';
import { element2JatsUnist, transformXrefToLink } from './utils.js';
import type { ProjectFrontmatter } from 'myst-frontmatter';

export async function deposit(
  session: ISession,
  opts: {
    type?: 'conference' | 'journal' | 'preprint';
    file?: string;
    id?: string;
    name?: string;
    email?: string;
    registrant?: string;
    output?: string;
    journalTitle?: string;
    journalAbbr?: string;
    journalDoi?: string;
  },
) {
  let { type: depositType, name, email, registrant, journalTitle, journalAbbr, journalDoi } = opts;
  if (!depositType) {
    const resp = await inquirer.prompt([
      {
        name: 'depositType',
        type: 'list',
        message: 'Deposit type:',
        choices: [
          { name: 'Posted Content / Preprint', value: 'preprint' },
          { name: 'Journal', value: 'journal' },
          { name: 'Conference Proceeding', value: 'conference' },
        ],
      },
    ]);
    depositType = resp.depositType;
  }
  if (depositType === 'conference') {
    throw new Error('Conference Proceeding not yet implemented');
  }
  if (depositType !== 'journal' && (journalTitle || journalAbbr || journalDoi)) {
    throw new Error('journal title/abbreviation/doi are only used for deposit type "journal"');
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
  const state = session.store.getState();
  const projectPath = selectors.selectCurrentProjectPath(state);
  const configFile = selectors.selectCurrentProjectFile(state);
  if (!projectPath || !configFile) {
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
    const resp = await inquirer.prompt([
      {
        name: 'depositFile',
        type: 'list',
        message: 'File:',
        choices: [{ file: configFile }, ...filterPages(project)].map(({ file }) => {
          return { name: path.relative('.', file), value: file };
        }),
      },
    ]);
    depositFile = resp.depositFile;
  }
  const projectFrontmatter = selectors.selectLocalProjectConfig(
    session.store.getState(),
    projectPath,
  );
  let abstractPart: GenericParent | undefined;
  let frontmatter: ProjectFrontmatter | undefined;
  const dois: Record<string, string> = {};
  if (depositFile === configFile) {
    const { pages } = await loadProject(session, projectPath);
    const fileContents = await getFileContent(
      session,
      pages.map(({ file }) => file),
      { projectPath, imageExtensions: [] },
    );
    if (projectFrontmatter?.parts?.abstract) {
      abstractPart = parseMyst(session, projectFrontmatter.parts.abstract.join('\n\n'), configFile);
    } else {
      fileContents.forEach(({ mdast }) => {
        if (abstractPart) return;
        abstractPart = extractPart(mdast, 'abstract');
      });
    }
    fileContents.forEach(({ references }) => {
      references.cite?.order.forEach((key) => {
        const value = references.cite?.data[key].doi;
        if (value) dois[key] = value;
        else session.log.warn(`Citation without DOI excluded from crossref deposit: ${key}`);
      });
    });
    frontmatter = projectFrontmatter;
  } else {
    const [fileContent] = await getFileContent(session, [depositFile], {
      projectPath,
      imageExtensions: [],
    });
    // Prioritize project title over page title
    const title = projectFrontmatter?.title ?? frontmatter?.title;
    // Prioritize project subtitle over page subtitle unless project has no title
    const subtitle = projectFrontmatter?.title
      ? projectFrontmatter?.subtitle ?? undefined
      : frontmatter?.subtitle;
    frontmatter = { ...fileContent.frontmatter, title, subtitle };
    abstractPart = extractPart(fileContent.mdast, 'abstract');
    fileContent.references.cite?.order.forEach((key) => {
      const value = fileContent.references.cite?.data[key].doi;
      if (value) dois[key] = value;
      else session.log.warn(`Citation without DOI excluded from crossref deposit: ${key}`);
    });
  }

  let abstract: Element | undefined;
  if (abstractPart) {
    transformXrefToLink(abstractPart);
    const serializer = new JatsSerializer(new VFile(), abstractPart as any);
    const jats = serializer.render(true).elements();
    abstract = u(
      'element',
      { name: 'jats:abstract' },
      jats.map((e) => element2JatsUnist(e)),
    ) as Element;
  }

  let body: Element;
  if (depositType === 'journal') {
    if (!journalTitle) {
      const resp = await inquirer.prompt([
        {
          name: 'journalTitle',
          type: 'string',
          message: 'Journal Title:',
        },
      ]);
      journalTitle = resp.journalTitle;
    }
    if (journalAbbr == null) {
      const resp = await inquirer.prompt([
        {
          name: 'journalAbbr',
          type: 'string',
          message: 'Journal Abbreviation:',
        },
      ]);
      journalAbbr = resp.journalAbbr;
    }
    if (!journalDoi) {
      const resp = await inquirer.prompt([
        {
          name: 'journalDoi',
          type: 'string',
          message: 'Journal DOI:',
        },
      ]);
      journalDoi = resp.journalDoi;
    }
    if (!journalTitle || !journalDoi) throw new Error('Journal title and DOI are required');
    body = journalXml(
      {
        title: journalTitle,
        abbrevTitle: journalAbbr,
        doi_data: {
          doi: journalDoi,
          resource: `https://doi.curvenote.com/${journalDoi}`,
        },
      },
      undefined,
      [journalArticleFromMyst(frontmatter ?? {}, dois, abstract)],
    );
  } else {
    body = preprintFromMyst(frontmatter ?? {}, dois, abstract);
  }
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
        .choices(['conference', 'journal', 'preprint'])
        .default('preprint'),
    )
    .addOption(new Option('--id <value>', 'Deposit batch id'))
    .addOption(new Option('--name <value>', 'Depositor name').default('Curvenote'))
    .addOption(new Option('--email <value>', 'Depositor email').default('doi@curvenote.com'))
    .addOption(new Option('--registrant <value>', 'Registrant organization').default('Crossref'))
    .addOption(new Option('-o, --output <value>', 'Output file'))
    .addOption(new Option('--journal-title <value>', 'Journal title for journal deposits'))
    .addOption(
      new Option('--journal-abbr <value>', 'Journal title abbreviation for journal deposits'),
    )
    .addOption(new Option('--journal-doi <value>', 'Journal DOI for journal deposits'))
    .action(clirun(deposit, { program, getSession: (logger) => new Session({ logger }) }));
  return command;
}

export function addDepositCLI(program: Command) {
  program.addCommand(makeDepositCLI(program));
}
