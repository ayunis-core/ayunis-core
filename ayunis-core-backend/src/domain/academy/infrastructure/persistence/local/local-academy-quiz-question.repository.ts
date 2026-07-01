import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { UUID } from 'crypto';

import { AcademyQuizQuestionRepository } from '../../../application/ports/academy-quiz-question.repository';
import { AcademyQuizQuestion } from '../../../domain/academy-quiz-question.entity';
import { AcademyQuizQuestionRecord } from './schema/academy-quiz-question.record';
import { AcademyMapper } from './mappers/academy.mapper';
import { QuizQuestionNotFoundError } from '../../../application/academy.errors';

@Injectable()
export class LocalAcademyQuizQuestionRepository implements AcademyQuizQuestionRepository {
  private readonly logger = new Logger(LocalAcademyQuizQuestionRepository.name);

  constructor(
    @InjectRepository(AcademyQuizQuestionRecord)
    private readonly repository: Repository<AcademyQuizQuestionRecord>,
    private readonly mapper: AcademyMapper,
  ) {}

  async findOne(id: UUID): Promise<AcademyQuizQuestion | null> {
    this.logger.log('findOne', { id });
    const record = await this.repository.findOne({ where: { id } });
    if (!record) return null;
    return this.mapper.quizQuestionToDomain(record);
  }

  async findMaxPosition(chapterId: UUID): Promise<number | null> {
    this.logger.log('findMaxPosition', { chapterId });
    return this.repository.maximum('position', { chapterId });
  }

  async create(
    quizQuestion: AcademyQuizQuestion,
  ): Promise<AcademyQuizQuestion> {
    this.logger.log('create', { chapterId: quizQuestion.chapterId });
    const record = this.mapper.quizQuestionToRecord(quizQuestion);
    const saved = await this.repository.save(record);
    return this.mapper.quizQuestionToDomain(saved);
  }

  async update(
    quizQuestion: AcademyQuizQuestion,
  ): Promise<AcademyQuizQuestion> {
    this.logger.log('update', { id: quizQuestion.id });
    const record = this.mapper.quizQuestionToRecord(quizQuestion);
    const saved = await this.repository.save(record);
    return this.mapper.quizQuestionToDomain(saved);
  }

  async delete(id: UUID): Promise<void> {
    this.logger.log('delete', { id });
    const result = await this.repository.delete({ id });
    if (result.affected === 0) {
      throw new QuizQuestionNotFoundError(id);
    }
  }
}
