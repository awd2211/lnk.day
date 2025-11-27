import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SSOProvider } from '../entities/sso-config.entity';

export class CreateSAMLConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ description: 'IdP Entity ID' })
  @IsString()
  entityId: string;

  @ApiProperty({ description: 'IdP SSO URL' })
  @IsString()
  ssoUrl: string;

  @ApiPropertyOptional({ description: 'IdP SLO URL' })
  @IsOptional()
  @IsString()
  sloUrl?: string;

  @ApiProperty({ description: 'IdP Certificate (PEM format)' })
  @IsString()
  certificate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nameIdFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  attributeMapping?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    groups?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoProvision?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enforceSSO?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];
}

export class CreateOIDCConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ description: 'OIDC Issuer URL' })
  @IsString()
  issuer: string;

  @ApiProperty({ description: 'Client ID' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: 'Client Secret' })
  @IsString()
  clientSecret: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorizationUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tokenUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userInfoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  attributeMapping?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    groups?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoProvision?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enforceSSO?: boolean;
}

export class CreateLDAPConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ description: 'LDAP Server URL (ldap:// or ldaps://)' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'Bind DN' })
  @IsString()
  bindDn: string;

  @ApiProperty({ description: 'Bind Password' })
  @IsString()
  bindPassword: string;

  @ApiProperty({ description: 'Search Base DN' })
  @IsString()
  searchBase: string;

  @ApiPropertyOptional({ description: 'Search Filter (use {{username}} placeholder)' })
  @IsOptional()
  @IsString()
  searchFilter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  usernameAttribute?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emailAttribute?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  attributeMapping?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    groups?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoProvision?: boolean;
}

export class UpdateSSOConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoProvision?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enforceSSO?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  attributeMapping?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    groups?: string;
  };
}

export class SAMLCallbackDto {
  @ApiProperty()
  @IsString()
  SAMLResponse: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  RelayState?: string;
}

export class TestConnectionDto {
  @ApiPropertyOptional({ description: 'Username for LDAP test' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'Password for LDAP test' })
  @IsOptional()
  @IsString()
  password?: string;
}

// Response DTOs

export class SSOConfigResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  provider: SSOProvider;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  displayName?: string;

  @ApiProperty()
  autoProvision: boolean;

  @ApiProperty()
  enforceSSO: boolean;

  @ApiProperty()
  allowedDomains: string[];

  @ApiProperty()
  createdAt: Date;
}

export class SAMLMetadataResponseDto {
  @ApiProperty()
  entityId: string;

  @ApiProperty()
  acsUrl: string;

  @ApiProperty()
  sloUrl: string;

  @ApiProperty()
  certificate: string;

  @ApiProperty()
  metadataXml: string;
}
