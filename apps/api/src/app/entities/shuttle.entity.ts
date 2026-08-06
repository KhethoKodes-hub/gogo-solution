import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'wp_shuttle' })
export class ShuttleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: true })
  capacity!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  number!: string | null;
}
