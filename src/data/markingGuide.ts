export type MarkingCriterion = {
  id: string;
  label: string;
  marks: number;
  keywords: string[];
  guidance: string;
  standards?: string[];
};

export type MarkingGuideSection = {
  id: string;
  title: string;
  marks: number;
  criteria: MarkingCriterion[];
};

export const markingGuideSourceUrl = "https://nursesrevisionuganda.com/writing-a-research-proposal/";
export const MARKING_RUBRIC_VERSION = "uhpab-adapted-100-v3";
export const markingGuideAdaptation = "Adapted practice guide: Background 4 to 3; Study Design 3 to 2, correcting the published 102-point sum to 100. Not an official examiner award.";

export const reportMarkingGuide: MarkingGuideSection[] = [
  {
    id: "preliminary",
    title: "Preliminary pages",
    marks: 10,
    criteria: [
      {
        id: "title-page",
        label: "Standard title page that fits the study",
        marks: 1,
        keywords: ["title", "candidate", "HTIN", "date"],
        guidance: "Title page evidence: research title, candidate name, HTIN, submission purpose/programme and date. Supervisor identity and qualifications are not title-page requirements.",
      },
      {
        id: "table-of-contents",
        label: "Table of contents matches page numbers",
        marks: 1,
        keywords: ["table of contents", "contents", "page"],
        guidance: "Table of contents evidence: listed sections with page numbers consistent with the final document.",
      },
      {
        id: "list-of-tables",
        label: "List of tables, figures and pictures is consistent",
        marks: 1,
        keywords: ["list of tables", "tables"],
        guidance: "Table, figure and picture titles and numbers match the items used. Accept one combined list; do not require separate old-format lists.",
      },
      {
        id: "key-terms",
        label: "Operational terms are defined",
        marks: 1,
        keywords: ["definition of terms", "operational terms", "key terms"],
        guidance: "Key terms evidence: operational definitions are provided for the study terms.",
      },
      {
        id: "abbreviations",
        label: "Acronyms and abbreviations are listed",
        marks: 1,
        keywords: ["abbreviations", "acronyms"],
        guidance: "Abbreviations evidence: acronyms are listed with their full meanings.",
      },
      {
        id: "abstract",
        label: "Abstract uses expected subheadings and content",
        marks: 5,
        keywords: ["abstract", "background", "methodology", "results", "conclusion"],
        guidance: "Abstract evidence: background, methods, findings, conclusion, and recommendations are summarized.",
      },
    ],
  },
  {
    id: "introduction",
    title: "Introduction",
    marks: 15,
    criteria: [
      {
        id: "background",
        label: "Background is relevant to the study",
        marks: 3,
        keywords: ["background"],
        guidance: "Background evidence: broad context narrows to the local study problem using current evidence.",
      },
      {
        id: "problem-statement",
        label: "Problem statement is clear",
        marks: 4,
        keywords: ["problem statement", "statement of the problem"],
        guidance: "Problem statement evidence: gap, affected population, place, and need for the study are stated.",
      },
      {
        id: "purpose",
        label: "Purpose of the study is stated",
        marks: 1,
        keywords: ["purpose of the study", "purpose"],
        guidance: "Purpose evidence: one overall purpose is stated and matches the title.",
      },
      {
        id: "objectives",
        label: "Objectives relate to the title",
        marks: 3,
        keywords: ["objectives", "specific objectives"],
        guidance: "Objectives evidence: measurable objectives directly answer the research title.",
      },
      {
        id: "research-questions",
        label: "Research questions match objectives",
        marks: 1,
        keywords: ["research questions", "questions"],
        guidance: "Research question evidence: each question mirrors a specific objective.",
      },
      {
        id: "justification",
        label: "Justification explains why the study matters",
        marks: 1,
        keywords: ["justification", "rationale"],
        guidance: "Justification evidence: necessity of the study in the chosen setting is explained.",
      },
      {
        id: "significance",
        label: "Significance and scope define contribution and boundaries",
        marks: 2,
        keywords: ["significance", "beneficiaries"],
        guidance: "Identify beneficiaries and practical use of findings. Define content, geographical and time scope coherently with the topic.",
      },
    ],
  },
  {
    id: "literature",
    title: "Literature review",
    marks: 12,
    criteria: [
      {
        id: "objective-based-literature",
        label: "Literature is relevant to objectives",
        marks: 6,
        keywords: ["literature", "objective", "review"],
        guidance: "Literature evidence: reviewed studies are organized around the specific objectives.",
      },
      {
        id: "literature-organization",
        label: "Literature is synthesised and research gaps identified",
        marks: 3,
        keywords: ["subheading", "organized", "theme"],
        guidance: "Compare reviewed evidence, synthesise agreement and disagreement, and establish a specific gap for the proposed study. Headings alone earn no marks.",
      },
      {
        id: "apa-citation",
        label: "APA citation style is applied",
        marks: 3,
        keywords: ["citation", "apa", "author", "year"],
        guidance: "Citation evidence: in-text citations are present and align with the reference list.",
      },
    ],
  },
  {
    id: "methodology",
    title: "Methodology",
    marks: 22,
    criteria: [
      {
        id: "study-design",
        label: "Study design is described and justified",
        marks: 2,
        keywords: ["study design", "research design", "rationale"],
        guidance: "Study design evidence: design is named and its fit for the study is justified.",
      },
      {
        id: "study-setting",
        label: "Study setting is described and justified",
        marks: 2,
        keywords: ["study setting", "setting", "rationale"],
        guidance: "Study setting evidence: location or facility is described and justified.",
      },
      {
        id: "study-population",
        label: "Study population is described",
        marks: 1,
        keywords: ["study population", "target population"],
        guidance: "Study population evidence: target group is clearly defined.",
      },
      {
        id: "inclusion",
        label: "Inclusion criteria are stated",
        marks: 1,
        keywords: ["inclusion criteria"],
        guidance: "Inclusion evidence: qualifying participant characteristics are stated.",
      },
      {
        id: "exclusion",
        label: "Exclusion criteria are stated",
        marks: 1,
        keywords: ["exclusion criteria"],
        guidance: "Exclusion evidence: non-qualifying participant characteristics and rationale are stated.",
      },
      {
        id: "sample-size",
        label: "Sample size determination is justified",
        marks: 2,
        keywords: ["sample size", "sample size determination"],
        guidance: "Sample size evidence: determination method and justification are provided.",
      },
      {
        id: "sampling",
        label: "Sampling procedure is clear",
        marks: 2,
        keywords: ["sampling", "sampling procedure", "sampling method"],
        guidance: "Sampling evidence: sampling procedure is described step by step.",
      },
      {
        id: "variables",
        label: "Study variables are defined",
        marks: 2,
        keywords: ["variables", "dependent", "independent"],
        guidance: "Variable evidence: independent and dependent variables are identified where applicable.",
      },
      {
        id: "tools",
        label: "Instruments and data collection procedures are coherent",
        marks: 2,
        keywords: ["questionnaire", "interview guide", "research instruments", "tools"],
        guidance: "Describe relevant instruments, their objective-linked questions or measurements, and the actual steps for collecting the required data.",
      },
      {
        id: "quality-assurance",
        label: "Quality assurance is addressed",
        marks: 2,
        keywords: ["quality assurance", "validity", "reliability"],
        guidance: "Quality assurance evidence: validity, reliability, or trustworthiness procedures are described.",
      },
      {
        id: "data-analysis",
        label: "Data management, analysis and presentation are described",
        marks: 2,
        keywords: ["data management", "data analysis"],
        guidance: "Specify secure handling, cleaning/coding, an analysis appropriate to each objective and data type, and planned or actual presentation of the results.",
      },
      {
        id: "ethics",
        label: "Ethical considerations are covered",
        marks: 1,
        keywords: ["ethical", "consent", "confidentiality", "approval"],
        guidance: "Ethics evidence: consent, confidentiality, permissions, and participant protection are addressed.",
      },
      {
        id: "dissemination",
        label: "Dissemination plan is included",
        marks: 1,
        keywords: ["dissemination", "study findings"],
        guidance: "Dissemination evidence: plan for sharing findings is stated.",
      },
      {
        id: "limitations",
        label: "Study limitations are stated",
        marks: 1,
        keywords: ["limitations", "study limitations"],
        guidance: "Limitations evidence: likely constraints and their effect on the study are stated.",
      },
    ],
  },
  {
    id: "results",
    title: "Results / findings",
    marks: 12,
    criteria: [
      {
        id: "tables-figures",
        label: "Tables and figures fit the objectives",
        marks: 8,
        keywords: ["table", "figure", "findings", "results"],
        guidance: "Findings evidence: tables or figures answer the study objectives.",
      },
      {
        id: "results-interpretation",
        label: "Results are interpreted correctly",
        marks: 4,
        keywords: ["interpretation", "comments", "results"],
        guidance: "Interpretation evidence: comments explain the meaning of results.",
      },
    ],
  },
  {
    id: "discussion",
    title: "Discussion, conclusions, recommendations and health profession implications",
    marks: 19,
    criteria: [
      {
        id: "discussion-objectives",
        label: "Discussion follows the study objectives",
        marks: 6,
        keywords: ["discussion", "objectives", "findings"],
        guidance: "Discussion evidence: results are discussed objective by objective.",
      },
      {
        id: "comparison-literature",
        label: "Findings are compared with literature",
        marks: 3,
        keywords: ["literature", "similar", "contradict", "compare"],
        guidance: "Literature comparison evidence: findings are compared with reviewed studies.",
      },
      {
        id: "problem-purpose-link",
        label: "Findings link back to the problem and purpose",
        marks: 3,
        keywords: ["problem", "purpose", "findings"],
        guidance: "Linkage evidence: findings answer the problem statement and study purpose.",
      },
      {
        id: "conclusion",
        label: "Conclusion relates to objectives",
        marks: 3,
        keywords: ["conclusion", "objectives"],
        guidance: "Conclusion evidence: conclusion is concise and objective-based.",
      },
      {
        id: "recommendations",
        label: "Recommendations are practical",
        marks: 2,
        keywords: ["recommendations"],
        guidance: "Recommendation evidence: recommendations are specific, realistic, and linked to findings.",
      },
      {
        id: "nursing-practice",
        label: "Implications for health profession practice are justified",
        marks: 2,
        keywords: ["nursing practice", "implications", "health practice"],
        guidance: "Practice implication evidence: meaning for nursing or health practice is stated.",
      },
    ],
  },
  {
    id: "references",
    title: "References",
    marks: 2,
    criteria: [
      {
        id: "reference-count",
        label: "At least 20 references are listed",
        marks: 2,
        keywords: ["references", "bibliography"],
        guidance: "Reference evidence: at least 20 credible sources are listed and citations align with references.",
      },
    ],
  },
  {
    id: "appendices",
    title: "Appendices",
    marks: 8,
    criteria: [
      {
        id: "similarity-report",
        label: "An authentic similarity report is attached",
        marks: 2,
        keywords: ["similarity index", "similarity report"],
        guidance: "Inspect an attached provider report and its documented similarity value against the applicable limit. A typed claim or this app's originality estimate is not a verified report; if the attachment cannot be inspected, mark unassessable.",
      },
      {
        id: "apa-format",
        label: "APA format is applied throughout the report",
        marks: 2,
        keywords: ["apa", "format"],
        guidance: "APA evidence: headings, citations, reference list, tables, and appendices follow APA style.",
      },
      {
        id: "instruments",
        label: "Research instruments are attached",
        marks: 1,
        keywords: ["instrument", "questionnaire", "interview guide"],
        guidance: "Instrument evidence: questionnaires, interview guides, or data collection tools are attached.",
      },
      {
        id: "consent-form",
        label: "Consent form and participant information are attached",
        marks: 1,
        keywords: ["consent form", "consent"],
        guidance: "Consent evidence: participant consent form is attached.",
      },
      {
        id: "introduction-letter",
        label: "Applicable approval and introductory letters are attached",
        marks: 1,
        keywords: ["introduction letter"],
        guidance: "Introduction letter evidence: permission/introduction letter is attached.",
      },
      {
        id: "maps-pictures",
        label: "Relevant maps or pictures are attached and labelled",
        marks: 1,
        keywords: ["map", "picture", "study area"],
        guidance: "Relevant maps or pictures identify the study setting or support the work, with clear captions and source where needed.",
      },
    ],
  },
];

export const totalMarkingGuideMarks = reportMarkingGuide.reduce((sum, section) => sum + section.marks, 0);

export const getMarkingGuideSection = (sectionId: string) =>
  reportMarkingGuide.find((section) => section.id === sectionId);

const qualityStandards: Record<string, string[]> = {
  'title-page': ['The title names a coherent problem, population and local setting.', 'Candidate name, HTIN, submission purpose/programme and month/year are supplied. Do not require supervisor identity or qualifications on the title page.', 'Declaration and supervisor/principal approval pages are present. Do not require a supervisor commitment or copyright page. Signature authenticity requires human verification.'],
  'table-of-contents': ['Entries reflect actual sections rather than a template.', 'Page references are consistent where pagination is verifiable; otherwise explicitly mark this check unassessable.'],
  'list-of-tables': ['Listed captions and numbers correspond to actual tables, pictures or figures.', 'Page references are accurate where they can be verified.'],
  'key-terms': ['Operational definitions specify how key variables are used or measured in this study.', 'Definitions are appropriate to the actual problem rather than copied general dictionary definitions.'],
  abbreviations: ['Abbreviations used in the document have correct full meanings.', 'Entries are alphabetical and consistent with usage.'],
  abstract: ['The abstract accurately summarises the actual problem, purpose and methodology.', 'Findings correspond to the objectives and the reported results.', 'Conclusions, recommendations and health profession implications are supported by those findings.', 'Required subheadings are used, there are no citations, and the summary is no more than 300 words and one single-spaced page where verifiable.'],
  background: ['The discussion narrows from wider evidence to the actual local problem.', 'Substantive claims have appropriate identifiable citations, not citation placeholders.', 'A clear local research gap and rationale follow logically from the evidence.'],
  'problem-statement': ['The ideal and actual situations are distinguished.', 'The magnitude and consequences of the problem are supported, without invented local statistics.', 'A specific unresolved gap in the named population and setting makes the study necessary.'],
  purpose: ['One measurable general objective matches the topic issue, population and setting exactly.'],
  objectives: ['There are two or three distinct measurable objectives with category or construct first.', 'Every objective retains the same topic health issue, population, age boundaries and setting.', 'The objectives collectively address the general objective and can be answered by the proposed methods.'],
  'research-questions': ['Each question mirrors one actual specific objective, in the same order and without changing variables, population or setting.'],
  justification: ['Specific reasons for doing this study now are grounded in the identified local gap, not generic claims about research.'],
  significance: ['Identified beneficiaries have a clear practical or academic use for the findings.', 'Content, geographic and time boundaries are supplied and consistent with the topic.'],
  'objective-based-literature': ['Evidence is organised under the actual specific objectives.', 'Relevant findings from identifiable sources are compared and interpreted rather than merely listed.', 'The material concerns the actual variables and population and supports the study question.'],
  'literature-organization': ['The synthesis identifies what is known and where findings differ.', 'A precise unresolved gap leads to this study rather than merely declaring that few studies exist.'],
  'apa-citation': ['Substantive literature claims have well-formed author-year citations.', 'Cited works correspond to identifiable reference-list entries; do not assume that a plausible citation is a real verified source.'],
  'study-design': ['An actual design is explicitly named and appropriate to the objectives. Quantitative/qualitative alone is an approach, not a design.', 'A study-specific rationale explains the choice without unsupported causal claims.'],
  'study-setting': ['The actual local facility or community and relevant characteristics are described.', 'Access to the intended population and a study-specific reason for choosing the setting are explained.'],
  'study-population': ['The respondent group and eligibility boundaries match the title and objectives.'],
  inclusion: ['Eligibility rules define who can participate and match the study population.'],
  exclusion: ['Exclusions are justified and do not simply restate the inverse of inclusion criteria.'],
  'sample-size': ['The method, assumptions and source of input values are provided.', 'The numerical working and final size are coherent and justified for the design; check arithmetic rather than trusting the stated answer.'],
  sampling: ['The sampling approach and available sampling frame are described.', 'Selection steps are practical, reproducible and appropriate to the objectives.'],
  variables: ['Outcome and explanatory variables are correctly distinguished.', 'Definitions and measurements are operational and align with objectives and instruments.'],
  tools: ['The instruments collect the information needed for each objective.', 'Collection steps, responsible persons and administration of the instruments are described concretely.'],
  'quality-assurance': ['Validity or trustworthiness measures are specific to the tools and design.', 'Reliability, pretesting and quality control are explained with applicable steps rather than naming these terms.'],
  'data-analysis': ['Handling, coding, cleaning and protection of records are described.', 'Analysis matches each objective and data type, with appropriate summary or analytical methods.', 'Data presentation uses suitable tables, charts or narratives.'],
  ethics: ['Permissions, voluntary informed consent, privacy, withdrawal and participant protection are coherently planned or documented for the actual study.'],
  dissemination: ['Findings have named recipients and feasible communication methods.'],
  limitations: ['Study-specific design or practical limitations and realistic mitigation are explained.'],
  'tables-figures': ['Findings answer every specific objective and are logically ordered.', 'Tables and figures have meaningful captions, consistent numbers, denominators and appropriate totals.', 'Narratives accurately describe the actual data without invented or contradictory values.'],
  'results-interpretation': ['Respondent characteristics are presented with correct denominators, counts and percentages.', 'Narratives correctly reflect distributions without claiming causal explanations not established by the design.'],
  'discussion-objectives': ['Key findings are interpreted objective by objective.', 'Interpretations are supported by the actual findings and respect design limitations.'],
  'comparison-literature': ['Actual findings are compared with identifiable studies reviewed earlier.', 'Agreement and disagreement are explained in the study context.'],
  'problem-purpose-link': ['Discussion demonstrates how the findings answer the original problem and purpose.', 'Claims remain consistent with the actual results.'],
  conclusion: ['Conclusions answer the actual objectives.', 'No unsupported new data or unjustified generalisations are introduced.'],
  recommendations: ['Each action follows from a finding and identifies who should do what and when or under what conditions.'],
  'nursing-practice': ['Practical implications for the relevant health profession follow directly from findings and are feasible.'],
  'reference-count': ['At least 20 distinct entries are supplied, not placeholders or duplicates.', 'References correspond to citations, follow APA 7 and respect the applicable ten-year guidance with justified exceptions.'],
  'apa-format': ['Assess observable APA conventions in headings, citations, tables and references.', 'Do not claim font, margin, alignment or spacing compliance from extracted plain text; mark unsupported visual checks unassessable.'],
  instruments: ['Actual instruments are attached rather than just mentioned.', 'Items collect relevant, ethical and interpretable data for the objectives.'],
  'consent-form': ['The consent and participant information sheets explain the study, voluntariness, risks, confidentiality and withdrawal accessibly.'],
  'introduction-letter': ['Ethical appendices include applicable school approvals and introductory/permission letters, not just a mention. Identify pending approvals separately, never invent letters or certify signature authenticity.'],
  'maps-pictures': ['Relevant maps and pictures are organised after the ethical documents, clearly labelled with provenance and participant privacy safeguards. Do not claim to inspect an image from a heading alone.'],
  'similarity-report': ['An actual provider report can be inspected; do not infer authenticity from a typed percentage.', 'The documented value is within the applicable limit; use unassessable if verification requires an unavailable image or attachment.'],
  'work-plan': ['The proposed activities, sequence and time estimates are feasible and consistent with the methods.'],
  budget: ['Itemised quantities and costs reconcile, are reasonable for the proposed procedures, and identify the total.'],
};

for (const section of reportMarkingGuide) {
  for (const criterion of section.criteria) criterion.standards = qualityStandards[criterion.id] || [criterion.guidance];
}

export const getDocumentMarkingGuide = (documentType: 'proposal' | 'report'): MarkingGuideSection[] => {
  if (documentType === 'report') return reportMarkingGuide;
  return reportMarkingGuide.filter(section => !['results', 'discussion'].includes(section.id)).map(section => {
    let criteria = section.criteria.filter(criterion => !['abstract', 'similarity-report'].includes(criterion.id));
    if (section.id === 'appendices') criteria = [...criteria, ...[
      { id: 'work-plan', label: 'A feasible work plan is attached', marks: 1, keywords: ['work plan'], guidance: 'Supply a feasible activity schedule.', standards: qualityStandards['work-plan'] },
      { id: 'budget', label: 'An itemised justified budget is attached', marks: 1, keywords: ['budget'], guidance: 'Supply a justified budget with correct totals.', standards: qualityStandards.budget },
    ]];
    return { ...section, criteria, marks: criteria.reduce((sum, criterion) => sum + criterion.marks, 0) };
  });
};
