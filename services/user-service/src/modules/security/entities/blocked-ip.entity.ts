import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('blocked_ips')
@Index('IDX_blocked_ips_ip', ['ipAddress'])
@Index('IDX_blocked_ips_expires', ['expiresAt'])
export class BlockedIp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 45 })
  ipAddress: string; // 支持 IPv4, IPv6, 和 CIDR 格式

  @Column({ length: 255 })
  reason: string;

  @Column('uuid')
  blockedById: string; // 封禁该 IP 的管理员 ID

  @Column({ length: 100 })
  blockedByName: string; // 管理员名称

  @Column({ default: false })
  permanent: boolean; // 是否永久封禁

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null; // 过期时间，null 表示永久

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
