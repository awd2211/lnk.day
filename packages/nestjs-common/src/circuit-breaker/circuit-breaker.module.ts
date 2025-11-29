import { Module, Global } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';
import { CircuitBreakerController } from './circuit-breaker.controller';

@Global()
@Module({
  providers: [
    CircuitBreakerService,
    {
      provide: 'CIRCUIT_BREAKER_SERVICE',
      useExisting: CircuitBreakerService,
    },
  ],
  controllers: [CircuitBreakerController],
  exports: [CircuitBreakerService, 'CIRCUIT_BREAKER_SERVICE'],
})
export class CircuitBreakerModule {}
