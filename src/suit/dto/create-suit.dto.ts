import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { SuitCategory, SuitState } from 'src/utils/suit_utils';
import { Size } from '../entity/suit.entity';

export class CreateSuitDto {
  @IsNotEmpty()
  id: string;
  @IsString()
  @IsNotEmpty()
  brand: string;
  @IsEnum(SuitCategory)
  @IsNotEmpty()
  category: SuitCategory;
  @IsOptional()
  @IsEnum(SuitState)
  state?: SuitState;
  @IsOptional()
  size: Size;
  @IsNotEmpty()
  @IsString()
  color: string;
}
