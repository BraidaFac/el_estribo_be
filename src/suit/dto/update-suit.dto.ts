import { CreateSuitDto } from './create-suit.dto';
import { PartialType } from '@nestjs/mapped-types';
export class UpdateSuitDto extends PartialType(CreateSuitDto) {}
