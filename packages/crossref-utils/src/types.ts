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
    number?: string | number;
    date?: string;
    location?: string;
  };
  contributors?: Element;
  proceedings: {
    title: string;
    publisher: { name: string };
    publication_date: PublicationDate;
    subject?: string;
    doi_data?: DoiData;
  };
  series?: {
    title: string;
    original_language_title?: string;
    issn: string;
    doi_data?: DoiData;
  };
  conference_papers?: Element[];
};

export type Titles =
  | string
  | {
      title: string;
      subtitle?: string;
      original_language_title?: string;
      original_language_subtitle?: string;
    };

type InterWorkRelationTypes =
  | 'isDerivedFrom'
  | 'hasDerivation'
  | 'isReviewOf'
  | 'hasReview'
  | 'isCommentOn'
  | 'hasComment'
  | 'isReplyTo'
  | 'hasReply'
  | 'basedOnData'
  | 'isDataBasisFor'
  | 'hasRelatedMaterial'
  | 'isRelatedMaterial'
  | 'isCompiledBy'
  | 'compiles'
  | 'isDocumentedBy'
  | 'documents'
  | 'isSupplementTo'
  | 'isSupplementedBy'
  | 'isContinuedBy'
  | 'continues'
  | 'isPartOf'
  | 'hasPart'
  | 'references'
  | 'isReferencedBy'
  | 'isBasedOn'
  | 'isBasisFor'
  | 'requires'
  | 'isRequiredBy'
  | 'finances'
  | 'isFinancedBy';

type IntraWorkRelationTypes =
  | 'isTranslationOf'
  | 'hasTranslation'
  | 'isPreprintOf'
  | 'hasPreprint'
  | 'isManuscriptOf'
  | 'hasManuscript'
  | 'isExpressionOf'
  | 'hasExpression'
  | 'isManifestationOf'
  | 'hasManifestation'
  | 'isReplacedBy'
  | 'replaces'
  | 'isSameAs'
  | 'isIdenticalTo'
  | 'isVariantFormOf'
  | 'isOriginalFormOf'
  | 'isVersionOf'
  | 'hasVersion'
  | 'isFormatOf'
  | 'hasFormat';

type IdentifierType =
  | 'doi'
  | 'issn'
  | 'isbn'
  | 'uri'
  | 'pmid'
  | 'pmcid'
  | 'purl'
  | 'arxiv'
  | 'ark'
  | 'handle'
  | 'uuid'
  | 'ecli'
  | 'accession'
  | 'other';

type RelatedItem =
  | { kind: 'intra'; relationship: IntraWorkRelationTypes; id: string; idType: IdentifierType }
  | { kind: 'inter'; relationship: InterWorkRelationTypes; id: string; idType: IdentifierType };

export type DatabaseOptions = {
  contributors?: Element;
  title?: Titles;
  description?: Element[] | string;
  date?: {
    created?: PublicationDate;
    published?: PublicationDate;
    updated?: PublicationDate;
  };
  publisher?: { name: string; place?: string };
  institution?: {
    name: string;
    id?: string;
    acronym?: string;
    place?: string;
    department?: string;
  };
  doi_data?: DoiData;
  datasets?: Element[];
};

export type DatasetMetadata = {
  type?: 'record' | 'collection' | 'crossmark_policy' | 'other';
  contributors?: Element;
  title?: Titles;
  date?: {
    created?: PublicationDate;
    published?: PublicationDate;
    updated?: PublicationDate;
  };
  description?: Element[] | string;
  // format?: string;
  relations?: RelatedItem[];
  doi_data?: DoiData;
  citations?: Record<string, string>; // For now, this is { key: doi }
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
