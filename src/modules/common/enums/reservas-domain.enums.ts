export enum TipoPrenda {
  SACO = 'SACO',
  PANTALON = 'PANTALON',
}

export enum CondicionPrenda {
  LIMPIA = 'LIMPIA',
  SUCIA = 'SUCIA',
  REQUIERE_REVISION = 'REQUIERE_REVISION',
}

export enum EstadoReserva {
  CONFIRMADA = 'CONFIRMADA',
  /** Control pre-entrega aprobado; habilita retiro en el local. */
  LISTO_PARA_ENTREGAR = 'LISTO_PARA_ENTREGAR',
  EN_CURSO = 'EN_CURSO',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA',
}

export enum EstadoControlPreEntrega {
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  /** Rechazo corregido manualmente; equivalente a aprobado para retiro. */
  RESUELTO = 'RESUELTO',
  /** Aprobación anulada por reversión de paso. */
  REVERTIDO = 'REVERTIDO',
}

export enum EstadoUbicacionPrenda {
  TIENDA = 'TIENDA',
  EN_MODISTA = 'EN_MODISTA',
  EN_LAVANDERIA = 'EN_LAVANDERIA',
  RETIRADO_CLIENTE = 'RETIRADO_CLIENTE',
}

export enum TipoBloqueo {
  MEDICION = 'MEDICION',
  RESERVA = 'RESERVA',
  MODISTA = 'MODISTA',
  LISTO_TIENDA = 'LISTO_TIENDA',
  LAVANDERIA = 'LAVANDERIA',
  MANTENIMIENTO = 'MANTENIMIENTO',
  MANUAL = 'MANUAL',
}

export enum OrigenBloqueo {
  AUTOMATICO = 'AUTOMATICO',
  MANUAL = 'MANUAL',
}

export enum EstadoBloqueo {
  ACTIVO = 'ACTIVO',
  CANCELADO = 'CANCELADO',
}

export enum TipoTareaOperativa {
  LLEVAR_LAVANDERIA = 'LLEVAR_LAVANDERIA',
  LLEVAR_MODISTA = 'LLEVAR_MODISTA',
  CONTACTAR_MEDICION = 'CONTACTAR_MEDICION',
}

export enum EstadoTareaOperativa {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA',
}

export enum PrioridadTareaOperativa {
  ALTA = 'ALTA',
  MEDIA = 'MEDIA',
  BAJA = 'BAJA',
}

export enum EstadoAgendaMedicion {
  PROGRAMADA = 'PROGRAMADA',
  ASISTIO = 'ASISTIO',
  NO_ASISTIO = 'NO_ASISTIO',
  REPROGRAMADA = 'REPROGRAMADA',
  CANCELADA = 'CANCELADA',
}

/** Categorías de motivo de rechazo en control pre-entrega. */
export enum MotivoRechazoPreEntrega {
  AROMA = 'AROMA',
  PLANCHADO = 'PLANCHADO',
  SASTRERIA = 'SASTRERIA',
  HIGIENE = 'HIGIENE',
  COMPLEMENTOS = 'COMPLEMENTOS',
  OTRO = 'OTRO',
}

/** Inspección al devolver: botones / cierres. */
export enum BotonesCierresInspeccion {
  OK = 'OK',
  DANO_LEVE = 'DANO_LEVE',
}

/** Inspección al devolver: ruedos / telas. */
export enum RuedosTelasInspeccion {
  OK = 'OK',
  ENGANCHE = 'ENGANCHE',
  ROTURA = 'ROTURA',
}

/** Daño grave al devolver el traje. */
export enum DanoGraveInspeccion {
  OK = 'OK',
  QUEMADURA = 'QUEMADURA',
  MANCHA_QUIMICA = 'MANCHA_QUIMICA',
}

/** Estado general del traje al devolver. */
export enum EstadoGeneralDevolucion {
  SUCIIO_O_MANCHADO = 'SUCIIO_O_MANCHADO',
  IMPECABLE = 'IMPECABLE',
}

/** Destino de lavado tras la devolución. */
export enum DecisionLavadoPostDevolucion {
  LAVANDERIA_EXTERNA = 'LAVANDERIA_EXTERNA',
  LIMPIEZA_LOCAL = 'LIMPIEZA_LOCAL',
}

export enum TipoPasoCompletado {
  CONTACTO_MEDICION_MARCADO = 'CONTACTO_MEDICION_MARCADO',
  MEDICION_PROGRAMADA = 'MEDICION_PROGRAMADA',
  MEDICIONES_REGISTRADAS = 'MEDICIONES_REGISTRADAS',
  LAVANDERIA_OMITIDA = 'LAVANDERIA_OMITIDA',
  MODISTA_OMITIDA = 'MODISTA_OMITIDA',
  ENVIO_LAVANDERIA = 'ENVIO_LAVANDERIA',
  RECEPCION_LAVANDERIA = 'RECEPCION_LAVANDERIA',
  ENVIO_MODISTA = 'ENVIO_MODISTA',
  RECEPCION_MODISTA = 'RECEPCION_MODISTA',
  CONTROL_PRE_ENTREGA = 'CONTROL_PRE_ENTREGA',
  RETIRO_CLIENTE = 'RETIRO_CLIENTE',
  DEVOLUCION_CLIENTE = 'DEVOLUCION_CLIENTE',
}
