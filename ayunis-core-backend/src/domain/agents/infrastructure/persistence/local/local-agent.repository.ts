import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';

import { AgentRepository } from '../../../application/ports/agent.repository';
import { Agent } from '../../../domain/agent.entity';
import { AgentRecord } from './schema/agent.record';
import { AgentMapper } from './mappers/agent.mapper';
import { AgentNotFoundError } from '../../../application/agents.errors';

@Injectable()
export class LocalAgentRepository implements AgentRepository {
  private readonly logger = new Logger(LocalAgentRepository.name);

  constructor(
    @InjectRepository(AgentRecord)
    private readonly agentRepository: Repository<AgentRecord>,
    private readonly agentMapper: AgentMapper,
  ) {}

  async create(agent: Agent): Promise<Agent> {
    this.logger.log('create', { id: agent.id, name: agent.name });

    try {
      const agentEntity = this.agentMapper.toEntity(agent);
      const savedAgentEntity = await this.agentRepository.save(agentEntity);

      this.logger.debug('Agent created successfully', {
        savedAgentEntity,
      });

      return this.agentMapper.toDomain(savedAgentEntity);
    } catch (error) {
      this.logger.error('Error creating agent', {
        error,
        id: agent.id,
        name: agent.name,
      });

      throw error;
    }
  }

  async delete(agentId: UUID, userId: UUID): Promise<void> {
    this.logger.log('delete', { agentId, userId });

    try {
      // Verify agent exists
      const existingAgent = await this.agentRepository.findOne({
        where: { id: agentId, userId },
      });

      if (!existingAgent) {
        this.logger.warn('Attempted to delete non-existent agent', {
          id: agentId,
        });
        throw new AgentNotFoundError(agentId);
      }

      await this.agentRepository.delete({ id: agentId, userId });
      this.logger.debug('Agent deleted successfully', { agentId });
    } catch (error) {
      if (error instanceof AgentNotFoundError) {
        // Already logged and correctly typed, just rethrow
        throw error;
      }

      this.logger.error('Error deleting agent', { error, agentId });
      throw error;
    }
  }

  async findOne(id: UUID, userId: UUID): Promise<Agent | null> {
    this.logger.log('findOne', { id, userId });

    try {
      const agentEntity = await this.agentRepository.findOne({
        where: { id, userId },
        relations: ['tools'],
      });

      if (!agentEntity) {
        this.logger.debug('Agent not found', { id, userId });
        return null;
      }

      this.logger.debug('Agent found', { id, name: agentEntity.name });
      return this.agentMapper.toDomain(agentEntity);
    } catch (error) {
      this.logger.error('Error finding agent', { error, id, userId });
      throw error;
    }
  }

  async findMany(ids: UUID[], userId: UUID): Promise<Agent[]> {
    this.logger.log('findMany', { ids, userId });

    try {
      // Use find instead of findBy to include relations
      const agentEntities = await this.agentRepository.find({
        where: {
          id: ids.length > 0 ? (ids as any) : undefined, // TypeORM syntax for IN query
          userId,
        },
        relations: ['tools'], // Include tools relation
      });

      this.logger.debug('Agents found', { count: agentEntities.length });
      return agentEntities.map((entity) => this.agentMapper.toDomain(entity));
    } catch (error) {
      this.logger.error('Error finding agents', { error, ids, userId });
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
      this.logger.error('Error finding agents for user', { error, userId });
      throw error;
    }
  }
}
