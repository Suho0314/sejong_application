import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { execFile } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { ConfirmPdfQuestionDraftDto, ConfirmPdfQuestionImportDto } from './dto/confirm-pdf-question-import.dto';
import { PreviewPdfQuestionImportDto } from './dto/preview-pdf-question-import.dto';
import {
  parsePdfAnswerPages,
  parsePdfQuestionPages,
  ParsedPdfAnswer,
  ParsedPdfQuestion,
} from './question-pdf-parser';
import { QuestionPdfAiAssistService } from './question-pdf-ai-assist.service';
import { QuestionsService } from './questions.service';

const execFileAsync = promisify(execFile);

type UploadedPdfFile = {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
  size: number;
};

type PdfPageText = {
  pageNumber: number;
  lines: string[];
};

type PopplerWord = {
  text: string;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
};

type PopplerPage = {
  pageNumber: number;
  width: number;
  height: number;
  words: PopplerWord[];
};

export type PdfImportPreviewStatus = 'ready' | 'needs_review' | 'invalid';

type ParsedQuestion = ParsedPdfQuestion;

type ParsedAnswer = ParsedPdfAnswer;

export type PdfImportPreviewItem = ParsedQuestion & {
  correctAnswerIndex: number | null;
  answerNumber: number | null;
  status: PdfImportPreviewStatus;
  reasons: string[];
};

const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const DEFAULT_SUBJECT = 'PDF 가져오기';
const DEFAULT_DIFFICULTY = 'medium' as const;
const IMAGE_HINT_PATTERN = /(그림|도표|표\s*\d*|사진|자료|이미지|위\s*자료|아래\s*자료|다음\s*그림|다음\s*표)/;
const CIRCLED_CHOICE_MAP = new Map([
  ['①', 1],
  ['②', 2],
  ['③', 3],
  ['④', 4],
  ['⑤', 5],
]);

@Injectable()
export class QuestionPdfImportService {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly aiAssistService: QuestionPdfAiAssistService,
  ) {}

  async preview(
    questionPdf?: UploadedPdfFile,
    answerPdf?: UploadedPdfFile,
    options: PreviewPdfQuestionImportDto = {},
  ) {
    this.assertPdfFile(questionPdf, '문제지 PDF');
    this.assertPdfFile(answerPdf, '정답지 PDF');

    const questionPages = await this.extractPdfPages(questionPdf.buffer);
    const answerPages = await this.extractPdfPages(answerPdf.buffer);
    const questionParseResult = parsePdfQuestionPages(questionPages, DEFAULT_SUBJECT);
    const answerParseResult = parsePdfAnswerPages(answerPages);
    const parsedQuestions = questionParseResult.questions;
    const answersByNumber = answerParseResult.answers;
    const useAiAssist = this.isTruthyOption(options.useAiAssist);
    const aiAssistMode = options.aiAssistMode === 'review_only' ? 'review_only' : 'all';

    if (parsedQuestions.length === 0 && !useAiAssist) {
      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_QUESTION_PARSE_FAILED',
          message: '문제지에서 문항을 찾지 못했습니다. 텍스트 기반 PDF와 문항 번호 형식을 확인해주세요.',
          details: [],
        },
      });
    }

    if (parsedQuestions.length <= 1 && this.countQuestionStartCandidates(questionPages) > 1) {
      const boundaryWarning = '문항 경계를 안정적으로 분리하지 못했습니다. AI 보정 결과를 반드시 검토해주세요.';

      if (!useAiAssist) {
        throw new UnprocessableEntityException({
          error: {
            code: 'PDF_QUESTION_BOUNDARY_FAILED',
            message: '문항 경계를 안정적으로 분리하지 못했습니다. PDF 텍스트 레이아웃을 확인해주세요.',
            details: [],
          },
        });
      }

      questionParseResult.warnings.push(boundaryWarning);
    }

    let items = parsedQuestions.map((question) => this.toPreviewItem(question, answersByNumber));

    if (useAiAssist) {
      try {
        const aiAssistResult = await this.aiAssistService.assist({
          questionPages,
          answerPages,
          ruleItems: items,
          answerItems: this.toAnswerItems(answersByNumber),
          parserQuestionCount: parsedQuestions.length,
          parserWarnings: [...questionParseResult.warnings, ...answerParseResult.warnings],
          mode: aiAssistMode,
        });
        items = aiAssistResult.items;
        questionParseResult.warnings.push(...aiAssistResult.warnings);
      } catch (error) {
        if (items.length === 0) {
          throw error;
        }

        const fallbackWarning =
          'AI 보정 요청에 실패해 기본 PDF 파싱 결과를 검토 필요 상태로 표시합니다.';
        questionParseResult.warnings.push(fallbackWarning);
        items = items.map((item) =>
          item.status === 'invalid'
            ? item
            : {
                ...item,
                status: 'needs_review',
                reasons: item.reasons.includes(fallbackWarning)
                  ? item.reasons
                  : [...item.reasons, fallbackWarning],
              },
        );
      }
    }

    const extractedQuestionNumbers = new Set(items.map((question) => question.questionNumber));
    const unmatchedAnswerWarnings = [...answersByNumber.keys()]
      .filter((questionNumber) => !extractedQuestionNumbers.has(questionNumber))
      .sort((left, right) => left - right)
      .map((questionNumber) => `${questionNumber}번 정답은 있으나 문제지에서 해당 문항을 찾지 못했습니다.`);
    const parseWarnings = [
      ...questionParseResult.warnings,
      ...answerParseResult.warnings,
      ...unmatchedAnswerWarnings,
    ];

    return {
      data: {
        items,
        summary: {
          total: items.length,
          ready: items.filter((item) => item.status === 'ready').length,
          needsReview: items.filter((item) => item.status === 'needs_review').length,
          invalid: items.filter((item) => item.status === 'invalid').length,
          parseWarnings,
        },
      },
    };
  }

  async confirm(body: ConfirmPdfQuestionImportDto, createdBy?: string) {
    if (!createdBy) {
      throw new UnauthorizedException({
        error: {
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다.',
          details: [],
        },
      });
    }

    if (body.permissionConfirmed !== true) {
      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_IMPORT_PERMISSION_REQUIRED',
          message: '문제 사용 권한 확인이 필요합니다.',
          details: [],
        },
      });
    }

    const createdQuestions = [];

    for (const question of body.questions) {
      this.assertConfirmQuestion(question);

      const response = await this.questionsService.createQuestion(
        {
          subject: question.subject.trim(),
          category: question.category?.trim() || null,
          type: 'multiple_choice',
          content: question.content.trim(),
          choices: question.choices.map((choice) => choice.trim()),
          correctAnswerIndex: question.correctAnswerIndex,
          status: 'draft',
        },
        createdBy,
      );

      createdQuestions.push(response.data);
    }

    return {
      data: {
        createdCount: createdQuestions.length,
        questions: createdQuestions,
      },
    };
  }

  private toAnswerItems(answersByNumber: Map<number, ParsedAnswer>) {
    return [...answersByNumber.entries()]
      .map(([questionNumber, answer]) => ({
        questionNumber,
        answerNumber: answer.answerIndex + 1,
        subject: answer.subject,
      }))
      .sort((left, right) => left.questionNumber - right.questionNumber);
  }

  private isTruthyOption(value: unknown): boolean {
    return value === true || value === 'true' || value === '1' || value === 'on';
  }

  private assertPdfFile(file: UploadedPdfFile | undefined, label: string): asserts file is UploadedPdfFile {
    if (!file?.buffer) {
      throw new BadRequestException({
        error: {
          code: 'PDF_FILE_REQUIRED',
          message: `${label} 파일이 필요합니다.`,
          details: [],
        },
      });
    }

    if (file.mimetype !== 'application/pdf' && !file.originalname?.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_PDF_FILE_TYPE',
          message: `${label}는 PDF 파일만 업로드할 수 있습니다.`,
          details: [],
        },
      });
    }

    if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
      throw new BadRequestException({
        error: {
          code: 'PDF_FILE_TOO_LARGE',
          message: `${label}는 10MB 이하만 업로드할 수 있습니다.`,
          details: [],
        },
      });
    }

    if (!file.buffer.subarray(0, 5).toString('latin1').startsWith('%PDF')) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_PDF_CONTENT',
          message: `${label} 파일 내용을 PDF로 인식하지 못했습니다.`,
          details: [],
        },
      });
    }
  }

  private assertConfirmQuestion(question: ConfirmPdfQuestionDraftDto): void {
    const choices = question.choices.map((choice) => choice.trim()).filter(Boolean);

    if (!question.content.trim() || choices.length !== 5) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_PDF_IMPORT_QUESTION',
          message: '생성할 문제의 본문과 보기 5개를 확인해주세요.',
          details: [],
        },
      });
    }

    if (question.correctAnswerIndex < 0 || question.correctAnswerIndex >= 5) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_PDF_IMPORT_ANSWER',
          message: '정답 번호가 보기 범위를 벗어났습니다.',
          details: [],
        },
      });
    }
  }

  private async extractPdfPages(buffer: Buffer): Promise<PdfPageText[]> {
    const tempDir = await mkdtemp(join(tmpdir(), 'sejong-pdf-import-'));
    const inputPath = join(tempDir, 'upload.pdf');
    const outputPath = join(tempDir, 'layout.html');

    try {
      await writeFile(inputPath, buffer);
      await execFileAsync('pdftotext', ['-bbox-layout', '-enc', 'UTF-8', inputPath, outputPath], {
        timeout: 30000,
        maxBuffer: 20 * 1024 * 1024,
      });

      const layoutHtml = await readFile(outputPath, 'utf8');
      const pages = this.parsePopplerBboxLayout(layoutHtml).map((page) => ({
        pageNumber: page.pageNumber,
        lines: this.rebuildLinesFromPopplerWords(page),
      }));

      return pages;
    } catch (error) {
      if (this.isKnownHttpException(error)) {
        throw error;
      }

      const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';

      if (code === 'ENOENT') {
        throw new InternalServerErrorException({
          error: {
            code: 'PDF_TEXT_EXTRACTOR_NOT_INSTALLED',
            message: '서버에 pdftotext(Poppler)가 설치되어 있지 않습니다. 배포 환경에 poppler-utils를 설치해주세요.',
            details: [],
          },
        });
      }

      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_TEXT_EXTRACTION_FAILED',
          message: 'PDF 텍스트 추출에 실패했습니다. 텍스트 기반 PDF인지 확인해주세요.',
          details: [],
        },
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private parsePopplerBboxLayout(layoutHtml: string): PopplerPage[] {
    const pages: PopplerPage[] = [];
    const pagePattern = /<page\b([^>]*)>([\s\S]*?)<\/page>/gi;
    let pageMatch: RegExpExecArray | null;

    while ((pageMatch = pagePattern.exec(layoutHtml)) !== null) {
      const attributes = pageMatch[1];
      const pageBody = pageMatch[2];
      const pageNumber = pages.length + 1;
      const width = this.parseNumberAttribute(attributes, 'width') ?? 0;
      const height = this.parseNumberAttribute(attributes, 'height') ?? 0;
      const words = this.parsePopplerWords(pageBody);

      pages.push({ pageNumber, width, height, words });
    }

    if (pages.length === 0 || pages.every((page) => page.words.length === 0)) {
      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_TEXT_EXTRACTION_FAILED',
          message: 'PDF에서 텍스트를 추출하지 못했습니다. 텍스트 기반 PDF인지 확인해주세요.',
          details: [],
        },
      });
    }

    return pages;
  }

  private parsePopplerWords(pageBody: string): PopplerWord[] {
    const words: PopplerWord[] = [];
    const wordPattern = /<word\b([^>]*)>([\s\S]*?)<\/word>/gi;
    let match: RegExpExecArray | null;

    while ((match = wordPattern.exec(pageBody)) !== null) {
      const attributes = match[1];
      const text = this.normalizePdfText(this.decodeXmlEntities(match[2]));
      const xMin = this.parseNumberAttribute(attributes, 'xMin');
      const yMin = this.parseNumberAttribute(attributes, 'yMin');
      const xMax = this.parseNumberAttribute(attributes, 'xMax');
      const yMax = this.parseNumberAttribute(attributes, 'yMax');

      if (!text || xMin === null || yMin === null || xMax === null || yMax === null) continue;

      words.push({ text, xMin, yMin, xMax, yMax });
    }

    return words;
  }

  private parseNumberAttribute(attributes: string, name: string): number | null {
    const match = attributes.match(new RegExp(`${name}="([^"]+)"`, 'i'));

    if (!match) return null;

    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
  }

  private decodeXmlEntities(value: string): string {
    return value
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
      .replace(/&amp;/g, '&');
  }

  private rebuildLinesFromPopplerWords(page: PopplerPage): string[] {
    const rows = this.groupWordsIntoRows(page.words);
    const singleColumnLines = this.rowsToSingleColumnLines(rows, page);
    let best = {
      columnCount: 1,
      lines: singleColumnLines,
      questionStarts: this.countQuestionStartCandidates([{ pageNumber: page.pageNumber, lines: singleColumnLines }]),
    };

    for (const columnCount of [2, 3, 4]) {
      const lines = this.rowsToColumnLines(rows, page, columnCount);
      const questionStarts = this.countQuestionStartCandidates([{ pageNumber: page.pageNumber, lines }]);

      if (
        lines.length >= 6 &&
        questionStarts > best.questionStarts &&
        this.hasUsableColumns(rows, page, columnCount)
      ) {
        best = { columnCount, lines, questionStarts };
      }
    }

    return best.lines;
  }

  private groupWordsIntoRows(words: PopplerWord[]): Array<{ y: number; yMin: number; yMax: number; words: PopplerWord[] }> {
    const rows: Array<{ y: number; yMin: number; yMax: number; words: PopplerWord[] }> = [];
    const sortedWords = [...words].sort((left, right) => left.yMin - right.yMin || left.xMin - right.xMin);
    const yTolerance = 4;

    for (const word of sortedWords) {
      const centerY = (word.yMin + word.yMax) / 2;
      let row = rows.find((candidate) => Math.abs(candidate.y - centerY) <= yTolerance);

      if (!row) {
        row = { y: centerY, yMin: word.yMin, yMax: word.yMax, words: [] };
        rows.push(row);
      }

      row.y = (row.y * row.words.length + centerY) / (row.words.length + 1);
      row.yMin = Math.min(row.yMin, word.yMin);
      row.yMax = Math.max(row.yMax, word.yMax);
      row.words.push(word);
    }

    return rows.sort((left, right) => left.y - right.y);
  }

  private rowsToSingleColumnLines(
    rows: Array<{ y: number; yMin: number; yMax: number; words: PopplerWord[] }>,
    page: PopplerPage,
  ): string[] {
    return rows
      .map((row) => ({ ...row, text: this.wordsToLine(row.words) }))
      .filter((row) => !this.isHeaderFooterLine(row.text, page, row.yMin, row.yMax))
      .flatMap((row) => this.expandLogicalLines(row.text))
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private rowsToColumnLines(
    rows: Array<{ y: number; yMin: number; yMax: number; words: PopplerWord[] }>,
    page: PopplerPage,
    columnCount: number,
  ): string[] {
    const width = page.width > 0 ? page.width : this.estimatePageWidth(rows);
    const columnLines = Array.from({ length: columnCount }, () => [] as Array<{ y: number; text: string }>);

    for (const row of rows) {
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        const minX = (width / columnCount) * columnIndex;
        const maxX = (width / columnCount) * (columnIndex + 1);
        const columnWords = row.words.filter((word) => {
          const centerX = (word.xMin + word.xMax) / 2;
          return centerX >= minX && (columnIndex === columnCount - 1 ? centerX <= maxX : centerX < maxX);
        });
        const text = this.wordsToLine(columnWords);

        if (text && !this.isHeaderFooterLine(text, page, row.yMin, row.yMax)) {
          columnLines[columnIndex].push({ y: row.y, text });
        }
      }
    }

    return columnLines
      .flatMap((lines) => lines.sort((left, right) => left.y - right.y))
      .flatMap((line) => this.expandLogicalLines(line.text))
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private wordsToLine(words: PopplerWord[]): string {
    return words
      .sort((left, right) => left.xMin - right.xMin)
      .map((word) => word.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private estimatePageWidth(rows: Array<{ words: PopplerWord[] }>): number {
    const xMaxValues = rows.flatMap((row) => row.words).map((word) => word.xMax);
    return xMaxValues.length > 0 ? Math.max(...xMaxValues) : 0;
  }

  private hasUsableColumns(
    rows: Array<{ words: PopplerWord[] }>,
    page: PopplerPage,
    columnCount: number,
  ): boolean {
    const width = page.width > 0 ? page.width : this.estimatePageWidth(rows);
    const rowCounts = Array.from({ length: columnCount }, () => 0);

    for (const row of rows) {
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
        const minX = (width / columnCount) * columnIndex;
        const maxX = (width / columnCount) * (columnIndex + 1);

        if (
          row.words.some((word) => {
            const centerX = (word.xMin + word.xMax) / 2;
            return centerX >= minX && (columnIndex === columnCount - 1 ? centerX <= maxX : centerX < maxX);
          })
        ) {
          rowCounts[columnIndex] += 1;
        }
      }
    }

    return rowCounts.every((count) => count >= 3);
  }

  private isHeaderFooterLine(text: string, page: PopplerPage, yMin: number, yMax: number): boolean {
    const normalized = text.trim();

    if (!normalized) return true;

    const nearTop = page.height > 0 && yMin < page.height * 0.06;
    const nearBottom = page.height > 0 && yMax > page.height * 0.94;

    if ((nearTop || nearBottom) && /^-?\s*\d+\s*-?$/.test(normalized)) return true;
    if ((nearTop || nearBottom) && /^(?:페이지|page)\s*\d+/i.test(normalized)) return true;

    return false;
  }

  private isKnownHttpException(error: unknown): boolean {
    return (
      error instanceof BadRequestException ||
      error instanceof InternalServerErrorException ||
      error instanceof UnprocessableEntityException
    );
  }

  private normalizePdfText(text: string): string {
    return text
      .replace(/\u0000/g, '')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  private expandLogicalLines(line: string): string[] {
    return line
      .replace(/\s+(?=[①②③④⑤])/g, '\n')
      .replace(/\s+(?=[1-5][\).．]\s)/g, '\n')
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  private parseQuestions(pages: PdfPageText[]): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];
    let currentQuestion: ParsedQuestion | null = null;
    let currentSubject = DEFAULT_SUBJECT;
    let currentCategory: string | null = null;

    const flushQuestion = () => {
      if (!currentQuestion) return;

      currentQuestion.content = this.cleanText(currentQuestion.content);
      currentQuestion.choices = currentQuestion.choices.map((choice) => this.cleanText(choice)).filter(Boolean);

      if (!questions.some((question) => question.questionNumber === currentQuestion?.questionNumber)) {
        questions.push(currentQuestion);
      }

      currentQuestion = null;
    };

    for (const page of pages) {
      for (const line of page.lines) {
        const section = this.parseSectionLine(line);

        if (section) {
          currentSubject = section.subject;
          currentCategory = section.category;
          continue;
        }

        const questionStart = this.parseQuestionStart(line, currentQuestion);

        if (questionStart) {
          flushQuestion();
          currentQuestion = {
            questionNumber: questionStart.questionNumber,
            subject: currentSubject,
            category: currentCategory,
            content: questionStart.content,
            choices: [],
            pageNumber: page.pageNumber,
          };
          continue;
        }

        if (!currentQuestion) continue;

        const choice = this.parseChoiceLine(line);

        if (choice) {
          const existing = currentQuestion.choices[choice.index - 1] ?? '';
          currentQuestion.choices[choice.index - 1] = existing
            ? `${existing} ${choice.text}`
            : choice.text;
          continue;
        }

        const lastChoiceIndex = this.findLastChoiceIndex(currentQuestion.choices);

        if (lastChoiceIndex >= 0 && !this.looksLikeQuestionContinuation(line)) {
          currentQuestion.choices[lastChoiceIndex] = `${currentQuestion.choices[lastChoiceIndex]} ${line}`;
          continue;
        }

        currentQuestion.content = `${currentQuestion.content} ${line}`;
      }
    }

    flushQuestion();

    return questions.sort((left, right) => left.questionNumber - right.questionNumber);
  }

  private parseSectionLine(line: string): { subject: string; category: string | null } | null {
    const explicit = line.match(/^(?:과목|섹션|영역|분류)\s*[:：]\s*(.+)$/);

    if (explicit) {
      return { subject: this.cleanText(explicit[1]), category: null };
    }

    const bracket = line.match(/^\[([^\]]{2,60})\]$/);

    if (bracket) {
      return { subject: this.cleanText(bracket[1]), category: null };
    }

    return null;
  }

  private parseQuestionStart(
    line: string,
    currentQuestion: ParsedQuestion | null,
  ): { questionNumber: number; content: string } | null {
    const match = line.match(/^(?:문제\s*)?(\d{1,3})[\).．]\s*(.*)$/);

    if (!match) return null;

    const questionNumber = Number(match[1]);
    const startsWithQuestionWord = /^문제\s*/.test(line);
    const isClearlyQuestionNumber = questionNumber > 5;
    const followsCurrentQuestion =
      currentQuestion !== null &&
      questionNumber === currentQuestion.questionNumber + 1 &&
      currentQuestion.choices.filter(Boolean).length >= 2;

    if (!currentQuestion || startsWithQuestionWord || isClearlyQuestionNumber || followsCurrentQuestion) {
      return { questionNumber, content: match[2].trim() };
    }

    return null;
  }

  private parseChoiceLine(line: string): { index: number; text: string } | null {
    const circled = CIRCLED_CHOICE_MAP.get(line[0]);

    if (circled) {
      return { index: circled, text: line.slice(1).trim() };
    }

    const numbered = line.match(/^([1-5])[\).．]\s*(.+)$/);

    if (!numbered) return null;

    return { index: Number(numbered[1]), text: numbered[2].trim() };
  }

  private findLastChoiceIndex(choices: string[]): number {
    for (let index = choices.length - 1; index >= 0; index -= 1) {
      if (choices[index]) return index;
    }

    return -1;
  }

  private looksLikeQuestionContinuation(line: string): boolean {
    return /^(?:다음|아래|위|보기|자료|그림|표)\b/.test(line);
  }

  private parseAnswers(pages: PdfPageText[]): Map<number, ParsedAnswer> {
    const answers = new Map<number, ParsedAnswer>();
    const lines = pages.flatMap((page) => page.lines);
    let currentSubject: string | null = null;

    for (const line of lines) {
      const normalized = this.replaceCircledNumbers(line);
      const structuredRows = this.parseStructuredAnswerRows(normalized);

      if (structuredRows.length > 0) {
        for (const row of structuredRows) {
          if (row.subject) {
            currentSubject = row.subject;
          }

          answers.set(row.questionNumber, {
            answerIndex: row.answerNumber - 1,
            subject: row.subject ?? currentSubject,
          });
        }

        continue;
      }

      const explicitSubject = this.parseAnswerSubjectLine(normalized);

      if (explicitSubject) {
        currentSubject = explicitSubject;
      }

      const explicitPairs = this.parseExplicitAnswerPairs(normalized);

      for (const pair of explicitPairs) {
        answers.set(pair.questionNumber, {
          answerIndex: pair.answerNumber - 1,
          subject: currentSubject,
        });
      }

      if (explicitPairs.length > 0) {
        continue;
      }

      const numericPairs = this.parseNumericAnswerPairs(normalized);

      for (const pair of numericPairs) {
        answers.set(pair.questionNumber, {
          answerIndex: pair.answerNumber - 1,
          subject: currentSubject,
        });
      }
    }

    return answers;
  }

  private parseStructuredAnswerRows(
    line: string,
  ): Array<{ questionNumber: number; answerNumber: number; subject: string | null }> {
    const rows: Array<{ questionNumber: number; answerNumber: number; subject: string | null }> = [];
    const normalized = line.replace(/[|│]/g, ' ').replace(/\s+/g, ' ').trim();
    const rowPattern =
      /(?:^|\s)(?:(?:\d+\s*)?교시\s+|\d+\s+)?([가-힣A-Za-z][가-힣A-Za-z0-9·ㆍ/()\- ]{1,50}?)\s+(\d{1,3})\s+([1-5])(?=\s|$)/g;
    let match: RegExpExecArray | null;

    while ((match = rowPattern.exec(normalized)) !== null) {
      const subject = this.cleanAnswerSubject(match[1]);
      const questionNumber = Number(match[2]);
      const answerNumber = Number(match[3]);

      if (!subject || !this.isValidQuestionAnswerPair(questionNumber, answerNumber)) continue;

      rows.push({ questionNumber, answerNumber, subject });
    }

    return rows;
  }

  private parseAnswerSubjectLine(line: string): string | null {
    const explicit = line.match(/(?:과목|영역|분류)\s*[:：]\s*([가-힣A-Za-z][가-힣A-Za-z0-9·ㆍ/()\- ]{1,50})/);

    if (explicit) {
      return this.cleanAnswerSubject(explicit[1]);
    }

    const periodSubject = line.match(/^(?:(?:\d+\s*)?교시\s+)([가-힣A-Za-z][가-힣A-Za-z0-9·ㆍ/()\- ]{1,50})$/);

    if (periodSubject) {
      return this.cleanAnswerSubject(periodSubject[1]);
    }

    if (!/\d/.test(line)) {
      return this.cleanAnswerSubject(line);
    }

    return null;
  }

  private parseExplicitAnswerPairs(line: string): Array<{ questionNumber: number; answerNumber: number }> {
    const pairs: Array<{ questionNumber: number; answerNumber: number }> = [];
    const explicitPattern =
      /(?:^|\s)(\d{1,3})\s*(?:번)?\s*(?:정답|답|answer)\s*[:：]?\s*([1-5])(?:번)?(?=\s|$)/gi;
    let match: RegExpExecArray | null;

    while ((match = explicitPattern.exec(line)) !== null) {
      const questionNumber = Number(match[1]);
      const answerNumber = Number(match[2]);

      if (this.isValidQuestionAnswerPair(questionNumber, answerNumber)) {
        pairs.push({ questionNumber, answerNumber });
      }
    }

    return pairs;
  }

  private parseNumericAnswerPairs(line: string): Array<{ questionNumber: number; answerNumber: number }> {
    const pairs: Array<{ questionNumber: number; answerNumber: number }> = [];
    const numericTokens = line.match(/\d{1,3}/g)?.map(Number) ?? [];

    if (numericTokens.length < 2) return pairs;

    for (let index = 0; index < numericTokens.length - 1; index += 2) {
      const questionNumber = numericTokens[index];
      const answerNumber = numericTokens[index + 1];

      if (this.isValidQuestionAnswerPair(questionNumber, answerNumber)) {
        pairs.push({ questionNumber, answerNumber });
      }
    }

    return pairs;
  }

  private cleanAnswerSubject(value: string): string | null {
    const subject = this.cleanText(value)
      .replace(/^(?:\d+\s*)?교시\s+/, '')
      .replace(/^(?:과목|영역|분류)\s*[:：]?\s*/, '')
      .replace(/\b(?:문제번호|문항번호|최종답안|정답|답안|번호)\b/g, '')
      .trim();

    if (!subject || subject.length > 60) return null;
    if (!/[가-힣A-Za-z]/.test(subject)) return null;
    if (/^(?:교시|과목|문제번호|문항번호|최종답안|정답|답안|번호)$/i.test(subject)) return null;

    return subject;
  }

  private isValidQuestionAnswerPair(questionNumber: number, answerNumber: number): boolean {
    return questionNumber >= 1 && questionNumber <= 300 && answerNumber >= 1 && answerNumber <= 5;
  }

  private replaceCircledNumbers(value: string): string {
    return value.replace(/[①②③④⑤]/g, (matched) => String(CIRCLED_CHOICE_MAP.get(matched) ?? matched));
  }

  private countQuestionStartCandidates(pages: PdfPageText[]): number {
    return pages
      .flatMap((page) => page.lines)
      .filter((line) => /^(?:문제\s*)?\d{1,3}[\).．](?:\s+|$)/.test(line))
      .length;
  }

  private resolvePreviewSubject(question: ParsedQuestion, answer: ParsedAnswer | undefined): string {
    const answerSubject = answer?.subject?.trim();

    if (answerSubject) {
      return answerSubject;
    }

    if (question.subject.trim()) {
      return question.subject.trim();
    }

    return DEFAULT_SUBJECT;
  }

  private shouldShowSubjectReviewReason(question: ParsedQuestion, answer: ParsedAnswer | undefined): boolean {
    if (answer?.subject?.trim()) {
      return false;
    }

    return !question.subject.trim() || question.subject.trim() === DEFAULT_SUBJECT;
  }

  private toPreviewItem(question: ParsedQuestion, answersByNumber: Map<number, ParsedAnswer>): PdfImportPreviewItem {
    const reasons: string[] = [];
    const answer = answersByNumber.get(question.questionNumber);
    const answerNumber = answer ? answer.answerIndex + 1 : null;
    const subject = this.resolvePreviewSubject(question, answer);
    const choices = question.choices.filter(Boolean);
    const content = this.cleanText(question.content);
    const combinedText = [content, ...choices].join(' ');

    for (const warning of question.parseWarnings ?? []) {
      reasons.push(warning);
    }

    if (!content) {
      reasons.push('문제 본문을 추출하지 못했습니다.');
    }

    if (content.length > 0 && content.length < 8) {
      reasons.push('문제 본문이 비정상적으로 짧습니다.');
    }

    if (choices.length !== 5) {
      reasons.push('보기가 5개가 아닙니다.');
    }

    if (!answerNumber) {
      reasons.push('정답지에서 정답을 찾지 못했습니다.');
    }

    if (answerNumber && answerNumber > choices.length) {
      reasons.push('정답 번호가 보기 개수를 초과합니다.');
    }

    if (this.shouldShowSubjectReviewReason(question, answer)) {
      reasons.push('정답지 과목 정보를 찾지 못해 기본 과목으로 표시합니다.');
    }

    if (this.hasBrokenText(combinedText)) {
      reasons.push('깨진 문자 또는 비정상 인코딩이 감지되었습니다.');
    }

    if (IMAGE_HINT_PATTERN.test(content)) {
      reasons.push('그림·도표·자료형 문항일 수 있어 검토가 필요합니다.');
    }

    const invalid = reasons.some((reason) =>
      reason.includes('못했습니다') ||
      reason.includes('짧습니다') ||
      reason.includes('초과합니다') ||
      reason.includes('깨진 문자'),
    );

    return {
      ...question,
      subject,
      content,
      choices,
      correctAnswerIndex: answer ? answer.answerIndex : null,
      answerNumber,
      status: invalid ? 'invalid' : reasons.length > 0 ? 'needs_review' : 'ready',
      reasons,
    };
  }

  private hasBrokenText(value: string): boolean {
    if (!value) return true;

    const suspiciousCount = (value.match(/[�□■�]/g) ?? []).length;
    const visibleLength = value.replace(/\s/g, '').length;

    return suspiciousCount > 0 || (visibleLength > 0 && suspiciousCount / visibleLength > 0.02);
  }

  private cleanText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }
}
