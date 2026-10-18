// Report structure derived from the official UHPAB guideline sections.

import officialGuidelines from './uhpabOfficialGuidelines';
import proposalStructure from './proposalStructure';
import { getAppendixSections, subheadingTitle, type ResearchStructure } from './researchGuidelineRules';

type OfficialGuideline = {
  section_id: string;
  document_type: string;
  section_name: string;
  parent_section_id: string | null;
  rules_and_guidelines: string[];
  formatting_notes: string[];
  page_count_limits: string | null;
  examples: string[];
  prompt_keywords: string[];
};

const normalizeReportId = (value: string) =>
  value.replace(/^(uhpab_)?report_/, '');

const toCamelKey = (value: string) =>
  normalizeReportId(value)
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char: string) => char.toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase());

const rootKeyMap: Record<string, string> = {
  preliminary_main: 'preliminaryPages',
  chapter_1_main: 'chapter1',
  chapter_2_main: 'chapter2',
  chapter_3_main: 'chapter3',
  chapter_4_main: 'chapter4',
  chapter_5_main: 'chapter5',
  references: 'references',
  appendices_main: 'appendices',
};

const childKeyMap: Record<string, string> = {
  title_page: 'titlePage',
  declaration: 'declaration',
  approval: 'approval',
  dedication: 'dedication',
  acknowledgement: 'acknowledgement',
  table_of_contents: 'tableOfContents',
  list_of_tables_figures: 'listOfTables',
  acronyms: 'acronyms',
  definitions: 'definitions',
  abstract: 'abstract',
  chapter_1_0: 'introduction',
  chapter_1_1: 'background',
  chapter_1_2: 'statementOfProblem',
  chapter_1_3: 'researchObjectives',
  chapter_1_3_1: 'generalObjective',
  chapter_1_3_2: 'specificObjectives',
  chapter_1_3_3: 'researchQuestions',
  chapter_1_4: 'justification',
  chapter_1_5: 'significance',
  chapter_1_6: 'scope',
  chapter_2_0: 'introduction',
  chapter_2_1: 'body',
  chapter_3_0: 'introduction',
  chapter_3_1: 'studyDesign',
  chapter_3_2: 'studySetting',
  chapter_3_3: 'studyPopulation',
  chapter_3_4: 'sampleSize',
  chapter_3_5: 'samplingMethod',
  chapter_3_6: 'inclusionExclusion',
  chapter_3_7: 'studyVariables',
  chapter_3_8: 'researchInstruments',
  chapter_3_9: 'dataCollection',
  chapter_3_10: 'dataManagement',
  chapter_3_11: 'dataPresentation',
  chapter_3_12: 'qualityControl',
  chapter_3_13: 'ethicalConsiderations',
  chapter_3_14: 'limitations',
  chapter_3_15: 'dissemination',
  chapter_4_0: 'introduction',
  chapter_4_1: 'demographicCharacteristics',
  chapter_4_objectives: 'objectiveFindings',
  chapter_5_0: 'introduction',
  chapter_5_1: 'discussionOfFindings',
  chapter_5_2: 'recommendations',
  chapter_5_3: 'conclusions',
  chapter_5_4: 'implicationsToNursingPractice',
};

const defaultAppendixSections = getAppendixSections('report');

const toRootKey = (value: string) => rootKeyMap[normalizeReportId(value)] || toCamelKey(value);
const toChildKey = (value: string) => childKeyMap[normalizeReportId(value)] || toCamelKey(value);

const toStructureSection = (section: OfficialGuideline) => ({
  title: subheadingTitle(section.section_name),
  description: section.rules_and_guidelines[0] ?? '',
  requirements: section.rules_and_guidelines,
  formatting: [
    ...section.formatting_notes,
    section.page_count_limits ? `Page guidance: ${section.page_count_limits}` : null
  ]
    .filter(Boolean)
    .join(' '),
  examples: section.examples,
  keywords: section.prompt_keywords
});

const reportStructure = (officialGuidelines as OfficialGuideline[])
  .filter((section) => !section.parent_section_id)
  .reduce<ResearchStructure>((structure, root) => {
    const children = (officialGuidelines as OfficialGuideline[]).filter(
      (section) => section.parent_section_id === root.section_id
    );

    const rootKey = toRootKey(root.section_id);
    const childSections = children.reduce<Record<string, ReturnType<typeof toStructureSection>>>((sections, child) => {
      sections[toChildKey(child.section_id)] = toStructureSection(child);
      return sections;
    }, {});

    structure[rootKey] = {
      title: /^chapter\b/i.test(root.section_name) ? root.section_name.toUpperCase() : root.section_name,
      description: root.rules_and_guidelines[0] ?? '',
      requirements: root.rules_and_guidelines,
      formatting: [
        ...root.formatting_notes,
        root.page_count_limits ? `Page guidance: ${root.page_count_limits}` : null
      ]
        .filter(Boolean)
        .join(' '),
      sections: rootKey === 'appendices'
        ? defaultAppendixSections
        : childSections
    };

    return structure;
  }, {});

// Chapters One and Two have the same numbered structure in both document types.
// Reuse their contracts instead of maintaining another partial copy.
reportStructure.chapter1 = { ...proposalStructure.chapter1, description: 'Introduces the completed research study; maintain its actual topic, objectives and scope.' };
reportStructure.chapter2 = { ...proposalStructure.chapter2 };
export default reportStructure;
