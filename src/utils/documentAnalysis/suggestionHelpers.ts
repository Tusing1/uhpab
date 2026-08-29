
// Helper function to generate suggestions based on the issue
export function getSuggestionForIssue(issue: string): string {
  if (issue.includes("problem statement")) {
    return "Make your problem statement more concise and ensure it clearly identifies the research gap.";
  } else if (issue.includes("background")) {
    return "Expand your background with more global context and recent developments in the field.";
  } else if (issue.includes("literature")) {
    return "Include more recent studies (within the last 5 years) and critically analyze their findings.";
  } else if (issue.includes("sampling")) {
    return "Clearly describe your sampling technique and justify why it's appropriate for your study.";
  } else if (issue.includes("method")) {
    return "Provide more details about your methodology, including validity and reliability considerations.";
  } else if (issue.includes("reference")) {
    return "Ensure all references follow APA 7th edition format and check for consistency.";
  } else if (issue.includes("ethical")) {
    return "Elaborate on ethical considerations, including informed consent and confidentiality measures.";
  } else {
    return "Review this section against the UHPAB guidelines and provide more comprehensive details.";
  }
}
