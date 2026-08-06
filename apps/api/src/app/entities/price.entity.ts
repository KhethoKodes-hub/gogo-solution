import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'wp_price' })
export class PriceEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'rout_id', nullable: true })
  rout_id!: number | null;

  @Column({ type: 'int', name: 'route_id', nullable: true })
  route_id!: number | null;

  @Column({ type: 'int', name: 'shuttle_id', nullable: true })
  shuttle_id!: number | null;

  @Column({ type: 'varchar', length: 50, name: 'shuttle_capacity', nullable: true })
  shuttle_capacity!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'round_price', nullable: true })
  round_price!: string | null;
}
