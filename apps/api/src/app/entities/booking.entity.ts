import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'wp_booking' })
export class BookingEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  booking_id!: string | null;

  @Column({ type: 'int', name: 'rout_id', nullable: true })
  rout_id!: number | null;

  @Column({ type: 'int', name: 'shuttle_id', nullable: true })
  shuttle_id!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  shuttle_number!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bus_capacity!: string | null;

  @Column({ type: 'text', nullable: true })
  route_start!: string | null;

  @Column({ type: 'text', nullable: true })
  route_end!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  purchase_order!: string | null;

  @Column({ type: 'int', nullable: true })
  customer_id!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customer_info!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  booking_status!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  booking_date!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  booking_time!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contact_name!: string | null;

  @Column({ type: 'varchar', length: 255, name: 'contact_person_no', nullable: true })
  contact_person_no!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  payment_status!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  last_updated!: string | null;

  @Column({ type: 'datetime', nullable: true })
  date_booked!: string | null;
}
