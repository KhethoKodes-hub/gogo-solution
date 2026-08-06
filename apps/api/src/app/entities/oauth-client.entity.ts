import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'app_oauth_clients' })
@Unique(['clientId'])
export class OAuthClientEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 120, name: 'client_id' })
  clientId!: string;

  @Column({ type: 'varchar', length: 255, name: 'client_secret_hash' })
  clientSecretHash!: string;

  @Column({ type: 'varchar', length: 255, name: 'allowed_scopes', default: '' })
  allowedScopes!: string;

  @Column({ type: 'tinyint', width: 1, name: 'is_active', default: () => '1' })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 120, default: '' })
  name!: string;
}
