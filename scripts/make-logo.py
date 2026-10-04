#!/usr/bin/env python3
"""Régénère les petites versions du logo intégrées dans index.html par le build.

  assets/trimobe-logo.jpeg      source (1133 x 1130, 68 Ko) : n'est plus publiée, seulement conservée
  assets/trimobe-logo-176.jpeg  logo du pied de page, affiché à 88 px (176 px pour les écrans à double densité)
  assets/trimobe-logo-64.jpeg   icône de l'onglet (favicon)

Le build (scripts/build.mjs) les lit et les écrit en data: URI : aucune requête, aucun fichier à publier avec index.html.
Usage : python scripts/make-logo.py   (Pillow), puis npm run build.
"""
from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).resolve().parent.parent / "assets"
SOURCE = ASSETS / "trimobe-logo.jpeg"
TARGETS = ((176, 80, "trimobe-logo-176.jpeg"), (64, 85, "trimobe-logo-64.jpeg"))


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    side = min(source.size)  # le logo est carré à 3 pixels près : on recadre au centre
    left, top = (source.width - side) // 2, (source.height - side) // 2
    square = source.crop((left, top, left + side, top + side))
    for size, quality, name in TARGETS:
        target = ASSETS / name
        square.resize((size, size), Image.LANCZOS).save(target, "JPEG", quality=quality, optimize=True, progressive=True)
        print(f"{name} : {size} x {size}, {target.stat().st_size} octets")


if __name__ == "__main__":
    main()
