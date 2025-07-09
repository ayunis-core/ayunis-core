import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UUID } from 'crypto';

import { AgentRepository } from '../../../application/ports/agent.repository';
import { Agent } from '../../../domain/agent.entity';
import { AgentRecord } from './schema/agent.record';
import { AgentMapper } from './mappers/agent.mapper';
import { AgentNotFoundError } from '../../../application/agents.errors';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';

@Injectable()
export class LocalAgentRepository implements AgentRepository {
  private readonly logger = new Logger(LocalAgentRepository.name);

  constructor(
    @InjectRepository(AgentRecord)
    private readonly agentRepository: Repository<AgentRecord>,
    private readonly agentMapper: AgentMapper,
  ) {}

  async create(agent: Agent): Promise<Agent> {
    this.logger.log('create', {
      name: agent.name,
      userId: agent.userId,
      modelId: agent.model.id,
    });

    try {
      const agentEntity = this.agentMapper.toRecord(agent);
      const savedAgent = await this.agentRepository.save(agentEntity);

      this.logger.debug('Agent created successfully', {
        id: savedAgent.id,
        name: savedAgent.name,
      });

      // Load the agent with relations to return complete data
      const agentWithRelations = await this.agentRepository.findOne({
        where: { id: savedAgent.id },
        relations: ['agentTools'],
      });

      if (!agentWithRelations) {
        throw new Error('Failed to load created agent');
      }

      return this.agentMapper.toDomain(agentWithRelations);
    } catch (error) {
      this.logger.error('Error creating agent', {
        error: error as Error,
        agentName: agent.name,
        userId: agent.userId,
      });
      throw error;
    }
  }

  async delete(agentId: UUID, userId: UUID): Promise<void> {
    this.logger.log('delete', { agentId, userId });

    try {
      const result = await this.agentRepository.delete({
        id: agentId,
        userId,
      });

      if (result.affected === 0) {
        throw new AgentNotFoundError(agentId);
      }

      this.logger.debug('Agent deleted successfully', { agentId });
    } catch (error) {
      this.logger.error('Error deleting agent', {
        error: error as Error,
        agentId,
        userId,
      });
      throw error;
    }
  }

  async findOne(id: UUID, userId: UUID): Promise<Agent | null> {
    this.logger.log('findOne', { id, userId });

    try {
      const agentEntity = await this.agentRepository.findOne({
        where: { id, userId },
        relations: ['agentTools', 'model'],
      });

      if (!agentEntity) {
        this.logger.debug('Agent not found', { id, userId });
        return null;
      }

      this.logger.debug('Agent found', { id, name: agentEntity.name });
      return this.agentMapper.toDomain(agentEntity);
    } catch (error) {
      this.logger.error('Error finding agent', {
        error: error as Error,
        id,
        userId,
      });
      throw error;
    }
  }

  async findMany(ids: UUID[], userId: UUID): Promise<Agent[]> {
    this.logger.log('findMany', { ids, userId });

    try {
      // Use find instead of findBy to include relations
      const agentEntities = await this.agentRepository.find({
        where: {
          id: In(ids),
          userId,
        },
        relations: ['agentTools', 'model'],
      });

      this.logger.debug('Agents found', { count: agentEntities.length });
      return agentEntities.map((entity) => this.agentMapper.toDomain(entity));
    } catch (error) {
      this.logger.error('Error finding agents', {
        error: error as Error,
        ids,
        userId,
      });
      throw error;
    }
  }

  async findAllByOwner(userId: UUID): Promise<Agent[]> {
    this.logger.log('findAllByOwner', { userId });

    try {
      const agentEntities = await this.agentRepository.find({
        where: { userId },
        relations: ['agentTools'], // Include agentTools relation
      });

      this.logger.debug('Agents found for user', {
        count: agentEntities.length,
        userId,
      });
      return agentEntities.map((entity) => this.agentMapper.toDomain(entity));
    } catch (error) {
      this.logger.error('Error finding agents for user', {
        error: error as Error,
        userId,
      });
      throw error;
    }
  }

  async findAllByModel(modelId: UUID): Promise<Agent[]> {
    this.logger.log('findAllByModel', { modelId });

    try {
      const agentEntities = await this.agentRepository.find({
        where: { modelId },
        relations: ['agentTools'],
      });

      this.logger.debug('Agents found for model', {
        count: agentEntities.length,
        modelId,
      });
      return agentEntities.map((entity) => this.agentMapper.toDomain(entity));
    } catch (error) {
      this.logger.error('Error finding agents for model', {
        error: error as Error,
        modelId,
      });
      throw error;
    }
  }

  async updateModel(
    agentId: UUID,
    userId: UUID,
    model: PermittedModel,
  ): Promise<void> {
    this.logger.log('updateModel', {
      agentId,
      userId,
      modelId: model.id,
    });

    try {
      const result = await this.agentRepository.update(
        { id: agentId, userId },
        { modelId: model.id },
      );

      if (!result.affected || result.affected === 0) {
        throw new AgentNotFoundError(agentId);
      }

      this.logger.debug('Agent model updated successfully', {
        agentId,
        modelId: model.id,
      });
    } catch (error) {
      this.logger.error('Error updating agent model', {
        error: error as Error,
        agentId,
        userId,
        modelId: model.id,
      });
      throw error;
    }
  }
}
