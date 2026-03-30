import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ResolverRechazoPreEntregaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  resueltoPor: string;
}
