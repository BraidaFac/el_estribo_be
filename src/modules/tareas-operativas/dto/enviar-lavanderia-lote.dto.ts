import { IsArray, IsInt, Min } from 'class-validator';

export class EnviarLavanderiaLoteDto {
  @IsArray()
  @IsInt({ each: true })
  ids: number[];

  @IsInt()
  @Min(1)
  lavanderiaId: number;
}
