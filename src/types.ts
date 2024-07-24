import type { Element } from 'xast';

export type DoiBatchOptions = {
  id: string;
  timestamp?: number;
  depositor: { name: string; email: string };
  /** This is by default "Crossref" */
  registrant?: string;
};

export type ContributorOptions = {
  nameParsed: {
    literal: string;
    given: string;
    family: string;
  };
  affiliations?: {
    id: string;
    name: string;
    institution?: string;
    ror?: string;
    isni?: string;
    department?: string;
    city?: string;
    state?: string;
    country?: string;
  }[];
  sequence: 'first' | 'additional';
  contributor_role:
    | 'author'
    | 'editor'
    | 'chair'
    | 'reviewer'
    | 'review-assistant'
    | 'stats-reviewer'
    | 'reviewer-external'
    | 'reader'
    | 'translator';
  orcid?: string;
};

export type DoiData = {
  doi: string;
  resource: string;
  zip?: string;
  pdf?: string;
  xml?: string;
};

export type PublicationDate =
  | Date
  | {
      media_type?: 'online' | 'print' | 'other'; // Default is `online`
      month?: string | number; // will be a 2 digit string-number with leading zero
      day?: string | number; // will be a 2 digit string-number with leading zero
      year: string | number;
    };

export type Fundref = {
  sources: { name: string; identifiers: string[] }[];
  awardNumbers: string[];
};

export type Paper = {
  contributors?: Element; // Already a 'contributors' element
  title?: string;
  subtitle?: string;
  abstract?: Element;
  doi_data?: DoiData;
  citations?: Record<string, string>; // For now, this is { key: doi }
  funding?: Fundref[];
  license?: string; // License URL
};

export type Preprint = Paper & {
  date?: PublicationDate;
};

export type ConferencePaper = Paper & {
  pages?: {
    first_page: string;
    last_page?: string;
    other_pages?: string;
  };
  publication_dates?: PublicationDate[];
};

export type ConferenceOptions = {
  event: {
    name: string;
    acronym?: string;
    number?: number;
    date: string;
  };
  contributors?: Element;
  proceedings: {
    title: string;
    publisher: { name: string };
    publication_date: PublicationDate;
  };
  doi_data: DoiData;
  conference_papers?: Element[];
};

export type JournalMetadata = {
  title: string;
  abbrevTitle?: string;
  doi_data: DoiData;
};

export type JournalIssue = {
  contributors?: Element; // Already a 'contributors' element
  title?: string;
  subtitle?: string;
  doi_data?: DoiData;
  publication_dates?: PublicationDate[];
  issue?: string;
  volume?: string;
};

export type JournalArticle = ConferencePaper;
