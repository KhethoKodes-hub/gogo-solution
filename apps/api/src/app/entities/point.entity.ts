import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'wp_points' })
export class PointEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'rout_id', nullable: true })
  routId!: number | null;

  @Column({ type: 'longtext', nullable: true })
  points!: string | null;
}
