import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LdapConfig } from './ldap-config.entity';
import { LdapService } from './ldap.service';
import { LdapController } from './ldap.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LdapConfig])],
  controllers: [LdapController],
  providers: [LdapService],
  exports: [LdapService],
})
export class LdapModule {}
