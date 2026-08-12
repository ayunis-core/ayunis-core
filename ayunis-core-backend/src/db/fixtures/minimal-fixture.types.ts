import type { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import type { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { RenewalCycle } from 'src/iam/subscriptions/domain/value-objects/renewal-cycle.enum';
import type { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';

export type ModelKey =
  | 'languageModel'
  | 'anthropicLanguageModel'
  | 'azureLanguageModel'
  | 'openaiLanguageModel'
  | 'mistralLanguageModel'
  | 'geminiLanguageModel'
  | 'embeddingModel'
  | 'imageGenerationModel';

export interface LanguageModelFixture {
  name: string;
  displayName: string;
  provider: ModelProvider;
  canStream: boolean;
  isReasoning: boolean;
  isArchived: boolean;
  canUseTools: boolean;
  canVision: boolean;
  inputTokenCost: number;
  outputTokenCost: number;
}

export interface EmbeddingModelFixture {
  name: string;
  displayName: string;
  provider: ModelProvider;
  dimensions: EmbeddingDimensions;
}

export interface ImageGenerationModelFixture {
  name: string;
  displayName: string;
  provider: ModelProvider;
  inputTokenCost: number;
  outputTokenCost: number;
}

export interface BillingInfoFixture {
  companyName: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
}

export type SubscriptionFixture =
  | {
      type: 'seat';
      noOfSeats: number;
      pricePerSeat: number;
      renewalCycle: RenewalCycle;
      billingInfo: BillingInfoFixture;
    }
  | {
      type: 'usage';
      monthlyCredits: number;
      billingInfo: BillingInfoFixture;
    };

export interface AdminFixture {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  systemRole: SystemRole;
  emailVerified: boolean;
  hasAcceptedMarketing: boolean;
}

export interface MemberFixture {
  email: string;
  name: string;
  consumedCredits: number;
  creditLimit?: number;
}

/**
 * Offsets are relative to seed time rather than absolute dates, so a fixture
 * seeded once keeps hitting the same certificate state months later.
 */
export interface AcademyCompletionFixture {
  email: string;
  completedDaysAgo: number;
  /** What the offset is meant to exercise — shown in the seed log. */
  expectedState: string;
}

export interface OrgFixture {
  key: string;
  name: string;
  admin: AdminFixture;
  subscription: SubscriptionFixture;
  members: readonly MemberFixture[];
  teams: readonly string[];
  memberships: Readonly<Record<string, readonly string[]>>;
  teamLimits?: Readonly<Record<string, number>>;
  /** Whether the org holds the academy add-on. Without it the academy is invisible. */
  academyAddon?: boolean;
  academyCompletions?: readonly AcademyCompletionFixture[];
}

export interface QuizAnswerOptionFixture {
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestionFixture {
  text: string;
  position: number;
  options: readonly QuizAnswerOptionFixture[];
}

export interface CourseModuleFixture {
  title: string;
  description: string;
  loomUrl: string;
  position: number;
}

export interface AcademyChapterFixture {
  title: string;
  description: string;
  position: number;
  quizEnabled: boolean;
  passThreshold: number;
  modules: readonly CourseModuleFixture[];
  quiz: readonly QuizQuestionFixture[];
}

export interface PermittedModelFixture {
  modelKey: ModelKey;
  isDefault: boolean;
  anonymousOnly: boolean;
}

export interface SeedFixture {
  languageModel: LanguageModelFixture;
  anthropicLanguageModel: LanguageModelFixture;
  azureLanguageModel: LanguageModelFixture;
  openaiLanguageModel: LanguageModelFixture;
  mistralLanguageModel: LanguageModelFixture;
  geminiLanguageModel: LanguageModelFixture;
  embeddingModel: EmbeddingModelFixture;
  imageGenerationModel: ImageGenerationModelFixture;
  platformConfig: { creditsPerEuro: number };
  orgs: readonly OrgFixture[];
  permittedModels: readonly PermittedModelFixture[];
  academyChapters: readonly AcademyChapterFixture[];
}
