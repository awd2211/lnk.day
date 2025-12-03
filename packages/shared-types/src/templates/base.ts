/**
 * Base types for all template entities
 */

/**
 * Common fields for all template entities
 */
export interface BaseTemplate {
  id: string;
  teamId: string;
  createdBy: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Common fields for creating templates
 */
export interface BaseCreateTemplateDto {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}
