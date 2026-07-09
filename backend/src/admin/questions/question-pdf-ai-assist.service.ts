import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
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

type OpenAiResponsesRequestBody = {
  model: string;
  input: Array<{ role: 'system' | 'user'; content: string }>;
  text: {
    format: {
      type: 'json_schema';
      name: string;
      schema: Record<string, unknown>;
      strict: true;
    };
  };
  max_output_tokens: number;
  reasoning?: {
    effort: string;
  };
};

type OpenAiResponseEnvelope = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  status?: string;
  error?: {
    code?: string;
    message?: string;
    type?: string;
  } | null;
  incomplete_details?: {
    reason?: string;
  } | null;
};

type AnswerItem = {
  questionNumber: number;
  answerNumber: number;
  subject: string | null;
};

type AssistInput = {
  questionPages: PdfPageText[];
  answerPages: PdfPageText[];
  ruleItems: PdfImportPreviewItem[];
  answerItems?: AnswerItem[];
  parserQuestionCount?: number;
  parserWarnings?: string[];
  mode: PdfImportAiAssistMode;
};

const DEFAULT_AI_MODEL = 'gpt-4.1-mini';
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const AI_REQUEST_TIMEOUT_MS = 90_000;
const AI_MAX_OUTPUT_TOKENS = 20_000;
const MAX_TEXT_CHARS = 120_000;
const GPT5_MODEL_PATTERN = /^gpt-5(?:$|[.-])/i;
const REASONING_EFFORT_VALUES = new Set(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']);

@Injectable()
export class QuestionPdfAiAssistService {
  private readonly logger = new Logger(QuestionPdfAiAssistService.name);

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

    const aiItems = this.toPreviewItems(
      aiResponse.questions ?? [],
      input.ruleItems,
      warnings,
      input.answerItems ?? [],
    );

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
    const requestBody = this.buildOpenAiRequestBody(model, input);

    try {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const body = await response.text();

      if (!response.ok) {
        const openAiError = this.extractOpenAiError(body);
        this.logger.warn(
          `PDF AI assist OpenAI request failed model=${this.safeModelName(model)} status=${response.status} code=${openAiError.code ?? 'unknown'} message=${openAiError.message ?? 'unknown'}`,
        );

        throw new UnprocessableEntityException({
          error: {
            code: 'PDF_IMPORT_AI_REQUEST_FAILED',
            message: 'AI 보정 요청에 실패했습니다. 잠시 후 다시 시도해주세요.',
            details: [{ status: response.status, code: openAiError.code ?? null }],
          },
        });
      }

      return this.parseOpenAiResponse(body, model);
    } catch (error) {
      if (error instanceof UnprocessableEntityException) {
        throw error;
      }

      const isTimeout = error instanceof Error && error.name === 'AbortError';
      this.logger.warn(
        `PDF AI assist request failed model=${this.safeModelName(model)} reason=${isTimeout ? 'timeout' : 'network_or_parse'} message=${error instanceof Error ? error.message : 'unknown'}`,
      );

      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_IMPORT_AI_REQUEST_FAILED',
          message: 'AI 보정 요청에 실패했습니다. 네트워크, timeout, 응답 형식을 확인해주세요.',
          details: [{ reason: isTimeout ? 'timeout' : 'network_or_parse' }],
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildOpenAiRequestBody(model: string, input: AssistInput): OpenAiResponsesRequestBody {
    const body: OpenAiResponsesRequestBody = {
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
      max_output_tokens: AI_MAX_OUTPUT_TOKENS,
    };

    if (this.isGpt5FamilyModel(model)) {
      body.reasoning = {
        effort: this.getReasoningEffort(),
      };
    }

    return body;
  }

  private isGpt5FamilyModel(model: string): boolean {
    return GPT5_MODEL_PATTERN.test(model.trim());
  }

  private getReasoningEffort(): string {
    const configured = this.configService.get<string>('OPENAI_PDF_IMPORT_REASONING_EFFORT')?.trim().toLowerCase();

    if (configured && REASONING_EFFORT_VALUES.has(configured)) {
      return configured;
    }

    return 'low';
  }

  private buildSystemPrompt(): string {
    return [
      '너는 간호학원 객관식 문제 PDF를 구조화하는 보정 도구다.',
      '제공된 텍스트와 기존 파싱 결과 안에서만 문제를 재구성하라.',
      '원문에 없는 문제, 보기, 정답을 새로 만들지 마라.',
      '문제 번호를 보존하라.',
      '문항 번호가 "1. 문제"가 아니라 "1 문제" 형식일 수 있다.',
      '기본 파서가 0문항을 찾았더라도 문제지 raw text가 있으면 raw text에서 문제를 복원하라.',
      '각 문제는 반드시 보기 5개여야 한다.',
      '정답표가 제공되면 정답표의 번호별 정답을 우선하라.',
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
        '문제지/정답지 추출 텍스트와 기존 파싱 결과를 비교해 최종 문제 JSON을 만들어라. correctAnswerNumber는 1~5 기준이다. 기본 파서가 0문항을 찾은 경우에도 raw text에서 1 문제, 2 문제처럼 점 없는 문항 번호를 찾아라.',
      parserQuestionCount: input.parserQuestionCount ?? input.ruleItems.length,
      expectedQuestionCount: input.answerItems?.length ?? null,
      parserWarnings: input.parserWarnings ?? [],
      questionText: this.pagesToText(input.questionPages),
      answerText: this.pagesToText(input.answerPages),
      answerItems: input.answerItems ?? [],
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

  private responseSchema(): Record<string, unknown> {
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
              number: { type: 'integer' },
              content: { type: 'string' },
              choices: {
                type: 'array',
                items: { type: 'string' },
              },
              correctAnswerNumber: { type: 'integer' },
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

  private parseOpenAiResponse(rawBody: string, model: string): AiResponseShape {
    let parsed: OpenAiResponseEnvelope;

    try {
      parsed = JSON.parse(rawBody) as OpenAiResponseEnvelope;
    } catch (error) {
      this.logger.warn(
        `PDF AI assist response JSON parse failed model=${this.safeModelName(model)} bodyLength=${rawBody.length} message=${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_IMPORT_AI_RESPONSE_PARSE_FAILED',
          message: 'AI 보정 응답 형식을 해석하지 못했습니다.',
          details: [],
        },
      });
    }

    if (parsed.error) {
      this.logger.warn(
        `PDF AI assist response returned error model=${this.safeModelName(model)} status=${parsed.status ?? 'unknown'} code=${parsed.error.code ?? 'unknown'} message=${parsed.error.message ?? 'unknown'}`,
      );
      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_IMPORT_AI_RESPONSE_ERROR',
          message: 'AI 보정 응답에 오류가 포함되어 있습니다.',
          details: [{ code: parsed.error.code ?? null, status: parsed.status ?? null }],
        },
      });
    }

    if (parsed.status && parsed.status !== 'completed') {
      this.logger.warn(
        `PDF AI assist response incomplete model=${this.safeModelName(model)} status=${parsed.status} reason=${parsed.incomplete_details?.reason ?? 'unknown'}`,
      );
      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_IMPORT_AI_RESPONSE_INCOMPLETE',
          message: 'AI 보정 응답이 완료되지 않았습니다.',
          details: [{ status: parsed.status, reason: parsed.incomplete_details?.reason ?? null }],
        },
      });
    }

    const outputText =
      parsed.output_text ??
      parsed.output
        ?.flatMap((item) => item.content ?? [])
        .filter((content) => content.type === undefined || content.type === 'output_text')
        .find((content) => content.text)?.text;
    const text = outputText?.trim();

    if (!text) {
      this.logger.warn(`PDF AI assist response empty model=${this.safeModelName(model)} status=${parsed.status ?? 'unknown'}`);
      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_IMPORT_AI_RESPONSE_EMPTY',
          message: 'AI 보정 응답이 비어 있습니다.',
          details: [],
        },
      });
    }

    try {
      return JSON.parse(text) as AiResponseShape;
    } catch (error) {
      this.logger.warn(
        `PDF AI assist output JSON parse failed model=${this.safeModelName(model)} outputLength=${text.length} message=${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw new UnprocessableEntityException({
        error: {
          code: 'PDF_IMPORT_AI_OUTPUT_PARSE_FAILED',
          message: 'AI 보정 결과 JSON을 해석하지 못했습니다.',
          details: [],
        },
      });
    }
  }

  private extractOpenAiError(rawBody: string): { code?: string; message?: string } {
    try {
      const parsed = JSON.parse(rawBody) as { error?: { code?: string; message?: string } };
      return {
        code: parsed.error?.code,
        message: parsed.error?.message,
      };
    } catch {
      return {
        message: rawBody ? `non_json_error_body_length_${rawBody.length}` : 'empty_error_body',
      };
    }
  }

  private safeModelName(model: string): string {
    return model.replace(/[^a-zA-Z0-9_.:-]/g, '');
  }

  private toPreviewItems(
    aiQuestions: AiQuestion[],
    ruleItems: PdfImportPreviewItem[],
    globalWarnings: string[],
    answerItems: AnswerItem[] = [],
  ): PdfImportPreviewItem[] {
    const ruleByNumber = new Map(ruleItems.map((item) => [item.questionNumber, item]));
    const answerByNumber = new Map(answerItems.map((item) => [item.questionNumber, item]));
    const seenNumbers = new Set<number>();
    const items: PdfImportPreviewItem[] = aiQuestions.map((question) => {
      const base = ruleByNumber.get(question.number);
      const answer = answerByNumber.get(question.number);
      const reasons = this.validateAiQuestion(question, seenNumbers, base, answer);
      const subject = base?.subject || answer?.subject || question.subject || 'PDF 가져오기';
      const category = base?.category ?? question.category ?? null;
      const choices = Array.isArray(question.choices)
        ? question.choices.map((choice) => choice.trim())
        : [];
      const answerNumber = answer?.answerNumber ?? question.correctAnswerNumber;
      const correctAnswerIndex = answerNumber - 1;

      seenNumbers.add(question.number);

      return {
        questionNumber: question.number,
        subject,
        category,
        content: question.content.trim(),
        choices,
        pageNumber: base?.pageNumber ?? 1,
        correctAnswerIndex,
        answerNumber,
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
    answer: AnswerItem | undefined,
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

    const expectedAnswerNumber = base?.answerNumber ?? answer?.answerNumber;

    if (
      expectedAnswerNumber &&
      Number.isInteger(question.correctAnswerNumber) &&
      question.correctAnswerNumber !== expectedAnswerNumber
    ) {
      reasons.push('정답표의 정답과 AI 보정 정답이 일치하지 않습니다.');
    }

    return reasons;
  }
}
