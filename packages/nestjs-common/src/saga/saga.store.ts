import { Injectable, Logger } from '@nestjs/common';
import { SagaDefinition, SagaStatus, SagaStepStatus } from './saga.types';

/**
 * Saga 状态存储接口
 */
export interface ISagaStore {
  save(saga: SagaDefinition): Promise<void>;
  findById(sagaId: string): Promise<SagaDefinition | null>;
  findByStatus(status: SagaStatus): Promise<SagaDefinition[]>;
  updateStatus(sagaId: string, status: SagaStatus, error?: string): Promise<void>;
  updateStepStatus(
    sagaId: string,
    stepName: string,
    status: SagaStepStatus,
    result?: Record<string, any>,
    error?: string,
  ): Promise<void>;
  delete(sagaId: string): Promise<void>;
}

/**
 * 内存实现的 Saga 存储（开发/测试用）
 */
@Injectable()
export class InMemorySagaStore implements ISagaStore {
  private readonly logger = new Logger(InMemorySagaStore.name);
  private readonly sagas = new Map<string, SagaDefinition>();

  async save(saga: SagaDefinition): Promise<void> {
    this.sagas.set(saga.sagaId, { ...saga });
    this.logger.debug(`Saga saved: ${saga.sagaId}`);
  }

  async findById(sagaId: string): Promise<SagaDefinition | null> {
    return this.sagas.get(sagaId) || null;
  }

  async findByStatus(status: SagaStatus): Promise<SagaDefinition[]> {
    return Array.from(this.sagas.values()).filter((saga) => saga.status === status);
  }

  async updateStatus(sagaId: string, status: SagaStatus, error?: string): Promise<void> {
    const saga = this.sagas.get(sagaId);
    if (saga) {
      saga.status = status;
      saga.updatedAt = new Date().toISOString();
      if (error) {
        saga.error = error;
      }
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'COMPENSATED') {
        saga.completedAt = new Date().toISOString();
      }
      this.sagas.set(sagaId, saga);
      this.logger.debug(`Saga ${sagaId} status updated to ${status}`);
    }
  }

  async updateStepStatus(
    sagaId: string,
    stepName: string,
    status: SagaStepStatus,
    result?: Record<string, any>,
    error?: string,
  ): Promise<void> {
    const saga = this.sagas.get(sagaId);
    if (saga) {
      const step = saga.steps.find((s) => s.name === stepName);
      if (step) {
        step.status = status;
        if (result) {
          step.result = result;
        }
        if (error) {
          step.error = error;
        }
        if (status === 'RUNNING') {
          step.startedAt = new Date().toISOString();
        }
        if (
          status === 'COMPLETED' ||
          status === 'FAILED' ||
          status === 'COMPENSATED'
        ) {
          step.completedAt = new Date().toISOString();
        }
        saga.updatedAt = new Date().toISOString();
        this.sagas.set(sagaId, saga);
        this.logger.debug(`Saga ${sagaId} step ${stepName} updated to ${status}`);
      }
    }
  }

  async delete(sagaId: string): Promise<void> {
    this.sagas.delete(sagaId);
    this.logger.debug(`Saga deleted: ${sagaId}`);
  }
}

export const SAGA_STORE = 'SAGA_STORE';
