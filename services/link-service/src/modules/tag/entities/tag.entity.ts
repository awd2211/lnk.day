import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('tags')
@Index(['teamId', 'name'], { unique: true })
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  @Index()
  teamId: string;

  @Column({ nullable: true })
  color?: string; // HEX color for UI display

  @Column({ nullable: true })
  icon?: string; // Icon identifier for UI

  @Column({ nullable: true })
  parentId?: string; // For hierarchical tags/groups

  @Column({ default: 0 })
  usageCount: number;

  @Column({ default: 0 })
  order: number; // For custom ordering

  @Column('jsonb', { default: {} })
  metadata: {
    autoApplyRules?: Array<{
      type: 'url_pattern' | 'utm_source' | 'utm_campaign' | 'domain';
      value: string;
    }>;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('tag_groups')
@Index(['teamId', 'name'], { unique: true })
export class TagGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  @Index()
  teamId: string;

  @Column({ nullable: true })
  color?: string;

  @Column({ default: 0 })
  order: number;

  @Column({ default: false })
  isExclusive: boolean; // Only one tag from group can be applied

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
