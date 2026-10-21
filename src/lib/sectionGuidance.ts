import { getUhpabSectionContract, sectionCitationPolicy, type UhpabWritingContext } from './uhpabWritingEngine';
const examples: Record<string, string> = {
    introduction: 'This chapter presents the background, problem statement, objectives, research questions, justification, significance and scope of the study.',
    justification: 'Understanding the selected problem in this setting can help identify locally relevant gaps. The study is therefore intended to provide evidence to guide appropriate improvements.',
    significance: 'The findings may help health workers tailor education to the needs identified, and help facility managers prioritise improvements.',
    generalObjective: 'To assess the stated health issue among the exact population at the named study setting.',
    specificObjectives: 'To assess the socio-demographic factors associated with the stated issue among the exact population at the named setting.',
    researchQuestions: 'What socio-demographic factors are associated with the stated issue among the exact population at the named setting?',
    background: 'Move from the wider published evidence to Uganda and the study setting, then identify the local knowledge gap. Use real sources for factual claims; do not invent local figures.',
    statementOfProblem: 'Explain the expected situation, the evidenced problem and the remaining gap that this study will address. Avoid claiming unverified facility results.',
    studyDesign: 'A cross-sectional design may suit a study measuring the situation at one point in time. Choose it only if it matches the actual study plan.',
    sampleSize: 'Show the chosen sample-size method, its confirmed inputs, calculation and final justified sample. Do not choose numbers just to complete the section.',
};
export function sectionGuidance(context: UhpabWritingContext) {
    const contract = getUhpabSectionContract(context);
    return {
        purpose: contract.purpose,
        length: contract.maxWords ? `Up to ${contract.maxWords} words${contract.maxParagraphs ? `; up to ${contract.maxParagraphs} paragraph${contract.maxParagraphs > 1 ? 's' : ''}` : ''}.` : contract.listItems ? `${context.objectiveCount || 3} aligned items.` : 'Keep to the selected section and its requirements.',
        citationPolicy: sectionCitationPolicy(context.sectionKey, context.componentId),
        example: examples[context.componentId] || context.guidelines?.requirements?.[0] || 'Use only the facts and decisions that apply to your study. Unknown information should remain clearly marked until confirmed.',
    };
}
