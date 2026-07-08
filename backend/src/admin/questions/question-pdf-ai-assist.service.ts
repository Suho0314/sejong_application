import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PdfImportAiAssistMode } from './dto/preview-pdf-question-import.dto';
import type { PdfImportPreviewItem } from './question-pdf-import.service';

type PdfPageText = {
  pageNumber: number;
  lines: string[];
};

type AiQuestion = {
  number: number;
  content: string;
  choices: string[];
  correctAnswerNumber: number;
  subject?: string | null;
  category?: string | null;
  warnings?: string[];
};

type AiResponseShape = {
  questions?: AiQuestion[];
  warnings?: string[];
};

type AssistInput = {
  questionPages: PdfPageText[];
  answerPages: PdfPageText[];
  ruleItems: PdfImportPreviewItem[];
  mode: PdfImportAiAssistMode;
};

const DEFAULT_AI_MODEL = 'gpt-4.1-mini';
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const AI_REQUEST_TIMEOUT_MS = 45_000;
const MAX_TEXT_CHARS = 120_000;

@Injectable()
export class QuestionPdfAiAssistService {
  constructor(private readonly configService: ConfigService) {}

  async assist(input: AssistInput): Promise<{ items: PdfImportPreviewItem[]; warnings: string[] }> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();

    if (!apiKey) {
      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_IMPORT_AI_API_KEY_REQUIRED',
          message: 'AI 보정을 사용하려면 Backend 환경변수 OPENAI_API_KEY가 필요합니다.',
          details: [],
        },
      });
    }

    const model = this.configService.get<string>('OPENAI_PDF_IMPORT_MODEL')?.trim() || DEFAULT_AI_MODEL;
    const aiResponse = await this.callOpenAi(apiKey, model, input);
    const warnings = aiResponse.warnings ?? [];

    const aiItems = this.toPreviewItems(aiResponse.questions ?? [], input.ruleItems, warnings);

    if (input.mode === 'review_only') {
      const aiItemNumbers = new Set(aiItems.map((item) => item.questionNumber));
      const preservedReadyItems = input.ruleItems.filter(
        (item) => item.status === 'ready' && !aiItemNumbers.has(item.questionNumber),
      );

      return {
        items: [...preservedReadyItems, ...aiItems].sort((left, right) => left.questionNumber - right.questionNumber),
        warnings,
      };
    }

    return {
      items: aiItems,
      warnings,
    };
  }

  private async callOpenAi(apiKey: string, model: string, input: AssistInput): Promise<AiResponseShape> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: 'system',
              content: this.buildSystemPrompt(),
            },
            {
              role: 'user',
              content: JSON.stringify(this.buildUserPayload(input)),
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'pdf_question_import_ai_assist',
              schema: this.responseSchema(),
              strict: true,
            },
          },
        }),
        signal: controller.signal,
      });

      const body = await response.text();

      if (!response.ok) {
        throw new UnprocessableEntityException({
          error: {
            code: 'PDF_IMPORT_AI_REQUEST_FAILED',
            message: 'AI 보정 요청에 실패했습니다. 잠시 후 다시 시도해주세요.',
            details: [{ status: response.status }],
          },
        });
      }

      return this.parseOpenAiResponse(body);
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        throw error;
      }

      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_IMPORT_AI_REQUEST_FAILED',
          message: 'AI 보정 요청에 실패했습니다. 네트워크, timeout, 응답 형식을 확인해주세요.',
          details: [],
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildSystemPrompt(): string {
    return [
      '너는 간호학원 객관식 문제 PDF를 구조화하는 보정 도구다.',
      '제공된 텍스트와 기존 파싱 결과 안에서만 문제를 재구성하라.',
      '원문에 없는 문제, 보기, 정답을 새로 만들지 마라.',
      '문제 번호를 보존하라.',
      '각 문제는 반드시 보기 5개여야 한다.',
      '정답표가 제공되면 정답표의 번호를 우선하라.',
      '확신이 없으면 임의로 고치지 말고 warnings에 남겨라.',
      '반환은 JSON만 하라.',
    ].join('\n');
  }

  private buildUserPayload(input: AssistInput) {
    const targetItems =
      input.mode === 'review_only'
        ? input.ruleItems.filter((item) => item.status !== 'ready')
        : input.ruleItems;

    return {
      mode: input.mode,
      instruction:
        '문제지/정답지 추출 텍스트와 기존 파싱 결과를 비교해 최종 문제 JSON을 만들어라. correctAnswerNumber는 1~5 기준이다.',
      questionText: this.pagesToText(input.questionPages),
      answerText: this.pagesToText(input.answerPages),
      ruleParserItems: targetItems.map((item) => ({
        number: item.questionNumber,
        content: item.content,
        choices: item.choices,
        correctAnswerNumber: item.answerNumber,
        subject: item.subject,
        category: item.category,
        status: item.status,
        reasons: item.reasons,
      })),
    };
  }

  private pagesToText(pages: PdfPageText[]): string {
    return pages
      .map((page) => [`[page ${page.pageNumber}]`, ...page.lines].join('\n'))
      .join('\n\n')
      .slice(0, MAX_TEXT_CHARS);
  }

  private responseSchema() {
    return {
      type: 'object',
      additionalProperties: false,
      required: ['questions', 'warnings'],
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['number', 'content', 'choices', 'correctAnswerNumber', 'subject', 'category', 'warnings'],
            properties: {
              number: { type: 'integer', minimum: 1, maximum: 300 },
              content: { type: 'string' },
              choices: {
                type: 'array',
                minItems: 5,
                maxItems: 5,
                items: { type: 'string' },
              },
              correctAnswerNumber: { type: 'integer', minimum: 1, maximum: 5 },
              subject: { type: ['string', 'null'] },
              category: { type: ['string', 'null'] },
              warnings: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
        warnings: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    };
  }

  private parseOpenAiResponse(rawBody: string): AiResponseShape {
    const parsed = JSON.parse(rawBody) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ text?: string }> }>;
    };
    const text =
      parsed.output_text ??
      parsed.output?.flatMap((item) => item.content ?? []).find((content) => content.text)?.text;

    if (!text) {
      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_IMPORT_AI_RESPONSE_EMPTY',
          message: 'AI 보정 응답이 비어 있습니다.',
          details: [],
        },
      });
    }

    return JSON.parse(text) as AiResponseShape;
  }

  private toPreviewItems(
    aiQuestions: AiQuestion[],
    ruleItems: PdfImportPreviewItem[],
    globalWarnings: string[],
  ): PdfImportPreviewItem[] {
    const ruleByNumber = new Map(ruleItems.map((item) => [item.questionNumber, item]));
    const seenNumbers = new Set<number>();
    const items: PdfImportPreviewItem[] = aiQuestions.map((question) => {
      const base = ruleByNumber.get(question.number);
      const reasons = this.validateAiQuestion(question, seenNumbers, base);
      const subject = base?.subject || question.subject || 'PDF 가져오기';
      const category = base?.category ?? question.category ?? null;
      const choices = Array.isArray(question.choices)
        ? question.choices.map((choice) => choice.trim())
        : [];
      const correctAnswerIndex = question.correctAnswerNumber - 1;

      seenNumbers.add(question.number);

      return {
        questionNumber: question.number,
        subject,
        category,
        content: question.content.trim(),
        choices,
        pageNumber: base?.pageNumber ?? 1,
        correctAnswerIndex,
        answerNumber: question.correctAnswerNumber,
        status: reasons.length === 0 ? 'ready' : 'needs_review',
        reasons: [...(question.warnings ?? []), ...reasons],
      };
    });

    if (items.length === 0) {
      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_IMPORT_AI_RESPONSE_INVALID',
          message: 'AI 보정 결과에서 유효한 문항을 찾지 못했습니다.',
          details: globalWarnings,
        },
      });
    }

    return items.sort((left, right) => left.questionNumber - right.questionNumber);
  }

  private validateAiQuestion(
    question: AiQuestion,
    seenNumbers: Set<number>,
    base: PdfImportPreviewItem | undefined,
  ): string[] {
    const reasons: string[] = [];

    if (!Number.isInteger(question.number) || question.number < 1) {
      reasons.push('문제 번호가 올바르지 않습니다.');
    }

    if (seenNumbers.has(question.number)) {
      reasons.push('문제 번호가 중복되었습니다.');
    }

    if (!question.content?.trim()) {
      reasons.push('문제 본문이 비어 있습니다.');
    }

    if (!Array.isArray(question.choices) || question.choices.length !== 5) {
      reasons.push('보기가 5개가 아닙니다.');
    } else if (question.choices.some((choice) => !choice.trim())) {
      reasons.push('빈 보기가 포함되어 있습니다.');
    }

    if (
      !Number.isInteger(question.correctAnswerNumber) ||
      question.correctAnswerNumber < 1 ||
      question.correctAnswerNumber > 5
    ) {
      reasons.push('정답 번호가 1~5 범위를 벗어났습니다.');
    }

    if (
      base?.answerNumber &&
      Number.isInteger(question.correctAnswerNumber) &&
      question.correctAnswerNumber !== base.answerNumber
    ) {
      reasons.push('정답표의 정답과 AI 보정 정답이 일치하지 않습니다.');
    }

    return reasons;
  }
}
