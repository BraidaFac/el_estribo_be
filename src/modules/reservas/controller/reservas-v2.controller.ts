import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { AccionReservaDto } from '../dto/accion-reserva.dto';
import { DevolucionClienteDto } from '../dto/devolucion-cliente.dto';
import { QueryHistorialReservasDto } from '../dto/query-historial-reservas.dto';
import { ActualizarReservaV2Dto } from '../dto/actualizar-reserva-v2.dto';
import { CreateReservaV2Dto } from '../dto/create-reserva-v2.dto';
import { QueryReservasRangoDto } from '../dto/query-reservas-rango.dto';
import { QueryDisponibilidadDto } from '../dto/query-disponibilidad.dto';
import { GuardarMedicionesReservaDto } from '../dto/guardar-mediciones-reserva.dto';
import { ValidarReservaV2Dto } from '../dto/validar-reserva-v2.dto';
import { MedicionesReservaService } from '../service/mediciones-reserva.service';
import { PasosReservaService } from '../service/pasos-reserva.service';
import { RevertirPasoService } from '../service/revertir-paso.service';
import { ReservasV2Service } from '../service/reservas-v2.service';
import { RevertirUltimoPasoDto } from '../dto/pasos-reserva.dto';

@Controller('v2/reservas')
@UseGuards(AuthGuard)
export class ReservasV2Controller {
  constructor(
    private readonly reservasV2Service: ReservasV2Service,
    private readonly medicionesReservaService: MedicionesReservaService,
    private readonly pasosReservaService: PasosReservaService,
    private readonly revertirPasoService: RevertirPasoService,
  ) {}

  @Get()
  listar(@Query() query: QueryReservasRangoDto) {
    return this.reservasV2Service.listarPorRango(
      query.desde,
      query.hasta,
      query.sacoId,
    );
  }

  @Get('dashboard-operativo')
  dashboardOperativo() {
    return this.reservasV2Service.dashboardOperativo();
  }

  @Get('historial')
  listarHistorial(@Query() query: QueryHistorialReservasDto) {
    return this.reservasV2Service.listarHistorialReservas(query);
  }

  @Get('disponibilidad/sacos/:sacoId')
  disponibilidadSaco(
    @Param('sacoId', ParseIntPipe) sacoId: number,
    @Query() query: QueryDisponibilidadDto,
  ) {
    return this.reservasV2Service.disponibilidadSaco(
      sacoId,
      query.desde,
      query.hasta,
    );
  }

  @Get('disponibilidad/pantalones')
  pantalonesDisponibles(@Query('fecha') fecha: string) {
    return this.reservasV2Service.pantalonesDisponibles(fecha);
  }

  @Post('validar')
  async validar(@Body() body: ValidarReservaV2Dto) {
    await this.reservasV2Service.validarPreConfirmacion(body);
    return { valid: true };
  }

  @Post()
  crear(@Body() body: CreateReservaV2Dto, @Req() request: any) {
    return this.reservasV2Service.crearReserva(body, request?.user?.sub);
  }

  @Patch(':reservaId')
  actualizar(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() body: ActualizarReservaV2Dto,
  ) {
    return this.reservasV2Service.actualizarReserva(reservaId, body);
  }

  @Get(':reservaId/detalle-operativo')
  detalleOperativo(@Param('reservaId', ParseIntPipe) reservaId: number) {
    return this.reservasV2Service.obtenerDetalleOperativoReserva(reservaId);
  }

  @Get(':reservaId/mediciones')
  obtenerMediciones(@Param('reservaId', ParseIntPipe) reservaId: number) {
    return this.medicionesReservaService.obtenerPorReserva(reservaId);
  }

  @Put(':reservaId/mediciones')
  guardarMediciones(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() body: GuardarMedicionesReservaDto,
    @Req() request: any,
  ) {
    return this.medicionesReservaService.guardar(
      reservaId,
      body,
      request?.user?.sub,
    );
  }

  @Post(':reservaId/retirar')
  marcarRetirada(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() body: AccionReservaDto,
    @Req() request: any,
  ) {
    return this.reservasV2Service.marcarRetiradaCliente(
      reservaId,
      body.usuarioId ?? request?.user?.sub,
      body.motivo,
    );
  }

  @Post(':reservaId/devolver')
  marcarDevolucion(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() body: DevolucionClienteDto,
    @Req() request: any,
  ) {
    return this.reservasV2Service.marcarDevolucionCliente(
      reservaId,
      body.recepcion,
      body.usuarioId ?? request?.user?.sub,
      body.motivo,
    );
  }

  @Post(':reservaId/cancelar')
  cancelar(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() body: AccionReservaDto,
    @Req() request: any,
  ) {
    return this.reservasV2Service.cancelarReserva(
      reservaId,
      body.usuarioId ?? request?.user?.sub,
      body.motivo,
    );
  }

  @Get(':reservaId/pasos-completados')
  obtenerPasosCompletados(@Param('reservaId', ParseIntPipe) reservaId: number) {
    return this.pasosReservaService.obtenerPasosCompletados(reservaId);
  }

  @Post(':reservaId/revertir-ultimo-paso')
  revertirUltimoPaso(
    @Param('reservaId', ParseIntPipe) reservaId: number,
    @Body() body: RevertirUltimoPasoDto,
    @Req() request: any,
  ) {
    return this.revertirPasoService.revertirUltimoPaso(
      reservaId,
      body,
      request?.user?.sub,
    );
  }
}
