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
import { AgentToolAssignmentRecord } from './schema/agent-tool.record';
import { AgentSourceAssignmentRecord } from './schema/agent-source-assignment.record';

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

      // Set MCP integration relations using relation IDs
      if (agent.mcpIntegrationIds.length > 0) {
        await this.agentRepository
          .createQueryBuilder()
          .relation(AgentRecord, 'mcpIntegrations')
          .of(savedAgent.id)
          .add(agent.mcpIntegrationIds);
      }

      this.logger.debug('Agent created successfully', {
        id: savedAgent.id,
        name: savedAgent.name,
      });

      // Load the agent with relations to return complete data
      const agentWithRelations = await this.agentRepository.findOne({
        where: { id: savedAgent.id },
        relations: ['agentTools', 'mcpIntegrations'],
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

  async update(agent: Agent): Promise<Agent> {
    this.logger.log('update', {
      id: agent.id,
      name: agent.name,
      userId: agent.userId,
    });

    // get transaction
    const queryRunner =
      this.agentRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      const existing = await queryRunner.manager.findOne(AgentRecord, {
        where: { id: agent.id, userId: agent.userId },
        relations: {
          agentTools: {
            toolConfig: true,
          },
          model: {
            model: true,
          },
          sourceAssignments: {
            source: true,
          },
          mcpIntegrations: true,
        },
      });

      if (!existing) {
        throw new AgentNotFoundError(agent.id);
      }
      this.logger.debug('Existing agent', {
        existing,
      });

      // delete existing tool assignments if they are not in the new tool assignments
      const existingToolAssignments = existing.agentTools;
      const newToolAssignments = agent.toolAssignments;
      const toolAssignmentsToDelete =
        existingToolAssignments?.filter(
          (ta) => !newToolAssignments.some((ta2) => ta2.id === ta.id),
        ) ?? [];
      this.logger.debug('Tool assignments to delete', {
        existingToolAssignments,
        newToolAssignments,
        toolAssignmentsToDelete,
      });
      for (const ta of toolAssignmentsToDelete) {
        await queryRunner.manager.delete(AgentToolAssignmentRecord, ta.id);
      }

      // delete existing source assignments if they are not in the new source assignments
      const existingSourceAssignments = existing.sourceAssignments;
      const newSourceAssignments = agent.sourceAssignments ?? [];
      const sourceAssignmentsToDelete =
        existingSourceAssignments?.filter(
          (sa) => !newSourceAssignments.some((sa2) => sa2.id === sa.id),
        ) ?? [];
      this.logger.debug('Source assignments to delete', {
        existingSourceAssignments,
        newSourceAssignments,
        sourceAssignmentsToDelete,
      });
      await queryRunner.manager.remove(
        AgentSourceAssignmentRecord,
        sourceAssignmentsToDelete,
      );

      const updatedAgent = new Agent({
        ...agent,
        toolAssignments: newToolAssignments,
        sourceAssignments: newSourceAssignments,
      });
      this.logger.debug('Updated agent', {
        agent,
      });

      // update agent with new data
      const record = this.agentMapper.toRecord(updatedAgent);
      const updatedRecord = await queryRunner.manager.save(AgentRecord, record);
      this.logger.debug('Updated record', {
        updatedRecord,
      });

      // Handle MCP integrations many-to-many relationship using relation API
      const existingMcpIntegrationIds =
        existing.mcpIntegrations?.map((i) => i.id) ?? [];
      const newMcpIntegrationIds = agent.mcpIntegrationIds;

      // Find integrations to add and remove
      const integrationsToAdd = newMcpIntegrationIds.filter(
        (id) => !existingMcpIntegrationIds.includes(id),
      );
      const integrationsToRemove = existingMcpIntegrationIds.filter(
        (id) => !newMcpIntegrationIds.includes(id),
      );

      // Use relation API to update join table without loading full entities
      if (integrationsToAdd.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .relation(AgentRecord, 'mcpIntegrations')
          .of(agent.id)
          .add(integrationsToAdd);
      }

      if (integrationsToRemove.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .relation(AgentRecord, 'mcpIntegrations')
          .of(agent.id)
          .remove(integrationsToRemove);
      }

      await queryRunner.commitTransaction();

      // Reload with MCP integrations to return complete data
      const reloadedAgent = await this.agentRepository.findOne({
        where: { id: agent.id },
        relations: {
          mcpIntegrations: true,
          agentTools: true,
          model: true,
          sourceAssignments: {
            source: true,
          },
        },
      });

      if (!reloadedAgent) {
        throw new AgentNotFoundError(agent.id);
      }

      return this.agentMapper.toDomain(reloadedAgent);
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
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
        relations: {
          agentTools: true,
          model: true,
          sourceAssignments: {
            source: true,
          },
          mcpIntegrations: true,
        },
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

  async findById(id: UUID): Promise<Agent | null> {
    this.logger.log('findById', { id });

    try {
      const agentEntity = await this.agentRepository.findOne({
        where: { id },
        relations: {
          agentTools: {
            toolConfig: true,
          },
          model: {
            model: true,
          },
          sourceAssignments: {
            source: true,
          },
          mcpIntegrations: true,
        },
      });

      if (!agentEntity) {
        this.logger.debug('Agent not found', { id });
        return null;
      }

      this.logger.debug('Agent found', { id, name: agentEntity.name });
      return this.agentMapper.toDomain(agentEntity);
    } catch (error) {
      this.logger.error('Error finding agent by id', {
        error: error as Error,
        id,
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
        relations: ['agentTools', 'model', 'mcpIntegrations'],
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

  async findByIds(ids: UUID[]): Promise<Agent[]> {
    this.logger.log('findByIds', { ids });

    try {
      if (ids.length === 0) {
        return [];
      }

      // Find agents by IDs without userId filter (for shared agents)
      const agentEntities = await this.agentRepository.find({
        where: {
          id: In(ids),
        },
        relations: ['agentTools', 'model', 'mcpIntegrations'],
      });

      this.logger.debug('Agents found by IDs', { count: agentEntities.length });
      return agentEntities.map((entity) => this.agentMapper.toDomain(entity));
    } catch (error) {
      this.logger.error('Error finding agents by IDs', {
        error: error as Error,
        ids,
      });
      throw error;
    }
  }

  async findAllByOwner(userId: UUID): Promise<Agent[]> {
    this.logger.log('findAllByOwner', { userId });

    try {
      const agentEntities = await this.agentRepository.find({
        where: { userId },
        relations: ['agentTools', 'mcpIntegrations'], // Include agentTools and mcpIntegrations relations
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
        relations: ['agentTools', 'mcpIntegrations'],
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
