type Question = { id: string; options: readonly { id: string }[] };
export function validateAnswers(questions: readonly Question[], answers: Record<string, string>) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new Error('Complete every question.');
  if (Object.keys(answers).length !== questions.length) throw new Error('Complete every question with a supported choice.');
  for (const q of questions) {
    if (!Object.hasOwn(answers, q.id) || !q.options.some(o => o.id === answers[q.id])) throw new Error('Choose a supported answer for: ' + q.id);
  }
}
