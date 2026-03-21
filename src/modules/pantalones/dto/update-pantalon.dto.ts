import { PartialType } from '@nestjs/mapped-types';
import { CreatePantalonDto } from './create-pantalon.dto';

export class UpdatePantalonDto extends PartialType(CreatePantalonDto) {}
