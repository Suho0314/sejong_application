const assert = require('assert');
const {
  parsePdfQuestionPages,
  parsePdfAnswerPages,
} = require('../dist/admin/questions/question-pdf-parser');

const pages = [
  {
    pageNumber: 1,
    lines: [
      '1. 활력징후 측정 시',
      '가장 적절한 간호는?',
      '① 체온을 확인한다 ② 혈압을 확인한다 ③ 통증을 기록한다',
      '④ 의식 상태를 확인한다 ⑤ 호흡을 확인한다',
      '2. 다음 중 철 결핍과 관련된 것은?',
      '① 철(Fe) ② 칼슘(Ca) ③ 염소(Cl) ④ 나트륨(Na) ⑤ 칼륨(K)',
      '14. 저혈당 증상으로 옳은 것은?',
      '① 발한 ② 떨림 ③ 불안정 ④ 공복감 ⑤ 얼굴에 뜬다. 15. 동맥혈가스분석에서 확인하는 것은?',
      '① pH ② 산소분압 ③ 이산화탄소분압 ④ 중탄산염 ⑤ 모두 해당한다',
      '52. 다음 설명에 해당하는 것은? ① 첫 번째 보기가 길어서',
      '다음 줄까지 이어진다 ② 두 번째 보기 ③ 세 번째 보기 ④ 네 번째 보기 ⑤ 다섯 번째 보기',
      '60. 감염 관리 방법은? ① 손 씻기 ② 장갑 착용 ③ 마스크 착용 ④ 소독 ⑤ 격리 61. 멸균 물품 관리 방법은?',
      '① 건조 보관 ② 오염 방지 ③ 유효기간 확인 ④ 포장 확인 ⑤ 모두 해당',
      '99. 옳은것은? ① 보기1 ② 보기2 ③ 보기3 ④ 보기4 ⑤ 보기5',
      '100. 마지막 문제는? ① 하나 ② 둘 ③ 셋 ④ 넷 ⑤ 다섯',
    ],
  },
];

const questionResult = parsePdfQuestionPages(pages);
const numbers = questionResult.questions.map((question) => question.questionNumber);
assert.deepStrictEqual(numbers, [1, 2, 14, 15, 52, 60, 61, 99, 100]);
assert.strictEqual(questionResult.questions.find((question) => question.questionNumber === 1).choices.length, 5);
assert.strictEqual(questionResult.questions.find((question) => question.questionNumber === 14).choices[4], '얼굴에 뜬다.');
assert.match(questionResult.questions.find((question) => question.questionNumber === 15).content, /동맥혈가스분석/);
assert.strictEqual(questionResult.questions.find((question) => question.questionNumber === 52).choices.length, 5);
assert.match(questionResult.questions.find((question) => question.questionNumber === 52).choices[0], /다음 줄까지 이어진다/);
assert.match(questionResult.questions.find((question) => question.questionNumber === 61).content, /멸균 물품/);

const answerPages = [
  {
    pageNumber: 1,
    lines: [
      '기초간호학개요 1 ① (1) 기초간호학개요 14 ① (1) 기초간호학개요 15 ⑤ (5)',
      '보건간호학개요 49 ② (2) 공중보건학개론 69 ② (2) 실기 100 ⑤ (5)',
      '1 ① (1) 21 ⑤ (5) 41 ① (1) 61 ① (1) 81 ② (2)',
      '2 ② (2) 22 ③ (3) 42 ⑤ (5) 62 ④ (4) 82 ⑤ (5)',
    ],
  },
];

const answerResult = parsePdfAnswerPages(answerPages);
assert.strictEqual(answerResult.answers.get(1).answerIndex, 0);
assert.strictEqual(answerResult.answers.get(14).answerIndex, 0);
assert.strictEqual(answerResult.answers.get(15).answerIndex, 4);
assert.strictEqual(answerResult.answers.get(49).answerIndex, 1);
assert.strictEqual(answerResult.answers.get(69).answerIndex, 1);
assert.strictEqual(answerResult.answers.get(100).answerIndex, 4);

console.log('question-pdf-parser tests passed');
