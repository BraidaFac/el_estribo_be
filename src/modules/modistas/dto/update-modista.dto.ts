import { PartialType } from '@nestjs/mapped-types';
import { CreateModistaDto } from './create-modista.dto';

export class UpdateModistaDto extends PartialType(CreateModistaDto) {}
