const assert = require('assert');
const { QuestionPdfImportService } = require('../dist/admin/questions/question-pdf-import.service');

const questionBuffer = Buffer.from('%PDF-question');
const answerBuffer = Buffer.from('%PDF-answer');
const questionFile = {
  buffer: questionBuffer,
  mimetype: 'application/pdf',
  originalname: 'question.pdf',
  size: questionBuffer.length,
};
const answerFile = {
  buffer: answerBuffer,
  mimetype: 'application/pdf',
  originalname: 'answer.pdf',
  size: answerBuffer.length,
};

const questionPagesWithoutDotMarkers = [
  {
    pageNumber: 1,
    lines: [
      '1 감염 관리에서 가장 중요한 것은?',
      '① 손 씻기 ② 환기 ③ 운동 ④ 수면 ⑤ 식이',
    ],
  },
];
const answerPages = [
  {
    pageNumber: 1,
    lines: ['1 ② (2)'],
  },
];

function createService(aiAssistService) {
  const service = new QuestionPdfImportService({}, aiAssistService);
  service.extractPdfPages = async (buffer) => {
    if (buffer === questionBuffer) return questionPagesWithoutDotMarkers;
    if (buffer === answerBuffer) return answerPages;
    throw new Error('Unexpected buffer');
  };
  return service;
}

async function assertAiOffKeepsParseFailure() {
  const service = createService({
    assist: async () => {
      assert.fail('AI assist should not be called when useAiAssist is false');
    },
  });

  try {
    await service.preview(questionFile, answerFile, { useAiAssist: false });
    assert.fail('Expected parse failure');
  } catch (error) {
    assert.strictEqual(error.response.error.code, 'PDF_QUESTION_PARSE_FAILED');
  }
}

async function assertAiOnUsesRawTextFallback() {
  let capturedInput = null;
  const service = createService({
    assist: async (input) => {
      capturedInput = input;
      return {
        items: [
          {
            questionNumber: 1,
            subject: 'PDF 가져오기',
            category: null,
            content: '감염 관리에서 가장 중요한 것은?',
            choices: ['손 씻기', '환기', '운동', '수면', '식이'],
            pageNumber: 1,
            correctAnswerIndex: 1,
            answerNumber: 2,
            status: 'ready',
            reasons: [],
          },
        ],
        warnings: ['AI raw text fallback used'],
      };
    },
  });

  const result = await service.preview(questionFile, answerFile, {
    useAiAssist: true,
    aiAssistMode: 'all',
  });

  assert.ok(capturedInput);
  assert.strictEqual(capturedInput.parserQuestionCount, 0);
  assert.strictEqual(capturedInput.ruleItems.length, 0);
  assert.strictEqual(capturedInput.answerItems.length, 1);
  assert.strictEqual(capturedInput.answerItems[0].questionNumber, 1);
  assert.strictEqual(capturedInput.answerItems[0].answerNumber, 2);
  assert.match(capturedInput.questionPages[0].lines.join(' '), /감염 관리/);
  assert.strictEqual(result.data.summary.total, 1);
  assert.strictEqual(result.data.summary.ready, 1);
  assert.ok(result.data.summary.parseWarnings.includes('AI raw text fallback used'));
}

assertAiOffKeepsParseFailure()
  .then(assertAiOnUsesRawTextFallback)
  .then(() => console.log('question-pdf-import-ai-fallback tests passed'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
