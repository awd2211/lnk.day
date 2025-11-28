import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Team } from './team.entity';
import { User } from '../../user/entities/user.entity';
import { CustomRole } from './custom-role.entity';

export enum TeamMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

@Entity('team_members')
@Unique(['teamId', 'userId'])
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  teamId: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: TeamMemberRole, default: TeamMemberRole.MEMBER })
  role: TeamMemberRole;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  customRoleId?: string;

  @ManyToOne(() => CustomRole, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customRoleId' })
  customRole?: CustomRole;

  @CreateDateColumn()
  joinedAt: Date;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: Team;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
