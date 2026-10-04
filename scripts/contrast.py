#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""contrast.py : rapport de contraste WCAG exact, calculé depuis tokens.css (clair ET sombre).

Python 3 standard uniquement. Réutilise l'analyseur de CSS et les fonctions couleur de migrate.py (même dossier).

  python scripts/contrast.py                      # matrice des paires texte/fond et composants, clair et sombre
  python scripts/contrast.py --md                 # même chose en tableaux Markdown
  python scripts/contrast.py --csv matrice.csv    # même chose en CSV (point-virgule)
  python scripts/contrast.py --theme dark         # un seul thème
  python scripts/contrast.py --dom audit/dark.json [--dom audit/light.json]   # paires RÉELLES relevées dans le DOM (tools/audit-dom.cjs)
Codes de sortie : 0 = tout passe en sombre et aucune régression en clair ; 1 = une paire sombre (ou une paire claire non
préexistante) est sous le seuil AA ; 2 = erreur (miroir sombre différent du bloc @media, jeton absent).

Rapport de contraste = (L1 + 0,05) / (L2 + 0,05), L = luminance relative WCAG 2.x.
Seuils : 4,5:1 texte courant ; 3:1 grand texte (>= 24 px, ou >= 18,66 px en gras) et composants d'interface
(bords de champs, coches, anneaux de focus, segments d'état).
Une paire sous le seuil en clair est dite « préexistante » si elle l'était déjà avec les couleurs d'origine du CSS
(KNOWN_LIGHT_UI : rails des segments, dont l'information est doublée par le texte) : elle n'est pas modifiée par la migration.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import migrate as mg  # noqa: E402

AA_TEXT, AA_LARGE, AA_UI = 4.5, 3.0, 3.0


# ------------------------------------------------------------------ couleurs et contraste
def lum(rgb) -> float:
    return 0.2126 * mg._lin(rgb[0]) + 0.7152 * mg._lin(rgb[1]) + 0.0722 * mg._lin(rgb[2])


def ratio(fg, bg) -> float:
    a, b = lum(fg), lum(bg)
    if a < b:
        a, b = b, a
    return (a + 0.05) / (b + 0.05)


def over(top, base_rgb):
    """top = (r, g, b, a) posé sur un fond opaque -> (r, g, b)."""
    r, g, b, a = top
    return tuple(c * a + k * (1 - a) for c, k in zip((r, g, b), base_rgb))


def rgba_of(hexcolor: str):
    return mg.to_rgba(mg.normalize_hex(hexcolor))


class Theme:
    """Valeurs résolues des jetons pour un thème."""

    def __init__(self, tokens: dict, name: str):
        self.name = name
        table = dict(tokens["light"])
        if name == "dark":
            table.update(tokens["dark"])
        self.table = table

    def rgba(self, token: str):
        # un littéral « #rrggbb » est accepté tel quel (couleurs des schémas SVG, écrites en dur)
        v = mg.normalize_hex(token) if token.startswith("#") else mg.token_color(self.table, token)
        if v is None:
            raise KeyError(f"jeton sans valeur couleur : {token}")
        return rgba_of(v)

    def hex(self, token: str) -> str:
        return mg.normalize_hex(token) if token.startswith("#") else mg.token_color(self.table, token)

    def opaque(self, spec: str):
        """'--a' ou '--a/--b' (a posé sur b) ou '--a/--b/--c' -> (r, g, b)."""
        parts = spec.split("/")
        rgb = self.rgba(parts[-1])[:3]
        for p in reversed(parts[:-1]):
            rgb = over(self.rgba(p), rgb)
        return tuple(rgb)


# ------------------------------------------------------------------ paires utilisées (d'après les règles CSS et l'audit du DOM)
# (groupe, premier plan, fond(s), type, où)   fond = jeton, « a/b » (a posé sur b) ou liste de jetons (dégradé : pire cas)
T, U = "text", "ui"
ISLAND = "Schémas : îlot clair (mêmes valeurs dans les deux thèmes)"
GRAD = ["--mint", "--surface-soft"]
HERO = ["--hero-from", "--hero-to", "--hero-glow"]
PAIRS = [
    ("Texte courant", "--ink", "--paper", T, "texte principal sur la page"),
    ("Texte courant", "--ink", "--surface", T, "texte des cartes, champs, boîtes de dialogue"),
    ("Texte courant", "--ink", "--surface-soft", T, "remarque de contexte, exemples, cartes imbriquées"),
    ("Texte courant", "--ink", "--mint", T, "choix sélectionné, « Dire », encarts, survols"),
    ("Texte courant", "--ink", GRAD, T, "cadre de question et de fiche (dégradé)"),
    ("Texte courant", "--ink", "--rose", T, "corps de « En danger maintenant ? », liste « à éviter »"),
    ("Texte courant", "--ink", "--header-bg/--paper", T, "menu et textes de l'en-tête"),
    ("Texte courant", "--muted", "--paper", T, "chapeaux, pied de page, navigation"),
    ("Texte courant", "--muted", "--header-bg/--paper", T, "liens de navigation (en-tête)"),
    ("Texte courant", "--muted", "--surface", T, "textes d'aide, étiquettes, légendes"),
    ("Texte courant", "--muted", "--surface-soft", T, "aides dans les encarts"),
    ("Texte courant", "--muted", "--mint", T, "aides sur teinte (survol, sélection)"),
    ("Texte courant", "--muted", GRAD, T, "aides dans les cadres (dégradé)"),
    ("Texte courant", "--placeholder", "--surface", T, "texte d'aide des champs vides"),
    ("Texte courant", "--example-ink", "--surface-soft", T, "texte et étiquette des exemples fictifs"),
    ("Texte courant", "--example-ink", GRAD, T, "exemple dans un cadre (dégradé)"),
    ("Liens et accent", "--brand", "--paper", T, "liens sur la page"),
    ("Liens et accent", "--brand", "--surface", T, "liens, boutons secondaires, étiquettes"),
    ("Liens et accent", "--brand", "--surface-soft", T, "liens dans les encarts"),
    ("Liens et accent", "--brand", "--mint", T, "étiquette, bouton survolé, « Changer »"),
    ("Liens et accent", "--brand", GRAD, T, "surtitres des cadres (dégradé)"),
    ("Liens et accent", "--brand", "--rose", T, "lien dans « En danger maintenant ? »"),
    ("Liens et accent", "--deep", "--header-bg/--paper", T, "nom « Pas à pas » en en-tête"),
    ("Liens et accent", "--deep", "--paper", T, "titres et nom dans le pied de page"),
    ("Liens et accent", "--deep", "--surface", T, "titres, compteur d'étape, valeur choisie"),
    ("Liens et accent", "--deep", "--mint", T, "navigation courante, choix coché"),
    ("Liens et accent", "--deep", "--surface-soft", T, "titres dans les encarts"),
    ("Liens et accent", "--deep", GRAD, T, "titres des cadres (dégradé)"),
    ("Sur aplat de marque", "--on-fill", "--brand-fill", T, "bouton principal, flèches, numéros, coche"),
    ("Sur aplat de marque", "--on-fill", "--brand-fill-hover", T, "bouton principal survolé"),
    ("Sur aplat de marque", "--on-fill", "--deep-fill", T, "logo, étape courante, info-bulle, message, lien d'évitement"),
    ("Sur aplat de marque", "--on-fill-soft", "--deep-fill", T, "petit texte de l'étape courante"),
    ("Sur aplat de marque", "--on-fill", "--on-fill-wash/--deep-fill", T, "numéro de l'étape courante (voile blanc sur aplat)"),
    ("Sur aplat de marque", "--on-fill", HERO, T, "titre du bandeau d'accueil (dégradé)"),
    ("Sur aplat de marque", "--on-fill-soft", HERO, T, "chapeau du bandeau d'accueil (dégradé)"),
    ("Danger et vigilance", "--red", "--surface", T, "bouton de danger, erreur, « Retirer »"),
    ("Danger et vigilance", "--red", "--header-bg/--paper", T, "« Besoin d'aide ? » (en-tête)"),
    ("Danger et vigilance", "--red", "--rose", T, "titre « à éviter »"),
    ("Danger et vigilance", "--red", GRAD, T, "« Retirer » dans un cadre (dégradé)"),
    ("Danger et vigilance", "--red-ink", "--rose", T, "notice rouge (danger), « En danger maintenant ? » (mot fort)"),
    ("Danger et vigilance", "--red-ink", "--surface", T, "lien-bouton dans la notice rouge"),
    ("Danger et vigilance", "--amber-ink", "--amber", T, "notice ambre (vigilance)"),
    ("Violentomètre", "--m1-ink", "--m1-bg", T, "niveau 1 (vert)"),
    ("Violentomètre", "--m1-ink", "--m2-bg", T, "niveau 2 (vert-jaune)"),
    ("Violentomètre", "--amber-ink", "--amber", T, "niveau 3 (ambre)"),
    ("Violentomètre", "--m4-ink", "--m4-bg", T, "niveau 4 (orange)"),
    ("Violentomètre", "--red-ink", "--m5-bg", T, "niveau 5 (rouge)"),
    ("Violentomètre", "--m6-ink", "--m6-bg", T, "niveau 6 (rouge profond)"),
    # ---- composants d'interface (3:1)
    ("Composants (3:1)", "--field-line", "--surface", U, "bord des champs, cercle de choix, bord de l'interrupteur / fond blanc"),
    ("Composants (3:1)", "--field-line", ["--mint", "--surface-soft", "--surface"], U, "mêmes bords / fond du cadre autour ou piste de l'interrupteur"),
    ("Composants (3:1)", "--brand", "--surface", U, "bord 2 px des champs principaux, filet de sélection, focus de champ"),
    ("Composants (3:1)", "--brand", GRAD, U, "même bord, côté fond du cadre (dégradé)"),
    ("Composants (3:1)", "--line-strong", "--line-soft", U, "question passée / rail (information doublée par le texte)"),
    ("Composants (3:1)", "--brand-fill", "--surface", U, "choix coché, interrupteur actif"),
    ("Composants (3:1)", "--brand-fill", "--mint", U, "pastille et coche sur teinte"),
    ("Composants (3:1)", "--on-fill", "--brand-fill", U, "coche et bouton de l'interrupteur"),
    ("Composants (3:1)", "--focus-ring", "--paper", U, "anneau de focus clavier sur la page"),
    ("Composants (3:1)", "--focus-ring", "--surface", U, "anneau de focus clavier sur une carte"),
    ("Composants (3:1)", "--focus-ring", GRAD, U, "anneau de focus clavier dans un cadre"),
    ("Composants (3:1)", "--page-ring", "--paper", U, "contour de focus d'un schéma (îlot clair)"),
    ("Composants (3:1)", "--deep", "--line-soft", U, "segment d'étape courante / rail"),
    ("Composants (3:1)", "--brand", "--line-soft", U, "segment fait / rail ; question courante / rail"),
    ("Composants (3:1)", "--progress-fill", "--line-soft", U, "barre de progression du collectif"),
    ("Composants (3:1)", "--red", "--rose", U, "filet de « En danger maintenant ? »"),
    ("Composants (3:1)", "--m1-edge", "--m1-bg", U, "filet du niveau 1"),
    ("Composants (3:1)", "--m2-edge", "--m2-bg", U, "filet du niveau 2"),
    ("Composants (3:1)", "--m3-edge", "--amber", U, "filet du niveau 3"),
    ("Composants (3:1)", "--m4-edge", "--m4-bg", U, "filet du niveau 4"),
    ("Composants (3:1)", "--m5-edge", "--m5-bg", U, "filet du niveau 5"),
    ("Composants (3:1)", "--m6-edge", "--m6-bg", U, "filet du niveau 6"),
    ("Composants (3:1)", "--m1-edge", "--paper", U, "filet du niveau 1 / page"),
    ("Composants (3:1)", "--m6-edge", "--paper", U, "filet du niveau 6 / page"),
    # ---- îlot clair (schémas) : toujours évalué avec les valeurs CLAIRES, dans les deux thèmes
    (ISLAND, "--muted", "--mint", T, "légende du schéma"),
    (ISLAND, "--brand", "--surface", T, "bouton « Enregistrer l'image »"),
    (ISLAND, "#202b50", "#ffffff", T, "SVG : intitulés des cases"),
    (ISLAND, "#202b50", "#edf3fb", T, "SVG : intitulés des losanges"),
    (ISLAND, "#202b50", "#edf6ee", T, "SVG : cases « oui »"),
    (ISLAND, "#596680", "#ffffff", T, "SVG : petites légendes"),
    (ISLAND, "#596680", "#edf6ee", T, "SVG : légendes des cases « oui »"),
    (ISLAND, "#285b9d", "#edf3fb", T, "SVG : « Oui »"),
    (ISLAND, "#75490f", "#edf3fb", T, "SVG : « Non ou doute »"),
    (ISLAND, "#51370f", "#fff4dc", T, "SVG : cases « pause »"),
    (ISLAND, "#ffffff", "#285b9d", T, "SVG : chiffres des pastilles"),
    (ISLAND, "#285b9d", "#edf3fb", U, "SVG : flèches et contours des losanges"),
]

# Paires d'interface sous 3:1 en clair depuis l'origine du CSS et laissées telles quelles. Les bords de champs, cercles de choix
# et interrupteurs (--field-line, #7589b1) ont été relevés à 3:1 lors de la refonte : ils ne sont plus dans cette liste.
KNOWN_LIGHT_UI = {
    ("--line-strong", "--line-soft"),
}


def eval_pair(theme: Theme, fg: str, bg):
    """Retourne (rapport minimal, détail) ; bg peut être une liste (dégradé : pire cas)."""
    fgc = theme.rgba(fg)
    stops = bg if isinstance(bg, list) else [bg]
    worst, which = 1e9, ""
    for s in stops:
        b = theme.opaque(s)
        f = over(fgc, b) if fgc[3] < 0.999 else fgc[:3]
        r = ratio(f, b)
        if r < worst:
            worst, which = r, s
    return worst, which


def verdict(r: float, need: float) -> str:
    return "OK" if r >= need else "ÉCHEC"


def bg_label(bg) -> str:
    return " + ".join(bg) if isinstance(bg, list) else bg


def build_matrix(tokens: dict, themes=("light", "dark")):
    rows = []
    th = {n: Theme(tokens, n) for n in themes}
    for group, fg, bg, kind, usage in PAIRS:
        need = AA_TEXT if kind == T else AA_UI
        res = {}
        for n in themes:
            # l'îlot clair garde les valeurs claires quel que soit le thème de la page
            r, which = eval_pair(th["light"] if group == ISLAND and "light" in th else th[n], fg, bg)
            res[n] = (r, which)
        rows.append((group, fg, bg, kind, need, usage, res))
    return rows


def is_known(fg, bg, theme):
    return theme == "light" and (fg, bg_label(bg)) in KNOWN_LIGHT_UI


def cell(r, need, fg, bg, theme):
    ok = r >= need
    if ok:
        return f"{r:.2f}"
    return f"{r:.2f} ÉCHEC" + (" (préexistant)" if is_known(fg, bg, theme) else "")


def render_text(rows, themes) -> str:
    out, cur = [], None
    for group, fg, bg, kind, need, usage, res in rows:
        if group != cur:
            out.append(f"\n== {group}")
            cur = group
        cells = "  ".join(f"{n[:1].upper()} {cell(res[n][0], need, fg, bg, n):>22}" for n in themes)
        out.append(f"{fg:18} / {bg_label(bg):40} seuil {need:3.1f}  {cells}  {usage}")
    return "\n".join(out)


def render_md(rows, themes) -> str:
    out, cur = [], None
    for group, fg, bg, kind, need, usage, res in rows:
        if group != cur:
            out += ["", f"**{group}**", "", "| Premier plan | Fond | Où | Seuil | Clair | Sombre |", "|---|---|---|---|---|---|"]
            cur = group
        cells = [cell(res[n][0], need, fg, bg, n) for n in themes]
        bgs = bg_label(bg).replace("--header-bg/--paper", "--header-bg sur --paper")
        out.append(f"| `{fg}` | `{bgs}` | {usage} | {need:g}:1 | {cells[0]} | {cells[1] if len(cells) > 1 else ''} |")
    return "\n".join(out)


def write_csv(path, rows, themes):
    with open(path, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh, delimiter=";")
        w.writerow(["groupe", "premier_plan", "fond", "seuil", "usage"] + [f"rapport_{n}" for n in themes] + [f"resultat_{n}" for n in themes])
        for group, fg, bg, kind, need, usage, res in rows:
            w.writerow([group, fg, bg_label(bg), need, usage] + [f"{res[n][0]:.2f}".replace(".", ",") for n in themes]
                       + [("OK" if res[n][0] >= need else "ECHEC" + (" prexistant" if is_known(fg, bg, n) else "")) for n in themes])


def summary(rows, themes):
    s = {}
    for n in themes:
        fails = [(g, fg, bg, res[n][0], need, usage) for g, fg, bg, k, need, usage, res in rows if res[n][0] < need]
        s[n] = (len(rows), fails)
    return s


# ------------------------------------------------------------------ audit du DOM (paires réelles)
def stack_backdrops(layers, depth=0):
    """Pile de fonds (du haut vers le bas) -> liste de couleurs opaques possibles (dégradés : chaque arrêt)."""
    if not layers:
        return [(255.0, 255.0, 255.0)]
    top, rest = layers[0], layers[1:]
    kind = top["k"]
    if kind == "img":
        return stack_backdrops(rest, depth + 1)
    options = [tuple(top["c"])] if kind == "color" else [tuple(c) for c in top["s"]]
    outs = []
    for c in options:
        if c[3] >= 0.999:
            outs.append(tuple(c[:3]))
        else:
            for under in stack_backdrops(rest, depth + 1):
                outs.append(over(c, under))
    return outs or [(255.0, 255.0, 255.0)]


def is_large(fs: float, fw: int) -> bool:
    return fs >= 24 or (fs >= 18.66 and fw >= 700)


def audit_dom(path: Path, tokens: dict, theme_name: str):
    data = json.loads(path.read_text(encoding="utf-8"))
    theme = Theme(tokens, theme_name if theme_name in ("light", "dark") else data.get("theme", "light"))
    names = {}
    for tok in theme.table:
        try:
            names.setdefault(theme.hex(tok), []).append(tok)
        except Exception:
            pass

    def name_of(rgb):
        """Nom lisible d'une couleur : les jetons « --on-* » d'abord, puis les autres ; --page-ring en dernier."""
        h = mg.normalize_hex("#%02x%02x%02x" % tuple(int(round(c)) for c in rgb[:3]))
        cands = sorted(names.get(h, [h]), key=lambda t: (0 if t.startswith("--on-") else 2 if t == "--page-ring" else 1, t))
        return "/".join(cands[:2])

    groups = defaultdict(lambda: {"n": 0, "ex": [], "states": set(), "min": 1e9, "need": 4.5})
    ui_groups = defaultdict(lambda: {"n": 0, "ex": [], "min": 1e9})
    total_text = total_fail = 0
    for state, widths in data["states"].items():
        for width, rows in widths.items():
            for r in rows:
                if r.get("ui"):
                    bc = tuple(r["border"])
                    for side in ("inside", "outside"):
                        for b in stack_backdrops(r[side]):
                            f = over(bc, b) if bc[3] < 0.999 else bc[:3]
                            rt = ratio(f, b)
                            k = (name_of(bc), side, name_of(b))
                            g = ui_groups[k]
                            g["n"] += 1
                            g["min"] = min(g["min"], rt)
                            if len(g["ex"]) < 2:
                                g["ex"].append(r["d"])
                    continue
                if r.get("disabled") or not r.get("fg"):
                    continue
                total_text += 1
                need = AA_LARGE if is_large(r.get("fs", 16), r.get("fw", 400)) else AA_TEXT
                op = r.get("op", 1.0)
                worst, worst_bg = 1e9, None
                for b in stack_backdrops(r["layers"]):
                    fg = tuple(r["fg"])
                    a = fg[3] * op
                    f = over((fg[0], fg[1], fg[2], a), b)
                    rt = ratio(f, b)
                    if rt < worst:
                        worst, worst_bg = rt, (b, fg)
                k = (name_of(worst_bg[1]), name_of(worst_bg[0]), need)
                g = groups[k]
                g["n"] += 1
                g["min"] = min(g["min"], worst)
                g["need"] = need
                g["states"].add(state)
                if len(g["ex"]) < 3:
                    g["ex"].append(f"{r['d']} « {r.get('t', '')} »")
                if worst < need:
                    total_fail += 1
    return theme, groups, ui_groups, total_text, total_fail


def render_dom(path: Path, tokens: dict, theme_name: str) -> int:
    theme, groups, ui_groups, total, fail = audit_dom(path, tokens, theme_name)
    print(f"\n### Audit du DOM ({path.name}, thème {theme.name}) : {total} textes visibles, {fail} sous le seuil\n")
    print("| Texte | Fond (pire arrêt) | Seuil | Rapport min. | Occurrences | Exemple |")
    print("|---|---|---|---|---|---|")
    for (fg, bg, need), g in sorted(groups.items(), key=lambda kv: kv[1]["min"]):
        flag = "" if g["min"] >= need else " **ÉCHEC**"
        print(f"| `{fg}` | `{bg}` | {need:g}:1 | {g['min']:.2f}{flag} | {g['n']} | {g['ex'][0][:80]} |")
    bad_ui = [(k, g) for k, g in ui_groups.items() if g["min"] < 3 and ("input" in g["ex"][0] or "textarea" in g["ex"][0] or "select" in g["ex"][0])]
    print("\nBords de champs (input, textarea, select), pire rapport par côté : "
          + (", ".join(f"{k[0]} / {k[1]} {k[2]} = {g['min']:.2f}" for k, g in bad_ui) or "tous >= 3:1"))
    return fail


# ------------------------------------------------------------------ CLI
def main(argv=None) -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    ap = argparse.ArgumentParser(description="Matrice de contraste WCAG calculée depuis tokens.css.")
    ap.add_argument("--tokens", default=None, help="défaut : tokens.css à côté du script ou styles/tokens.css")
    ap.add_argument("--theme", choices=["light", "dark", "both"], default="both")
    ap.add_argument("--md", action="store_true", help="sortie Markdown")
    ap.add_argument("--csv", metavar="FICHIER", help="écrit aussi la matrice en CSV (point-virgule)")
    ap.add_argument("--dom", action="append", default=[], help="relevé de audit-dom.cjs à vérifier (répétable)")
    ap.add_argument("--dom-theme", choices=["light", "dark"], help="thème des valeurs de jetons pour nommer les couleurs du relevé")
    args = ap.parse_args(argv)
    tokens_path = Path(args.tokens) if args.tokens else mg.default_tokens()
    tokens = mg.load_tokens(tokens_path)
    if tokens["dark"] != tokens["mirror"]:
        diff = sorted(set(tokens["dark"].items()) ^ set(tokens["mirror"].items()))
        print("ERREUR : le miroir [data-theme=\"dark\"] diffère du bloc @media :", diff[:6], "(python migrate.py --sync-mirror)", file=sys.stderr)
        return 2
    themes = ("light", "dark") if args.theme == "both" else (args.theme,)
    try:
        rows = build_matrix(tokens, themes)
    except KeyError as e:
        print("ERREUR :", e, file=sys.stderr)
        return 2
    print(render_md(rows, themes) if args.md else render_text(rows, themes))
    if args.csv:
        write_csv(args.csv, rows, themes)
    summ = summary(rows, themes)
    print()
    rc = 0
    for n in themes:
        total, fails = summ[n]
        new = [f for f in fails if not is_known(f[1], f[2], n)]
        old = [f for f in fails if is_known(f[1], f[2], n)]
        line = f"Thème {n} : {total - len(fails)}/{total} paires atteignent leur seuil AA"
        if old:
            line += f" ; {len(old)} préexistante(s) sous 3:1 (CSS d'origine) : " + "; ".join(f"{fg} / {bg_label(bg)} = {r:.2f}" for _, fg, bg, r, need, _ in old)
        if new:
            line += " ; SOUS LE SEUIL : " + "; ".join(f"{fg} / {bg_label(bg)} = {r:.2f} (< {need:g})" for _, fg, bg, r, need, _ in new)
            rc = 1
        print(line)
    for p in args.dom:
        tn = args.dom_theme or ("dark" if "dark" in Path(p).name else "light")
        if render_dom(Path(p), tokens, tn) and tn == "dark":
            rc = 1
    return rc


if __name__ == "__main__":
    sys.exit(main())
