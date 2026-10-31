"""Convierte el logo del frontend en firmware/include/logo.h (RGB565) para la
pantalla de presentación de la TFT.

Recorta los márgenes transparentes, funde la imagen sobre fondo blanco y la
escala para que quepa en ANCHO_MAX x ALTO_MAX conservando la proporción.

Uso (necesita Pillow), desde la raíz del repositorio:
    python firmware/tools/generar_logo.py
"""

from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
ORIGEN = RAIZ / "frontend" / "src" / "assets" / "saman_logo.png"
DESTINO = RAIZ / "firmware" / "include" / "logo.h"
ANCHO_MAX = 300
ALTO_MAX = 224
FONDO = (255, 255, 255)


def a_rgb565(r: int, g: int, b: int) -> int:
    return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)


def main() -> None:
    imagen = Image.open(ORIGEN).convert("RGBA")
    imagen = imagen.crop(imagen.getchannel("A").getbbox())
    escala = min(ANCHO_MAX / imagen.width, ALTO_MAX / imagen.height)
    tamano = (round(imagen.width * escala), round(imagen.height * escala))
    imagen = imagen.resize(tamano, Image.LANCZOS)

    fondo = Image.new("RGBA", imagen.size, FONDO + (255,))
    rgb = Image.alpha_composite(fondo, imagen).convert("RGB")
    datos = rgb.tobytes()
    pixeles = [a_rgb565(datos[i], datos[i + 1], datos[i + 2]) for i in range(0, len(datos), 3)]

    lineas = []
    for i in range(0, len(pixeles), 12):
        lineas.append("  " + ", ".join(f"0x{p:04X}" for p in pixeles[i : i + 12]) + ",")

    DESTINO.write_text(
        "// Generado por firmware/tools/generar_logo.py a partir de\n"
        f"// frontend/src/assets/{ORIGEN.name}. No editar a mano.\n\n"
        "#ifndef LOGO_H\n#define LOGO_H\n\n#include <Arduino.h>\n\n"
        f"const uint16_t LOGO_ANCHO = {rgb.width};\n"
        f"const uint16_t LOGO_ALTO = {rgb.height};\n"
        f"// Color del fondo sobre el que se fundió el logo (RGB565).\n"
        f"const uint16_t LOGO_FONDO = 0x{a_rgb565(*FONDO):04X};\n\n"
        "const uint16_t LOGO[] PROGMEM = {\n" + "\n".join(lineas) + "\n};\n\n#endif\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"{DESTINO.relative_to(RAIZ)}: {rgb.width}x{rgb.height}, {len(pixeles) * 2} bytes")


if __name__ == "__main__":
    main()
