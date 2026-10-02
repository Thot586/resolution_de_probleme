      // Standalone, zero-dependency application. User input is escaped before HTML rendering.
      const $ = (s, r = document) => r.querySelector(s),
        $$ = (s, r = document) => [...r.querySelectorAll(s)];
      const esc = (v) =>
        String(v ?? "").replace(
          /[&<>"']/g,
          (c) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[c],
        );
      const KEY = "pas-a-pas.brouillon.v1";
      const contextIcon = (k) => {
        const paths = {
          daily: "M3 10l9-7 9 7M5 9v12h14V9M9 21v-7h6v7",
          work: "M8 6V3h8v3M3 6h18v14H3zM3 11c6 4 12 4 18 0M10 12h4",
          couple:
            "M12 20S2 14 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 6-10 12-10 12z",
          family:
            "M3 20v-4a4 4 0 0 1 8 0v4M13 20v-4a4 4 0 0 1 8 0v4M10 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0M20 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
          study:
            "M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1v15",
          health: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z",
          collective: "M4 20h16M6 20V9l6-5 6 5v11M9 12h6M9 16h6",
        };
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[k]}"/></svg>`;
      };
      const stepNames = [
        ["Commencer", "Mon contexte"],
        ["Clarifier", "Un but précis"],
        ["Imaginer", "Plusieurs pistes"],
        ["Choisir", "Comparer les options"],
        ["Agir", "Un premier pas"],
        ["Faire le point", "Après l’essai"],
      ];
      function term(k) {
        return `<button type="button" class="glossary-button" data-term="${k}">${glossary[k][0].toLowerCase()}</button>`;
      }
      function fresh() {
        return {
          version: 1,
          step: 0,
          context: "daily",
          scale: "personal",
          safety: "",
          energy: "",
          fields: {
            situation: "",
            goal: "",
            obstacle: "",
            emotion: "",
            control: "",
            outside: "",
            action: "",
            when: "",
            support: "",
            backup: "",
            measure: "",
            reviewDate: "",
            result: "",
            learning: "",
            next: "",
            trial: "notyet",
          },
          options: [
            { id: 1, text: "", plus: "", minus: "" },
            { id: 2, text: "", plus: "", minus: "" },
          ],
          chosen: null,
        };
      }
      let state = fresh(),
        remember = false,
        nextId = 4,
        previousFocus = null,
        pendingConfirm = null,
        supportMode = "listen",
        selectedNeed = "listen",
        meterIndex = 0;
      function validateDraft(raw) {
        if (
          !raw ||
          raw.version !== 1 ||
          !Object.hasOwn(contexts, raw.context) ||
          !Array.isArray(raw.options) ||
          raw.options.length < 1 ||
          raw.options.length > 8
        )
          throw Error("invalid");
        const clean = fresh();
        clean.context = raw.context;
        clean.scale = Object.hasOwn(scales, raw.scale) ? raw.scale : "personal";
        clean.step =
          Number.isInteger(raw.step) && raw.step >= 0 && raw.step < 6
            ? raw.step
            : 0;
        clean.energy = ["", "ready", "pause"].includes(raw.energy)
          ? raw.energy
          : "";
        clean.safety = ["", "safe", "unsure", "danger"].includes(raw.safety)
          ? raw.safety
          : "";
        if (!raw.fields || typeof raw.fields !== "object")
          throw Error("invalid");
        Object.keys(clean.fields).forEach((k) => {
          if (typeof raw.fields[k] === "string")
            clean.fields[k] = raw.fields[k].slice(0, 6000);
        });
        clean.fields.trial = ["notyet", "yes", "partly", "no"].includes(
          clean.fields.trial,
        )
          ? clean.fields.trial
          : "notyet";
        const ids = new Set();
        clean.options = raw.options.map((o, i) => {
          if (!o || typeof o.text !== "string") throw Error("invalid");
          const id = i + 1;
          ids.add(id);
          return {
            id,
            text: o.text.slice(0, 6000),
            plus: typeof o.plus === "string" ? o.plus.slice(0, 6000) : "",
            minus: typeof o.minus === "string" ? o.minus.slice(0, 6000) : "",
          };
        });
        const choice = raw.options.findIndex((o) => o.id === raw.chosen);
        clean.chosen =
          choice >= 0 && clean.options[choice].text.trim() ? choice + 1 : null;
        return clean;
      }
      try {
        const saved = localStorage.getItem(KEY);
        if (saved) {
          state = validateDraft(JSON.parse(saved));
          remember = true;
          nextId = state.options.length + 1;
        }
      } catch (e) {
        /* Corrupt or unavailable storage does not block use. */
      }
      function persist() {
        if (!remember) return;
        try {
          localStorage.setItem(KEY, JSON.stringify(state));
        } catch (e) {
          remember = false;
          $("#remember").checked = false;
          updatePrivacy();
          toast(
            "La sauvegarde a échoué. Téléchargez votre brouillon pour le conserver.",
          );
        }
      }
      function updatePrivacy() {
        $("#privacy-status").textContent = remember
          ? "Brouillon gardé dans ce navigateur à ma demande. Rien n’est envoyé."
          : "Ce que j’écris reste dans cette page. Rien n’est envoyé.";
        $("#remember").checked = remember;
      }
      function toast(t) {
        $("#toast").textContent = t;
        $("#toast").hidden = false;
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => ($("#toast").hidden = true), 5500);
      }
      function confirmAction(title, text, action, label = "Confirmer") {
        previousFocus = document.activeElement;
        $("#dialog-title").textContent = title;
        $("#dialog-description").textContent = text;
        $("#dialog-confirm").textContent = label;
        pendingConfirm = action;
        $("#confirm-dialog").showModal();
        $("#dialog-cancel").focus();
      }
      function closeDialog() {
        const d = $("#confirm-dialog");
        d.close();
        pendingConfirm = null;
        if (previousFocus?.isConnected) previousFocus.focus();
      }
      $("#dialog-cancel").addEventListener("click", closeDialog);
      $("#confirm-dialog").addEventListener("cancel", (e) => {
        e.preventDefault();
        closeDialog();
      });
      $("#dialog-confirm").addEventListener("click", () => {
        const fn = pendingConfirm;
        closeDialog();
        fn?.();
      });
      function example(text, label = "") {
        return `<details class="example-help"><summary${label ? ` aria-label="Voir un exemple : ${esc(label)}"` : ""}>Voir un exemple</summary><div class="example"><small>Exemple fictif · ${esc(state.scale === "personal" ? contexts[state.context].label : scales[state.scale][0])}</small><p>${esc(text)}</p></div></details>`;
      }
      function field(key, label, hint = "", type = "textarea", ex = "") {
        const val = state.fields[key] || "",
          id = "field-" + key;
        return `<div class="field"><label class="label" for="${id}">${label}</label>${type === "textarea" ? `<textarea id="${id}" data-field="${key}" maxlength="6000" placeholder="Écrivez avec vos mots…"${hint ? ` aria-describedby="hint-${key}"` : ""}>${esc(val)}</textarea>` : `<input id="${id}" data-field="${key}" type="${type}" value="${esc(val)}"${type === "text" ? ' maxlength="6000" placeholder="Votre réponse…"' : ""}${hint ? ` aria-describedby="hint-${key}"` : ""}>`}${hint ? `<p class="hint" id="hint-${key}">${hint}</p>` : ""}${ex ? example(ex, label) : ""}</div>`;
      }
      function renderSteps() {
        const workflow = workflows[state.scale];
        $("#steps").innerHTML = stepNames
          .map(
            (s, i) =>
              `<li><button class="step-link" data-step="${i}"${i === state.step ? ' aria-current="step"' : ""}><span class="step-num">${i + 1}</span><span class="step-text"><b>${s[0]}</b><small>${workflow.steps[i]}</small></span></button></li>`,
          )
          .join("");
      }
      function renderStep(focus = false) {
        hideTooltip();
        renderSteps();
        const c = contexts[state.context],
          i = state.step,
          workflow = workflows[state.scale];
        const titles = workflow.titles;
        const leads = workflow.leads;
        let body = "";
        if (i === 0) {
          body = `<fieldset><legend>Je choisis le niveau de mon problème</legend><div class="scale-options">${Object.entries(scales).map(([key, [label, description]]) => `<button class="scale-option" type="button" data-scale="${key}" aria-pressed="${state.scale === key}"><strong>${label}</strong><span>${description}</span></button>`).join("")}</div></fieldset><fieldset class="section-gap"><legend>Je choisis le domaine</legend><div class="contexts">${Object.entries(
            contexts,
          )
            .map(
              ([k, v]) =>
                `<button type="button" class="context" data-context="${k}" aria-pressed="${state.context === k}"><span class="context-icon" aria-hidden="true">${contextIcon(k)}</span><span>${v.label}</span></button>`,
            )
            .join(
              "",
            )}</div><details class="section-gap"><summary>Ma situation n’est pas dans la liste</summary><div class="details-body"><p>Je peux choisir le domaine le plus proche. Logement, argent et démarches vont dans « Vie quotidienne ». Une question de quartier ou de service public va dans « Vie collective ».</p></div></details></fieldset><fieldset class="section-gap"><legend>Est-ce que je me sens en sécurité pour réfléchir ?</legend><div class="choice-stack">${[
            ["safe", "Oui, je peux réfléchir"],
            ["unsure", "J’ai un doute"],
            ["danger", "Je me sens en danger"],
          ]
            .map(
              ([k, v]) =>
                `<button class="pill" type="button" data-safety="${k}" aria-pressed="${state.safety === k}">${v}</button>`,
            )
            .join(
              "",
            )}</div></fieldset>${state.safety === "danger" ? `<div class="notice red section-gap"><strong>Ma sécurité passe avant l’exercice.</strong>Je peux chercher de l’aide maintenant.<div class="button-row section-gap"><a class="btn danger" href="#securite">Voir les possibilités d’aide →</a><a class="btn" href="#violences">Repérer une violence</a></div></div>` : state.safety === "unsure" ? `<div class="notice amber section-gap"><strong>La peur, les menaces ou le contrôle méritent de l’aide.</strong> <a href="#violences">Explorer le violentomètre</a> ou <a href="#securite">chercher de l’aide</a>.</div>` : `<p class="hint" style="margin-top:12px">Peur, menaces ou contrôle ? <a href="#violences">Voir les repères de sécurité</a>.</p>`}`;
        }
        if (i === 1) {
          body =
            `${state.scale === "organization" || state.scale === "public" ? '<div class="notice section-gap"><strong>Je ne porte pas seul un problème collectif.</strong>Je peux identifier les personnes concernées, les décisions à prendre et les ressources disponibles. Je demande l’accord avant de parler au nom d’autres personnes.</div>' : ""}` +
            field(
              "situation",
              workflow.fields[0],
              workflow.fields[1],
              "textarea",
              workflow.examples?.[0] || c.situation,
            ) +
            field(
              "goal",
              workflow.fields[2],
              workflow.fields[3],
              "textarea",
              workflow.examples?.[1] || c.goal,
            ) +
            field(
              "obstacle",
              workflow.fields[4],
              workflow.fields[5],
              "textarea",
              workflow.examples?.[2] || c.obstacle,
            ) +
            `<details class="optional-fields"${["emotion", "control", "outside"].some((k) => state.fields[k]) ? " open" : ""}><summary>Si nécessaire : ce que je ressens et ce que je peux changer</summary><div class="details-body">${field("emotion", "Ce que je ressens", "Quelques mots suffisent.", "text")}${field("control", "Ce sur quoi je peux agir", "Même demander de l’aide est une action possible.", "textarea", c.control)}${field("outside", "Ce qui ne dépend pas de moi", "Ne pas pouvoir tout changer ne signifie pas être responsable du problème.", "textarea", c.outside)}</div></details><details class="section-gap"${state.energy === "pause" ? " open" : ""}><summary>Je peux faire une pause ou demander de l’aide</summary><div class="details-body"><p>Je peux m’arrêter ici et reprendre plus tard. Je peux aussi demander à une personne de confiance de rester avec moi pendant que je réfléchis.</p><div class="button-row"><button class="btn small" data-action="pause">Je fais une pause</button><a class="btn small" href="#securite">Où trouver une aide extérieure ?</a></div>${state.energy === "pause" ? '<p class="hint" role="status">Ma pause est choisie. Je peux reprendre avec le bouton Continuer.</p>' : ""}</div></details>`;
        }
        if (i === 2) {
          body = `<p class="hint">${workflow.idea}</p><div class="section-gap" id="ideas">${state.options.map((o, j) => `<div class="field"><div class="option-head"><label class="label" for="idea-${o.id}">Piste ${j + 1}</label>${state.options.length > 1 ? `<button class="remove" data-remove="${o.id}" aria-label="Retirer la piste ${j + 1}">Retirer</button>` : ""}</div><textarea id="idea-${o.id}" data-option="${o.id}" data-prop="text" maxlength="6000" placeholder="Une possibilité serait de…">${esc(o.text)}</textarea>${j < 3 ? example((workflow.ideas || c.ideas)[j], "Piste " + (j + 1)) : ""}</div>`).join("")}</div><button class="btn" data-action="add"${state.options.length >= 8 ? " disabled" : ""}>+ Ajouter une piste</button>`;
        }
        if (i === 3) {
          const options = state.options.filter((o) => o.text.trim());
          body = options.length
            ? `${options.map((o, j) => `<article class="option-card${state.chosen === o.id ? " selected" : ""}"><h3>${j + 1}. ${esc(o.text)}</h3><details${o.plus || o.minus ? " open" : ""}><summary>Comparer les avantages et les limites</summary><div class="details-body"><div class="field-row"><div><label class="label" for="plus-${o.id}">Ce qu’elle peut apporter</label><textarea id="plus-${o.id}" data-option="${o.id}" data-prop="plus" maxlength="6000" placeholder="Bénéfice attendu, besoin respecté…">${esc(o.plus)}</textarea></div><div><label class="label" for="minus-${o.id}">Contraintes et risques</label><textarea id="minus-${o.id}" data-option="${o.id}" data-prop="minus" maxlength="6000" placeholder="Temps, coût, énergie, sécurité…">${esc(o.minus)}</textarea></div></div></div></details><button class="btn ${state.chosen === o.id ? "primary" : ""} section-gap" data-choose="${o.id}" aria-pressed="${state.chosen === o.id}">${state.chosen === o.id ? "✓ Option choisie" : "Choisir cette option"}</button></article>`).join("")}<details><summary>Un exemple de comparaison</summary><div class="details-body"><p><strong>Exemple fictif :</strong> ${esc((workflow.ideas || c.ideas)[0])}</p><p><strong>Apport possible :</strong> ${esc((workflow.comparison || comparisonExamples[state.context])[0])}</p><p><strong>Limite :</strong> ${esc((workflow.comparison || comparisonExamples[state.context])[1])}</p></div></details><details><summary>J’hésite entre plusieurs pistes</summary><div class="details-body"><p>${workflow.compare}</p><p>Si les conséquences sont importantes, demandez un avis adapté avant d’agir.</p></div></details>`
            : `<div class="notice amber"><strong>Vous n’avez pas encore noté de piste.</strong>Revenez à l’étape Imaginer pour en ajouter une.<div class="button-row section-gap"><button class="btn" data-step="2">Imaginer une piste →</button></div></div>`;
        }
        if (i === 4) {
          const chosen = state.options.find((o) => o.id === state.chosen);
          body = `<div class="notice"><strong>Ma piste choisie</strong>${chosen ? esc(chosen.text) : "Aucune piste choisie. Vous pouvez revenir à l’étape précédente."}</div><div class="section-gap">${field("action", workflow.action[0], workflow.action[1], "textarea", workflow.actionExamples?.[0] || c.action)}${field("when", "Quand et où ?", "", "text", "Demain, après le petit-déjeuner, pendant dix minutes.")}${field("measure", workflow.action[2], workflow.action[3], "textarea", workflow.actionExamples?.[1] || c.measure)}<details class="optional-fields"${["support", "backup", "reviewDate"].some((k) => state.fields[k]) ? " open" : ""}><summary>Prévoir de l’aide, un obstacle ou une date de bilan (facultatif)</summary><div class="details-body">${field("support", "Qui ou quoi peut m’aider ?", "", "textarea", c.support)}${field("backup", "Si ça bloque, que pourrai-je faire ?", "Prévoyez une autre action simple et sûre.", "textarea", c.backup)}${field("reviewDate", "Quand faire le point ?", "Une date pour votre fiche, sans rappel automatique.", "date")}</div></details></div>`;
        }
        if (i === 5) {
          body = `<fieldset><legend>Où en êtes-vous de l’action ?</legend><div class="choice-stack">${[
            ["notyet", "Pas encore essayé"],
            ["yes", "Essayé"],
            ["partly", "En partie"],
            ["no", "Je n’ai pas pu"],
          ]
            .map(
              ([k, v]) =>
                `<button class="pill" data-trial="${k}" aria-pressed="${state.fields.trial === k}">${v}</button>`,
            )
            .join(
              "",
            )}</div></fieldset>${state.fields.trial === "notyet" ? `<div class="notice section-gap"><strong>Vous pouvez garder votre plan pour plus tard.</strong>Le bilan se remplit après l’essai. Pas besoin d’inventer un résultat.<div class="button-row section-gap"><a class="btn" href="#recap">Voir mon plan →</a></div></div>` : `<div class="section-gap">${field("result", "Ce qui s’est réellement passé", "Même si vous n’avez fait qu’une partie.", "textarea", c.result)}${state.fields.measure ? `<div class="example" style="margin-bottom:22px"><small>Le progrès que vous espériez</small><p>${esc(state.fields.measure)}</p></div>` : ""}${field("learning", "Ce que j’en retiens", "Qu’est-ce qui a aidé ? Qu’est-ce qui manque ou reste difficile ?", "textarea", "L’action était faisable, mais j’avais besoin d’une information supplémentaire.")}${field("next", "Ce que je souhaite faire ensuite", "Continuer, ajuster, demander de l’aide ou faire une pause.", "textarea", "Réduire le prochain pas et demander l’information manquante.")}</div>`}`;
        }
        if (workflow.tools[i]) {
          const [name, description, source] = workflow.tools[i];
          body += `<details class="section-gap"><summary>Outil utile ici : ${name}</summary><div class="details-body"><p>${description}</p><p class="source-note">Pourquoi ce repère ? <a href="${source}">Voir la source et ses limites</a>.</p></div></details>`;
        }
        $("#step-container").innerHTML =
          `<div class="step-topline"><span class="tag">${String(i + 1).padStart(2, "0")} / ${String(6).padStart(2, "0")} · ${stepNames[i][0]}</span><div class="progress" role="progressbar" aria-label="Position dans le parcours" aria-valuenow="${i + 1}" aria-valuemin="1" aria-valuemax="6"><span style="width:${((i + 1) / 6) * 100}%"></span></div></div><h2 id="step-title" tabindex="-1">${titles[i]}</h2>${leads[i] ? `<p class="step-lead">${leads[i]}</p>` : ""}<div class="step-content">${body}</div><div class="footer-actions"><button class="btn" data-action="back"${i === 0 ? " hidden" : ""}>← Retour</button>${i === 0 ? '<span class="step-meta">À votre rythme</span>' : ""}<button class="btn primary" data-action="next">${i === 5 ? "Voir mon récapitulatif" : i === 4 ? "Garder mon plan" : "Continuer"} <span aria-hidden="true">→</span></button></div>`;
        if (focus) {
          $("#step-title").focus({ preventScroll: true });
          $("#step-container").scrollIntoView({
            block: "start",
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
          });
        }
      }
      function changeStep(i) {
        state.step = Math.max(0, Math.min(5, i));
        persist();
        if (location.hash !== "#outil") {
          location.hash = "outil";
          renderStep();
        } else renderStep(true);
      }
      function goNext() {
        if (state.step === 4 || state.step === 5) {
          renderRecap();
          location.hash = "recap";
          return;
        }
        if (state.step === 2 && !state.options.some((o) => o.text.trim())) {
          toast("Notez au moins une piste pour pouvoir la comparer.");
          $("#ideas textarea")?.focus();
          return;
        }
        if (
          state.step === 3 &&
          !state.options.some((o) => o.id === state.chosen && o.text.trim())
        ) {
          toast(
            "Choisissez une option, ou revenez en arrière pour en imaginer une.",
          );
          $("#step-title").focus();
          return;
        }
        changeStep(state.step + 1);
      }
      function renderRecap() {
        const planTitle = {
          personal: "Mon prochain pas",
          shared: "Notre accord à essayer",
          organization: "Notre test d’amélioration",
          public: "Notre démarche collective",
        }[state.scale];
        $("#recap .page-heading h1").textContent = planTitle;
        const f = state.fields,
          c = contexts[state.context],
          choice = state.options.find((o) => o.id === state.chosen);
        const dd = (k, v) =>
          `<dt>${k}</dt><dd${v ? "" : ' class="empty"'}>${v ? esc(v) : "Non renseigné"}</dd>`;
        const block = (title, idx, content) =>
          `<article class="card recap-section"><h3>${title}<button class="text-button no-print" data-step="${idx}">Modifier</button></h3><dl>${content}</dl></article>`;
        $("#recap-content").innerHTML =
          block(
            "1. Ma situation",
            1,
            dd("Contexte", c.label) +
              dd("Échelle", scales[state.scale][0]) +
              dd("Les faits", f.situation) +
              dd("Mon but", f.goal) +
              dd("Mon obstacle", f.obstacle) +
              (f.emotion ? dd("Mon ressenti", f.emotion) : "") +
              (f.control ? dd("Ma marge de manœuvre", f.control) : "") +
              (f.outside ? dd("Ce qui ne dépend pas de moi", f.outside) : ""),
          ) +
          block(
            "2. Mes options",
            2,
            state.options
              .filter((o) => o.text.trim())
              .map(
                (o, j) =>
                  dd("Piste " + (j + 1), o.text) +
                  (o.plus ? dd("Bénéfices envisagés", o.plus) : "") +
                  (o.minus ? dd("Contraintes et risques", o.minus) : ""),
              )
              .join("") || dd("Pistes", ""),
          ) +
          block("3. Mon choix", 3, dd("Option retenue", choice?.text)) +
          block(
            "4. Mon premier pas",
            4,
            dd("Action", f.action) +
              dd("Quand et où", f.when) +
              (f.support ? dd("Appui", f.support) : "") +
              (f.backup ? dd("Si ça bloque", f.backup) : "") +
              dd("Signe de progrès", f.measure) +
              (f.reviewDate
                ? dd("Date du bilan", formatDate(f.reviewDate))
                : ""),
          ) +
          block(
            "5. Mon bilan",
            5,
            dd(
              "Statut",
              {
                notyet: "Pas encore essayé",
                yes: "Essayé",
                partly: "Essayé en partie",
                no: "Je n’ai pas pu",
              }[f.trial],
            ) +
              (f.trial === "notyet"
                ? ""
                : dd("Résultat", f.result) +
                  dd("Ce que j’en retiens", f.learning) +
                  dd("Prochaine étape", f.next)),
          );
      }

      // Pack complete cards first, then complete label/answer pairs. Only answers
      // taller than a page are continued, at paragraph/sentence/word boundaries.
      // Measurements use the exact same typography as the print media layout.
      function preparePrint() {
        renderRecap();
        const documentRoot = $("#print-document");
        document.body.classList.remove("print-ready");
        documentRoot.replaceChildren();
        documentRoot.classList.add("print-measuring");
        const pages = [];
        let pageBody;
        const make = (tag, className, text) => {
          const el = document.createElement(tag);
          if (className) el.className = className;
          if (text !== undefined) el.textContent = text;
          return el;
        };
        const newPage = () => {
          const page = make("section", "print-page");
          pageBody = make("div", "print-page-body");
          const heading = make(
            "div",
            "print-document-heading" + (pages.length ? " continued" : ""),
          );
          heading.append(
            make(
              "h1",
              "",
              $("#recap .page-heading h1").textContent + (pages.length ? " · suite" : ""),
            ),
          );
          if (!pages.length)
            heading.append(
              make(
                "p",
                "",
                "Fiche de travail · Pas à pas · Outil éducatif, sans validation clinique propre.",
              ),
            );
          pageBody.append(heading);
          page.append(pageBody, make("div", "print-page-footer"));
          documentRoot.append(page);
          pages.push(page);
        };
        // The last card's bottom includes its margin; scrollHeight alone can
        // ignore that margin in some layout engines.
        const fits = () => {
          const children = [...pageBody.children];
          const last = children.at(-1);
          const limit = pageBody.getBoundingClientRect().bottom;
          const bottom =
            last.getBoundingClientRect().bottom +
            parseFloat(getComputedStyle(last).marginBottom || 0);
          return bottom <= limit - 1;
        };
        const makeCard = (title, continued = false) => {
          const card = make("article", "print-card");
          card.append(make("h2", "", title + (continued ? " · suite" : "")));
          return card;
        };
        const makeEntry = (label, text, continued = false) => {
          const entry = make("div", "print-entry");
          entry.append(
            make(
              "div",
              "print-entry-label",
              label + (continued ? " (suite)" : ""),
            ),
            make("p", "print-entry-text", text),
          );
          return entry;
        };
        const sources = $$("#recap-content .recap-section").map((section) => ({
          title: $("h3", section).firstChild.textContent,
          entries: $$("dt", section).map((dt) => [
            dt.textContent,
            dt.nextElementSibling.textContent,
          ]),
        }));
        newPage();
        for (const source of sources) {
          let card = makeCard(source.title);
          for (const [label, text] of source.entries)
            card.append(makeEntry(label, text));
          pageBody.append(card);
          if (fits()) continue;
          card.remove();
          // If the whole card fits on a fresh page, preserve it as a unit.
          if (pageBody.children.length > 1) newPage();
          pageBody.append(card);
          if (fits()) continue;
          card.remove();
          card = makeCard(source.title);
          pageBody.append(card);
          let sectionContinued = false;
          const continueCard = () => {
            if (card.children.length === 1) card.remove();
            else sectionContinued = true;
            if (pageBody.children.length > 1) newPage();
            card = makeCard(source.title, sectionContinued);
            pageBody.append(card);
          };
          for (const [label, fullText] of source.entries) {
            let entry = makeEntry(label, fullText);
            card.append(entry);
            if (fits()) continue;
            const previous = {
              body: pageBody,
              card,
              continued: sectionContinued,
              pageCount: pages.length,
            };
            entry.remove();
            continueCard();
            card.append(entry);
            if (fits()) continue;
            // This answer cannot fit even on a fresh page. Use the remaining
            // space on the original page instead of leaving a large blank area.
            entry.remove();
            card.remove();
            if (pages.length > previous.pageCount) pages.pop().remove();
            pageBody = previous.body;
            card = previous.card;
            sectionContinued = previous.continued;
            if (!card.isConnected) pageBody.append(card);
            card.append(entry);
            const characters = Array.from(fullText);
            let offset = 0;
            while (offset < characters.length) {
              const answer = $(".print-entry-text", entry);
              let low = 0,
                high = characters.length - offset;
              while (low < high) {
                const mid = Math.ceil((low + high) / 2);
                answer.textContent = characters
                  .slice(offset, offset + mid)
                  .join("");
                if (fits()) low = mid;
                else high = mid - 1;
              }
              if (
                low < 120 &&
                (card.children.length > 2 || pageBody.children.length > 2)
              ) {
                entry.remove();
                continueCard();
                card.append(entry);
                continue;
              }
              if (!low) throw new Error("Print entry cannot fit on an A4 page");
              let count = low;
              if (offset + count < characters.length) {
                const prefix = characters
                  .slice(offset, offset + count)
                  .join("");
                const thresholds = [
                  prefix.lastIndexOf("\n") + 1,
                  [...prefix.matchAll(/[.!?…][ \n]/g)].at(-1)?.index + 1 || 0,
                  prefix.lastIndexOf(" ") + 1,
                ];
                const boundary = thresholds.find(
                  (n) => n >= prefix.length * 0.6,
                );
                if (boundary)
                  count = Array.from(prefix.slice(0, boundary)).length;
              }
              answer.textContent = characters
                .slice(offset, offset + count)
                .join("");
              offset += count;
              if (offset < characters.length) {
                continueCard();
                entry = makeEntry(label, "", true);
                card.append(entry);
              }
            }
          }
        }
        const note = make(
          "p",
          "print-closing-note",
          "Vous pouvez ajuster ce plan, demander un appui ou choisir un pas plus petit. Document personnel à conserver en lieu sûr.",
        );
        pageBody.append(note);
        if (!fits()) {
          note.remove();
          newPage();
          pageBody.append(note);
        }
        pages.forEach((page, i) => {
          $(".print-page-footer", page).append(
            make("span", "", "Pas à pas · Résolution de problème"),
            make("span", "", `Page ${i + 1} / ${pages.length}`),
          );
        });
        documentRoot.classList.remove("print-measuring");
        document.body.classList.add("print-ready");
      }
      function finishPrint() {
        document.body.classList.remove("print-ready");
        $("#print-document").classList.remove("print-measuring");
      }
      function formatDate(s) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return "";
        const [y, m, d] = s.split("-");
        return `${d}/${m}/${y}`;
      }
      function download(name, content, mime) {
        const a = document.createElement("a"),
          url = URL.createObjectURL(new Blob([content], { type: mime }));
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
      function exportText() {
        renderRecap();
        const parts = $$(".recap-section").map((section) => {
          const title = $("h3", section).firstChild.textContent;
          return (
            title +
            "\n" +
            $$("dt", section)
              .map(
                (dt) =>
                  dt.textContent + " : " + dt.nextElementSibling.textContent,
              )
              .join("\n")
          );
        });
        download(
          "mon-prochain-pas.txt",
          $("#recap .page-heading h1").textContent.toUpperCase() + "\nFiche de travail - Pas à pas\n\n" +
            parts.join("\n\n") +
            "\n\nOutil éducatif. Document personnel à conserver en lieu sûr.",
          "text/plain;charset=utf-8",
        );
      }
      function renderSupport() {
        $("#support-content").innerHTML = supportModes[supportMode];
        $$("[data-support-mode]").forEach((b) =>
          b.setAttribute(
            "aria-pressed",
            String(b.dataset.supportMode === supportMode),
          ),
        );
        const v = supportContexts[$("#support-context").value];
        if (!v) {
          $("#support-context-content").replaceChildren();
          return;
        }
        $("#support-context-content").innerHTML =
          `<article class="card padded"><h3>${v[0]}</h3><p>${v[1]}</p><div class="say">${v[2]}</div><p>${v[3]}</p>${["couple", "young"].includes($("#support-context").value) ? '<a href="#violences" class="text-button">Explorer les repères de violence →</a>' : ""}</article>`;
      }
      function renderNeedGuidance() {
        const [title, phrase, action] = needGuidance[selectedNeed];
        const relation = $("#support-relation").value;
        const relationNote = {
          colleague: "Entre collègues, tenir compte de la charge réelle, des rôles et des ressources disponibles.",
          learner: "Dans une relation d’encadrement, votre position peut rendre un refus difficile. Dites explicitement que la personne peut choisir le type d’aide et demander un autre interlocuteur.",
          close: "Avec un proche, demander ce qu’il souhaite et respecter ses limites. Le lien familial ne donne pas le droit de décider à sa place.",
          other: "Adapter la proposition à la relation, aux ressources et à la liberté réelle de refuser.",
        }[relation];
        $("#need-guidance").innerHTML = `<h3>${title}</h3><p class="say">${phrase}</p><p>${action}</p><p class="hint">${relationNote}</p>${relation === "close" ? '<a class="text-button" href="#proche">Voir aussi : comment aider un proche ? ↗</a>' : ""}<p class="source-note">Après l’échange : « Est-ce que cette aide te convient ? »</p>`;
        $$("[data-need]").forEach((button) =>
          button.setAttribute("aria-pressed", String(button.dataset.need === selectedNeed)),
        );
      }
      // These are educational examples, not validated scales or risk scores.
      function renderMeter() {
        const key = $("#violence-context").value,
          d = violenceData[key];
        $("#violence-context-note").textContent = d.note;
        $("#meter").innerHTML = d.items
          .map(
            (v, j) =>
              `<button type="button" data-meter="${j}" aria-pressed="${meterIndex === j}" aria-controls="meter-detail"><span><small>${esc(v[0])}</small>${esc(v[1])}</span><span aria-hidden="true">↗</span></button>`,
          )
          .join("");
        renderMeterDetail();
      }
      function glossarize(text) {
        return esc(text)
          .replace(/contrôle coercitif/g, term("coercion"))
          .replace(/consentement/g, term("consent"))
          .replace(/asymétrie pédagogique/g, term("power"));
      }
      function renderMeterDetail() {
        const d = violenceData[$("#violence-context").value],
          v = d.items[meterIndex];
        $("#meter-detail").innerHTML =
          `<span class="tag">${esc(v[0])}</span><h3>${esc(v[1])}</h3><p>${glossarize(v[2])}</p><p class="label">Un repère pour agir</p><p>${esc(v[3])}</p>${meterIndex >= 2 ? '<a href="#securite" class="btn section-gap">Voir les possibilités d’aide →</a>' : ""}<p class="source-note">Exemple pédagogique. Aucun diagnostic ni score de risque. Sources : ${d.refs.replace(/\d+/g, (n) => `<a href="#ref-${n}">${n}</a>`)}.</p><button class="text-button section-gap" data-action="meter-back">← Explorer les autres repères</button>`;
        $$("[data-meter]").forEach((b) =>
          b.setAttribute(
            "aria-pressed",
            String(Number(b.dataset.meter) === meterIndex),
          ),
        );
      }
      function route() {
        hideTooltip();
        const hash = location.hash.slice(1) || "accueil";
        const page = hash.startsWith("ref-")
          ? "bibliographie"
          : [
                "accueil",
                "outil",
                "soutenir",
                "proche",
                "violences",
                "comprendre",
                "bibliographie",
                "securite",
                "recap",
              ].includes(hash)
            ? hash
            : "accueil";
        $$(".view").forEach((el) => (el.hidden = el.id !== page));
        $$("nav a").forEach((a) => {
          if (
            a.dataset.page === page ||
            (page === "recap" && a.dataset.page === "outil")
          )
            a.setAttribute("aria-current", "page");
          else a.removeAttribute("aria-current");
        });
        setMenuOpen(false);
        if (page === "recap") renderRecap();
        if (page === "outil") renderStep();
        const title = {
          accueil: "Choisir un parcours",
          outil: "Mon problème",
          soutenir: "Soutenir quelqu’un",
          proche: "Comment aider un proche ?",
          violences: "Violentomètre",
          comprendre: "Comprendre",
          bibliographie: "Bibliographie",
          securite: "Sécurité & aide",
          recap: $("#recap .page-heading h1").textContent,
        }[page];
        document.title = title + " - Pas à pas";
        if (hash.startsWith("ref-")) {
          const ref = document.getElementById(hash);
          if (ref) {
            ref.tabIndex = -1;
            ref.focus({ preventScroll: true });
            ref.scrollIntoView({ block: "start" });
          }
        } else {
          $("#main").focus({ preventScroll: true });
          window.scrollTo({ top: 0, behavior: "instant" });
        }
      }
      function setMenuOpen(open) {
        $("#navigation").classList.toggle("open", open);
        const button = $(".menu-toggle");
        button.setAttribute("aria-expanded", String(open));
        button.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
        button.textContent = open ? "Fermer ×" : "Menu ☰";
      }
      $(".menu-toggle").addEventListener("click", () => {
        setMenuOpen(!$("#navigation").classList.contains("open"));
      });
      $(".skip").addEventListener("click", (e) => {
        e.preventDefault();
        $("#main").focus();
        $("#main").scrollIntoView({ block: "start" });
      });
      $$("nav a").forEach((a) =>
        a.addEventListener("click", () => {
          if (a.hash === location.hash) route();
          setMenuOpen(false);
        }),
      );
      $$("[data-start-scale]").forEach((a) =>
        a.addEventListener("click", () => {
          state.scale = a.dataset.startScale;
          state.step = 0;
          persist();
          renderStep();
        }),
      );
      document.addEventListener("click", (event) => {
        if (!event.target.closest(".navbar") && $("#navigation").classList.contains("open"))
          setMenuOpen(false);
      });
      window.addEventListener("hashchange", route);
      window.addEventListener("beforeprint", preparePrint);
      window.addEventListener("afterprint", finishPrint);
      document.addEventListener("input", (e) => {
        const el = e.target;
        if (el.dataset.field) {
          state.fields[el.dataset.field] = el.value;
          persist();
        }
        if (el.dataset.option) {
          const o = state.options.find(
            (o) => o.id === Number(el.dataset.option),
          );
          if (o) {
            o[el.dataset.prop] = el.value;
            if (!o.text.trim() && state.chosen === o.id) state.chosen = null;
            persist();
          }
        }
      });
      document.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.step !== undefined) {
          changeStep(Number(b.dataset.step));
          return;
        }
        if (b.dataset.context) {
          state.context = b.dataset.context;
          persist();
          renderStep();
          $(`[data-context="${state.context}"]`).focus();
          toast(
            "Exemples adaptés : " +
              contexts[state.context].label +
              ". Le texte déjà saisi ne change pas.",
          );
          return;
        }
        if (b.dataset.safety) {
          state.safety = b.dataset.safety;
          persist();
          renderStep();
          $(`[data-safety="${state.safety}"]`).focus();
          return;
        }
        if (b.dataset.trial) {
          state.fields.trial = b.dataset.trial;
          persist();
          renderStep();
          $(`[data-trial="${state.fields.trial}"]`).focus();
          return;
        }
        if (b.dataset.choose) {
          state.chosen = Number(b.dataset.choose);
          persist();
          renderStep();
          $(`[data-choose="${state.chosen}"]`).focus();
          toast(
            "Option choisie. Vous pouvez maintenant préparer votre action.",
          );
          return;
        }
        if (b.dataset.remove) {
          const id = Number(b.dataset.remove),
            o = state.options.find((o) => o.id === id);
          const remove = () => {
            state.options = state.options.filter((o) => o.id !== id);
            if (state.chosen === id) state.chosen = null;
            persist();
            renderStep();
            $("#ideas textarea")?.focus();
          };
          if (o.text || o.plus || o.minus)
            confirmAction(
              "Retirer cette piste ?",
              "Son texte et ses notes de comparaison seront effacés.",
              remove,
              "Retirer",
            );
          else remove();
          return;
        }
        if (b.dataset.supportMode) {
          supportMode = b.dataset.supportMode;
          renderSupport();
          return;
        }
        if (b.dataset.scale) {
          state.scale = b.dataset.scale;
          persist();
          renderStep();
          $(`[data-scale="${state.scale}"]`).focus();
          return;
        }
        if (b.dataset.need) {
          selectedNeed = b.dataset.need;
          renderNeedGuidance();
          return;
        }
        if (b.dataset.meter !== undefined) {
          meterIndex = Number(b.dataset.meter);
          renderMeterDetail();
          if (matchMedia("(max-width:600px)").matches)
            $("#meter-detail").scrollIntoView({
              block: "start",
              behavior: "smooth",
            });
          return;
        }
        switch (b.dataset.action) {
          case "next":
            goNext();
            break;
          case "back":
            changeStep(state.step - 1);
            break;
          case "pause":
            state.energy = "pause";
            persist();
            renderStep();
            toast("Vous pouvez faire une pause et reprendre à votre rythme.");
            break;
          case "add":
            if (state.options.length < 8) {
              const id = nextId++;
              state.options.push({ id, text: "", plus: "", minus: "" });
              persist();
              renderStep();
              $("#idea-" + id).focus();
            }
            break;
          case "export":
            download(
              "mon-brouillon-pas-a-pas.json",
              JSON.stringify(state, null, 2),
              "application/json",
            );
            toast(
              "Brouillon téléchargé. Il contient vos réponses personnelles.",
            );
            break;
          case "import":
            $("#import-file").click();
            break;
          case "text":
            exportText();
            break;
          case "print":
            preparePrint();
            window.print();
            break;
          case "reset":
            confirmAction(
              "Effacer mon brouillon ?",
              "Toutes vos réponses dans cette page et la sauvegarde de ce navigateur seront supprimées. Vos téléchargements, impressions et historique ne seront pas effacés.",
              () => {
                let removed = true;
                try {
                  localStorage.removeItem(KEY);
                } catch (e) {
                  removed = false;
                }
                state = fresh();
                remember = false;
                nextId = 4;
                updatePrivacy();
                renderStep();
                renderRecap();
                if (location.hash === "recap") location.hash = "outil";
                toast(
                  removed
                    ? "Brouillon effacé. Vous pouvez repartir d’un nouveau problème."
                    : "Réponses effacées de la page ; le stockage du navigateur n’a pas pu être effacé.",
                );
              },
              "Tout effacer",
            );
            break;
          case "meter-back": {
            const selected = $("[data-meter][aria-pressed=true]");
            selected?.focus();
            selected?.scrollIntoView({ block: "center", behavior: "smooth" });
            break;
          }
          case "quick-exit":
            location.replace("https://www.wikipedia.org/");
            break;
        }
      });
      $("#remember").addEventListener("change", (e) => {
        remember = e.target.checked;
        if (remember) {
          persist();
          toast(
            remember
              ? "Sauvegarde activée sur cet appareil."
              : "Sauvegarde indisponible.",
          );
        } else {
          try {
            localStorage.removeItem(KEY);
            toast("Sauvegarde désactivée et retirée de ce navigateur.");
          } catch (e) {
            toast(
              "Impossible de retirer la sauvegarde. Vérifiez les paramètres de votre navigateur.",
            );
          }
        }
        updatePrivacy();
      });
      $("#import-file").addEventListener("change", async (e) => {
        const file = e.target.files[0];
        e.target.value = "";
        if (!file) return;
        if (file.size > 250000) {
          toast(
            "Ce fichier est trop volumineux. Choisissez un brouillon de cet outil.",
          );
          return;
        }
        try {
          const imported = validateDraft(JSON.parse(await file.text()));
          confirmAction(
            "Reprendre ce brouillon ?",
            "Le fichier remplacera les réponses actuellement affichées. Téléchargez-les d’abord si vous souhaitez les garder.",
            () => {
              state = imported;
              nextId = state.options.length + 1;
              persist();
              renderStep();
              if (location.hash !== "#outil") location.hash = "outil";
              else renderStep(true);
              toast("Brouillon repris. Vos réponses sont modifiables.");
            },
            "Reprendre",
          );
        } catch (e) {
          toast(
            "Fichier non reconnu. Utilisez un brouillon JSON téléchargé depuis cet outil.",
          );
        }
      });
      $("#support-context").addEventListener("change", renderSupport);
      $("#violence-context").addEventListener("change", () => {
        meterIndex = 0;
        renderMeter();
      });
      // A single tooltip works with hover, keyboard focus and touch; Escape dismisses it.
      let tooltipOwner = null,
        tipTimer = null;
      function showTooltip(b) {
        const k = b.dataset.term;
        if (!glossary[k]) return;
        clearTimeout(tipTimer);
        if (tooltipOwner && tooltipOwner !== b)
          tooltipOwner.removeAttribute("aria-describedby");
        tooltipOwner = b;
        const tip = $("#tooltip");
        tip.textContent = glossary[k][1];
        tip.hidden = false;
        b.setAttribute("aria-describedby", "tooltip");
        const r = b.getBoundingClientRect(),
          width = Math.min(310, innerWidth - 24);
        tip.style.width = width + "px";
        const tr = tip.getBoundingClientRect();
        tip.style.left =
          Math.max(12, Math.min(r.left, innerWidth - width - 12)) + "px";
        tip.style.top =
          (r.bottom + tr.height + 18 < innerHeight
            ? r.bottom + 8
            : Math.max(10, r.top - tr.height - 8)) + "px";
      }
      function hideTooltip() {
        clearTimeout(tipTimer);
        $("#tooltip").hidden = true;
        tooltipOwner?.removeAttribute("aria-describedby");
        tooltipOwner = null;
      }
      document.addEventListener("mouseover", (e) => {
        const b = e.target.closest("[data-term]");
        if (b) showTooltip(b);
        if (e.target.closest("#tooltip")) clearTimeout(tipTimer);
      });
      document.addEventListener("mouseout", (e) => {
        if (e.target.closest("[data-term],#tooltip"))
          tipTimer = setTimeout(() => {
            if (
              !$("#tooltip").matches(":hover") &&
              !tooltipOwner?.matches(":hover,:focus")
            )
              hideTooltip();
          }, 160);
      });
      document.addEventListener("focusin", (e) => {
        if (e.target.matches("[data-term]")) showTooltip(e.target);
        else if (!e.target.closest("#tooltip")) hideTooltip();
      });
      document.addEventListener("click", (e) => {
        const b = e.target.closest("[data-term]");
        if (b) showTooltip(b);
        else if (!e.target.closest("#tooltip")) hideTooltip();
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          hideTooltip();
          if ($("nav").classList.contains("open")) {
            setMenuOpen(false);
            $(".menu-toggle").focus();
          }
        }
      });
      window.addEventListener("resize", () => {
        hideTooltip();
        if (innerWidth > 850) setMenuOpen(false);
      });
      window.addEventListener("scroll", hideTooltip, { passive: true });
      $("#glossary-list").innerHTML = Object.values(glossary)
        .map(([k, v]) => `<p><strong>${esc(k)}.</strong> ${esc(v)}</p>`)
        .join("");
      updatePrivacy();
      renderStep();
      renderSupport();
      $("#support-relation").addEventListener("change", renderNeedGuidance);
      renderNeedGuidance();
      renderMeter();
      route();
