/** Remove a leading judgement only for common research behaviours, not clinical terms such as low birth weight. */
export function neutralTopicSubject(value: string) {
  return value.replace(/^(?:low|high|poor|inadequate)\s+(?=(?:uptake|use|utilization|adherence|practice(?:s)?|hand hygiene|screening|attendance|compliance|awareness|knowledge)\b)/i, '').trim();
}
