export type PdfParserPageText = {
  pageNumber: number;
  lines: string[];
};

export type ParsedPdfQuestion = {
  questionNumber: number;
  subject: string;
  category: string | null;
  content: string;
  choices: string[];
  pageNumber: number;
  parseWarnings?: string[];
};

export type ParsedPdfAnswer = {
  answerIndex: number;
  subject: string | null;
};

export type ParsedPdfQuestionResult = {
  questions: ParsedPdfQuestion[];
  warnings: string[];
};

export type ParsedPdfAnswerResult = {
  answers: Map<number, ParsedPdfAnswer>;
  warnings: string[];
};

const DEFAULT_SUBJECT = 'PDF 가져오기';
const CIRCLED_CHOICE_MAP = new Map([
  ['①', 1],
  ['②', 2],
  ['③', 3],
  ['④', 4],
  ['⑤', 5],
]);

type TextSegment = {
  start: number;
  end: number;
  pageNumber: number;
  subject: string;
  category: string | null;
};

type MarkerToken = {
  start: number;
  end: number;
  value: number;
  kind: 'question-or-numbered-choice' | 'circled-choice';
  hasQuestionWord: boolean;
};

type MutableQuestion = ParsedPdfQuestion & {
  activeChoiceIndex: number | null;
};

export function parsePdfQuestionPages(
  pages: PdfParserPageText[],
  defaultSubject = DEFAULT_SUBJECT,
): ParsedPdfQuestionResult {
  const stream = buildQuestionTextStream(pages, defaultSubject);
  const markers = tokenizeQuestionAndChoiceMarkers(stream.text);
  const questions: ParsedPdfQuestion[] = [];
  const warnings: string[] = [];
  let currentQuestion: MutableQuestion | null = null;
  let lastQuestionNumber = 0;
  let cursor = 0;

  const appendText = (rawText: string) => {
    if (!currentQuestion) return;

    const text = cleanText(rawText);
    if (!text) return;

    if (currentQuestion.activeChoiceIndex !== null) {
      const index = currentQuestion.activeChoiceIndex;
      currentQuestion.choices[index] = currentQuestion.choices[index]
        ? `${currentQuestion.choices[index]} ${text}`
        : text;
      return;
    }

    currentQuestion.content = currentQuestion.content
      ? `${currentQuestion.content} ${text}`
      : text;
  };

  const flushQuestion = () => {
    if (!currentQuestion) return;

    const choices = currentQuestion.choices.map((choice) => cleanText(choice)).filter(Boolean);
    const question: ParsedPdfQuestion = {
      questionNumber: currentQuestion.questionNumber,
      subject: currentQuestion.subject,
      category: currentQuestion.category,
      content: cleanText(currentQuestion.content),
      choices,
      pageNumber: currentQuestion.pageNumber,
      parseWarnings: [...(currentQuestion.parseWarnings ?? [])],
    };

    if (questions.some((candidate) => candidate.questionNumber === question.questionNumber)) {
      question.parseWarnings?.push(`문제 번호 ${question.questionNumber}가 중복 추출되었습니다.`);
      warnings.push(`문제 번호 ${question.questionNumber}가 중복 추출되었습니다.`);
    }

    if (lastQuestionNumber > 0 && question.questionNumber !== lastQuestionNumber + 1) {
      question.parseWarnings?.push(
        `문제 번호가 ${lastQuestionNumber}번 다음 ${question.questionNumber}번으로 이어집니다.`,
      );
      warnings.push(`문제 번호 ${lastQuestionNumber + 1}번 근처 누락 또는 병합 가능성이 있습니다.`);
    }

    questions.push(question);
    lastQuestionNumber = Math.max(lastQuestionNumber, question.questionNumber);
    currentQuestion = null;
  };

  for (const marker of markers) {
    if (marker.start < cursor) continue;

    appendText(stream.text.slice(cursor, marker.start));

    const markerIsQuestion = shouldTreatMarkerAsQuestion(marker, currentQuestion);

    if (markerIsQuestion) {
      flushQuestion();

      const context = findSegmentContext(stream.segments, marker.start, defaultSubject);
      currentQuestion = {
        questionNumber: marker.value,
        subject: context.subject,
        category: context.category,
        content: '',
        choices: [],
        pageNumber: context.pageNumber,
        parseWarnings: [],
        activeChoiceIndex: null,
      };
    } else if (currentQuestion && marker.value >= 1 && marker.value <= 5) {
      currentQuestion.activeChoiceIndex = marker.value - 1;
      currentQuestion.choices[currentQuestion.activeChoiceIndex] =
        currentQuestion.choices[currentQuestion.activeChoiceIndex] ?? '';
    }

    cursor = marker.end;
  }

  appendText(stream.text.slice(cursor));
  flushQuestion();

  return {
    questions: questions.sort((left, right) => left.questionNumber - right.questionNumber),
    warnings,
  };
}

export function parsePdfAnswerPages(pages: PdfParserPageText[]): ParsedPdfAnswerResult {
  const answers = new Map<number, ParsedPdfAnswer>();
  const warnings: string[] = [];
  const text = replaceCircledNumbers(pages.flatMap((page) => page.lines).join(' ')).replace(/\s+/g, ' ').trim();
  let currentSubject: string | null = null;
  let matchedStructuredRows = 0;

  const structuredPattern =
    /(?:^|\s)(?:(?:\d+\s*)?교시\s+|\d+\s+)?([가-힣A-Za-z][가-힣A-Za-z0-9·ㆍ/()\- ]{1,50}?)\s+(\d{1,3})\s+([1-5])(?:\s*\(\s*[1-5]\s*\))?(?=\s|$)/g;
  let structuredMatch: RegExpExecArray | null;

  while ((structuredMatch = structuredPattern.exec(text)) !== null) {
    const subject = cleanAnswerSubject(structuredMatch[1]);
    const questionNumber = Number(structuredMatch[2]);
    const answerNumber = Number(structuredMatch[3]);

    if (!subject || !isValidQuestionAnswerPair(questionNumber, answerNumber)) continue;

    currentSubject = subject;
    matchedStructuredRows += 1;
    answers.set(questionNumber, {
      answerIndex: answerNumber - 1,
      subject,
    });
  }

  for (const pair of parseLooseAnswerPairs(text)) {
    const current = answers.get(pair.questionNumber);

    if (current && current.answerIndex !== pair.answerNumber - 1) {
      warnings.push(`${pair.questionNumber}번 정답이 서로 다르게 추출되었습니다.`);
    }

    answers.set(pair.questionNumber, {
      answerIndex: pair.answerNumber - 1,
      subject: current?.subject ?? currentSubject,
    });
  }

  if (answers.size === 0) {
    const explicitPairs = parseExplicitAnswerPairs(text);
    for (const pair of explicitPairs) {
      answers.set(pair.questionNumber, {
        answerIndex: pair.answerNumber - 1,
        subject: currentSubject,
      });
    }

    if (explicitPairs.length === 0) {
      const numericPairs = parseNumericAnswerPairs(text);
      for (const pair of numericPairs) {
        answers.set(pair.questionNumber, {
          answerIndex: pair.answerNumber - 1,
          subject: currentSubject,
        });
      }
    }
  }

  const sortedNumbers = [...answers.keys()].sort((left, right) => left - right);
  for (let index = 1; index < sortedNumbers.length; index += 1) {
    if (sortedNumbers[index] !== sortedNumbers[index - 1] + 1) {
      warnings.push(`${sortedNumbers[index - 1]}번 다음 ${sortedNumbers[index]}번 정답으로 이어집니다.`);
    }
  }

  return { answers, warnings };
}

function buildQuestionTextStream(pages: PdfParserPageText[], defaultSubject: string) {
  const parts: string[] = [];
  const segments: TextSegment[] = [];
  let currentSubject = defaultSubject;
  let currentCategory: string | null = null;
  let cursor = 0;

  for (const page of pages) {
    for (const line of page.lines) {
      const section = parseSectionLine(line);

      if (section) {
        currentSubject = section.subject;
        currentCategory = section.category;
        continue;
      }

      const text = cleanText(line);
      if (!text) continue;

      if (parts.length > 0) {
        parts.push(' ');
        cursor += 1;
      }

      const start = cursor;
      parts.push(text);
      cursor += text.length;
      segments.push({
        start,
        end: cursor,
        pageNumber: page.pageNumber,
        subject: currentSubject,
        category: currentCategory,
      });
    }
  }

  return { text: parts.join(''), segments };
}

function tokenizeQuestionAndChoiceMarkers(text: string): MarkerToken[] {
  const markers: MarkerToken[] = [];
  const numberedPattern = /(^|\s)(문제\s*)?(\d{1,3})[\).．]\s*/g;
  let numberedMatch: RegExpExecArray | null;

  while ((numberedMatch = numberedPattern.exec(text)) !== null) {
    const leading = numberedMatch[1] ?? '';
    const markerStart = numberedMatch.index + leading.length;
    const markerEnd = numberedPattern.lastIndex;
    const nextChar = text[markerEnd] ?? '';

    if (/\d/.test(nextChar)) continue;

    markers.push({
      start: markerStart,
      end: markerEnd,
      value: Number(numberedMatch[3]),
      kind: 'question-or-numbered-choice',
      hasQuestionWord: Boolean(numberedMatch[2]),
    });
  }

  for (const match of text.matchAll(/[①②③④⑤]/g)) {
    const index = match.index ?? 0;
    markers.push({
      start: index,
      end: index + match[0].length,
      value: CIRCLED_CHOICE_MAP.get(match[0]) ?? 0,
      kind: 'circled-choice',
      hasQuestionWord: false,
    });
  }

  return markers.sort((left, right) => left.start - right.start || markerPriority(left) - markerPriority(right));
}

function markerPriority(marker: MarkerToken): number {
  return marker.kind === 'circled-choice' ? 0 : 1;
}

function shouldTreatMarkerAsQuestion(marker: MarkerToken, currentQuestion: MutableQuestion | null): boolean {
  if (marker.kind === 'circled-choice') return false;
  if (marker.hasQuestionWord) return true;
  if (!currentQuestion) return true;
  if (marker.value > 5) return true;

  const filledChoices = currentQuestion.choices.filter((choice) => cleanText(choice)).length;
  return marker.value === currentQuestion.questionNumber + 1 && filledChoices >= 5;
}

function findSegmentContext(segments: TextSegment[], index: number, defaultSubject: string) {
  const exact = segments.find((segment) => index >= segment.start && index <= segment.end);

  if (exact) {
    return exact;
  }

  for (let segmentIndex = segments.length - 1; segmentIndex >= 0; segmentIndex -= 1) {
    if (segments[segmentIndex].start <= index) {
      return segments[segmentIndex];
    }
  }

  return {
    start: 0,
    end: 0,
    pageNumber: 1,
    subject: defaultSubject,
    category: null,
  };
}

function parseSectionLine(line: string): { subject: string; category: string | null } | null {
  const explicit = line.match(/^(?:과목|섹션|영역|분류)\s*[:：]\s*(.+)$/);

  if (explicit) {
    return { subject: cleanText(explicit[1]), category: null };
  }

  const bracket = line.match(/^\[([^\]]{2,60})\]$/);

  if (bracket) {
    return { subject: cleanText(bracket[1]), category: null };
  }

  return null;
}

function parseLooseAnswerPairs(text: string): Array<{ questionNumber: number; answerNumber: number }> {
  const pairs: Array<{ questionNumber: number; answerNumber: number }> = [];
  const pairPattern = /(?:^|\s)(\d{1,3})\s+([1-5])\s*(?:\(\s*[1-5]\s*\))?(?=\s|$)/g;
  let match: RegExpExecArray | null;

  while ((match = pairPattern.exec(text)) !== null) {
    const questionNumber = Number(match[1]);
    const answerNumber = Number(match[2]);

    if (isValidQuestionAnswerPair(questionNumber, answerNumber)) {
      pairs.push({ questionNumber, answerNumber });
    }
  }

  return pairs;
}

function parseExplicitAnswerPairs(text: string): Array<{ questionNumber: number; answerNumber: number }> {
  const pairs: Array<{ questionNumber: number; answerNumber: number }> = [];
  const explicitPattern =
    /(?:^|\s)(\d{1,3})\s*(?:번)?\s*(?:정답|답|answer)\s*[:：]?\s*([1-5])(?:번)?(?=\s|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = explicitPattern.exec(text)) !== null) {
    const questionNumber = Number(match[1]);
    const answerNumber = Number(match[2]);

    if (isValidQuestionAnswerPair(questionNumber, answerNumber)) {
      pairs.push({ questionNumber, answerNumber });
    }
  }

  return pairs;
}

function parseNumericAnswerPairs(text: string): Array<{ questionNumber: number; answerNumber: number }> {
  const pairs: Array<{ questionNumber: number; answerNumber: number }> = [];
  const numericTokens = text.match(/\d{1,3}/g)?.map(Number) ?? [];

  for (let index = 0; index < numericTokens.length - 1; index += 2) {
    const questionNumber = numericTokens[index];
    const answerNumber = numericTokens[index + 1];

    if (isValidQuestionAnswerPair(questionNumber, answerNumber)) {
      pairs.push({ questionNumber, answerNumber });
    }
  }

  return pairs;
}

function cleanAnswerSubject(value: string): string | null {
  const subject = cleanText(value)
    .replace(/^(?:\d+\s*)?교시\s+/, '')
    .replace(/^(?:과목|영역|분류)\s*[:：]?\s*/, '')
    .replace(/\b(?:문제번호|문항번호|최종답안|정답|답안|번호)\b/g, '')
    .trim();

  if (!subject || subject.length > 60) return null;
  if (!/[가-힣A-Za-z]/.test(subject)) return null;
  if (/^(?:교시|과목|문제번호|문항번호|최종답안|정답|답안|번호)$/i.test(subject)) return null;

  return subject;
}

function isValidQuestionAnswerPair(questionNumber: number, answerNumber: number): boolean {
  return questionNumber >= 1 && questionNumber <= 300 && answerNumber >= 1 && answerNumber <= 5;
}

function replaceCircledNumbers(value: string): string {
  return value.replace(/[①②③④⑤]/g, (matched) => String(CIRCLED_CHOICE_MAP.get(matched) ?? matched));
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
