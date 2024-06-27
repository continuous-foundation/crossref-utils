import path from 'path';
import which from 'which';
import fs from 'node:fs';
import fetch from 'node-fetch';
import type { ISession, LoggerDE } from 'myst-cli-utils';
import { makeExecutable, writeFileToFolder } from 'myst-cli-utils';
import chalk from 'chalk';
import AdmZip from 'adm-zip';

const DEFAULT_XSD_VERSION = '5.3.1';

function xsdVersionFromXml(session: ISession, file: string) {
  let version: string | undefined;
  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file).toString();
    const matches = new RegExp(
      /xmlns="http:\/\/www\.crossref\.org\/schema\/(?<version>[0-9]+\.[0-9]+\.[0-9]+)"/g,
    ).exec(text);
    version = matches?.groups?.version;
  }
  if (version) return version;
  session.log.warn('Unable to determine crossref schema version from file');
  return DEFAULT_XSD_VERSION;
}

/**
 * Download and unzip xsd from crossref gitlab
 */
async function ensureXsdExists(session: ISession, version: string) {
  if (fs.existsSync(localXsdFile(version))) return;
  if (!fs.existsSync(xsdFolder())) {
    fs.mkdirSync(xsdFolder(), { recursive: true });
  }
  const url = 'https://gitlab.com/crossref/schema/-/archive/master/schema-master.zip?path=schemas';
  const zipFile = path.join(extractFolder(), 'archive.zip');
  session.log.info(`🌎 Downloading: ${url}`);
  session.log.debug(`Saving to ${extractFolder()}`);
  const resp = await fetch(url);
  const arrayBuffer = await resp.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  writeFileToFolder(zipFile, buffer);
  session.log.info(`🤐 Unzipping template: ${zipFile}`);
  const zip = new AdmZip(zipFile);
  zip.extractAllTo(extractFolder());
  if (!fs.existsSync(localXsdFile(version))) {
    throw new Error(
      `Downloading and unzipping XSD failed.\nURL: ${url}\nDestination: ${xsdFolder()}`,
    );
  }
}

function extractFolder() {
  return path.join(__dirname, 'static');
}

function xsdFolder() {
  return path.join(extractFolder(), 'schema-master-schemas', 'schemas');
}

function xsdFile(version: string) {
  return `crossref${version}.xsd`;
}

function localXsdFile(version: string) {
  return path.join(xsdFolder(), xsdFile(version));
}

/**
 * Test if xmllint is available as a cli command
 */
export function isXmllintAvailable() {
  return which.sync('xmllint', { nothrow: true });
}

/**
 * Create a logger that hides known error messages
 */
export function createXmllintLogger(session: Pick<ISession, 'log'>): LoggerDE {
  const logger = {
    debug(data: string) {
      const line = data.trim();
      if (!line) return;
      session.log.debug(data);
    },
    error(data: string) {
      const line = data.trim();
      if (!line) return;
      const lower = line.toLowerCase();
      if (lower.includes('skipping import of schema') || lower.startsWith('- validates')) {
        session.log.debug(line);
        return;
      }
      session.log.error(data);
    },
  };
  return logger;
}

/**
 * Run xmllint validation
 */
export async function xmllintValidate(session: Pick<ISession, 'log'>, file: string, xsd: string) {
  if (!isXmllintAvailable()) {
    session.log.error(
      `XML validation against XSD requires xmllint\n\n${chalk.dim(
        'To install:\n  mac:    brew install xmlstarlet\n  debian: apt install libxml2-utils',
      )}`,
    );
    return;
  }
  try {
    // First drop DOCTYPE with DTD in it - we have already fetched the DTD
    const dropDtdCommand = `xmllint --dropdtd`;
    const validateCommand = `xmllint --noout --schema ${xsd}`;
    await makeExecutable(
      `${dropDtdCommand} ${file} | ${validateCommand} -`,
      createXmllintLogger(session),
    )();
  } catch {
    return false;
  }
  return true;
}

/**
 * Check if XML is valid based on crossref XSD
 *
 * Returns true if valid and false if invalid.
 */
export async function validateAgainstXsd(session: ISession, file: string) {
  if (!fs.existsSync(file)) throw new Error(`File does not exist: ${file}`);
  const version = xsdVersionFromXml(session, file);
  await ensureXsdExists(session, version);
  session.log.debug(`Validating against: ${localXsdFile(version)}`);
  session.log.info(`🧐 Validating against: ${xsdFile(version)}`);
  const valid = await xmllintValidate(session, file, localXsdFile(version));
  return valid;
}

/**
 * Check if XML is valid based on crossref XSD
 *
 * Logs confirmation message if valid and throws an error if invalid.
 */
export async function validateAgainstXsdWrapper(session: ISession, file: string) {
  const success = await validateAgainstXsd(session, file);
  if (success) {
    session.log.info(chalk.greenBright('XML validation passed!'));
  } else {
    throw new Error('XML validation failed.');
  }
}
