import { PartialType } from '@nestjs/mapped-types';
import { CreateSacoDto } from './create-saco.dto';

export class UpdateSacoDto extends PartialType(CreateSacoDto) {}
