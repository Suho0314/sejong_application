const assert = require('assert');
const { QuestionPdfAiAssistService } = require('../dist/admin/questions/question-pdf-ai-assist.service');

const service = new QuestionPdfAiAssistService({ get: () => 'test-key' });

const baseItem = {
  questionNumber: 1,
  subject: 'Base Subject',
  category: null,
  content: 'Base content',
  choices: ['Base 1', 'Base 2', 'Base 3', 'Base 4', 'Base 5'],
  pageNumber: 1,
  correctAnswerIndex: 0,
  answerNumber: 1,
  status: 'ready',
  reasons: [],
};

const ready = service.toPreviewItems([
  {
    number: 1,
    content: 'Corrected content',
    choices: ['Choice 1', 'Choice 2', 'Choice 3', 'Choice 4', 'Choice 5'],
    correctAnswerNumber: 1,
    subject: null,
    category: null,
    warnings: [],
  },
], [baseItem], []);

assert.strictEqual(ready[0].status, 'ready');
assert.strictEqual(ready[0].correctAnswerIndex, 0);
assert.strictEqual(ready[0].subject, 'Base Subject');

const badChoices = service.toPreviewItems([
  {
    number: 1,
    content: 'Corrected content',
    choices: ['Choice 1', 'Choice 2'],
    correctAnswerNumber: 1,
    subject: null,
    category: null,
    warnings: [],
  },
], [baseItem], []);

assert.strictEqual(badChoices[0].status, 'needs_review');
assert.ok(badChoices[0].reasons.some((reason) => reason.includes('보기가 5개')));

const answerMismatch = service.toPreviewItems([
  {
    number: 1,
    content: 'Corrected content',
    choices: ['Choice 1', 'Choice 2', 'Choice 3', 'Choice 4', 'Choice 5'],
    correctAnswerNumber: 2,
    subject: null,
    category: null,
    warnings: [],
  },
], [baseItem], []);

assert.strictEqual(answerMismatch[0].status, 'needs_review');
assert.ok(answerMismatch[0].reasons.some((reason) => reason.includes('정답표')));

async function assertNoApiKeyFailure() {
  const noKeyService = new QuestionPdfAiAssistService({ get: () => undefined });

  try {
    await noKeyService.assist({
      questionPages: [],
      answerPages: [],
      ruleItems: [baseItem],
      mode: 'all',
    });
    assert.fail('Expected missing API key error');
  } catch (error) {
    assert.strictEqual(error.response.error.code, 'PDF_IMPORT_AI_API_KEY_REQUIRED');
  }
}

assertNoApiKeyFailure()
  .then(() => console.log('question-pdf-ai-assist tests passed'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
