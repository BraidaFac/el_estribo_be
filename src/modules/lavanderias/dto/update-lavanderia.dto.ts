import { PartialType } from '@nestjs/mapped-types';
import { CreateLavanderiaDto } from './create-lavanderia.dto';

export class UpdateLavanderiaDto extends PartialType(CreateLavanderiaDto) {}
