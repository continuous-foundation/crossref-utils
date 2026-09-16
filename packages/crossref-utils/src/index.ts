export * from './batch.js';
export * from './conference.js';
export * from './contributors.js';
export * from './dates.js';
export * from './preprint.js';
export * from './reader.js';
export * from './types.js';
export * from './journal.js';
export * from './dataset.js';
export * from './funding.js';
export * from './abstract.js';
export * from './doi.js';
export * from './logger.js';
export { validateDeposit, ensureSchemas } from './validate.js';
export type { ValidationResult, ValidationIssue } from './validate.js';
export { e, t } from './utils.js';
export { default as version } from './version.js';

/** MyST frontmatter → Crossref adapters */
export * as fromMyst from './fromMyst/index.js';
