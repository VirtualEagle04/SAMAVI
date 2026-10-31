// Detección de huevos por sensor VL53L0X, común a main.cpp y a los programas de
// prueba para que todos cuenten igual.
//
// Cada sensor es una máquina de dos estados (libre / huevo al frente) con
// histéresis en distancia y confirmación por lecturas consecutivas:
// - "dentro": medición válida (estado 0) entre DISTANCIA_MIN_MM y DISTANCIA_MAX_MM.
// - "fuera": nada al frente (estado 4) o medición válida a más de HISTERESIS_MM
//   de la zona. Entre la zona y la histéresis no cambia nada: así el ruido de una
//   superficie cerca del borde no hace contar una y otra vez.
// - Los estados 1 a 3 (señal débil, sigma alta) no son fiables: no confirman ni
//   liberan.
// Un huevo cuenta al confirmar LECTURAS_PARA_ENTRAR lecturas "dentro" y el sensor
// queda libre tras LECTURAS_PARA_SALIR lecturas "fuera" seguidas. No hay un tiempo
// de debounce: la confirmación de salida es la que evita contar dos veces.

#ifndef DETECCION_H
#define DETECCION_H

#include <Arduino.h>
#include "config.h"

// Periodo de medición continua de cada VL53L0X. Cada medición tarda unos 33 ms
// (presupuesto por defecto de la librería): con 33 ms el sensor se salta ciclos y
// da ~16 lecturas/s; con 40 ms da ~25 (medido con sensores_test).
const uint16_t PERIODO_MEDICION_MS = 40;
const uint16_t HISTERESIS_MM = 10;
const uint8_t LECTURAS_PARA_ENTRAR = 2;
const uint8_t LECTURAS_PARA_SALIR = 3;
const uint8_t ESTADO_VALIDO = 0;
const uint8_t ESTADO_NADA_AL_FRENTE = 4;

enum EventoDeteccion { SIN_CAMBIO, HUEVO_NUEVO, HUEVO_SALIO };

enum ClaseLectura { LECTURA_DENTRO, LECTURA_FUERA, LECTURA_NEUTRA };

struct DetectorHuevo {
  bool activo = false;
  uint8_t dentroSeguidas = 0;
  uint8_t fueraSeguidas = 0;
};

inline ClaseLectura clasificarLectura(uint16_t mm, uint8_t estado) {
  if (estado == ESTADO_NADA_AL_FRENTE) {
    return LECTURA_FUERA;
  }
  if (estado != ESTADO_VALIDO) {
    return LECTURA_NEUTRA;
  }
  if (mm >= DISTANCIA_MIN_MM && mm <= DISTANCIA_MAX_MM) {
    return LECTURA_DENTRO;
  }
  bool lejosDeLaZona = mm + HISTERESIS_MM < DISTANCIA_MIN_MM || mm > DISTANCIA_MAX_MM + HISTERESIS_MM;
  return lejosDeLaZona ? LECTURA_FUERA : LECTURA_NEUTRA;
}

inline EventoDeteccion procesarLectura(DetectorHuevo& d, uint16_t mm, uint8_t estado) {
  ClaseLectura clase = clasificarLectura(mm, estado);
  if (clase == LECTURA_DENTRO) {
    d.fueraSeguidas = 0;
    if (!d.activo && ++d.dentroSeguidas >= LECTURAS_PARA_ENTRAR) {
      d.activo = true;
      d.dentroSeguidas = 0;
      return HUEVO_NUEVO;
    }
  } else if (clase == LECTURA_FUERA) {
    d.dentroSeguidas = 0;
    if (d.activo && ++d.fueraSeguidas >= LECTURAS_PARA_SALIR) {
      d.activo = false;
      d.fueraSeguidas = 0;
      return HUEVO_SALIO;
    }
  }
  return SIN_CAMBIO;
}

#endif
