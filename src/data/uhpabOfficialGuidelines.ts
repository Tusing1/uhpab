// Official UHPAB guideline sections imported from Downloads/uhpab_code.txt

const uhpabOfficialGuidelines = [
  {
    "section_id": "uhpab_report_preliminary_main",
    "document_type": "report",
    "section_name": "Preliminary Pages (Report)",
    "parent_section_id": null,
    "rules_and_guidelines": [
      "These pages precede Chapter One of the report.",
      "For the report, preliminary pages include Declaration, Approval, Commitment by Research Supervisor, Dedication, Acknowledgement, Table of contents, List of tables/figures, Abbreviations/acronyms, Operational definitions, and Abstract.",
      "The entire research report shall not be below 30 pages, starting from chapter one up to the last page including appendices."
    ],
    "formatting_notes": [
      "Page numbering: Roman numerals (i, ii, iii, etc.), placed at the bottom and centred.",
      "Font type: Times New Romans.",
      "Font size: 12.",
      "Spacing: Double-spaced (except the Abstract).",
      "Headings for preliminary pages should be numbered in Roman numerals and centred."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "uhpab report",
      "preliminary pages",
      "front matter",
      "min 30 pages"
    ]
  },
  {
    "section_id": "uhpab_report_title_page",
    "document_type": "report",
    "section_name": "Title Page",
    "parent_section_id": "uhpab_report_preliminary_main",
    "rules_and_guidelines": [
      "Title of study should be 10-20 words.",
      "Include: Title of the study.",
      "Include: Name of candidate.",
      "Include: Health Trainee Identification Number (HTIN).",
      "Include: Purpose statement indicating submission to Uganda Health Professions Assessment Board (UHPAB) as a research report.",
      "Include: Date (Month, Year)."
    ],
    "formatting_notes": [
      "No page number on this page."
    ],
    "page_count_limits": null,
    "examples": [
      "Factors Associated with Uptake of Malaria Vaccine Among Caretakers of Children Below One Year in Buteebo Village Kampala District -Uganda\n\nBy\n\nMuhindo George\n\nJUL25/ U094 /DCM/ 071/2025\n\n\nA research report submitted in partial fulfilment of the requirement for the award of a diploma in Nursing of Uganda Health Professions Assessment Board (UHPAB)\n\nJune, 2025"
    ],
    "prompt_keywords": [
      "title",
      "candidate name",
      "HTIN",
      "purpose statement",
      "date",
      "UHPAB report"
    ]
  },
  {
    "section_id": "uhpab_report_declaration",
    "document_type": "report",
    "section_name": "i. Declaration",
    "parent_section_id": "uhpab_report_preliminary_main",
    "rules_and_guidelines": [
      "Candidate declares that the work is their original piece.",
      "States the work has not been submitted elsewhere before for another diploma award or any academic qualification.",
      "Must include the Research Title and Candidate Name.",
      "Must be signed and dated."
    ],
    "formatting_notes": [
      "Heading: Centred.",
      "Page numbering: Roman numeral, Bottom centre."
    ],
    "page_count_limits": null,
    "examples": [
      "Declaration\nThis research report entitled '[Title]' has been conducted by [Type name of candidate] and has never been submitted to any institution of higher learning for any award.\nName of candidate ....................................................\n\nSignature ................................... Date..................................."
    ],
    "prompt_keywords": [
      "originality",
      "declaration",
      "candidate signature"
    ]
  },
  {
    "section_id": "uhpab_report_approval",
    "document_type": "report",
    "section_name": "ii. Approval",
    "parent_section_id": "uhpab_report_preliminary_main",
    "rules_and_guidelines": [
      "The report shall be read and approved by the supervisor and the principal."
    ],
    "formatting_notes": [
      "Heading: Centred.",
      "Page numbering: Roman numeral, Bottom centre."
    ],
    "page_count_limits": null,
    "examples": [
      "Approval\nThis research report has been submitted for examination with our approval as the candidate's supervisor and principal.\n\nSupervisor Name ........................... Signature ........................... Date ...........................\nPrincipal Name ........................... Signature ........................... Date ..........................."
    ],
    "prompt_keywords": [
      "approval",
      "supervisor signature",
      "principal signature"
    ]
  },
  {
    "section_id": "uhpab_report_supervisor_commitment",
    "document_type": "report",
    "section_name": "iii. Commitment by Research Supervisor",
    "parent_section_id": "uhpab_report_preliminary_main",
    "rules_and_guidelines": [
      "The research supervisor states commitment to supervise the named candidate and research title.",
      "The supervisor commits time, guidance, and professional support throughout the research process.",
      "The page should be signed by the research supervisor.",
      "The principal may witness the commitment with name, date, and official stamp where required."
    ],
    "formatting_notes": [
      "Heading: Centred.",
      "Page numbering: Roman numeral, Bottom centre.",
      "Use clear signature, name, date, and witness lines."
    ],
    "page_count_limits": null,
    "examples": [
      "COMMITMENT BY THE RESEARCH SUPERVISOR\n\nI, [Supervisor Name], agree to serve as supervisor for [Candidate Name] on the research study entitled '[Research Title]'. I commit to provide guidance and professional support throughout the research process.\n\nSignature: ...........................\nName of Supervisor: ..................\nDate: ...............................\n\nWitnessed by Principal\nSignature: ...........................\nName: ...............................\nDate and official stamp: ............."
    ],
    "prompt_keywords": [
      "commitment",
      "research supervisor",
      "principal witness",
      "official stamp"
    ]
  },
  {
    "section_id": "uhpab_report_dedication",
    "document_type": "report",
    "section_name": "iv. Dedication",
    "parent_section_id": "uhpab_report_preliminary_main",
    "rules_and_guidelines": [
      "The candidate shall dedicate his or her work to people or organizations of his or her wish that contributed to the completion of the research report."
    ],
    "formatting_notes": [
      "Heading: Centred.",
      "Page numbering: Roman numeral, Bottom centre."
    ],
    "page_count_limits": null,
    "examples": [
      "DEDICATION\nThis research report is dedicated to my parents for their financial and moral support."
    ],
    "prompt_keywords": [
      "dedication",
      "people or organizations"
    ]
  },
  {
    "section_id": "uhpab_report_acknowledgement",
    "document_type": "report",
    "section_name": "v. Acknowledgement",
    "parent_section_id": "uhpab_report_preliminary_main",
    "rules_and_guidelines": [
      "The candidate acknowledges all those people that have contributed towards the conduct of his or her research work."
    ],
    "formatting_notes": [
      "Heading: Centred.",
      "Page numbering: Roman numeral, Bottom centre."
    ],
    "page_count_limits": null,
    "examples": [
      "ACKNOWLEDGEMENT\nI sincerely acknowledge the guidance of my supervisor, the cooperation of the respondents in Buteebo village, and the administrative support from my institution."
    ],
    "prompt_keywords": [
      "acknowledgement",
      "contributors",
      "gratitude"
    ]
  },
  {
    "section_id": "uhpab_report_table_of_contents",
    "document_type": "report",
    "section_name": "vi. Table of Contents",
    "parent_section_id": "uhpab_report_preliminary_main",
    "rules_and_guidelines": [
      "List all major sections of the report including Chapters 1 to 5, References, and Appendices.",
      "Include all preliminary pages.",
      "The word 'Page' is aligned to the right and content to the left."
    ],
    "formatting_notes": [
      "Heading: 'TABLE OF CONTENTS' in capital letters, bolded and centred on top of the page.",
      "Page numbering: Roman numeral, Bottom centre."
    ],
    "page_count_limits": null,
    "examples": [
      "TABLE OF CONTENTS\n\nContent                                                                Page\nDeclaration...............................................................i\nApproval.................................................................ii\nCommitment by Research Supervisor........................................iii\nDedication...............................................................iv\nAcknowledgement..........................................................v\nTable of Contents........................................................vi\nList of Tables, pictures and figures.....................................vii\nAbbreviations/acronyms...................................................viii\nOperational definitions..................................................ix\nAbstract.................................................................x\nCHAPTER ONE: INTRODUCTION................................................1\n...\nCHAPTER FOUR: FINDINGS OF THE STUDY......................................X\nCHAPTER FIVE: DISCUSSIONS, RECOMMENDATIONS AND CONCLUSIONS.............X\nReferences...............................................................X\nAppendices...............................................................X"
    ],
    "prompt_keywords": [
      "table of contents",
      "structure",
      "headings",
      "page numbers"
    ]
  },
  {
    "section_id": "uhpab_report_list_of_tables_figures",
    "document_type": "report",
    "section_name": "vii. List of Tables, pictures and figures",
    "parent_section_id": "uhpab_report_preliminary_main",
    "rules_and_guidelines": [
      "All tables, pictures and figures that appear in the document should be clearly numbered and labelled.",
      "The list is according to the number and titles."
    ],
    "formatting_notes": [
      "Heading: Centred, Bold.",
      "Page numbering: Roman numeral, Bottom centre."
    ],
    "page_count_limits": null,
    "examples": [
      "List of Tables, pictures and figures\n\nTable 1: Socio-demographic characteristics of respondents..............X\nFigure 1: Distribution of vaccine uptake..............................X"
    ],
    "prompt_keywords": [
      "list of tables",
      "list of figures",
      "pictures"
    ]
  },
  {
    "section_id": "uhpab_report_acronyms",
    "document_type": "report",
    "section_name": "viii. Abbreviations/acronyms",
    "parent_section_id": "uhpab_report_preliminary_main",
    "rules_and_guidelines": [
      "All abbreviations/acronyms should be written in full.",
      "Arrange the list in alphabetical order on a separate page."
    ],
    "formatting_notes": [
      "Heading: Centred.",
      "Put the acronyms in capital letters and bold them e.g., ANC: Antenatal Care.",
      "Page numbering: Roman numeral, Bottom centre."
    ],
    "page_count_limits": null,
    "examples": [
      "ABBREVIATIONS/ACRONYMS\n\nANC: Antenatal Care\nUHPAB: Uganda Health Professions Assessment Board"
    ],
    "prompt_keywords": [
      "acronyms",
      "abbreviations",
      "alphabetical",
      "bold acronym"
    ]
  },
  {
    "section_id": "uhpab_report_definitions",
    "document_type": "report",
    "section_name": "ix. Operational definitions",
    "parent_section_id": "uhpab_report_preliminary_main",
    "rules_and_guidelines": [
      "The researcher should define the major concepts and variables as used in the study."
    ],
    "formatting_notes": [
      "Heading: Centred.",
      "Page numbering: Roman numeral, Bottom centre."
    ],
    "page_count_limits": null,
    "examples": [
      "OPERATIONAL DEFINITIONS\n\nMalaria Vaccine Uptake: In this study, refers to the administration of the recommended doses of the malaria vaccine to children below one year of age as recorded in their immunization cards."
    ],
    "prompt_keywords": [
      "operational definitions",
      "variables",
      "concepts"
    ]
  },
  {
    "section_id": "uhpab_report_abstract",
    "document_type": "report",
    "section_name": "x. Abstract",
    "parent_section_id": "uhpab_report_preliminary_main",
    "rules_and_guidelines": [
      "A brief summary for the research report.",
      "Must include: Introduction/Background, Methodology, Findings (according to specific objectives), Conclusions, Recommendations, and Health Profession Implications.",
      "Pick key findings under each objective and key recommendations.",
      "Citations should NOT be included in the abstract."
    ],
    "formatting_notes": [
      "Heading: Centred.",
      "Page numbering: Roman numeral, Bottom centre.",
      "Must be SINGLE SPACING.",
      "Must use APA Publication Manual writing style.",
      "Subheadings inside abstract should be bolded."
    ],
    "page_count_limits": "Concise, not exceeding one page and not more than 300 words.",
    "examples": [
      "**Introduction/Background:** Introduce the main problem and purpose.\n**Methodology:** Summary of design, setting, sample, data collection.\n**Findings:** Highlights based on specific objectives.\n**Conclusions:** Reflect objectives.\n**Recommendations:** Summarized, highlighting key implementers.\n**Health Profession Implications:** Impact and relevancy to practice."
    ],
    "prompt_keywords": [
      "abstract",
      "summary",
      "single spacing",
      "300 words",
      "no citations",
      "health profession implications"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_1_main",
    "document_type": "report",
    "section_name": "Chapter One: Introduction",
    "parent_section_id": null,
    "rules_and_guidelines": [
      "This chapter introduces the research study that was conducted.",
      "MUST be presented in PAST tense as the research has already taken place.",
      "Contains the same subsections as the proposal (1.0 to 1.6)."
    ],
    "formatting_notes": [
      "Each chapter should start on a fresh page.",
      "Chapter Title: All chapter headings should be centred, in upper case and bolded (e.g., CHAPTER ONE: INTRODUCTION).",
      "Chapter must be written in words and not figures.",
      "Page numbering: Arabic numerals (1, 2, 3), bottom and centred.",
      "Subheadings: Left-aligned in sentence case and bolded.",
      "Double-spaced."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter one",
      "introduction",
      "past tense",
      "completed study"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_2_main",
    "document_type": "report",
    "section_name": "Chapter Two: Literature Review",
    "parent_section_id": null,
    "rules_and_guidelines": [
      "Systematic review of previous researchers related to the study.",
      "Arranged according to specific objectives.",
      "Must include a minimum of 20 in-text citations following APA 7th edition.",
      "Oldest references should not be beyond 10 years before time of conducting research.",
      "Must include a brief summary with gaps identified."
    ],
    "formatting_notes": [
      "Chapter Title: 'CHAPTER TWO: LITERATURE REVIEW' (Centred, upper case, bolded).",
      "Subheadings: Left-aligned, sentence case, bolded.",
      "Double-spaced."
    ],
    "page_count_limits": "At least five (5) pages.",
    "examples": [],
    "prompt_keywords": [
      "chapter two",
      "literature review",
      "minimum 5 pages",
      "APA 7th",
      "min 20 citations"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_1_0",
    "document_type": "report",
    "section_name": "1.0 Introduction",
    "parent_section_id": "uhpab_report_chapter_1_main",
    "rules_and_guidelines": [
      "Introduce the summary of Chapter One in one short paragraph of about 25-45 words.",
      "Mention the main sections covered in Chapter One without adding statistics, citations, definitions, or detailed background.",
      "Let 1.1 Background to the Study begin immediately after this preview where page space allows.",
      "Use past tense in the report because the study has already been conducted."
    ],
    "formatting_notes": [
      "Subheading format: 1.0 Introduction (left-aligned, sentence case, bolded)."
    ],
    "page_count_limits": "One short paragraph, about 25-45 words.",
    "examples": [],
    "prompt_keywords": [
      "chapter one",
      "introduction",
      "one paragraph"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_1_1",
    "document_type": "report",
    "section_name": "1.1 Background to the Study",
    "parent_section_id": "uhpab_report_chapter_1_main",
    "rules_and_guidelines": [
      "Use 4-6 focused paragraphs for a first draft, then expand only where evidence or supervisor feedback requires it.",
      "Be concise and precise with a maximum of two pages.",
      "Use a few references to support statements, but do not make it an extensive literature review.",
      "Provide an in-depth understanding of the research problem.",
      "Move from global, continental, regional, national, to local context.",
      "State the main reason why the issue is significant enough to warrant research."
    ],
    "formatting_notes": [
      "Use past tense where describing the completed report."
    ],
    "page_count_limits": "Maximum two pages.",
    "examples": [],
    "prompt_keywords": [
      "background",
      "global to local",
      "significance"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_1_2",
    "document_type": "report",
    "section_name": "1.2 Statement of the Problem",
    "parent_section_id": "uhpab_report_chapter_1_main",
    "rules_and_guidelines": [
      "Start with what is ideal or what should be happening.",
      "Then describe the current situation of the problem.",
      "Clearly state the nature and magnitude of the problem.",
      "Keep statistical information or citations brief and specific.",
      "Refer to the detected problem that needs a theoretical or practical solution.",
      "Briefly cite previous research to show gaps and justify the need for the study.",
      "State consequences if the problem is not addressed or if it is addressed."
    ],
    "formatting_notes": [
      "Be concise and precise."
    ],
    "page_count_limits": "About half a page.",
    "examples": [],
    "prompt_keywords": [
      "problem statement",
      "ideal situation",
      "current situation",
      "gap",
      "consequences"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_1_3",
    "document_type": "report",
    "section_name": "1.3 Research Objectives",
    "parent_section_id": "uhpab_report_chapter_1_main",
    "rules_and_guidelines": [
      "Clearly indicate the general research objective.",
      "Clearly indicate the specific objectives.",
      "Objectives should be SMART."
    ],
    "formatting_notes": [
      "Use this as the parent section for the general objective, specific objectives, and research questions."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "research objectives",
      "SMART objectives"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_1_3_1",
    "document_type": "report",
    "section_name": "1.3.1 Purpose of the Study or General Objective",
    "parent_section_id": "uhpab_report_chapter_1_main",
    "rules_and_guidelines": [
      "State the goal or main aim of the study.",
      "Use one general objective only.",
      "State what the research investigated in a broad sense.",
      "Include dependent and independent variables, study population, and study area."
    ],
    "formatting_notes": [
      "Begin with an action verb such as determine."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "general objective",
      "purpose of study"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_1_3_2",
    "document_type": "report",
    "section_name": "1.3.2 Specific Objectives",
    "parent_section_id": "uhpab_report_chapter_1_main",
    "rules_and_guidelines": [
      "Use 2-3 SMART objectives.",
      "Objectives should reflect what the candidate wants to study.",
      "Objectives should relate to the general objective.",
      "Use action words such as determine, establish, find out, assess, explore, evaluate, examine, or investigate."
    ],
    "formatting_notes": [
      "List objectives in logical order."
    ],
    "page_count_limits": "Usually 2-3 objectives.",
    "examples": [],
    "prompt_keywords": [
      "specific objectives",
      "action words",
      "SMART"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_1_3_3",
    "document_type": "report",
    "section_name": "1.3.3 Research Questions",
    "parent_section_id": "uhpab_report_chapter_1_main",
    "rules_and_guidelines": [
      "Research questions should be in line with the specific objectives.",
      "One general research question may be generated from the broad objective.",
      "Specific questions should match the specific objectives."
    ],
    "formatting_notes": [
      "Phrase questions clearly and directly."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "research questions",
      "specific objectives"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_1_4",
    "document_type": "report",
    "section_name": "1.4 Justification of the Study",
    "parent_section_id": "uhpab_report_chapter_1_main",
    "rules_and_guidelines": [
      "State the rationale for conducting the study.",
      "State the reason or reasons why the researcher chose to focus on the topic."
    ],
    "formatting_notes": [],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "justification",
      "rationale"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_1_5",
    "document_type": "report",
    "section_name": "1.5 Significance of the Study",
    "parent_section_id": "uhpab_report_chapter_1_main",
    "rules_and_guidelines": [
      "Explain the importance or contribution to academic knowledge or practical use.",
      "Highlight who benefits from the research findings and how they benefit."
    ],
    "formatting_notes": [],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "significance",
      "beneficiaries"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_1_6",
    "document_type": "report",
    "section_name": "1.6 Scope of the Study",
    "parent_section_id": "uhpab_report_chapter_1_main",
    "rules_and_guidelines": [
      "Provide the boundaries or limits of the research.",
      "Define the study in terms of content, geographical area, and time span."
    ],
    "formatting_notes": [],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "scope",
      "content scope",
      "geographical scope",
      "time span"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_2_0",
    "document_type": "report",
    "section_name": "2.0 Introduction",
    "parent_section_id": "uhpab_report_chapter_2_main",
    "rules_and_guidelines": [
      "Introduce the literature review chapter.",
      "Start with an overview of the dependent variable.",
      "Explain how the chapter is arranged according to the study objectives."
    ],
    "formatting_notes": [
      "Subheading format: 2.0 Introduction (left-aligned, sentence case, bolded)."
    ],
    "page_count_limits": "Not more than half a page.",
    "examples": [],
    "prompt_keywords": [
      "literature review introduction",
      "dependent variable"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_2_1",
    "document_type": "report",
    "section_name": "2.1 Body",
    "parent_section_id": "uhpab_report_chapter_2_main",
    "rules_and_guidelines": [
      "Present a systematic review of previous researchers' work related to the study.",
      "Arrange the review according to the specific objectives.",
      "Use credible sources such as Google Scholar, PubMed, HINARI, textbooks, journals, articles, websites, newsletters, bulletins, authorities, and other acceptable sources.",
      "Avoid Wikipedia as a source.",
      "Avoid copying directly; paraphrase while keeping the original meaning.",
      "Use correct APA 7th edition in-text citations.",
      "Include appropriate comparisons and contrasts.",
      "Cover all study objectives and variables.",
      "Include a brief summary and identify gaps."
    ],
    "formatting_notes": [
      "Use objective-based subheadings."
    ],
    "page_count_limits": "Chapter Two should have at least five pages and at least 20 in-text citations.",
    "examples": [],
    "prompt_keywords": [
      "literature review body",
      "minimum 20 citations",
      "APA 7th",
      "gaps"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_main",
    "document_type": "report",
    "section_name": "Chapter Three: Methodology",
    "parent_section_id": null,
    "rules_and_guidelines": [
      "Details the methodology that WAS utilized (past tense).",
      "Includes 3.0 Intro, 3.1 Design, 3.2 Setting, 3.3 Population, 3.4 Sample Size, 3.5 Sampling Method, 3.6 Inclusion/Exclusion, 3.7 Variables, 3.8 Instruments, 3.9 Data Collection, 3.10 Data Mgt/Analysis, 3.11 Data Presentation, 3.12 Quality Control, 3.13 Ethical Considerations, 3.14 Limitations (state what was done to mitigate), 3.15 Dissemination."
    ],
    "formatting_notes": [
      "Chapter Title: 'CHAPTER THREE: METHODOLOGY' (Centred, upper case, bolded).",
      "Subheadings: Left-aligned, sentence case, bolded.",
      "Double-spaced."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "past tense",
      "execution details"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_0",
    "document_type": "report",
    "section_name": "3.0 Introduction",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "Introduce the methodology chapter and briefly state that it explains how the study was conducted.",
      "Write in past tense because the report describes what was done."
    ],
    "formatting_notes": [
      "Subheading format: 3.0 Introduction (left-aligned, sentence case, bolded)."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.0 introduction",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_1",
    "document_type": "report",
    "section_name": "3.1 Study Design",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "Describe the research design that was used.",
      "State why the design was suitable for the study objectives."
    ],
    "formatting_notes": [
      "Use past tense and be specific about the design."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.1 study design",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_2",
    "document_type": "report",
    "section_name": "3.2 Study Setting",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "Describe where the study was carried out.",
      "Include relevant details about the facility, community, district, or catchment area."
    ],
    "formatting_notes": [
      "Use clear location details and past tense."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.2 study setting",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_3",
    "document_type": "report",
    "section_name": "3.3 Study Population",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "Describe the target population and accessible population used in the study.",
      "Mention the group from which respondents were selected."
    ],
    "formatting_notes": [
      "Keep wording aligned to the actual population studied."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.3 study population",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_4",
    "document_type": "report",
    "section_name": "3.4 Sample Size",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "State the sample size used in the study.",
      "Explain how the sample size was determined."
    ],
    "formatting_notes": [
      "Show formula or justification where applicable."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.4 sample size",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_5",
    "document_type": "report",
    "section_name": "3.5 Sampling Method",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "Describe the sampling method used to select participants.",
      "Explain how respondents were selected."
    ],
    "formatting_notes": [
      "Use past tense and match the actual method used."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.5 sampling method",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_6",
    "document_type": "report",
    "section_name": "3.6 Inclusion and Exclusion Criteria",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "State who was included in the study.",
      "State who was excluded from the study."
    ],
    "formatting_notes": [
      "Use separate inclusion and exclusion points for clarity."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.6 inclusion and exclusion criteria",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_7",
    "document_type": "report",
    "section_name": "3.7 Study Variables",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "Identify dependent and independent variables.",
      "Explain variables in relation to the study objectives."
    ],
    "formatting_notes": [
      "Use concise variable labels."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.7 study variables",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_8",
    "document_type": "report",
    "section_name": "3.8 Research Instruments",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "Describe the tools used for data collection.",
      "Mention questionnaires, interview guides, checklists, or other tools used."
    ],
    "formatting_notes": [
      "State how the tool was structured where relevant."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.8 research instruments",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_9",
    "document_type": "report",
    "section_name": "3.9 Data Collection Procedure",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "Explain the steps followed during data collection.",
      "Mention permissions, participant approach, consent, and actual collection process."
    ],
    "formatting_notes": [
      "Write in past tense and sequence the steps clearly."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.9 data collection procedure",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_10",
    "document_type": "report",
    "section_name": "3.10 Data Management and Analysis",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "Describe how data was checked, coded, entered, cleaned, stored, and analyzed.",
      "Mention software or methods used where applicable."
    ],
    "formatting_notes": [
      "Use past tense and include analysis method."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.10 data management and analysis",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_11",
    "document_type": "report",
    "section_name": "3.11 Data Presentation",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "Describe how findings were presented.",
      "Mention tables, figures, charts, narratives, or percentages where applicable."
    ],
    "formatting_notes": [
      "Match this to Chapter Four presentation style."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.11 data presentation",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_12",
    "document_type": "report",
    "section_name": "3.12 Quality Control",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "Explain measures used to ensure reliability and validity of data.",
      "Mention pretesting, training, supervision, or checking tools where applicable."
    ],
    "formatting_notes": [
      "Describe what was actually done."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.12 quality control",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_13",
    "document_type": "report",
    "section_name": "3.13 Ethical Considerations",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "Describe ethical approvals and permissions obtained.",
      "Mention informed consent, confidentiality, voluntary participation, and protection of respondents."
    ],
    "formatting_notes": [
      "Use institution and approval details where available."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.13 ethical considerations",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_14",
    "document_type": "report",
    "section_name": "3.14 Limitations of the Study",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "State limitations encountered during the study.",
      "Explain what was done to minimize or mitigate those limitations."
    ],
    "formatting_notes": [
      "Do not only list limitations; include mitigation."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.14 limitations of the study",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_3_15",
    "document_type": "report",
    "section_name": "3.15 Dissemination of Results",
    "parent_section_id": "uhpab_report_chapter_3_main",
    "rules_and_guidelines": [
      "State where and how study findings were shared or will be shared.",
      "Mention UHPAB, the training institution, health facility, community, or other relevant audiences."
    ],
    "formatting_notes": [
      "Use clear destination audiences."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter three",
      "methodology",
      "3.15 dissemination of results",
      "past tense"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_4_main",
    "document_type": "report",
    "section_name": "Chapter Four: Findings of the Study",
    "parent_section_id": null,
    "rules_and_guidelines": [
      "Study results or findings should be presented based on the specific objectives and in chronological order.",
      "Results should be presented in tables, narratives, figure or charts.",
      "After every figure or table, a narrative interpretation should be stated below it.",
      "Each table, figure or narrative should have a subheading and numbered.",
      "DO NOT discuss the findings in this section."
    ],
    "formatting_notes": [
      "Chapter Title: 'CHAPTER FOUR: FINDINGS OF THE STUDY' (Centred, upper case, bolded).",
      "Subheadings: Left-aligned, sentence case, bolded.",
      "Double-spaced."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter four",
      "findings",
      "results",
      "tables",
      "figures",
      "no discussion"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_4_0",
    "document_type": "report",
    "section_name": "4.0 Introduction",
    "parent_section_id": "uhpab_report_chapter_4_main",
    "rules_and_guidelines": [
      "Description of the sample size and data presentation methods."
    ],
    "formatting_notes": [
      "Subheading format: 4.0 Introduction (left-aligned, sentence case, bolded)."
    ],
    "page_count_limits": null,
    "examples": [
      "This chapter presents the findings from 130 respondents. Data is presented using frequency tables, pie charts, and summarized narrative statements corresponding to the study objectives."
    ],
    "prompt_keywords": [
      "findings introduction",
      "sample size",
      "presentation methods"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_4_1",
    "document_type": "report",
    "section_name": "4.1 Demographic Characteristics",
    "parent_section_id": "uhpab_report_chapter_4_main",
    "rules_and_guidelines": [
      "All socio-demographic characteristics should be presented in ONE table with frequencies and percentages for each variable.",
      "Avoid the row for totals if there is no missing data.",
      "Complete the narrative by only stating the most catching data or information (e.g., reporting majority >50%)."
    ],
    "formatting_notes": [
      "Subheading format: 4.1 Demographic characteristics (left-aligned, sentence case, bolded)."
    ],
    "page_count_limits": null,
    "examples": [
      "Table 1: Socio-demographic characteristics of respondents (n=130)\n[Table data here]\nMajority of the respondents 80 (62%) were aged between 20-30 years. A half of the respondents were males."
    ],
    "prompt_keywords": [
      "demographics",
      "one table",
      "frequencies",
      "percentages",
      "catching data narrative"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_4_objectives",
    "document_type": "report",
    "section_name": "4.2 to 4.X Research Objectives",
    "parent_section_id": "uhpab_report_chapter_4_main",
    "rules_and_guidelines": [
      "Present findings per objective (e.g., 4.2 Research Objective 1, 4.3 Research Objective 2).",
      "Use tables and figures OR summarized narrative statements.",
      "Highlight the key findings in relation to study objectives.",
      "Use NOT MORE THAN 2 tables or figures for each research objective."
    ],
    "formatting_notes": [
      "Subheading format: Left-aligned, sentence case, bolded."
    ],
    "page_count_limits": null,
    "examples": [
      "4.2 Research objective 1 findings\n[Insert up to 2 tables/figures, followed by narrative pointing out key results without discussing 'why']."
    ],
    "prompt_keywords": [
      "objective findings",
      "max 2 tables per objective",
      "narrative summary"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_5_main",
    "document_type": "report",
    "section_name": "Chapter Five: Discussions, Recommendations and Conclusions",
    "parent_section_id": null,
    "rules_and_guidelines": [
      "This chapter contains the interpretation, actionable advice, and final judgements based on the findings."
    ],
    "formatting_notes": [
      "Chapter Title: 'CHAPTER FIVE: DISCUSSIONS, RECOMMENDATIONS AND CONCLUSIONS' (Centred, upper case, bolded).",
      "Subheadings: Left-aligned, sentence case, bolded.",
      "Double-spaced."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "chapter five",
      "discussions",
      "recommendations",
      "conclusions"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_5_0",
    "document_type": "report",
    "section_name": "5.0 Introduction",
    "parent_section_id": "uhpab_report_chapter_5_main",
    "rules_and_guidelines": [
      "Brief introduction of the chapter sections."
    ],
    "formatting_notes": [
      "Subheading format: 5.0 Introduction (left-aligned, sentence case, bolded)."
    ],
    "page_count_limits": null,
    "examples": [
      "This chapter presents the discussion of the findings, the recommendations derived, conclusions drawn, and implications to health profession practice."
    ],
    "prompt_keywords": [
      "chapter five introduction"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_5_1",
    "document_type": "report",
    "section_name": "5.1 Discussion",
    "parent_section_id": "uhpab_report_chapter_5_main",
    "rules_and_guidelines": [
      "Interpretation of key results.",
      "Comparison with existing literature based on previous studies related to the study topic.",
      "Researcher's view on the result after comparison.",
      "MUST use correct in-text citation.",
      "Should follow the order of the specific objectives."
    ],
    "formatting_notes": [
      "Subheading format: 5.1 Discussion (left-aligned, sentence case, bolded)."
    ],
    "page_count_limits": null,
    "examples": [
      "The uptake of malaria vaccination (4th dose) in this study was 56%. This indicates an improvement in the vaccination coverage, but also underscores the need for continued efforts to reach the remaining 44% who are still un-vaccinated. This differs from the study conducted in Malawi where the coverage was 41.6% (Simbeye et al., 2024)."
    ],
    "prompt_keywords": [
      "discussion",
      "interpretation",
      "compare literature",
      "researcher view",
      "in-text citation"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_5_2",
    "document_type": "report",
    "section_name": "5.2 Recommendations",
    "parent_section_id": "uhpab_report_chapter_5_main",
    "rules_and_guidelines": [
      "Based on key findings derived from the results, based on study objectives or research questions.",
      "Indicate what is to be done by whom, how and when.",
      "There should be at least one recommendation for each objective.",
      "Clearly state which authority or individual should take which action."
    ],
    "formatting_notes": [
      "Subheading format: 5.2 Recommendations (left-aligned, sentence case, bolded)."
    ],
    "page_count_limits": null,
    "examples": [
      "Ministry of Health should strengthen community-based interventions to increase malaria vaccine uptake, train community health workers, and engage community leaders & influences, and monitor & evaluate the effectiveness of these interventions."
    ],
    "prompt_keywords": [
      "recommendations",
      "who what how when",
      "one per objective",
      "authority action"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_5_3",
    "document_type": "report",
    "section_name": "5.3 Conclusions",
    "parent_section_id": "uhpab_report_chapter_5_main",
    "rules_and_guidelines": [
      "A judgement that links the results to the objectives of the study.",
      "Draw conclusions answering the research questions or in line with set study objectives.",
      "Derived from the results."
    ],
    "formatting_notes": [
      "Subheading format: 5.3 Conclusions (left-aligned, sentence case, bolded).",
      "Summarized in paragraphs."
    ],
    "page_count_limits": "Cover half a page.",
    "examples": [
      "There is a significant improvement in malaria vaccine uptake related to the 4th dose standing at 56%."
    ],
    "prompt_keywords": [
      "conclusions",
      "judgement",
      "link results to objectives",
      "answer questions"
    ]
  },
  {
    "section_id": "uhpab_report_chapter_5_4",
    "document_type": "report",
    "section_name": "5.4 Implications to Health Profession Practice",
    "parent_section_id": "uhpab_report_chapter_5_main",
    "rules_and_guidelines": [
      "Highlight the impact and relevancy of the findings to the Health Profession Practice.",
      "State how the findings will be important in improving Health Profession Practice."
    ],
    "formatting_notes": [
      "Subheading format: 5.4 Implications to Health Profession Practice (left-aligned, sentence case, bolded)."
    ],
    "page_count_limits": null,
    "examples": [
      "These findings imply that health professionals must integrate tailored health education regarding vaccine schedules into routine post-natal care to sustain and improve uptake rates."
    ],
    "prompt_keywords": [
      "implications",
      "health profession practice",
      "impact",
      "relevancy",
      "improvement"
    ]
  },
  {
    "section_id": "uhpab_report_references",
    "document_type": "report",
    "section_name": "References",
    "parent_section_id": null,
    "rules_and_guidelines": [
      "Use American Psychological Association (APA) 7th Edition as the recommended style.",
      "Trainees are expected to use and submit a minimum of 20 references.",
      "References must be those cited within the body of the report."
    ],
    "formatting_notes": [
      "Heading: 'REFERENCES' in upper case, centred, bolded.",
      "Double-spaced throughout."
    ],
    "page_count_limits": null,
    "examples": [
      "Simbeye, A. J., Kumwenda, S., Cohee, L. M., Omondi, D., Masibo, P. K., Wao, H., & Awandu, S. S. (2024). Factors associated with malaria vaccine uptake in Nsanje district, Malawi. Malaria Journal, 23(1), 105. https://doi.org/10.1186/s12936-024-04938-7"
    ],
    "prompt_keywords": [
      "references",
      "APA 7th",
      "minimum 20",
      "cited in body"
    ]
  },
  {
    "section_id": "uhpab_report_appendices_main",
    "document_type": "report",
    "section_name": "Appendices",
    "parent_section_id": null,
    "rules_and_guidelines": [
      "Include: Data collection tools, Ethical requirements (consent form, approval letters, school approvals, introductory letters), Similarity Index Report, Maps, Pictures, Information sheets."
    ],
    "formatting_notes": [
      "Heading: 'APPENDICES' in upper case, centred, bolded.",
      "Numbered using Arabic numerals."
    ],
    "page_count_limits": null,
    "examples": [],
    "prompt_keywords": [
      "appendices",
      "tools",
      "ethics",
      "similarity index",
      "maps",
      "pictures"
    ]
  }
];

export default uhpabOfficialGuidelines;
