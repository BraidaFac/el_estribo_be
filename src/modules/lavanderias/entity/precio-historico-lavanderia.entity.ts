import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Lavanderia } from './lavanderia.entity';

@Entity({ name: 'precio_historico_lavanderia' })
export class PrecioHistoricoLavanderia {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Lavanderia, (l) => l.precios, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lavanderia_id' })
  lavanderia: Lavanderia;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: { to: (v: number) => v, from: (v: string) => parseFloat(v) },
  })
  precio: number;

  @Column({ type: 'date', name: 'vigencia_desde' })
  vigenciaDesde: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
