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

export type ConferencePaper = {
  contributors?: Element; // Already a 'contributors' element
  title?: string;
  abstract?: Element;
  doi_data?: DoiData;
  citations?: Record<string, string>; // For now, this is { key: doi }
  pages?: {
    first_page: string;
    last_page?: string;
    other_pages?: string;
  };
  license?: string; // License URL
  publication_dates?: {
    media_type: string;
    month: string; // 2 digit number, even with leading zero, hence string
    day: string; // 2 digit number, even with leading zero, hence string
    year: string;
  }[];
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
    publication_date: { year: number; month: number; day: number };
  };
  doi_data: DoiData;
  conference_papers?: Element[];
};
