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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
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
  ): Promise<void> {
    await this.tareasOperativasService.registrarEnvioLavanderiaPorReserva(
      reservaId,
      body,
    );
  }

  @Post('reservas/:reservaId/recibir-lavanderia')
  @HttpCode(204)
  async registrarReciboLavanderiaReserva(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() body: AccionTareaOperativaDto,
  ): Promise<void> {
    await this.tareasOperativasService.registrarRecibirLavanderiaPorReserva(
      reservaId,
      body,
    );
  }

  @Post('reservas/:reservaId/enviar-modista')
  @HttpCode(204)
  async registrarEnvioModistaReserva(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() body: EnviarModistaReservaDto,
  ): Promise<void> {
    await this.tareasOperativasService.registrarEnvioModistaPorReserva(
      reservaId,
      body,
    );
  }

  @Post('reservas/:reservaId/recibir-modista')
  @HttpCode(204)
  async registrarReciboModistaReserva(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() body: AccionTareaOperativaDto,
  ): Promise<void> {
    await this.tareasOperativasService.registrarRecibirModistaPorReserva(
      reservaId,
      body,
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
  ) {
    return this.tareasOperativasService.actualizarEstado(
      tareaId,
      body.estado,
      body.usuarioId,
      body.motivo,
    );
  }

  @Post(':tareaId/enviar-lavanderia')
  enviarLavanderia(
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() body: AccionTareaOperativaDto,
  ) {
    return this.tareasOperativasService.marcarEnviadoLavanderia(
      tareaId,
      body.usuarioId,
      body.motivo,
    );
  }

  @Post(':tareaId/recibir-lavanderia')
  recibirLavanderia(
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() body: AccionTareaOperativaDto,
  ) {
    return this.tareasOperativasService.marcarRecibidoLavanderia(
      tareaId,
      body.usuarioId,
      body.motivo,
    );
  }

  @Post(':tareaId/enviar-modista')
  enviarModista(
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() body: AccionTareaOperativaDto,
  ) {
    return this.tareasOperativasService.marcarEnviadoModista(
      tareaId,
      body.usuarioId,
      body.motivo,
    );
  }

  @Post(':tareaId/recibir-modista')
  recibirModista(
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() body: AccionTareaOperativaDto,
  ) {
    return this.tareasOperativasService.marcarRecibidoModista(
      tareaId,
      body.usuarioId,
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
