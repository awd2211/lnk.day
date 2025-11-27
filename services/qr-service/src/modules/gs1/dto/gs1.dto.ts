import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ParseDigitalLinkDto {
  @ApiProperty({
    description: 'GS1 Digital Link URL to parse',
    example: 'https://example.com/01/09521234567890/21/12345?10=ABC123',
  })
  @IsString()
  url: string;
}

export class ParseBarcodeDto {
  @ApiProperty({
    description: 'GS1-128 barcode data string',
    example: '0109521234567890211234510ABC123',
  })
  @IsString()
  barcodeData: string;
}

export class GenerateDigitalLinkOptionsDto {
  @ApiPropertyOptional({ description: 'Serial number (AI 21)', example: '12345' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Batch/Lot number (AI 10)', example: 'ABC123' })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional({
    description: 'Expiry date (YYYY-MM-DD or YYMMDD)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional({
    description: 'Additional Application Identifiers',
    example: { '37': '100', '400': 'ORDER123' },
  })
  @IsOptional()
  @IsObject()
  additionalAIs?: Record<string, string>;
}

export class GenerateDigitalLinkDto {
  @ApiProperty({
    description: 'Domain for the Digital Link',
    example: 'id.example.com',
  })
  @IsString()
  domain: string;

  @ApiProperty({
    description: 'Global Trade Item Number (GTIN)',
    example: '09521234567890',
  })
  @IsString()
  gtin: string;

  @ApiPropertyOptional({ type: GenerateDigitalLinkOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GenerateDigitalLinkOptionsDto)
  options?: GenerateDigitalLinkOptionsDto;
}

export class ValidateGTINDto {
  @ApiProperty({
    description: 'GTIN to validate (8, 12, 13, or 14 digits)',
    example: '09521234567890',
  })
  @IsString()
  gtin: string;
}

// Response DTOs

export class GS1ApplicationIdentifierDto {
  @ApiProperty({ description: 'Application Identifier code', example: '01' })
  ai: string;

  @ApiProperty({ description: 'Human-readable label', example: 'GTIN' })
  label: string;

  @ApiProperty({ description: 'Value of the identifier', example: '09521234567890' })
  value: string;

  @ApiPropertyOptional({ description: 'Format specification', example: 'N14' })
  format?: string;
}

export class GS1ParseResultDto {
  @ApiProperty({ description: 'Whether the parsing was successful' })
  valid: boolean;

  @ApiPropertyOptional({ description: 'Global Trade Item Number' })
  gtin?: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Batch/Lot number' })
  batchNumber?: string;

  @ApiPropertyOptional({ description: 'Expiry date (YYYY-MM-DD)' })
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Quantity' })
  quantity?: number;

  @ApiProperty({ type: [GS1ApplicationIdentifierDto] })
  allIdentifiers: GS1ApplicationIdentifierDto[];

  @ApiProperty({ description: 'Digital Link URL or path' })
  digitalLink: string;

  @ApiPropertyOptional({ description: 'Error message if parsing failed' })
  error?: string;
}

export class GS1DigitalLinkDto {
  @ApiProperty({ description: 'Domain of the Digital Link' })
  domain: string;

  @ApiProperty({ description: 'Primary key (GTIN)' })
  primaryKey: {
    ai: string;
    value: string;
  };

  @ApiProperty({ type: [GS1ApplicationIdentifierDto] })
  qualifiers: GS1ApplicationIdentifierDto[];

  @ApiProperty({ type: [GS1ApplicationIdentifierDto] })
  dataAttributes: GS1ApplicationIdentifierDto[];

  @ApiProperty({ description: 'Full constructed URL' })
  fullUrl: string;
}

export class ValidateGTINResultDto {
  @ApiProperty({ description: 'The GTIN that was validated' })
  gtin: string;

  @ApiProperty({ description: 'Whether the GTIN is valid' })
  valid: boolean;

  @ApiPropertyOptional({ description: 'Validation error message' })
  error?: string;
}

export class AIDefinitionDto {
  @ApiProperty({ description: 'Human-readable label' })
  label: string;

  @ApiProperty({ description: 'Format specification' })
  format: string;

  @ApiPropertyOptional({ description: 'Fixed length if applicable' })
  fixedLength?: number;
}
