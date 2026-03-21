import { BloqueoPrenda } from 'src/modules/bloqueos/entity/bloqueo-prenda.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'bloqueos_prenda_eventos' })
export class BloqueoPrendaEvento {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => BloqueoPrenda, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bloqueo_id' })
  bloqueo: BloqueoPrenda;

  @Column({ type: 'varchar', length: 60 })
  evento: string;

  @Column({ name: 'payload_json', type: 'json', nullable: true })
  payloadJson: Record<string, unknown> | null;

  @Column({ name: 'usuario_id', type: 'varchar', length: 80, nullable: true })
  usuarioId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
