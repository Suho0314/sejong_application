import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as zlib from 'zlib';
import { ConfirmPdfQuestionImportDto, ConfirmPdfQuestionDraftDto } from './dto/confirm-pdf-question-import.dto';
import { QuestionsService } from './questions.service';

type UploadedPdfFile = {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
  size: number;
};

export type PdfImportPreviewStatus = 'ready' | 'needs_review' | 'invalid';

type ParsedQuestion = {
  questionNumber: number;
  subject: string;
  category: string | null;
  content: string;
  choices: string[];
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
const NUMBERED_CHOICE_PATTERN = /^([1-5])[\).．]?\s+(.+)$/;
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

  preview(questionPdf?: UploadedPdfFile, answerPdf?: UploadedPdfFile) {
    this.assertPdfFile(questionPdf, '문제지 PDF');
    this.assertPdfFile(answerPdf, '정답지 PDF');

    const questionText = this.extractPdfText(questionPdf.buffer);
    const answerText = this.extractPdfText(answerPdf.buffer);
    const parsedQuestions = this.parseQuestions(questionText);
    const answersByNumber = this.parseAnswers(answerText);

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

  private extractPdfText(buffer: Buffer): string {
    const source = buffer.toString('latin1');
    const chunks: string[] = [];
    const streamPattern = /(\d+\s+\d+\s+obj[\s\S]*?)stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;

    while ((match = streamPattern.exec(source)) !== null) {
      const [, objectHeader, rawStream] = match;
      const streamBuffer = Buffer.from(rawStream, 'latin1');
      const contentBuffer = objectHeader.includes('/FlateDecode')
        ? this.tryInflate(streamBuffer)
        : streamBuffer;
      const content = contentBuffer.toString('latin1');

      chunks.push(this.extractTextFromContentStream(content));
    }

    const text = chunks.join('\n').replace(/\u0000/g, '').trim();

    if (!text) {
      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_TEXT_EXTRACTION_FAILED',
          message: 'PDF에서 텍스트를 추출하지 못했습니다. 텍스트 기반 PDF인지 확인해주세요.',
          details: [],
        },
      });
    }

    return this.normalizeText(text);
  }

  private tryInflate(buffer: Buffer): Buffer {
    try {
      return zlib.inflateSync(buffer);
    } catch {
      try {
        return zlib.inflateRawSync(buffer);
      } catch {
        return buffer;
      }
    }
  }

  private extractTextFromContentStream(content: string): string {
    const textChunks: string[] = [];
    const textBlockPattern = /BT([\s\S]*?)ET/g;
    let blockMatch: RegExpExecArray | null;

    while ((blockMatch = textBlockPattern.exec(content)) !== null) {
      const block = blockMatch[1]
        .replace(/T\*/g, '\n')
        .replace(/\s'Tj/g, '\n')
        .replace(/\s"Tj/g, '\n');
      const stringPattern = /<([0-9A-Fa-f\s]+)>|\((?:\\.|[^\\)])*\)/g;
      let stringMatch: RegExpExecArray | null;

      while ((stringMatch = stringPattern.exec(block)) !== null) {
        const token = stringMatch[0];

        if (token.startsWith('<')) {
          textChunks.push(this.decodeHexString(stringMatch[1]));
          continue;
        }

        textChunks.push(this.decodeLiteralString(token.slice(1, -1)));
      }

      textChunks.push('\n');
    }

    return textChunks.join(' ');
  }

  private decodeLiteralString(value: string): string {
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\n')
      .replace(/\\t/g, ' ')
      .replace(/\\([()\\])/g, '$1')
      .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));
  }

  private decodeHexString(value: string): string {
    const normalized = value.replace(/\s/g, '');
    const evenHex = normalized.length % 2 === 0 ? normalized : `${normalized}0`;
    const bytes = Buffer.from(evenHex, 'hex');

    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
      const chars: string[] = [];

      for (let index = 2; index + 1 < bytes.length; index += 2) {
        chars.push(String.fromCharCode(bytes.readUInt16BE(index)));
      }

      return chars.join('');
    }

    return bytes.toString('utf8').replace(/\u0000/g, '');
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+([①②③④⑤])/g, '\n$1 ')
      .replace(/\s+(\d{1,3})[\).．]\s+/g, '\n$1. ')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  private parseQuestions(text: string): ParsedQuestion[] {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const questions: ParsedQuestion[] = [];
    let currentQuestion: ParsedQuestion | null = null;
    let currentSubject = DEFAULT_SUBJECT;
    let currentCategory: string | null = null;

    const flushQuestion = () => {
      if (!currentQuestion) return;

      currentQuestion.content = this.cleanText(currentQuestion.content);
      currentQuestion.choices = currentQuestion.choices.map((choice) => this.cleanText(choice)).filter(Boolean);
      questions.push(currentQuestion);
      currentQuestion = null;
    };

    for (const line of lines) {
      const section = this.parseSectionLine(line);

      if (section) {
        currentSubject = section.subject;
        currentCategory = section.category;
        continue;
      }

      const questionStart = line.match(/^(?:문제\s*)?(\d{1,3})[\).．]\s*(.+)$/);

      if (questionStart) {
        flushQuestion();
        currentQuestion = {
          questionNumber: Number(questionStart[1]),
          subject: currentSubject,
          category: currentCategory,
          content: questionStart[2],
          choices: [],
        };
        continue;
      }

      if (!currentQuestion) continue;

      const choice = this.parseChoiceLine(line);

      if (choice) {
        currentQuestion.choices[choice.index - 1] = choice.text;
        continue;
      }

      currentQuestion.content = `${currentQuestion.content} ${line}`;
    }

    flushQuestion();

    return questions;
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

  private parseChoiceLine(line: string): { index: number; text: string } | null {
    const circled = CIRCLED_CHOICE_MAP.get(line[0]);

    if (circled) {
      return { index: circled, text: line.slice(1).trim() };
    }

    const numbered = line.match(NUMBERED_CHOICE_PATTERN);

    if (!numbered) return null;

    return { index: Number(numbered[1]), text: numbered[2].trim() };
  }

  private parseAnswers(text: string): Map<number, number> {
    const answers = new Map<number, number>();
    const normalized = text.replace(/[①②③④⑤]/g, (value) => String(CIRCLED_CHOICE_MAP.get(value) ?? value));
    const answerPattern = /(?:^|\s)(\d{1,3})\s*(?:번|[.)．])?\s*(?:정답|답|answer)?\s*[:：]?\s*([1-5])(?=\s|$)/gi;
    let match: RegExpExecArray | null;

    while ((match = answerPattern.exec(normalized)) !== null) {
      answers.set(Number(match[1]), Number(match[2]));
    }

    return answers;
  }

  private toPreviewItem(question: ParsedQuestion, answersByNumber: Map<number, number>): PdfImportPreviewItem {
    const reasons: string[] = [];
    const answerNumber = answersByNumber.get(question.questionNumber) ?? null;
    const choices = question.choices.filter(Boolean);

    if (!question.content.trim()) {
      reasons.push('문제 본문을 추출하지 못했습니다.');
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

    if (IMAGE_HINT_PATTERN.test(question.content)) {
      reasons.push('그림·도표·자료형 문항일 수 있어 검토가 필요합니다.');
    }

    const invalid = reasons.some((reason) =>
      reason.includes('못했습니다') ||
      reason.includes('2개 미만') ||
      reason.includes('5개를 초과') ||
      reason.includes('초과합니다'),
    );

    return {
      ...question,
      choices,
      correctAnswerIndex: answerNumber ? answerNumber - 1 : null,
      answerNumber,
      status: invalid ? 'invalid' : reasons.length > 0 ? 'needs_review' : 'ready',
      reasons,
    };
  }

  private cleanText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }
}
