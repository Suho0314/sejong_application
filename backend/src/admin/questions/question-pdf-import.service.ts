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

type ParsedQuestion = {
  questionNumber: number;
  subject: string;
  category: string | null;
  content: string;
  choices: string[];
  pageNumber: number;
};

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
  constructor(private readonly questionsService: QuestionsService) {}

  async preview(questionPdf?: UploadedPdfFile, answerPdf?: UploadedPdfFile) {
    this.assertPdfFile(questionPdf, '문제지 PDF');
    this.assertPdfFile(answerPdf, '정답지 PDF');

    const questionPages = await this.extractPdfPages(questionPdf.buffer);
    const answerPages = await this.extractPdfPages(answerPdf.buffer);
    const parsedQuestions = this.parseQuestions(questionPages);
    const answersByNumber = this.parseAnswers(answerPages);

    if (parsedQuestions.length === 0) {
      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_QUESTION_PARSE_FAILED',
          message: '문제지에서 문항을 찾지 못했습니다. 텍스트 기반 PDF와 문항 번호 형식을 확인해주세요.',
          details: [],
        },
      });
    }

    if (parsedQuestions.length <= 1 && this.countQuestionStartCandidates(questionPages) > 1) {
      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_QUESTION_BOUNDARY_FAILED',
          message: '문항 경계를 안정적으로 분리하지 못했습니다. PDF 텍스트 레이아웃을 확인해주세요.',
          details: [],
        },
      });
    }

    const items = parsedQuestions.map((question) => this.toPreviewItem(question, answersByNumber));

    return {
      data: {
        items,
        summary: {
          total: items.length,
          ready: items.filter((item) => item.status === 'ready').length,
          needsReview: items.filter((item) => item.status === 'needs_review').length,
          invalid: items.filter((item) => item.status === 'invalid').length,
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
          difficulty: question.difficulty ?? DEFAULT_DIFFICULTY,
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

    if (!question.content.trim() || choices.length < 2 || choices.length > 5) {
      throw new UnprocessableEntityException({
        error: {
          code: 'INVALID_PDF_IMPORT_QUESTION',
          message: '생성할 문제의 본문과 보기 2~5개를 확인해주세요.',
          details: [],
        },
      });
    }

    if (question.correctAnswerIndex < 0 || question.correctAnswerIndex >= choices.length) {
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
    const twoColumnLines = this.rowsToTwoColumnLines(rows, page);
    const twoColumnQuestionStarts = this.countQuestionStartCandidates([{ pageNumber: page.pageNumber, lines: twoColumnLines }]);
    const singleColumnQuestionStarts = this.countQuestionStartCandidates([
      { pageNumber: page.pageNumber, lines: singleColumnLines },
    ]);

    if (
      twoColumnLines.length >= 6 &&
      twoColumnQuestionStarts >= Math.max(2, singleColumnQuestionStarts) &&
      this.hasBalancedColumns(rows, page)
    ) {
      return twoColumnLines;
    }

    return singleColumnLines;
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

  private rowsToTwoColumnLines(
    rows: Array<{ y: number; yMin: number; yMax: number; words: PopplerWord[] }>,
    page: PopplerPage,
  ): string[] {
    const midpoint = page.width > 0 ? page.width / 2 : this.estimateMidpoint(rows);
    const leftLines: Array<{ y: number; text: string }> = [];
    const rightLines: Array<{ y: number; text: string }> = [];

    for (const row of rows) {
      const leftWords = row.words.filter((word) => (word.xMin + word.xMax) / 2 < midpoint);
      const rightWords = row.words.filter((word) => (word.xMin + word.xMax) / 2 >= midpoint);
      const leftText = this.wordsToLine(leftWords);
      const rightText = this.wordsToLine(rightWords);

      if (leftText && !this.isHeaderFooterLine(leftText, page, row.yMin, row.yMax)) {
        leftLines.push({ y: row.y, text: leftText });
      }

      if (rightText && !this.isHeaderFooterLine(rightText, page, row.yMin, row.yMax)) {
        rightLines.push({ y: row.y, text: rightText });
      }
    }

    return [...leftLines.sort((left, right) => left.y - right.y), ...rightLines.sort((left, right) => left.y - right.y)]
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

  private estimateMidpoint(rows: Array<{ words: PopplerWord[] }>): number {
    const centers = rows
      .flatMap((row) => row.words)
      .map((word) => (word.xMin + word.xMax) / 2)
      .sort((left, right) => left - right);

    if (centers.length === 0) return 0;

    return centers[Math.floor(centers.length / 2)];
  }

  private hasBalancedColumns(rows: Array<{ words: PopplerWord[] }>, page: PopplerPage): boolean {
    const midpoint = page.width > 0 ? page.width / 2 : this.estimateMidpoint(rows);
    let leftRows = 0;
    let rightRows = 0;

    for (const row of rows) {
      if (row.words.some((word) => (word.xMin + word.xMax) / 2 < midpoint)) leftRows += 1;
      if (row.words.some((word) => (word.xMin + word.xMax) / 2 >= midpoint)) rightRows += 1;
    }

    return leftRows >= 4 && rightRows >= 4 && Math.min(leftRows, rightRows) / Math.max(leftRows, rightRows) >= 0.25;
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

  private parseAnswers(pages: PdfPageText[]): Map<number, number> {
    const answers = new Map<number, number>();
    const lines = pages.flatMap((page) => page.lines);

    for (const line of lines) {
      const normalized = this.replaceCircledNumbers(line);
      const explicitPattern =
        /(?:^|\s)(\d{1,3})\s*(?:번)?\s*(?:정답|답|answer)?\s*[:：]?\s*([1-5])(?:번)?(?=\s|$)/gi;
      let match: RegExpExecArray | null;

      while ((match = explicitPattern.exec(normalized)) !== null) {
        answers.set(Number(match[1]), Number(match[2]));
      }

      const numericTokens = normalized.match(/\d{1,3}/g)?.map(Number) ?? [];

      if (numericTokens.length >= 2) {
        for (let index = 0; index < numericTokens.length - 1; index += 2) {
          const questionNumber = numericTokens[index];
          const answerNumber = numericTokens[index + 1];

          if (questionNumber >= 1 && questionNumber <= 300 && answerNumber >= 1 && answerNumber <= 5) {
            answers.set(questionNumber, answerNumber);
          }
        }
      }
    }

    return answers;
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

  private toPreviewItem(question: ParsedQuestion, answersByNumber: Map<number, number>): PdfImportPreviewItem {
    const reasons: string[] = [];
    const answerNumber = answersByNumber.get(question.questionNumber) ?? null;
    const choices = question.choices.filter(Boolean);
    const content = this.cleanText(question.content);
    const combinedText = [content, ...choices].join(' ');

    if (!content) {
      reasons.push('문제 본문을 추출하지 못했습니다.');
    }

    if (content.length > 0 && content.length < 8) {
      reasons.push('문제 본문이 비정상적으로 짧습니다.');
    }

    if (choices.length < 2) {
      reasons.push('보기가 2개 미만입니다.');
    }

    if (choices.length > 5) {
      reasons.push('보기가 5개를 초과합니다.');
    }

    if (!answerNumber) {
      reasons.push('정답지에서 정답을 찾지 못했습니다.');
    }

    if (answerNumber && answerNumber > choices.length) {
      reasons.push('정답 번호가 보기 개수를 초과합니다.');
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
      reason.includes('2개 미만') ||
      reason.includes('5개를 초과') ||
      reason.includes('초과합니다') ||
      reason.includes('깨진 문자'),
    );

    return {
      ...question,
      content,
      choices,
      correctAnswerIndex: answerNumber ? answerNumber - 1 : null,
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
