import { IsNumber, Min } from 'class-validator';
import { AccionTareaOperativaDto } from './accion-tarea-operativa.dto';

export class RecibirModistaDto extends AccionTareaOperativaDto {
  @IsNumber()
  @Min(0)
  costoModista: number;
}
