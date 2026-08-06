import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

export type UserRole = 'admin' | 'school';

@Entity({ name: 'app_users' })
@Unique(['email'])
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 120, name: 'display_name' })
  displayName!: string;

  @Column({ type: 'varchar', length: 20, default: 'school' })
  role!: UserRole;

  @Column({ type: 'varchar', length: 50, name: 'contact_number', nullable: true })
  contactNumber!: string | null;

  @Column({ type: 'int', name: 'school_id', nullable: true })
  schoolId!: number | null;
}
