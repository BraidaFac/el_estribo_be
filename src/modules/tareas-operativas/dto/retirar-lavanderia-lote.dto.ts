import { IsArray, IsInt } from 'class-validator';

export class RetirarLavanderiaLoteDto {
  @IsArray()
  @IsInt({ each: true })
  ids: number[];
}
