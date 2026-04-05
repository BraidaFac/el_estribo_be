import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AccesoriosModule } from './modules/accesorios/accesorios.module';
import { ReservaExtrasModule } from './modules/reserva-extras/reserva-extras.module';
import { BloqueosModule } from './modules/bloqueos/bloqueos.module';
import { ControlPreEntregaModule } from './modules/control-pre-entrega/control-pre-entrega.module';
import { CalendarioLaboralModule } from './modules/calendario-laboral/calendario-laboral.module';
import { ConfiguracionGeneralModule } from './modules/configuracion-general/configuracion-general.module';
import { LavanderiasModule } from './modules/lavanderias/lavanderias.module';
import { ModistasModule } from './modules/modistas/modistas.module';
import { OperacionesPrendaModule } from './modules/operaciones-prenda/operaciones-prenda.module';
import { PantalonesModule } from './modules/pantalones/pantalones.module';
import { ReservasModule } from './modules/reservas/reservas.module';
import { SacosModule } from './modules/sacos/sacos.module';
import { TareasOperativasModule } from './modules/tareas-operativas/tareas-operativas.module';
import databaseConfig from './config/database.config';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (db: ConfigType<typeof databaseConfig>) => ({
        type: db.type,
        host: db.host,
        port: db.port,
        username: db.username,
        password: db.password,
        database: db.database,
        timezone: db.timezone,
        dateStrings: db.dateStrings,
        autoLoadEntities: db.autoLoadEntities,
        synchronize: db.synchronize,
      }),
    }),
    SacosModule,
    PantalonesModule,
    ReservasModule,
    BloqueosModule,
    CalendarioLaboralModule,
    ConfiguracionGeneralModule,
    LavanderiasModule,
    ModistasModule,
    OperacionesPrendaModule,
    TareasOperativasModule,
    ControlPreEntregaModule,
    AuthModule,
    UserModule,
    AccesoriosModule,
    ReservaExtrasModule,
    AnalyticsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
