import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'wp_route' })
export class RouteEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  start!: string;

  @Column({ type: 'text' })
  end!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  distance!: string | null;

  @Column({ type: 'text', nullable: true })
  name!: string | null;

  @Column({ type: 'text', name: 'travel_time', nullable: true })
  travelTime!: string | null;

  @Column({ type: 'longtext', nullable: true })
  schools!: string | null;
}
