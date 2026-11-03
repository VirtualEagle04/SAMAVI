/**
 * Límite de intentos fallidos de inicio de sesión, por login y por IP, en una
 * ventana deslizante. Vive en memoria: vale porque hay un solo proceso de
 * backend, y se reinicia con él.
 */
export type LoginLimiterOptions = {
  ventanaMs: number;
  maxPorLogin: number;
  maxPorIp: number;
  /** Para pruebas. */
  now?: () => number;
};

/** Con más claves que esto se purgan las que ya no tienen fallos vigentes. */
const PURGAR_DESDE = 10_000;

export class LoginLimiter {
  private readonly porLogin = new Map<string, number[]>();
  private readonly porIp = new Map<string, number[]>();
  private readonly now: () => number;

  constructor(private readonly options: LoginLimiterOptions) {
    this.now = options.now ?? Date.now;
  }

  /** Segundos que faltan para poder intentar de nuevo, o null si se puede. */
  segundosDeEspera(ip: string, login: string): number | null {
    const ahora = this.now();
    const esperas = [
      this.espera(this.porLogin, login, this.options.maxPorLogin, ahora),
      this.espera(this.porIp, ip, this.options.maxPorIp, ahora),
    ].filter((valor): valor is number => valor !== null);
    return esperas.length === 0 ? null : Math.max(...esperas);
  }

  registrarFallo(ip: string, login: string): void {
    const ahora = this.now();
    this.agregar(this.porLogin, login, ahora);
    this.agregar(this.porIp, ip, ahora);
  }

  /** Un acceso correcto limpia los fallos del login, no los de la IP. */
  registrarExito(login: string): void {
    this.porLogin.delete(login);
  }

  private vigentes(mapa: Map<string, number[]>, clave: string, ahora: number): number[] {
    const fallos = (mapa.get(clave) ?? []).filter((momento) => ahora - momento < this.options.ventanaMs);
    if (fallos.length === 0) {
      mapa.delete(clave);
    } else {
      mapa.set(clave, fallos);
    }
    return fallos;
  }

  private espera(mapa: Map<string, number[]>, clave: string, maximo: number, ahora: number): number | null {
    const fallos = this.vigentes(mapa, clave, ahora);
    if (fallos.length < maximo) {
      return null;
    }
    // Se libera un intento cuando vence el fallo que deja el conteo por debajo del máximo.
    const liberador = fallos[fallos.length - maximo] ?? ahora;
    return Math.max(1, Math.ceil((liberador + this.options.ventanaMs - ahora) / 1000));
  }

  private agregar(mapa: Map<string, number[]>, clave: string, ahora: number): void {
    if (mapa.size >= PURGAR_DESDE) {
      for (const otra of [...mapa.keys()]) {
        this.vigentes(mapa, otra, ahora);
      }
    }
    mapa.set(clave, [...this.vigentes(mapa, clave, ahora), ahora]);
  }
}

export const loginLimiter = new LoginLimiter({
  ventanaMs: 15 * 60 * 1000,
  maxPorLogin: 5,
  maxPorIp: 20,
});
