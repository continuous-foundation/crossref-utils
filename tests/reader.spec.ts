import { describe, test, expect } from 'vitest';
import { DoiBatchReader } from '../src/reader.js';
import exp from 'constants';

const HEAD = `
<doi_batch xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.crossref.org/schema/4.4.2" version="4.4.2" xsi:schemaLocation="http://www.crossref.org/schema/4.4.2 http://www.crossref.org/schemas/crossref4.4.2.xsd">
<head>
<doi_batch_id>some.id12345</doi_batch_id>
<timestamp>1659353793</timestamp>
<depositor>
<depositor_name>Curve Note</depositor_name>
<email_address>crossref@curvenote.com</email_address>
</depositor>
<registrant>Crossref</registrant>
</head>
<body></body></doi_batch>`;

const BODY = `
<doi_batch xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.crossref.org/schema/4.4.2" version="4.4.2" xsi:schemaLocation="http://www.crossref.org/schema/4.4.2 http://www.crossref.org/schemas/crossref4.4.2.xsd">
<body>
<conference>
<event_metadata>
<conference_name>Python in Science Conference</conference_name>
<conference_acronym>SciPy</conference_acronym>
<conference_number>21st</conference_number>
<conference_location>Austin, Texas</conference_location>
<conference_date>July 11 - July 17 2022</conference_date>
</event_metadata>
<proceedings_series_metadata>
<series_metadata>
<titles>
<title>Proceedings of the Python in Science Conference</title>
<original_language_title>Proceedings of the Python in Science Conference</original_language_title>
</titles>
<issn>2575-9752</issn>
<doi_data>
<doi>10.25080/issn.2575-9752</doi>
<resource>https://conference.scipy.org/proceedings</resource>
</doi_data>
</series_metadata>
<proceedings_title>Proceedings of the 21st Python in Science Conference</proceedings_title>
<proceedings_subject>Scientific Computing with Python</proceedings_subject>
<publisher>
<publisher_name>SciPy</publisher_name>
</publisher>
<publication_date>
<year>2022</year>
</publication_date>
<noisbn reason="simple_series"/>
<doi_data>
<doi>10.25080/majora-212e5952-046</doi>
<resource>https://conference.scipy.org/proceedings/scipy2022</resource>
</doi_data>
</proceedings_series_metadata>
<conference_paper>
<contributors>
<person_name contributor_role="author" sequence="first">
<given_name>Perry</given_name>
<surname>Greenfield</surname>
</person_name>
<person_name contributor_role="author" sequence="additional">
<given_name>Edward</given_name>
<surname>Slavich</surname>
</person_name>
<person_name contributor_role="author" sequence="additional">
<given_name>William</given_name>
<surname>Jamieson</surname>
</person_name>
<person_name contributor_role="author" sequence="additional">
<given_name>Nadia</given_name>
<surname>Dencheva</surname>
</person_name>
</contributors>
<titles>
<title>The Advanced Scientific Data Format (ASDF): An Update</title>
</titles>
<publication_date media_type="print">
<year>2022</year>
</publication_date>
<pages>
<first_page>1</first_page>
<last_page>6</last_page>
</pages>
<doi_data>
<doi>10.25080/majora-212e5952-000</doi>
<resource>https://conference.scipy.org/proceedings/scipy2022/00_greenfield.html</resource>
</doi_data>
</conference_paper></conference></body></doi_batch>`;

describe('DoiBatchReader', () => {
  test('read head section', () => {
    const reader = new DoiBatchReader(HEAD);
    expect(reader.getHead()).toEqual({
      id: 'some.id12345',
      timestamp: new Date(1659353793 * 1000),
      depositor: {
        name: 'Curve Note',
        email: 'crossref@curvenote.com',
      },
      registrant: 'Crossref',
    });
  });
  test('read conference metadata', () => {
    const reader = new DoiBatchReader(BODY);
    const entries = reader.getEntries();
    expect(entries.length).toBeGreaterThanOrEqual(3);

    const entry = entries.find((entry) => entry.type === 'event_metadata');
    expect(entry).toBeDefined();

    expect(entry).toEqual({
      type: 'event_metadata',
      name: 'Python in Science Conference',
      acronym: 'SciPy',
      number: '21st',
      location: 'Austin, Texas',
      date: 'July 11 - July 17 2022',
    });
  });
  test('read conference proceedings', () => {
    const reader = new DoiBatchReader(BODY);
    const entries = reader.getEntries();
    expect(entries.length).toBeGreaterThanOrEqual(3);

    const entry = entries.find((entry) => entry.type === 'proceedings_series_metadata');
    expect(entry).toBeDefined();

    expect(entry).toEqual({
      type: 'proceedings_series_metadata',
      title: 'Proceedings of the Python in Science Conference',
      originalLanguageTitle: 'Proceedings of the Python in Science Conference',
      issn: '2575-9752',
      doi: '10.25080/issn.2575-9752',
      resource: 'https://conference.scipy.org/proceedings',
      publisher: 'SciPy',
    });
  });
  test('read conference paper', () => {
    const reader = new DoiBatchReader(BODY);
    const entries = reader.getEntries();
    expect(entries.length).toBeGreaterThanOrEqual(3);

    const entry = entries.find((entry) => entry.type === 'conference_paper');
    expect(entry).toBeDefined();

    expect(entry).toEqual({
      type: 'conference_paper',
      title: 'The Advanced Scientific Data Format (ASDF): An Update',
      authors: [
        { name: 'Perry Greenfield' },
        { name: 'Edward Slavich' },
        { name: 'William Jamieson' },
        { name: 'Nadia Dencheva' },
      ],
      doi: '10.25080/majora-212e5952-000',
      year: '2022',
      pages: ['1', '6'],
    });
  });
});
