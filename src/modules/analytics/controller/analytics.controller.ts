import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'src/utils/user_utils';
import { BiQueryDto } from '../dto/bi-query.dto';
import { AnalyticsService } from '../service/analytics.service';

@Controller('v2/analytics')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('bi')
  getBiData(@Query() query: BiQueryDto) {
    return this.analyticsService.getBiData(
      query.desde,
      query.hasta,
      query.granularidad,
    );
  }
}
