export type DoiBatchOptions = {
  id: string;
  timestamp?: number;
  depositor: { name: string; email: string };
  /** This is by default "Crossref" */
  registrant?: string;
};

export type ConferenceOptions = {
  event: {
    name: string;
    acronym?: string;
    date: string;
  };
  contributors?: [];
  proceedings: {
    title: string;
    publisher: { name: string };
    publication_date: { year: number; month: number; day: number };
  };
  doi: { doi: string; resource: string };
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
