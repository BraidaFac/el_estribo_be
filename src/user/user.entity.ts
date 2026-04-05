import { ControlPreEntrega } from 'src/modules/control-pre-entrega/entity/control-pre-entrega.entity';
import { MedicionReserva } from 'src/modules/reservas/entity/medicion-reserva.entity';
import { RecepcionDevolucionReserva } from 'src/modules/reservas/entity/recepcion-devolucion-reserva.entity';
import { TareaOperativa } from 'src/modules/tareas-operativas/entity/tarea-operativa.entity';
import { UserRole } from 'src/utils/user_utils';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: string;
  @Column()
  name: string;
  @Column({ unique: true })
  userName: string;
  @Column()
  password: string;
  @Column({ default: UserRole.USER })
  role: UserRole;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => TareaOperativa, (tarea) => tarea.resueltoPor)
  tareasResueltas: TareaOperativa[];

  @OneToMany(() => TareaOperativa, (tarea) => tarea.creadoPor)
  tareasCreadas: TareaOperativa[];

  @OneToMany(() => ControlPreEntrega, (control) => control.resueltoPor)
  controlPreEntregasResueltas: ControlPreEntrega[];

  @OneToMany(
    () => RecepcionDevolucionReserva,
    (recepcion) => recepcion.resueltoPor,
  )
  recepcionesDevolucionResueltas: RecepcionDevolucionReserva[];

  @OneToMany(() => MedicionReserva, (medicion) => medicion.creadoPor)
  medicionesCreadas: MedicionReserva[];
}
