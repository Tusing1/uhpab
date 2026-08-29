export type MarkingCriterion = {
  id: string;
  label: string;
  marks: number;
  keywords: string[];
  guidance: string;
};

export type MarkingGuideSection = {
  id: string;
  title: string;
  marks: number;
  criteria: MarkingCriterion[];
};

export const markingGuideSourceUrl = "https://nursesrevisionuganda.com/writing-a-research-proposal/";

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
        keywords: ["title", "student", "supervisor", "school", "date"],
        guidance: "Title page evidence: research title, candidate details, supervisor or school details, and submission date.",
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
        label: "List of tables is present and consistent",
        marks: 1,
        keywords: ["list of tables", "tables"],
        guidance: "List of tables evidence: table titles are listed and correspond to tables in the report.",
      },
      {
        id: "list-of-figures",
        label: "List of figures is present and consistent",
        marks: 1,
        keywords: ["list of figures", "figures"],
        guidance: "List of figures evidence: figure titles are listed and correspond to figures in the report.",
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
        marks: 4,
        keywords: ["abstract", "background", "methodology", "results", "conclusion"],
        guidance: "Abstract evidence: background, methods, findings, conclusion, and recommendations are summarized.",
      },
    ],
  },
  {
    id: "introduction",
    title: "Introduction",
    marks: 16,
    criteria: [
      {
        id: "background",
        label: "Background is relevant to the study",
        marks: 4,
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
        marks: 2,
        keywords: ["justification", "rationale"],
        guidance: "Justification evidence: necessity of the study in the chosen setting is explained.",
      },
      {
        id: "significance",
        label: "Significance identifies beneficiaries",
        marks: 1,
        keywords: ["significance", "beneficiaries"],
        guidance: "Significance evidence: beneficiaries and use of findings are identified.",
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
        label: "Literature is well organized",
        marks: 3,
        keywords: ["subheading", "organized", "theme"],
        guidance: "Organization evidence: clear subheadings and logical thematic flow are present.",
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
    marks: 23,
    criteria: [
      {
        id: "study-design",
        label: "Study design is described and justified",
        marks: 3,
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
        label: "Research tools are relevant",
        marks: 1,
        keywords: ["questionnaire", "interview guide", "research instruments", "tools"],
        guidance: "Tool evidence: data collection tools are described.",
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
        label: "Data management and analysis are described",
        marks: 2,
        keywords: ["data management", "data analysis"],
        guidance: "Data analysis evidence: storage, cleaning, coding, and analysis procedures are described.",
      },
      {
        id: "ethics",
        label: "Ethical considerations are covered",
        marks: 2,
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
    title: "Discussion, conclusion, recommendations and nursing practice",
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
        label: "Implications for nursing practice are stated",
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
    marks: 6,
    criteria: [
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
        label: "Consent form is attached",
        marks: 1,
        keywords: ["consent form", "consent"],
        guidance: "Consent evidence: participant consent form is attached.",
      },
      {
        id: "introduction-letter",
        label: "Introduction letter is attached",
        marks: 1,
        keywords: ["introduction letter"],
        guidance: "Introduction letter evidence: permission/introduction letter is attached.",
      },
      {
        id: "irc-approval",
        label: "IRC approval letter is attached",
        marks: 1,
        keywords: ["approval letter", "irc", "institutional review"],
        guidance: "IRC evidence: institutional research committee approval letter is attached.",
      },
    ],
  },
];

export const totalMarkingGuideMarks = reportMarkingGuide.reduce((sum, section) => sum + section.marks, 0);

export const getMarkingGuideSection = (sectionId: string) =>
  reportMarkingGuide.find((section) => section.id === sectionId);
