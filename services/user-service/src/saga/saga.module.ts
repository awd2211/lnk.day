import { Module } from '@nestjs/common';
import { SagaModule as CommonSagaModule } from '@lnk/nestjs-common';
import { RegisterUserSaga } from './register-user.saga';

@Module({
  imports: [CommonSagaModule.forRoot()],
  providers: [RegisterUserSaga],
  exports: [RegisterUserSaga],
})
export class UserSagaModule {}
