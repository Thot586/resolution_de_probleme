#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""migrate.py : remplace les couleurs écrites en dur dans des feuilles CSS par des jetons var(--…) (tokens.css).

Python 3 standard uniquement (re, argparse, difflib, math, csv, pathlib) : aucune dépendance.

Ce que fait le script, pour chaque fichier .css donné (ou chaque <style> / attribut style="" d'un .html)
  1. remplace chaque couleur (#rgb, #rgba, #rrggbb, #rrggbbaa, white, rgb(…)…) par var(--jeton), selon le RÔLE
     de la propriété (texte, fond, trait, ombre) et, si besoin, le sélecteur ;
  2. remappe les anciens jetons dont le sens se dédouble en sombre (var(--white) devient var(--surface), un aplat
     var(--brand) devient var(--brand-fill)…) ; les autres anciens noms (--ink, --muted…) restent valides ;
  3. retire des blocs :root les définitions de couleurs, désormais dans tokens.css ;
  4. signale toute couleur NON reconnue (avec les jetons les plus proches, par ΔE2000, et la ligne à ajouter à MAP)
     et laisse la règle intacte ;
  5. laisse telles quelles les couleurs d'impression (@media print, .print-*, #print-document) : valeurs fixes,
     jamais sombres ;
  6. pour ::backdrop (qui n'hérite des propriétés personnalisées que dans les navigateurs récents), écrit
     var(--jeton, valeur d'origine) : la valeur d'origine sert de secours ;
  7. ignore comme « transparent » une couleur totalement transparente (#rrggbb00) : sa teinte ne se voit pas.
Les fichiers .js et .html (schémas SVG, export PNG) ne sont jamais réécrits : leurs couleurs en dur sont seulement
comptées dans le rapport (elles restent claires dans les deux thèmes : îlot clair .teaching-figure).
Le script est idempotent : relancé sur un fichier déjà migré, il ne change rien. Il reste donc utilisable plus tard,
sur de nouvelles règles : seules les nouvelles couleurs en dur sont traitées ou signalées.

Exemples
  python scripts/migrate.py styles/base.css styles/paths.css styles/components.css   # réécrit en place
  python scripts/migrate.py --dry-run --diff styles/*.css                             # aperçu, sans écrire
  python scripts/migrate.py --check styles/*.css                                      # code 1 s'il reste à migrer
  python scripts/migrate.py --report styles/*.css scripts/*.js pages/*.html           # couleurs restantes, sans écrire
  python scripts/migrate.py --table styles/*.css                                      # tableau couleur -> jeton
  python scripts/migrate.py --snap 1.5 styles/*.css                                   # rattache aussi les inconnues très proches
  python scripts/migrate.py --selftest                                                # table et tokens.css (ΔE <= 2,0, miroir…)
  python scripts/migrate.py --check-tokens | --sync-mirror                            # contrôle / recopie du miroir sombre
  python scripts/migrate.py --meta index.template.html                                # <meta> color-scheme et theme-color sombre
Codes de sortie : 0 = OK ; 1 = --check avec modifications en attente ; 2 = erreur, ou couleurs inconnues avec --strict.
"""
from __future__ import annotations

import argparse
import csv
import difflib
import math
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
MAX_DE = 2.0  # écart maximal toléré pour un regroupement de teintes (ΔE2000)
PAPER = (247, 249, 253)  # fond sur lequel on compose les couleurs transparentes pour les comparer


def default_tokens() -> Path:
    """tokens.css à côté du script, sinon styles/tokens.css du dépôt (script placé dans scripts/)."""
    for cand in (HERE / "tokens.css", HERE.parent / "styles" / "tokens.css", Path.cwd() / "styles" / "tokens.css"):
        if cand.exists():
            return cand
    return HERE / "tokens.css"


# ====================================================================================== couleurs
NAMED = {
    "aliceblue": "f0f8ff", "antiquewhite": "faebd7", "aqua": "00ffff", "aquamarine": "7fffd4", "azure": "f0ffff",
    "beige": "f5f5dc", "bisque": "ffe4c4", "black": "000000", "blanchedalmond": "ffebcd", "blue": "0000ff",
    "blueviolet": "8a2be2", "brown": "a52a2a", "burlywood": "deb887", "cadetblue": "5f9ea0", "chartreuse": "7fff00",
    "chocolate": "d2691e", "coral": "ff7f50", "cornflowerblue": "6495ed", "cornsilk": "fff8dc", "crimson": "dc143c",
    "cyan": "00ffff", "darkblue": "00008b", "darkcyan": "008b8b", "darkgoldenrod": "b8860b", "darkgray": "a9a9a9",
    "darkgreen": "006400", "darkgrey": "a9a9a9", "darkkhaki": "bdb76b", "darkmagenta": "8b008b",
    "darkolivegreen": "556b2f", "darkorange": "ff8c00", "darkorchid": "9932cc", "darkred": "8b0000",
    "darksalmon": "e9967a", "darkseagreen": "8fbc8f", "darkslateblue": "483d8b", "darkslategray": "2f4f4f",
    "darkslategrey": "2f4f4f", "darkturquoise": "00ced1", "darkviolet": "9400d3", "deeppink": "ff1493",
    "deepskyblue": "00bfff", "dimgray": "696969", "dimgrey": "696969", "dodgerblue": "1e90ff", "firebrick": "b22222",
    "floralwhite": "fffaf0", "forestgreen": "228b22", "fuchsia": "ff00ff", "gainsboro": "dcdcdc",
    "ghostwhite": "f8f8ff", "gold": "ffd700", "goldenrod": "daa520", "gray": "808080", "green": "008000",
    "greenyellow": "adff2f", "grey": "808080", "honeydew": "f0fff0", "hotpink": "ff69b4", "indianred": "cd5c5c",
    "indigo": "4b0082", "ivory": "fffff0", "khaki": "f0e68c", "lavender": "e6e6fa", "lavenderblush": "fff0f5",
    "lawngreen": "7cfc00", "lemonchiffon": "fffacd", "lightblue": "add8e6", "lightcoral": "f08080",
    "lightcyan": "e0ffff", "lightgoldenrodyellow": "fafad2", "lightgray": "d3d3d3", "lightgreen": "90ee90",
    "lightgrey": "d3d3d3", "lightpink": "ffb6c1", "lightsalmon": "ffa07a", "lightseagreen": "20b2aa",
    "lightskyblue": "87cefa", "lightslategray": "778899", "lightslategrey": "778899", "lightsteelblue": "b0c4de",
    "lightyellow": "ffffe0", "lime": "00ff00", "limegreen": "32cd32", "linen": "faf0e6", "magenta": "ff00ff",
    "maroon": "800000", "mediumaquamarine": "66cdaa", "mediumblue": "0000cd", "mediumorchid": "ba55d3",
    "mediumpurple": "9370db", "mediumseagreen": "3cb371", "mediumslateblue": "7b68ee", "mediumspringgreen": "00fa9a",
    "mediumturquoise": "48d1cc", "mediumvioletred": "c71585", "midnightblue": "191970", "mintcream": "f5fffa",
    "mistyrose": "ffe4e1", "moccasin": "ffe4b5", "navajowhite": "ffdead", "navy": "000080", "oldlace": "fdf5e6",
    "olive": "808000", "olivedrab": "6b8e23", "orange": "ffa500", "orangered": "ff4500", "orchid": "da70d6",
    "palegoldenrod": "eee8aa", "palegreen": "98fb98", "paleturquoise": "afeeee", "palevioletred": "db7093",
    "papayawhip": "ffefd5", "peachpuff": "ffdab9", "peru": "cd853f", "pink": "ffc0cb", "plum": "dda0dd",
    "powderblue": "b0e0e6", "purple": "800080", "rebeccapurple": "663399", "red": "ff0000", "rosybrown": "bc8f8f",
    "royalblue": "4169e1", "saddlebrown": "8b4513", "salmon": "fa8072", "sandybrown": "f4a460", "seagreen": "2e8b57",
    "seashell": "fff5ee", "sienna": "a0522d", "silver": "c0c0c0", "skyblue": "87ceeb", "slateblue": "6a5acd",
    "slategray": "708090", "slategrey": "708090", "snow": "fffafa", "springgreen": "00ff7f", "steelblue": "4682b4",
    "tan": "d2b48c", "teal": "008080", "thistle": "d8bfd8", "tomato": "ff6347", "turquoise": "40e0d0",
    "violet": "ee82ee", "wheat": "f5deb3", "white": "ffffff", "whitesmoke": "f5f5f5", "yellow": "ffff00",
    "yellowgreen": "9acd32",
}
# Mots qui ne sont pas des couleurs « en dur » (transparent, currentColor, mots-clés CSS, couleurs système).
IGNORED_WORDS = {"transparent", "currentcolor", "inherit", "initial", "unset", "revert", "none", "auto"}


def normalize_hex(h: str) -> str:
    """#RGB/#RGBA/#RRGGBB/#RRGGBBAA -> #rrggbb ou #rrggbbaa (minuscules ; alpha ff supprimé)."""
    h = h.lower().lstrip("#")
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h)
    if len(h) == 8 and h.endswith("ff"):
        h = h[:6]
    return "#" + h


def to_rgba(color: str):
    """Couleur normalisée (#rrggbb[aa]) -> (r, g, b, a) avec a dans 0..1."""
    h = color.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
    return (r, g, b, a)


def flatten(color: str, bg=PAPER):
    """Compose une couleur (éventuellement transparente) sur un fond opaque -> (r, g, b)."""
    r, g, b, a = to_rgba(color)
    return tuple(c * a + k * (1 - a) for c, k in zip((r, g, b), bg))


def _lin(c8: float) -> float:
    c = c8 / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lab(rgb):
    """sRGB 0..255 -> CIE Lab (D65)."""
    lr, lg, lb = (_lin(c) for c in rgb)
    x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb
    y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb
    z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb

    def f(t):
        return t ** (1 / 3) if t > 216 / 24389 else (24389 / 27 * t + 16) / 116

    fx, fy, fz = f(x / 0.95047), f(y), f(z / 1.08883)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def de2000(l1, l2) -> float:
    """Écart de couleur CIEDE2000 (Sharma, Wu, Dalal 2005) entre deux couleurs Lab."""
    L1, a1, b1 = l1
    L2, a2, b2 = l2
    C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2)
    Cb = (C1 + C2) / 2
    G = 0.5 * (1 - math.sqrt(Cb**7 / (Cb**7 + 25**7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)

    def hp(b, a):
        if b == 0 and a == 0:
            return 0.0
        h = math.degrees(math.atan2(b, a))
        return h + 360 if h < 0 else h

    h1p, h2p = hp(b1, a1p), hp(b2, a2p)
    dLp, dCp = L2 - L1, C2p - C1p
    if C1p * C2p == 0:
        dhp = 0.0
    else:
        d = h2p - h1p
        dhp = d - 360 if d > 180 else d + 360 if d < -180 else d
    dHp = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dhp / 2))
    Lbp, Cbp = (L1 + L2) / 2, (C1p + C2p) / 2
    if C1p * C2p == 0:
        hbp = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        hbp = (h1p + h2p) / 2
    else:
        hbp = (h1p + h2p + 360) / 2 if h1p + h2p < 360 else (h1p + h2p - 360) / 2
    T = (1 - 0.17 * math.cos(math.radians(hbp - 30)) + 0.24 * math.cos(math.radians(2 * hbp))
         + 0.32 * math.cos(math.radians(3 * hbp + 6)) - 0.20 * math.cos(math.radians(4 * hbp - 63)))
    dTheta = 30 * math.exp(-(((hbp - 275) / 25) ** 2))
    Rc = 2 * math.sqrt(Cbp**7 / (Cbp**7 + 25**7))
    Sl = 1 + 0.015 * (Lbp - 50) ** 2 / math.sqrt(20 + (Lbp - 50) ** 2)
    Sc, Sh = 1 + 0.045 * Cbp, 1 + 0.015 * Cbp * T
    Rt = -math.sin(math.radians(2 * dTheta)) * Rc
    return math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh))


def delta_e(c1: str, c2: str) -> float:
    """ΔE2000 entre deux couleurs normalisées (les transparentes sont composées sur le fond de page)."""
    return de2000(lab(flatten(c1)), lab(flatten(c2)))


# ====================================================================================== scanner CSS
def mask(text: str) -> str:
    """Masque commentaires, chaînes et url(...) (mêmes décalages) pour que { } ; ( ) # y soient ignorés."""
    out = list(text)
    i, n = 0, len(text)

    def blank(a, b, ch):
        for k in range(a, min(b, n)):
            if text[k] != "\n":
                out[k] = ch

    while i < n:
        c = text[i]
        if c == "/" and text[i : i + 2] == "/*":
            j = text.find("*/", i + 2)
            j = n if j < 0 else j + 2
            blank(i, j, " ")
            i = j
        elif c in "\"'":
            j = i + 1
            while j < n and text[j] != c:
                j += 2 if text[j] == "\\" else 1
            blank(i + 1, j, "x")
            i = j + 1
        elif c in "uU" and text[i : i + 4].lower() == "url(" and (i == 0 or not (text[i - 1].isalnum() or text[i - 1] in "-_")):
            j = i + 4
            while j < n and text[j] in " \t\r\n":
                j += 1
            if j < n and text[j] in "\"'":  # url("data:…(…)…") : la parenthèse fermante suit la chaîne
                q = text[j]
                k = j + 1
                while k < n and text[k] != q:
                    k += 2 if text[k] == "\\" else 1
                end = text.find(")", k)
            else:
                end = text.find(")", j)
            end = n if end < 0 else end
            blank(i + 4, end, "x")
            i = end + 1
        else:
            i += 1
    return "".join(out)


AT_WITH_RULES = ("@media", "@supports", "@container", "@layer", "@document", "@scope", "@keyframes",
                 "@-webkit-keyframes", "@starting-style")


def scan(text: str, filename: str = "<css>"):
    """Liste des déclarations : dict(file, line, start, end, prop, value, vstart, vend, selector, atrules)."""
    m = mask(text)
    decls, stack = [], []
    buf_start = depth = 0
    n = len(m)

    def emit(a, b):
        raw = m[a:b]
        if not stack or stack[-1]["kind"] != "rule" or ":" not in raw:
            return
        d, colon = 0, -1
        for k, ch in enumerate(raw):
            if ch == "(":
                d += 1
            elif ch == ")":
                d -= 1
            elif ch == ":" and d == 0:
                colon = k
                break
        if colon < 0 or not raw[:colon].strip():
            return
        start = a + (len(raw) - len(raw.lstrip()))
        vs = a + colon + 1
        while vs < b and text[vs] in " \t\r\n":
            vs += 1
        ve = b
        while ve > vs and text[ve - 1] in " \t\r\n":
            ve -= 1
        sel = next((e["prelude"] for e in reversed(stack) if e["kind"] == "rule"), "")
        decls.append(dict(file=filename, line=text.count("\n", 0, start) + 1, start=start, end=ve,
                          prop=raw[:colon].strip(), value=text[vs:ve], vstart=vs, vend=ve,
                          selector=re.sub(r"\s+", " ", sel).strip(),
                          atrules=[re.sub(r"\s+", " ", e["prelude"]).strip() for e in stack if e["kind"] == "at"]))

    for i in range(n):
        c = m[i]
        if c == "(":
            depth += 1
        elif c == ")":
            depth = max(0, depth - 1)
        elif depth == 0 and c == "{":
            pre = re.sub(r"/\*.*?\*/", "", text[buf_start:i], flags=re.S).strip()
            kind = "at" if m[buf_start:i].strip().lower().startswith(AT_WITH_RULES) else "rule"
            stack.append(dict(prelude=pre, kind=kind))
            buf_start = i + 1
        elif depth == 0 and c == ";":
            emit(buf_start, i)
            buf_start = i + 1
        elif depth == 0 and c == "}":
            emit(buf_start, i)
            if stack:
                stack.pop()
            buf_start = i + 1
    return decls


# ====================================================================================== jetons
def load_tokens(path: Path):
    """Lit tokens.css -> {"light": {nom: valeur}, "dark": {nom: valeur}, "mirror": {nom: valeur}}."""
    res = {"light": {}, "dark": {}, "mirror": {}}
    for d in scan(path.read_text(encoding="utf-8"), str(path)):
        if not d["prop"].startswith("--"):
            continue
        ats, sel = " ".join(d["atrules"]), d["selector"]
        if "print" in ats:
            continue
        if "prefers-color-scheme: dark" in ats:
            res["dark"][d["prop"]] = d["value"]
        elif 'data-theme="dark"' in sel:
            res["mirror"][d["prop"]] = d["value"]
        elif not ats and sel.startswith(":root"):
            res["light"][d["prop"]] = d["value"]
    return res


VAR_RE = re.compile(r"var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)")


def resolve(value: str, table: dict, depth: int = 0) -> str:
    """Remplace les var(--x) d'une valeur par leur valeur dans `table`."""
    if depth > 8:
        return value
    return VAR_RE.sub(lambda m: resolve(table.get(m.group(1), m.group(0)), table, depth + 1), value)


def token_color(table: dict, name: str):
    """Valeur couleur normalisée d'un jeton (None si ce n'est pas une couleur simple)."""
    v = resolve(table.get(name, ""), table).strip()
    return normalize_hex(v) if re.fullmatch(r"#[0-9a-fA-F]{3,8}", v) else None


# ====================================================================================== table de correspondance
# Rôle d'une propriété : text | bg | line | shadow  (la même couleur peut avoir un jeton différent selon le rôle).
ROLE_PROPS = [
    ("text", r"color|caret-color|accent-color|text-decoration(-color)?|-webkit-text-fill-color|fill|stroke|scrollbar-color"),
    ("bg", r"background(-color|-image)?"),
    ("line", r"border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?|outline(-color)?|column-rule(-color)?"),
    ("shadow", r"box-shadow|text-shadow|filter|backdrop-filter"),
]
COLOR_PROP_RE = re.compile("^(?:" + "|".join(p for _, p in ROLE_PROPS) + r"|-webkit-tap-highlight-color|--[\w-]+)$")


def role_of(prop: str) -> str:
    p = prop.lower()
    for role, pat in ROLE_PROPS:
        if re.fullmatch(pat, p):
            return role
    return "*"


# rôle -> {couleur normalisée: jeton}.  Les quasi-doublons (ΔE2000 <= MAX_DE) pointent vers le même jeton.
# Pour apprendre une couleur au script : ajouter une ligne ici (et le jeton, clair + sombre, dans tokens.css).
MAP = {
    "bg": {
        "#ffffff": "--surface",
        "#f7f9fd": "--paper",
        "#f9fbfff5": "--header-bg",
        # encarts et survols très clairs (7 teintes, ΔE <= 1,28 du jeton)
        "#f8faff": "--surface-soft", "#f7faff": "--surface-soft", "#f6f8fc": "--surface-soft",
        "#f6f8fd": "--surface-soft", "#f4f7fc": "--surface-soft", "#f2f6fc": "--surface-soft", "#f6f9fe": "--surface-soft",
        # teinte bleue (5 teintes, ΔE <= 1,45)
        "#edf3fb": "--mint", "#f0f5fc": "--mint", "#eef4fc": "--mint", "#edf2fa": "--mint", "#e9f0fb": "--mint",
        # rails et remplissages de progression (ΔE <= 1,51 du jeton --line-soft)
        "#dce7f6": "--line-soft", "#dce5f2": "--line-soft", "#e8edf8": "--line-soft",
        "#9fb9db": "--line-strong", "#3b72b2": "--progress-fill",
        # aplats de marque
        "#285b9d": "--brand-fill", "#161f6e": "--deep-fill",
        # statuts (le fond « En danger maintenant ? » #fff3ee est à ΔE 1,87 de --rose ; #fff3d5 à 1,36 de --amber)
        "#fff0ed": "--rose", "#fff3ee": "--rose", "#fff3d9": "--amber", "#fff3d5": "--amber",
        # violentomètre : valeurs exactes (niveau 3 = --amber)
        "#e7f2e7": "--m1-bg", "#edf3df": "--m2-bg", "#fff0df": "--m4-bg", "#fbe4de": "--m5-bg", "#f5d9d4": "--m6-bg",
        # voiles et reflets sur aplat
        "#0c164899": "--scrim-soft", "#0c1648a6": "--scrim", "#ffffff15": "--on-fill-wash",
    },
    "text": {
        "#202b50": "--ink", "#596680": "--muted", "#285b9d": "--brand", "#161f6e": "--deep",
        "#ffffff": "--on-fill", "#69758b": "--placeholder", "#52627d": "--example-ink", "#4e6284": "--example-ink",
        "#dce9ff": "--on-fill-soft", "#e8f0ff": "--on-fill-soft",
        "#923f3b": "--red", "#793a36": "--red-ink", "#6d302b": "--red-ink", "#7a3430": "--red-ink",
        "#674819": "--amber-ink", "#67460d": "--amber-ink",
        "#1f533e": "--m1-ink", "#7b411a": "--m4-ink", "#752323": "--m6-ink",
    },
    "line": {
        "#d9e2ef": "--line", "#d5e1f0": "--line", "#d4e0f1": "--line",
        "#e5ecf7": "--line-soft", "#e3eaf4": "--line-soft", "#e1e8f3": "--line-soft",
        "#ceddef": "--line-tint", "#d0deed": "--line-tint", "#c7d7ed": "--line-tint",
        "#bbc9df": "--field-line",
        "#b7c9e3": "--line-mid", "#b7cbe8": "--line-mid", "#adc7e9": "--line-mid",
        "#9cb6d9": "--line-strong", "#a4b9dc": "--line-strong", "#9fb4d3": "--line-strong",
        "#86a9d4": "--line-ctx", "#d3c7b6": "--line-warm",
        "#285b9d": "--brand", "#161f6e": "--deep", "#ffffff": "--surface",
        "#d5b1ac": "--red-line", "#edcbc4": "--rose-line", "#e8ccc8": "--rose-line", "#ecd8b1": "--amber-line",
        "#9c463d": "--red", "#a06c25": "--focus-ring",
        "#2f7655": "--m1-edge", "#658348": "--m2-edge", "#a57522": "--m3-edge",
        "#ad612e": "--m4-edge", "#a8443d": "--m5-edge", "#8c2e2e": "--m6-edge",
        "#ffffff55": "--on-fill-line", "#ffffff99": "--on-fill-edge",
    },
    "shadow": {
        "#161f6e10": "--shade-soft", "#161f6e12": "--shade-soft", "#161f6e14": "--shade-soft",
        "#161f6e18": "--shade-soft", "#161f6e1c": "--shade-hover", "#161f6e20": "--shade-hover", "#161f6e2d": "--shade-menu",
        "#00000033": "--shade-pop", "#00000022": "--shade-drawer", "#285b9d26": "--focus-glow",
    },
    "*": {},
}

# Exceptions par sélecteur : (sélecteur, propriété, valeur d'origine, jeton ou None = ne pas toucher).
# La valeur d'origine est une couleur normalisée ou « var(--nom) ».
OVERRIDES = [
    # Bandeau d'accueil : dégradé dédié (le halo n'existe que là)
    (r"\.welcome-hero", r"background", "#161f6e", "--hero-from"),
    (r"\.welcome-hero", r"background", "#285b9d", "--hero-to"),
    (r"\.welcome-hero", r"background", "#3b64ae", "--hero-glow"),
    # Bouton principal : le bord suit l'aplat ; le survol a son propre jeton (plus clair en sombre)
    (r"\.btn\.primary", r"border-color", "var(--brand)", "--brand-fill"),
    (r"\.btn\.primary:hover", r"background", "var(--deep)", "--brand-fill-hover"),
    # Segments de progression : « fait » et « question courante » gardent --brand ; « étape courante » garde --deep
    (r"\.step-bar \.is-done", r"background", "var(--brand)", None),
    (r"\.step-bar \.is-later\.is-done", r"background", "var(--brand)", None),
    (r"\.question-segments \.is-current", r"background", "var(--brand)", None),
    (r"\.step-bar \.is-current", r"background", "var(--deep)", None),
    (r"\.step-bar \.is-later\.is-current", r"background", "var(--deep)", None),
    # Coche et bouton d'interrupteur : blancs sur aplat de marque (et non couleur de surface)
    (r"\.choice-mark::after", r"border", "var(--white)", "--on-fill"),
    (r"\.checkbox input\[type=\"checkbox\"\]::after", r"background", "var(--white)", "--on-fill"),
    # Pastille du logo : reste blanche dans les deux thèmes (le JPEG a un fond blanc)
    (r"\.footer-logo", r"background", "#ffffff", "--on-fill"),
    # Contour de focus d'un îlot clair : valeur du thème de la PAGE (le jeton --brand de l'îlot est clair)
    (r"\.scrollable-diagram:focus-visible", r"outline", "var(--brand)", "--page-ring"),
]

# Anciens jetons dont le sens se dédouble : (nom, rôle) -> nouveau nom.  Rôle « * » = tous les rôles.
LEGACY_VARS = {
    ("--white", "*"): "--surface",
    ("--brand", "bg"): "--brand-fill",
    ("--deep", "bg"): "--deep-fill",
}

# Anciens jetons qui n'existent plus : leur définition dans :root est retirée, leurs usages sont remappés.
REMOVED_TOKENS = {"--white", "--ochre"}

# Jetons volontairement identiques en clair et en sombre (pas de valeur dans le bloc sombre).
CONSTANT_TOKENS = {"--on-fill", "--on-fill-soft", "--on-fill-line", "--on-fill-wash", "--on-fill-edge", "--page-ring", "--shadow"}

# Portées d'impression : valeurs fixes (toujours claires), exemptées de la migration.
EXEMPT_AT = re.compile(r"@media[^{]*\bprint\b")
EXEMPT_SELECTOR = re.compile(r"^(?:\.print-|#print-document)")

ITEM_RE = re.compile(
    r"""(?P<hex>\#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-]))
      | (?P<func>\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|light-dark|color)\()
      | (?P<var>\bvar\(\s*(?P<vname>--[\w-]+)\s*(?:,[^)]*)?\))
      | (?P<word>(?<![\w#-])[A-Za-z]+(?![\w(-]))""",
    re.X,
)


def split_selectors(sel: str):
    """Sépare une liste de sélecteurs sur les virgules de premier niveau."""
    parts, depth, cur = [], 0, []
    for ch in sel:
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
    parts.append("".join(cur).strip())
    return [p for p in parts if p]


def match_override(selector: str, prop: str, original: str):
    """Retourne (trouvé, jeton|None) pour une exception éventuelle."""
    parts = split_selectors(selector)
    for sel_re, prop_re, orig, token in OVERRIDES:
        if orig == original and re.fullmatch(prop_re, prop.lower()) and any(re.fullmatch(sel_re, p) for p in parts):
            return True, token
    return False, None


def rgb_func_to_hex(text: str):
    """rgb(…)/rgba(…) à valeurs numériques -> couleur normalisée ; None si non convertible."""
    m = re.fullmatch(r"rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)", text.strip(), re.I)
    if not m:
        return None

    def ch(v):
        return round(float(v[:-1]) * 2.55) if v.endswith("%") else round(float(v))

    r, g, b = (max(0, min(255, ch(m.group(i)))) for i in (1, 2, 3))
    a = 1.0
    if m.group(4):
        a = float(m.group(4)[:-1]) / 100 if m.group(4).endswith("%") else float(m.group(4))
    return normalize_hex(f"#{r:02x}{g:02x}{b:02x}" + (f"{round(a * 255):02x}" if a < 0.999 else ""))


def find_close(s: str, open_idx: int) -> int:
    depth = 0
    for k in range(open_idx, len(s)):
        if s[k] == "(":
            depth += 1
        elif s[k] == ")":
            depth -= 1
            if depth == 0:
                return k
    return len(s) - 1


# ====================================================================================== moteur
class Finding:
    """Une couleur ou une variable rencontrée, avec son sort (status)."""

    def __init__(self, file, line, selector, atrules, prop, original, role, status, token=None, note="", raw=""):
        self.file, self.line, self.selector, self.atrules = file, line, selector, atrules
        self.prop, self.original, self.role, self.status, self.token, self.note = prop, original, role, status, token, note
        self.raw = raw or original  # écriture d'origine (#fff, white, #0003…)


def token_ref(token: str, selector: str, literal: str) -> str:
    """var(--jeton), avec la valeur d'origine en secours pour ::backdrop.

    ::backdrop n'hérite des propriétés personnalisées de <html> que dans les navigateurs récents
    (spécification changée fin 2023 : Firefox, Chrome puis Safari début 2024) : avant, var(--jeton) y serait
    vide et le voile disparaîtrait ; la valeur d'origine sert alors de secours.
    """
    return f"var({token}, {literal})" if "::backdrop" in selector else f"var({token})"


def has_color_literal(masked_value: str) -> bool:
    """Vrai s'il reste une couleur en dur visible (les couleurs totalement transparentes ne comptent pas)."""
    for m in ITEM_RE.finditer(masked_value):
        if m.group("hex") and to_rgba(normalize_hex(m.group("hex")))[3] > 0:
            return True
        if m.group("word") and m.group("word").lower() in NAMED:
            return True
    return False


def migrate_text(text: str, filename: str, tokens: dict, snap: float | None = None, remap_legacy: bool = True,
                 drop_root: bool = True):
    """Retourne (nouveau_texte, [Finding]).  Statuts : replaced | legacy | kept | exempt | unknown | snapped | dropped."""
    decls = scan(text, filename)
    masked = mask(text)
    edits, findings = [], []
    light = tokens["light"]
    pools = defaultdict(set)
    for role, table in MAP.items():
        pools[role].update(table.values())

    def suggest(color, role):
        """Jetons les plus proches (ΔE2000) du même rôle ; une couleur opaque ne se rattache qu'à un jeton opaque."""
        pool = pools.get(role) or set().union(*pools.values())
        opaque = to_rgba(color)[3] >= 0.999
        cands = []
        for n in sorted(pool):
            c = token_color(light, n)
            if c and (to_rgba(c)[3] >= 0.999) == opaque:
                cands.append((delta_e(color, c), n))
        return sorted(cands)[:2]

    for d in decls:
        prop, sel, ats = d["prop"], d["selector"], " ".join(d["atrules"])
        role = role_of(prop)
        value, mval = d["value"], masked[d["vstart"] : d["vend"]]

        def add(kind, a, b, rep, original, token=None, note=""):
            if rep is not None:
                edits.append(("sub", d["vstart"] + a, d["vstart"] + b, rep))
            findings.append(Finding(d["file"], d["line"], sel, d["atrules"], prop, original, role, kind, token, note, raw=value[a:b]))

        # --- blocs :root : les définitions de couleurs vivent désormais dans tokens.css
        if drop_root and sel == ":root" and not ats:
            if prop == "color-scheme" or prop in light or prop in REMOVED_TOKENS:
                edits.append(("drop", d["start"], d["end"]))
                note = ("color-scheme : géré par tokens.css" if prop == "color-scheme"
                        else "défini dans tokens.css" if prop in light else "ancien jeton renommé (voir LEGACY_VARS)")
                findings.append(Finding(d["file"], d["line"], sel, d["atrules"], prop, value, role, "dropped", note=note))
                continue
            if prop.startswith("--") and has_color_literal(mval):
                # une nouvelle définition de couleur : on la garde (la supprimer casserait ses var(--…)) et on la signale
                findings.append(Finding(d["file"], d["line"], sel, d["atrules"], prop, value, role, "unknown",
                                        note="définition de couleur absente de tokens.css : l'y ajouter (clair + sombre)"))
                continue
        if not COLOR_PROP_RE.match(prop.lower()):
            continue
        exempt = bool(EXEMPT_AT.search(ats)) or any(EXEMPT_SELECTOR.match(p) for p in split_selectors(sel))
        skip_until = 0
        for it in ITEM_RE.finditer(mval):
            if it.start() < skip_until:
                continue
            a, b = it.start(), it.end()
            if it.group("var"):  # ---- ancien jeton : var(--nom)
                if exempt or not remap_legacy:
                    continue
                name, orig = it.group("vname"), f"var({it.group('vname')})"
                found, tok = match_override(sel, prop, orig)
                new = tok if found else (LEGACY_VARS.get((name, role)) or LEGACY_VARS.get((name, "*")))
                if new and new != name:
                    add("legacy", a, b, f"var({new})", orig, new)
                elif found and tok is None:
                    add("kept", a, b, None, orig, name, "exception : garde ce jeton")
                continue
            if it.group("func"):  # ---- notation fonctionnelle
                fname = it.group("func")[:-1].lower()
                if fname == "color-mix":
                    continue  # les couleurs qu'elle contient sont traitées une à une
                close = find_close(mval, it.end() - 1)
                fn = value[a : close + 1]
                hx = rgb_func_to_hex(fn) if fname in ("rgb", "rgba") else None
                skip_until = close + 1
                if hx is None:
                    add("exempt" if exempt else "unknown", a, close + 1, None, fn, note="notation fonctionnelle non convertie")
                    continue
                b, original = close + 1, hx
            elif it.group("hex"):
                original = normalize_hex(it.group("hex"))
            else:
                w = it.group("word").lower()
                if w in IGNORED_WORDS or w not in NAMED:
                    continue
                original = normalize_hex(NAMED[w])
            if to_rgba(original)[3] == 0:
                continue  # totalement transparente (#rrggbb00) : comme « transparent », la teinte ne se voit pas
            if exempt:
                add("exempt", a, b, None, original, note="impression : valeur fixe")
                continue
            found, tok = match_override(sel, prop, original)
            if not found:
                tok = MAP.get(role, {}).get(original) or MAP["*"].get(original)
            if tok:
                add("replaced", a, b, token_ref(tok, sel, value[a:b]), original, tok)
                continue
            sug = suggest(original, role)
            if snap is not None and sug and sug[0][0] <= snap:
                add("snapped", a, b, token_ref(sug[0][1], sel, value[a:b]), original, sug[0][1], f"ΔE {sug[0][0]:.2f}")
            else:
                add("unknown", a, b, None, original, note=" ; ".join(f"{n} (ΔE {de:.2f})" for de, n in sug))
    return apply_edits(text, edits), findings


def apply_edits(text: str, edits):
    """Applique les remplacements ('sub') et suppressions ('drop') de la fin vers le début."""
    out = text
    for kind, *args in sorted(edits, key=lambda e: -e[1]):
        if kind == "sub":
            a, b, rep = args
            out = out[:a] + rep + out[b:]
            continue
        a, b = args  # drop : retire « propriété: valeur; » et la ligne entière si elle devient vide
        end = b
        while end < len(out) and out[end] in " \t":
            end += 1
        if end < len(out) and out[end] == ";":
            end += 1
        line_start = out.rfind("\n", 0, a) + 1
        line_end = end
        while line_end < len(out) and out[line_end] in " \t":
            line_end += 1
        if out[line_start:a].strip() == "" and (line_end >= len(out) or out[line_end] in "\r\n"):
            if line_end < len(out) and out[line_end] == "\r":
                line_end += 1
            if line_end < len(out) and out[line_end] == "\n":
                line_end += 1
            out = out[:line_start] + out[line_end:]
        else:
            out = out[:a] + out[end:].lstrip(" \t")
    return remove_empty_root_blocks(out)


def remove_empty_root_blocks(text: str) -> str:
    """Retire les blocs « :root { } » devenus vides après la suppression des définitions."""
    return re.sub(r"[ \t]*:root\s*\{\s*\}[ \t]*\r?\n?(?:[ \t]*\r?\n)?", "", text)


# ====================================================================================== HTML et fichiers hors CSS
STYLE_ATTR_RE = re.compile(r"""(\bstyle\s*=\s*)(["'])(.*?)\2""", re.S)
STYLE_BLOCK_RE = re.compile(r"(<style[^>]*>)(.*?)(</style>)", re.S | re.I)
EXTRA_HEX_RE = re.compile(r"(?<![\w&/%#-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])")


def migrate_html(text: str, filename: str, tokens: dict, **kw):
    """Réécrit les attributs style="…" et les blocs <style> d'un .html ; ne touche ni aux attributs SVG ni aux scripts."""
    findings = []

    def line_of(off):
        return text.count("\n", 0, off) + 1

    def attr(m):
        new, fs = migrate_text("x{" + m.group(3) + "}", filename, tokens, **kw)
        for f in fs:
            f.line, f.selector = line_of(m.start()), "[style]"
        findings.extend(fs)
        return m.group(1) + m.group(2) + new[2:-1] + m.group(2)

    def block(m):
        new, fs = migrate_text(m.group(2), filename, tokens, **kw)
        base = line_of(m.start(2)) - 1
        for f in fs:
            f.line += base
        findings.extend(fs)
        return m.group(1) + new + m.group(3)

    out = STYLE_BLOCK_RE.sub(block, text)
    out = STYLE_ATTR_RE.sub(attr, out)
    return out, findings


def extra_colors(text: str):
    """Couleurs #hex écrites en dur dans un .js ou un .html (attributs SVG, export PNG) : [(ligne, couleur)]."""
    out = []
    for m in EXTRA_HEX_RE.finditer(text):
        ls = text.rfind("\n", 0, m.start()) + 1
        le = text.find("\n", m.start())
        line = text[ls : le if le >= 0 else len(text)]
        if "theme-color" in line or re.search(r"(?:href|src|id|for)\s*=\s*[\"']?#", line[max(0, m.start() - ls - 12) : m.start() - ls + 1]):
            continue
        out.append((text.count("\n", 0, m.start()) + 1, normalize_hex(m.group(0))))
    return out


def ensure_meta(text: str, dark_color: str):
    """Ajoute <meta name="color-scheme"> et le theme-color sombre au modèle HTML (idempotent) -> (texte, [ajouts])."""
    added = []
    m = re.search(r"^([ \t]*)<meta\s+name=[\"']theme-color[\"'](?![^>]*media=)[^>]*>", text, re.M)
    if not m:
        return text, added
    indent, lines = m.group(1), []
    if not re.search(r"<meta\s+name=[\"']color-scheme[\"']", text):
        lines.append('<meta name="color-scheme" content="light dark" />')
        added.append("color-scheme")
    if not re.search(r"<meta\s+name=[\"']theme-color[\"'][^>]*prefers-color-scheme\s*:\s*dark", text):
        lines.append(f'<meta name="theme-color" media="(prefers-color-scheme: dark)" content="{dark_color}" />')
        added.append("theme-color sombre")
    if not lines:
        return text, added
    nl = "\r\n" if "\r\n" in text else "\n"
    ins = "".join(f"{indent}{ln}{nl}" for ln in lines)
    return text[: m.start()] + ins + text[m.start() :], added


# ====================================================================================== rapports
def render_report(all_findings, verbose=False, extras=None):
    by = defaultdict(list)
    for f in all_findings:
        by[f.status].append(f)
    out = [f"{len(by['replaced']) + len(by['snapped'])} couleur(s) remplacée(s), {len(by['legacy'])} ancien(s) jeton(s) remappé(s), "
           f"{len(by['dropped'])} définition(s) retirée(s) de :root, {len(by['kept'])} exception(s) conservée(s), "
           f"{len(by['exempt'])} couleur(s) d'impression conservée(s), {len(by['unknown'])} INCONNUE(S)."]
    if verbose and (by["replaced"] or by["snapped"]):
        counts = Counter(f.token for f in by["replaced"] + by["snapped"])
        out.append("\nJetons utilisés : " + ", ".join(f"{t} x{c}" for t, c in counts.most_common()))
    if by["legacy"]:
        c = Counter((f.original, f.token) for f in by["legacy"])
        out.append("\nAnciens jetons remappés : " + ", ".join(f"{o} -> var({t}) x{n}" for (o, t), n in c.most_common()))
    if by["unknown"]:
        out.append("\nCOULEURS NON RECONNUES (règle laissée telle quelle). Choisir un jeton existant (ΔE <= 2,0) ou en ajouter un "
                   "dans tokens.css (clair + sombre), puis la ligne dans MAP (migrate.py) :")
        for f in by["unknown"]:
            at = f"[{' '.join(f.atrules)}] " if f.atrules else ""
            shown = f.raw if f.raw.lower() == f.original else f"{f.raw} = {f.original}"
            out.append(f"  {Path(f.file).name}:{f.line}  {at}{f.selector} {{ {f.prop}: {shown} }}  rôle={f.role}"
                       + (f"  plus proches : {f.note}" if f.note else ""))
            first = re.match(r"(--[\w-]+) \(ΔE ([\d.]+)\)", f.note or "")
            if first and f.original.startswith("#"):
                hint = f'MAP["{f.role}"]["{f.original}"] = "{first.group(1)}"'
                out.append(f"      à ajouter : {hint}   # ΔE {first.group(2)}"
                           + ("  (au-delà de 2,0 : créer plutôt un jeton)" if float(first.group(2)) > MAX_DE else ""))
    if by["snapped"]:
        out.append("\nRattachées au plus proche (--snap) :")
        for f in by["snapped"]:
            out.append(f"  {Path(f.file).name}:{f.line}  {f.selector} {{ {f.prop}: {f.original} -> var({f.token}) }}  {f.note}")
    if verbose and by["exempt"]:
        out.append("\nCouleurs d'impression conservées (valeurs fixes) :")
        for f in by["exempt"]:
            out.append(f"  {Path(f.file).name}:{f.line}  {f.selector} {{ {f.prop}: {f.original} }}")
    if extras:
        out.append("\nCouleurs en dur hors CSS (non modifiées : schémas SVG et export PNG restent clairs dans les deux thèmes) :")
        for name, lst in extras.items():
            if lst:
                distinct = sorted(set(c for _, c in lst))
                out.append(f"  {name:28} {len(lst):3} occurrence(s), {len(distinct)} valeur(s) : {' '.join(distinct)}")
    return "\n".join(out)


def table_rows(all_findings, tokens):
    """Lignes (couleur d'origine, jeton, rôles, usages, sélecteurs, écritures) pour --table et --csv."""
    light = tokens["light"]
    rows = defaultdict(lambda: {"n": 0, "where": set(), "roles": set(), "raw": set()})

    def put(orig, tok, role, where, raw):
        r = rows[(normalize_hex(orig), tok)]
        r["n"] += 1
        r["roles"].add(role)
        r["where"].add(where)
        r["raw"].add(raw)

    for f in all_findings:
        if f.status in ("replaced", "snapped", "exempt", "unknown") and f.original.startswith("#"):
            tok = f.token if f.status in ("replaced", "snapped") else ("impression" if f.status == "exempt" else "?")
            put(f.original, tok, f.role, f.selector, f.raw)
        elif f.status == "dropped":  # définitions de :root retirées : la couleur vit désormais dans tokens.css
            for m in ITEM_RE.finditer(mask(f.original)):
                hx = m.group("hex")
                if not hx:
                    continue
                if token_color(light, f.prop):
                    tok = f.prop
                elif (f.prop, "*") in LEGACY_VARS:
                    tok = LEGACY_VARS[(f.prop, "*")]
                elif f.prop in REMOVED_TOKENS:
                    tok = "supprimé"
                else:
                    tok = next((t for tab in MAP.values() for c, t in tab.items() if c == normalize_hex(hx)), "?")
                if f.prop == "--shadow":
                    tok = MAP["shadow"].get(normalize_hex(hx), tok)
                put(hx, tok, "définition", f":root {f.prop}", f.original[m.start():m.end()])
    out = []
    for (orig, tok), r in sorted(rows.items(), key=lambda kv: (lab(flatten(kv[0][0]))[0], kv[0][0], kv[0][1])):
        tv = token_color(light, tok) if tok.startswith("--") else None
        de = delta_e(orig, tv) if tv else None
        out.append(dict(orig=orig, tok=tok, tv=tv, de=de, n=r["n"], roles="/".join(sorted(r["roles"])),
                        where=", ".join(sorted(r["where"])), raw=", ".join(sorted(r["raw"]))))
    return out


def render_table(all_findings, tokens):
    """Tableau Markdown : couleur d'origine -> jeton, ΔE, nombre d'occurrences."""
    lines = ["| Couleur d'origine | Écriture(s) | Rôle | Jeton | Valeur claire du jeton | ΔE2000 | Usages | Exemples de sélecteurs |",
             "|---|---|---|---|---|---|---|---|"]
    for r in table_rows(all_findings, tokens):
        tok = r["tok"]
        label = (f"`{tok}`" if tok.startswith("--") else "conservée (impression, valeur fixe)" if tok == "impression"
                 else "supprimé (inutilisé)" if tok == "supprimé" else "**inconnue**")
        spell = ", ".join(f"`{x}`" for x in r["raw"].split(", "))
        tv = f"`{r['tv']}`" if r["tv"] else "-"
        de = f"{r['de']:.2f}" if r["de"] is not None else "-"
        where = ", ".join(r["where"].split(", ")[:2])[:90]
        lines.append(f"| `{r['orig']}` | {spell} | {r['roles']} | {label} | {tv} | {de} | {r['n']} | {where} |")
    return "\n".join(lines)


def write_csv(path, rows):
    with open(path, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow(["couleur_origine", "ecritures", "role", "jeton", "valeur_claire_jeton", "dE2000", "usages", "selecteurs"])
        for r in rows:
            w.writerow([r["orig"], r["raw"], r["roles"], r["tok"], r["tv"] or "", f"{r['de']:.2f}".replace(".", ",") if r["de"] is not None else "",
                        r["n"], r["where"][:200]])


# ====================================================================================== contrôle de tokens.css
def check_tokens(tokens_path: Path):
    """Problèmes de tokens.css : valeur sombre manquante, miroir différent du bloc @media, jeton de la table absent."""
    t = load_tokens(tokens_path)
    light, dark, mirror = t["light"], t["dark"], t["mirror"]
    problems = []
    for name in sorted(set(dark) | set(mirror)):
        if (dark.get(name) or "").strip() != (mirror.get(name) or "").strip():
            problems.append(f"{name} : bloc @media sombre ({dark.get(name)!r}) != miroir [data-theme=dark] ({mirror.get(name)!r})")
        if name not in light:
            problems.append(f"{name} : valeur sombre sans valeur claire")
    for name in sorted(light):
        if name not in dark and name not in CONSTANT_TOKENS:
            problems.append(f"{name} : sans valeur sombre (identique en sombre ? l'ajouter alors à CONSTANT_TOKENS dans migrate.py)")
    for name in sorted(light):
        v = light[name].strip()
        if v.startswith("#") and token_color(light, name) is None:
            problems.append(f"{name} : valeur claire invalide ({v})")
    for name in sorted(dark):
        v = dark[name].strip()
        if v.startswith("#") and token_color(dark, name) is None:
            problems.append(f"{name} : valeur sombre invalide ({v})")
    return problems


def undefined_vars(paths, tokens: dict):
    """var(--x) sans valeur de secours dont --x n'est défini ni dans tokens.css ni dans les fichiers donnés -> {nom: [fichier:ligne]}."""
    defined = set(tokens["light"])
    texts = {}
    for p in paths:
        if Path(p).suffix.lower() in (".css", ".html", ".htm"):
            texts[str(p)] = read_file(Path(p))
            defined |= set(re.findall(r"(?<![\w-])(--[\w-]+)\s*:", mask(texts[str(p)])))
    out = defaultdict(list)
    for p, text in texts.items():
        m = mask(text)
        for it in re.finditer(r"var\(\s*(--[\w-]+)\s*([,)])", m):
            if it.group(1) not in defined and it.group(2) == ")":
                out[it.group(1)].append(f"{Path(p).name}:{text.count(chr(10), 0, it.start()) + 1}")
    return dict(out)


def sync_mirror(tokens_path: Path, write: bool = True):
    """Recopie les déclarations du bloc @media sombre dans le miroir [data-theme="dark"] -> (modifié, message)."""
    raw = tokens_path.read_bytes().decode("utf-8")
    nl = "\r\n" if raw.count("\r\n") > raw.count("\n") / 2 else "\n"
    text = raw.replace("\r\n", "\n")
    decls = scan(text, str(tokens_path))
    med = [d for d in decls if d["prop"].startswith("--") and "prefers-color-scheme: dark" in " ".join(d["atrules"])]
    mir = [d for d in decls if d["prop"].startswith("--") and 'data-theme="dark"' in d["selector"]]
    if not med or not mir:
        return False, "bloc @media sombre ou miroir introuvable"

    def span(ds):
        a = min(d["start"] for d in ds)
        b = max(d["end"] for d in ds)
        while b < len(text) and text[b] in " \t":
            b += 1
        if b < len(text) and text[b] == ";":
            b += 1
        return a, b

    (ma, mb), (ra, rb) = span(med), span(mir)

    def indent_of(a):
        ls = text.rfind("\n", 0, a) + 1
        return text[ls:a]

    body = text[ma:mb]
    delta = indent_of(ra)
    src_indent = indent_of(ma)
    lines = body.split("\n")
    fixed = [lines[0]] + [(delta + ln[len(src_indent):]) if ln.startswith(src_indent) else ln for ln in lines[1:]]
    new_text = text[:ra] + "\n".join(fixed) + text[rb:]
    changed = new_text != text
    if changed and write:
        tokens_path.write_bytes(new_text.replace("\n", nl).encode("utf-8"))
    return changed, ("miroir mis à jour" if changed else "miroir déjà identique au bloc @media")


def selftest(tokens: dict, tokens_path: Path | None = None) -> int:
    """Contrôle la table : jetons existants, valeur claire à ΔE <= MAX_DE de chaque couleur d'origine, tokens.css cohérent."""
    light, bad, rows = tokens["light"], 0, []
    entries = [(role, c, t) for role, tab in MAP.items() for c, t in tab.items()]
    entries += [("exception", orig, t) for _, _, orig, t in OVERRIDES if orig.startswith("#") and t]
    for role, c, t in entries:
        v = token_color(light, t)
        if v is None:
            print(f"ERREUR  {role:9} {c} -> {t} : jeton absent de tokens.css (ou pas une couleur)")
            bad += 1
            continue
        de = delta_e(c, v)
        rows.append((de, role, c, t, v))
        if de > MAX_DE:
            print(f"ERREUR  {role:9} {c} -> {t} ({v}) : ΔE2000 = {de:.2f} > {MAX_DE}")
            bad += 1
    for _, _, _, t in OVERRIDES:
        if t and t not in light:
            print(f"ERREUR  exception -> {t} : jeton absent de tokens.css")
            bad += 1
    for (name, role), t in LEGACY_VARS.items():
        if t not in light:
            print(f"ERREUR  ancien jeton {name} -> {t} : absent de tokens.css")
            bad += 1
    if tokens_path is not None:
        for p in check_tokens(tokens_path):
            print("ERREUR  tokens.css :", p)
            bad += 1
    worst = max(rows)[0] if rows else 0.0
    print(f"selftest : {len(rows)} correspondances, ΔE2000 max = {worst:.2f} (limite {MAX_DE}), {len(light)} jetons clairs, "
          f"{len(tokens['dark'])} sombres, {bad} erreur(s)")
    return 2 if bad else 0


# ====================================================================================== CLI
def read_file(path: Path) -> str:
    with open(path, encoding="utf-8", newline="") as fh:
        return fh.read()


def write_file(path: Path, text: str):
    with open(path, "w", encoding="utf-8", newline="") as fh:
        fh.write(text)


def main(argv=None) -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser(description="Remplace les couleurs en dur des feuilles CSS par des jetons (var(--…)).")
    ap.add_argument("files", nargs="*", help="feuilles .css à migrer (réécrites en place) ; .html : style/<style> ; .js : comptage seul")
    ap.add_argument("--tokens", default=None, help="fichier de jetons (défaut : tokens.css à côté du script ou styles/tokens.css)")
    ap.add_argument("--dry-run", "-n", action="store_true", help="n'écrit rien")
    ap.add_argument("--diff", action="store_true", help="affiche les changements au format diff")
    ap.add_argument("--check", action="store_true", help="n'écrit rien ; code 1 s'il reste des modifications à faire")
    ap.add_argument("--report", action="store_true", help="n'écrit rien ; liste les couleurs restantes (inconnues et exemptées)")
    ap.add_argument("--table", action="store_true", help="n'écrit rien ; tableau Markdown couleur -> jeton")
    ap.add_argument("--csv", metavar="FICHIER", help="écrit le tableau couleur -> jeton en CSV (point-virgule), sans rien migrer")
    ap.add_argument("--snap", type=float, metavar="DE", help="rattache les couleurs inconnues au jeton le plus proche si ΔE2000 <= DE")
    ap.add_argument("--strict", action="store_true", help="code 2 s'il reste des couleurs inconnues")
    ap.add_argument("--keep-root", action="store_true", help="ne retire pas les définitions de couleurs des blocs :root")
    ap.add_argument("--no-legacy", action="store_true", help="ne remappe pas les anciens jetons (--white, aplats --brand/--deep)")
    ap.add_argument("--selftest", action="store_true", help="contrôle la table de correspondance et tokens.css, puis quitte")
    ap.add_argument("--check-tokens", action="store_true", help="contrôle tokens.css (miroir, valeurs sombres) et, avec des fichiers, les var(--x) non définies, puis quitte")
    ap.add_argument("--sync-mirror", action="store_true", help="recopie le bloc @media sombre dans le miroir de tokens.css puis quitte")
    ap.add_argument("--meta", metavar="HTML", help="ajoute <meta color-scheme> et theme-color sombre au modèle HTML puis quitte")
    ap.add_argument("-v", "--verbose", action="store_true", help="détail des jetons utilisés et des exemptions")
    args = ap.parse_args(argv)

    tokens_path = Path(args.tokens) if args.tokens else default_tokens()
    if not tokens_path.exists():
        print(f"tokens.css introuvable : {tokens_path}", file=sys.stderr)
        return 2
    if args.sync_mirror:
        changed, msg = sync_mirror(tokens_path, write=not args.dry_run)
        print(msg)
        return 0
    tokens = load_tokens(tokens_path)
    if args.check_tokens:
        problems = check_tokens(tokens_path)
        for name, where in undefined_vars([f for f in args.files if Path(f).resolve() != tokens_path.resolve()], tokens).items():
            problems.append(f"var({name}) utilisée sans valeur de secours mais définie nulle part : {', '.join(where[:4])}")
        for p in problems:
            print("PROBLÈME :", p)
        print(f"tokens.css : {'OK' if not problems else str(len(problems)) + ' problème(s)'} "
              f"({len(tokens['light'])} jetons clairs, {len(tokens['dark'])} sombres, miroir {len(tokens['mirror'])})")
        return 1 if problems else 0
    if args.selftest:
        return selftest(tokens, tokens_path)
    if args.meta:
        p = Path(args.meta)
        dark = token_color(tokens["dark"], "--paper") or "#0e1424"
        new, added = ensure_meta(read_file(p), dark)
        if added and not args.dry_run:
            write_file(p, new)
        print(f"{p} : {'ajouté : ' + ', '.join(added) if added else 'déjà à jour'}")
        return 0
    if not args.files:
        ap.print_help()
        return 0

    read_only = args.dry_run or args.check or args.report or args.table or bool(args.csv)
    all_findings, changed, extras = [], 0, {}
    for name in args.files:
        path = Path(name)
        if path.resolve() == tokens_path.resolve():
            continue
        ext = path.suffix.lower()
        src = read_file(path)
        if ext == ".js":
            extras[path.name] = extra_colors(src)
            continue
        kw = dict(snap=args.snap, remap_legacy=not args.no_legacy, drop_root=not args.keep_root)
        if ext in (".html", ".htm"):
            new, findings = migrate_html(src, str(path), tokens, **kw)
            extras[path.name] = extra_colors(STYLE_BLOCK_RE.sub("", STYLE_ATTR_RE.sub("", new)))
        else:
            new, findings = migrate_text(src, str(path), tokens, **kw)
        all_findings += findings
        if new != src:
            changed += 1
            if mask(new).count("{") != mask(new).count("}"):
                print(f"ERREUR {path} : accolades déséquilibrées après migration, fichier non écrit", file=sys.stderr)
                return 2
            if args.diff:
                sys.stdout.writelines(difflib.unified_diff(src.splitlines(True), new.splitlines(True), f"a/{path}", f"b/{path}"))
            if not read_only:
                write_file(path, new)
                print(f"{path} : réécrit")

    if args.csv:
        write_csv(args.csv, table_rows(all_findings, tokens))
        print(f"{args.csv} : écrit")
    if args.table:
        print(render_table(all_findings, tokens))
        return 0
    print(render_report(all_findings, verbose=args.verbose or args.report, extras=extras))
    if args.check and changed:
        print(f"--check : {changed} fichier(s) à migrer", file=sys.stderr)
        return 1
    if args.strict and any(f.status == "unknown" for f in all_findings):
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
