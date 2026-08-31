// Proposal structure aligned to the scanned UHPAB Research Guidelines PDF.

const proposalStructure = {
  preliminaryPages: {
    title: 'Preliminary Pages',
    description: 'Pages before Chapter One, numbered with Roman numerals.',
    sections: {
      titlePage: {
        title: 'Title Page',
        description: 'Identifies the proposed study and the candidate.',
        requirements: [
          'Research title, normally 10-20 words',
          'Candidate name',
          'Health Trainee Identification Number (HTIN)',
          'Submission statement to Uganda Health Professions Assessment Board (UHPAB)',
          'Month and year of submission'
        ],
        formatting: 'No visible page number on the title page.'
      },
      declaration: {
        title: 'Declaration',
        description: 'Candidate declares that the proposal is original work.',
        requirements: [
          'Statement of originality',
          'Candidate name',
          'Signature and date'
        ],
        formatting: 'Centred heading; Roman numeral page numbering where applicable.'
      },
      approval: {
        title: 'Approval',
        description: 'Shows that the proposal has been approved for submission.',
        requirements: [
          'Supervisor approval',
          'Principal approval where required',
          'Names, signatures, and dates'
        ],
        formatting: 'Use clear signature lines.'
      },
      supervisorCommitment: {
        title: 'Commitment by Research Supervisor',
        description: 'Confirms that the research supervisor agrees to guide the candidate throughout the study.',
        requirements: [
          'Supervisor states willingness to supervise the named candidate and research title',
          'Supervisor commits time, guidance, and professional support',
          'Supervisor signs and writes their name and date',
          'Principal witnesses the commitment where required, with name, date, and official stamp'
        ],
        formatting: 'Use a formal commitment format with clear signature and witness lines.'
      },
      tableOfContents: {
        title: 'Table of Contents',
        description: 'Lists preliminary pages, chapters, references, and appendices.',
        requirements: [
          'Accurate headings and page numbers',
          'Chapter One to Chapter Three for proposal',
          'References and appendices'
        ],
        formatting: 'Use dot leaders or a clean table layout.'
      },
      acronyms: {
        title: 'Abbreviations/Acronyms',
        description: 'Lists abbreviations used in the proposal.',
        requirements: [
          'Write each abbreviation in full',
          'Arrange alphabetically',
          'Use a separate page'
        ],
        formatting: 'Acronyms should be capitalized and clearly paired with meanings.'
      },
      definitions: {
        title: 'Operational Definitions',
        description: 'Defines key concepts and study variables as used in the study.',
        requirements: [
          'Define major concepts',
          'Define dependent and independent variables where needed',
          'Keep definitions specific to the study'
        ],
        formatting: 'Use a separate page with a centred heading.'
      }
    }
  },
  chapter1: {
    title: 'CHAPTER ONE: INTRODUCTION',
    description: 'Introduces the research problem, objectives, questions, justification, significance, and scope.',
    sections: {
      introduction: {
        title: '1.0 Introduction',
        description: 'A short preview paragraph for Chapter One. Keep it brief so 1.1 Background can begin on the same page.',
        requirements: [
          'Write one paragraph only, about 25-45 words',
          'Mention the main sections covered in Chapter One',
          'Do not add statistics, citations, definitions, or detailed background here',
          'Move the real context and evidence to 1.1 Background'
        ]
      },
      background: {
        title: '1.1 Background to the Study',
        description: 'Builds an in-depth understanding of the research problem, starting from the wider issue and narrowing to the local study gap.',
        requirements: [
          'Use 4-6 focused paragraphs for a proposal starter, then expand only where your supervisor requires it',
          'Maximum two pages',
          'Use a few references without turning it into a literature review',
          'Move from global, continental, regional, national, to local context',
          'End by showing why the issue is significant enough to warrant research in the study area'
        ]
      },
      statementOfProblem: {
        title: '1.2 Statement of the Problem',
        description: 'States the ideal situation, current situation, gap, and consequences.',
        requirements: [
          'About half a page',
          'Begin with what is ideal or what should be happening',
          'Describe the current situation of the problem',
          'State the nature and magnitude of the problem clearly',
          'Use brief and specific statistics or citations',
          'Briefly cite previous research to show gaps',
          'State consequences if the problem is not addressed or if it is addressed'
        ]
      },
      researchObjectives: {
        title: '1.3 Research Objectives',
        description: 'Introduces the general and specific objectives.',
        requirements: [
          'Clearly indicate the general research objective',
          'Clearly indicate the specific objectives',
          'Objectives should be SMART'
        ]
      },
      generalObjective: {
        title: '1.3.1 Purpose of the Study or General Objective',
        description: 'States the main aim of the study.',
        requirements: [
          'Use one general objective only',
          'State what the research will investigate in a broad sense',
          'Include dependent and independent variables',
          'Include study population and study area'
        ]
      },
      specificObjectives: {
        title: '1.3.2 Specific Objectives',
        description: 'Breaks the general objective into measurable study objectives.',
        requirements: [
          'Use 2-3 SMART objectives',
          'Relate them directly to the general objective',
          'List them in logical order',
          'Use action words such as determine, establish, find out, assess, explore, evaluate, examine, or investigate'
        ]
      },
      researchQuestions: {
        title: '1.3.3 Research Questions',
        description: 'Questions generated from the objectives.',
        requirements: [
          'Align each question with the specific objectives',
          'A general research question may be included',
          'Questions should be clear and answerable'
        ]
      },
      justification: {
        title: '1.4 Justification of the Study',
        description: 'Explains the rationale for conducting the study.',
        requirements: [
          'State why the researcher chose the topic',
          'Explain why the study is necessary now',
          'Connect the topic to the identified problem or gap'
        ]
      },
      significance: {
        title: '1.5 Significance of the Study',
        description: 'Explains the contribution and beneficiaries of the study.',
        requirements: [
          'Explain academic or practical contribution',
          'Highlight who benefits from the research findings',
          'Explain how each beneficiary may benefit'
        ]
      },
      scope: {
        title: '1.6 Scope of the Study',
        description: 'Defines the boundaries or limits of the research.',
        requirements: [
          'State the content scope',
          'State the geographical scope',
          'State the time span of the research'
        ]
      }
    }
  },
  chapter2: {
    title: 'CHAPTER TWO: LITERATURE REVIEW',
    description: 'Reviews previous research related to the study objectives.',
    sections: {
      introduction: {
        title: '2.0 Introduction',
        description: 'Introduces the literature review chapter.',
        requirements: [
          'Not more than half a page',
          'Start with an overview of the dependent variable',
          'Explain how the chapter is arranged according to objectives'
        ]
      },
      body: {
        title: '2.1 Body',
        description: 'Presents literature arranged according to the specific objectives.',
        requirements: [
          'At least five pages',
          'Use correct APA 7th edition in-text citations',
          'Include at least 20 in-text citations',
          'Use credible sources such as Google Scholar, PubMed, HINARI, textbooks, journals, articles, and acceptable websites',
          'Avoid Wikipedia as a source',
          'Paraphrase instead of copying directly',
          'Use appropriate comparisons and contrasts',
          'Cover all study objectives and variables',
          'Include a brief summary and identified gaps'
        ],
        formatting: 'Arrange subheadings according to the specific objectives.'
      }
    },
    pageCount: 'At least five pages'
  },
  chapter3: {
    title: 'CHAPTER THREE: METHODOLOGY',
    description: 'Explains how the study will be conducted.',
    sections: {
      introduction: {
        title: '3.0 Introduction',
        description: 'Introduces the methodology chapter.',
        requirements: ['Write one paragraph summarizing the chapter']
      },
      studyDesign: {
        title: '3.1 Study Design',
        description: 'States the research design.',
        requirements: ['Describe the study design', 'Explain why the design fits the study objectives']
      },
      studySetting: {
        title: '3.2 Study Setting',
        description: 'Describes where the study will be conducted.',
        requirements: ['Name and describe the study area or facility', 'Give relevant local context']
      },
      studyPopulation: {
        title: '3.3 Study Population',
        description: 'Identifies the population for the study.',
        requirements: ['State the target population', 'State the accessible population where applicable']
      },
      sampleSize: {
        title: '3.4 Sample Size',
        description: 'Shows the number of participants and how it is determined.',
        requirements: ['State the sample size', 'Show the formula or justification used']
      },
      samplingMethod: {
        title: '3.5 Sampling Method',
        description: 'Explains how respondents will be selected.',
        requirements: ['Name the sampling method', 'Describe the selection procedure']
      },
      inclusionExclusion: {
        title: '3.6 Inclusion and Exclusion Criteria',
        description: 'Defines who will and will not participate.',
        requirements: ['List inclusion criteria', 'List exclusion criteria']
      },
      studyVariables: {
        title: '3.7 Study Variables',
        description: 'Identifies variables under study.',
        requirements: ['State dependent variables', 'State independent variables']
      },
      researchInstruments: {
        title: '3.8 Research Instruments',
        description: 'Describes tools for data collection.',
        requirements: ['Mention questionnaires, interview guides, checklists, or other tools', 'Explain the structure of the tool where relevant']
      },
      dataCollection: {
        title: '3.9 Data Collection Procedure',
        description: 'Explains how data will be collected.',
        requirements: ['Describe permissions', 'Describe participant approach and consent', 'Describe actual data collection steps']
      },
      dataManagement: {
        title: '3.10 Data Management and Analysis',
        description: 'Explains how data will be handled and analyzed.',
        requirements: ['Describe data checking, coding, entry, cleaning, and storage', 'State analysis methods or software']
      },
      dataPresentation: {
        title: '3.11 Data Presentation',
        description: 'Explains how findings will be presented.',
        requirements: ['Mention tables, charts, figures, percentages, or narratives']
      },
      qualityControl: {
        title: '3.12 Quality Control',
        description: 'Explains how reliability and validity will be maintained.',
        requirements: ['Mention pretesting, supervision, training, or tool checking where applicable']
      },
      ethicalConsiderations: {
        title: '3.13 Ethical Considerations',
        description: 'Explains ethical safeguards.',
        requirements: ['Mention approvals', 'Mention informed consent', 'Mention confidentiality and voluntary participation']
      },
      limitations: {
        title: '3.14 Limitations of the Study',
        description: 'States likely limitations and mitigation.',
        requirements: ['State anticipated limitations', 'Explain how each limitation will be minimized']
      },
      dissemination: {
        title: '3.15 Dissemination of Results',
        description: 'Explains how study findings will be shared.',
        requirements: ['Mention UHPAB', 'Mention the training institution', 'Mention facility, community, or other relevant audiences']
      }
    }
  },
  references: {
    title: 'REFERENCES',
    description: 'Lists all sources cited in the proposal.',
    requirements: [
      'Use APA 7th edition referencing style',
      'Include only sources cited in the proposal',
      'Use credible and current sources'
    ],
    formatting: 'Start on a new page after Chapter Three.'
  },
  appendices: {
    title: 'APPENDICES',
    description: 'Supplementary materials relevant to the proposal.',
    sections: {
      workPlan: {
        title: 'Appendix 1: Work plan',
        description: 'Timeline for completing the study.',
        requirements: ['Include research activities', 'Show realistic timeframes']
      },
      budget: {
        title: 'Appendix 2: Budget',
        description: 'Estimated cost of conducting the study.',
        requirements: ['List budget items', 'Show quantities and costs']
      },
      consentForm: {
        title: 'Appendix 3: Consent form',
        description: 'Participant consent document.',
        requirements: ['Explain the study', 'Mention voluntary participation', 'Include signature lines']
      },
      tools: {
        title: 'Appendix 4: Data collection tools',
        description: 'Questionnaire, interview guide, checklist, or other tools.',
        requirements: ['Attach complete tools', 'Align tools with study objectives']
      },
      maps: {
        title: 'Appendix 5: Maps',
        description: 'Map of the study area where relevant.',
        requirements: ['Use a clear map', 'Cite the source where applicable']
      }
    }
  }
};

export default proposalStructure;
