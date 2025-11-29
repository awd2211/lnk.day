import { Module } from '@nestjs/common';
import { SagaModule as CommonSagaModule } from '@lnk/nestjs-common';
import { CreateLinkSaga } from './create-link.saga';

@Module({
  imports: [CommonSagaModule.forRoot()],
  providers: [CreateLinkSaga],
  exports: [CreateLinkSaga],
})
export class LinkSagaModule {}
