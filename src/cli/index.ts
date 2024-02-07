#!/usr/bin/env node
import { Command } from 'commander';
import version from '../version.js';
import { addParseCLI } from './parse.js';
import { addValidateCLI } from './validate.js';

const program = new Command();

addParseCLI(program);
addValidateCLI(program);

program.version(`v${version}`, '-v, --version', 'Print the current version of crossref-utils');
program.option('-d, --debug', 'Log out any errors to the console.');
program.parse(process.argv);
