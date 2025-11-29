import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SSOController } from './sso.controller';
import { SSOService } from './sso.service';
import { SAMLService } from './saml/saml.service';
import { SSOConfig, SSOSession } from './entities/sso-config.entity';
import { LdapModule } from '../auth/ldap/ldap.module';

@Module({
  imports: [TypeOrmModule.forFeature([SSOConfig, SSOSession]), LdapModule],
  controllers: [SSOController],
  providers: [SSOService, SAMLService],
  exports: [SSOService, SAMLService],
})
export class SSOModule {}
