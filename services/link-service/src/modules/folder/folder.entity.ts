import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('folders')
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  parentId?: string;

  @ManyToOne(() => Folder, (folder) => folder.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: Folder;

  @OneToMany(() => Folder, (folder) => folder.parent)
  children?: Folder[];

  @Column({ default: 0 })
  linkCount: number;

  @Column({ default: '#6366f1' })
  color: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
