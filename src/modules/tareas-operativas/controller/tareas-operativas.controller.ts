import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { ReqWithUser } from 'src/auth/req-with-user.interface';
import { ActualizarEstadoTareaDto } from '../dto/actualizar-estado-tarea.dto';
import { AccionTareaOperativaDto } from '../dto/accion-tarea-operativa.dto';
import { ActualizarEstadoAgendaMedicionDto } from '../dto/actualizar-estado-agenda-medicion.dto';
import { ListarAgendaMedicionesQueryDto } from '../dto/listar-agenda-mediciones-query.dto';
import { EnviarLavanderiaReservaDto } from '../dto/enviar-lavanderia-reserva.dto';
import { EnviarModistaReservaDto } from '../dto/enviar-modista-reserva.dto';
import { ListarTareasOperativasQueryDto } from '../dto/listar-tareas-operativas-query.dto';
import { ProgramarMedicionDto } from '../dto/programar-medicion.dto';
import { TareasOperativasService } from '../service/tareas-operativas.service';

@Controller('v2/tareas-operativas')
@UseGuards(AuthGuard)
export class TareasOperativasController {
  constructor(
    private readonly tareasOperativasService: TareasOperativasService,
  ) {}

  @Get()
  listar(@Query() query: ListarTareasOperativasQueryDto) {
    return this.tareasOperativasService.listar(query);
  }

  @Get('agenda-mediciones')
  listarAgenda(@Query() query: ListarAgendaMedicionesQueryDto) {
    return this.tareasOperativasService.listarAgenda(
      query.desde,
      query.hasta,
      query.incluirTodosLosEstados,
    );
  }

  @Post('reservas/:reservaId/enviar-lavanderia')
  @HttpCode(204)
  async registrarEnvioLavanderiaReserva(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() body: EnviarLavanderiaReservaDto,
    @Req() req: ReqWithUser,
  ): Promise<void> {
    await this.tareasOperativasService.registrarEnvioLavanderiaPorReserva(
      reservaId,
      { ...body, usuarioId: req.user.sub },
    );
  }

  @Post('reservas/:reservaId/recibir-lavanderia')
  @HttpCode(204)
  async registrarReciboLavanderiaReserva(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() body: AccionTareaOperativaDto,
    @Req() req: ReqWithUser,
  ): Promise<void> {
    await this.tareasOperativasService.registrarRecibirLavanderiaPorReserva(
      reservaId,
      { ...body, usuarioId: req.user.sub },
    );
  }

  @Post('reservas/:reservaId/enviar-modista')
  @HttpCode(204)
  async registrarEnvioModistaReserva(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() body: EnviarModistaReservaDto,
    @Req() req: ReqWithUser,
  ): Promise<void> {
    await this.tareasOperativasService.registrarEnvioModistaPorReserva(
      reservaId,
      { ...body, usuarioId: req.user.sub },
    );
  }

  @Post('reservas/:reservaId/recibir-modista')
  @HttpCode(204)
  async registrarReciboModistaReserva(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() body: AccionTareaOperativaDto,
    @Req() req: ReqWithUser,
  ): Promise<void> {
    await this.tareasOperativasService.registrarRecibirModistaPorReserva(
      reservaId,
      { ...body, usuarioId: req.user.sub },
    );
  }

  @Patch('agenda-mediciones/:agendaId/estado')
  actualizarEstadoAgenda(
    @Param('agendaId', ParseIntPipe) agendaId: number,
    @Body() body: ActualizarEstadoAgendaMedicionDto,
  ) {
    return this.tareasOperativasService.actualizarEstadoAgendaMedicion(
      agendaId,
      body.estado,
      body.observaciones,
    );
  }

  @Patch(':tareaId/estado')
  actualizarEstado(
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() body: ActualizarEstadoTareaDto,
    @Req() req: ReqWithUser,
  ) {
    return this.tareasOperativasService.actualizarEstado(
      tareaId,
      body.estado,
      req.user.sub,
      body.motivo,
    );
  }

  @Post(':tareaId/enviar-lavanderia')
  enviarLavanderia(
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() body: AccionTareaOperativaDto,
    @Req() req: ReqWithUser,
  ) {
    return this.tareasOperativasService.marcarEnviadoLavanderia(
      tareaId,
      req.user.sub,
      body.motivo,
    );
  }

  @Post(':tareaId/recibir-lavanderia')
  recibirLavanderia(
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() body: AccionTareaOperativaDto,
    @Req() req: ReqWithUser,
  ) {
    return this.tareasOperativasService.marcarRecibidoLavanderia(
      tareaId,
      req.user.sub,
      body.motivo,
    );
  }

  @Post(':tareaId/enviar-modista')
  enviarModista(
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() body: AccionTareaOperativaDto,
    @Req() req: ReqWithUser,
  ) {
    return this.tareasOperativasService.marcarEnviadoModista(
      tareaId,
      req.user.sub,
      body.motivo,
    );
  }

  @Post(':tareaId/recibir-modista')
  recibirModista(
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() body: AccionTareaOperativaDto,
    @Req() req: ReqWithUser,
  ) {
    return this.tareasOperativasService.marcarRecibidoModista(
      tareaId,
      req.user.sub,
      body.motivo,
    );
  }

  @Post(':tareaId/programar-medicion')
  programarMedicion(
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() body: ProgramarMedicionDto,
  ) {
    return this.tareasOperativasService.programarMedicion(tareaId, body);
  }

  @Post(':tareaId/marcar-contacto-medicion')
  marcarContactoMedicion(@Param('tareaId', ParseIntPipe) tareaId: number) {
    return this.tareasOperativasService.marcarContactoMedicion(tareaId);
  }
}
