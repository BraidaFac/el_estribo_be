import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateSuitDto } from '../dto/create-suit.dto';
import { UpdateSuitDto } from '../dto/update-suit.dto';
import { SuitService } from '../service/suit.service';
@Controller('suit')
@UseGuards(AuthGuard)
export class SuitController {
  constructor(private suitService: SuitService) {}
  @Get()
  getSuits() {
    return this.suitService.getSuits();
  }
  @Get('laundry')
  getSuitToLoundry() {
    return this.suitService.getSuitToLoundry();
  }
  @Get('laundry/take')
  getSuitToTakeLoundry() {
    return this.suitService.getSuitToTakeLoundry();
  }
  @Get('laundry/in')
  getSuitInLoundry() {
    return this.suitService.getSuitsInLoundry();
  }
  @Get('free')
  getFreeSuits(@Query('date') date?: string, @Query('suit') id?: string) {
    console.log(date, id);
    return this.suitService.getFreeSuits({ date, id });
  }
  @Get('/:id')
  getOneSuit(@Param('id') id: string) {
    return this.suitService.getSuit(id);
  }
  @Post()
  createSuit(@Body() suit: CreateSuitDto) {
    return this.suitService.createSuit(suit);
  }
  @Delete('/:id')
  deleteSuit(@Param('id') id: string) {
    return this.suitService.deleteSuit(id);
  }
  @Patch('/:id')
  updateSuit(@Param('id') id: string, @Body() suit: UpdateSuitDto) {
    return this.suitService.updateSuit(id, suit);
  }
}
