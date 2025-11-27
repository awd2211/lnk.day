import { ApiProperty } from '@nestjs/swagger';
import { DomainStatus, SSLStatus } from '../entities/custom-domain.entity';

export class DomainVerificationDto {
  @ApiProperty()
  domain: string;

  @ApiProperty({ enum: DomainStatus })
  status: DomainStatus;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty({ type: [Object] })
  requiredRecords: {
    type: string;
    name: string;
    value: string;
    description: string;
  }[];

  @ApiProperty({ type: [Object], nullable: true })
  currentRecords: {
    type: string;
    name: string;
    value: string;
    valid: boolean;
  }[] | null;

  @ApiProperty({ nullable: true })
  lastCheckAt: Date | null;

  @ApiProperty({ nullable: true })
  lastCheckError: string | null;
}

export class DomainDetailsDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  domain: string;

  @ApiProperty({ enum: DomainStatus })
  status: DomainStatus;

  @ApiProperty({ enum: SSLStatus })
  sslStatus: SSLStatus;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty({ nullable: true })
  verifiedAt: Date | null;

  @ApiProperty({ nullable: true })
  sslExpiresAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}
