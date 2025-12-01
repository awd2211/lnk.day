import { Module, Global } from '@nestjs/common';
import { QueryOptimizerService } from './query-optimizer.service';

@Global()
@Module({
  providers: [QueryOptimizerService],
  exports: [QueryOptimizerService],
})
export class DatabaseUtilsModule {}
