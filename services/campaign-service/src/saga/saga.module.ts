import { Module } from '@nestjs/common';
import { SagaModule as CommonSagaModule } from '@lnk/nestjs-common';
import { CreateCampaignSaga } from './create-campaign.saga';

@Module({
  imports: [CommonSagaModule.forRoot()],
  providers: [CreateCampaignSaga],
  exports: [CreateCampaignSaga],
})
export class CampaignSagaModule {}
