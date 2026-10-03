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
      const KEY = "pas-a-pas.brouillon.v2";
      const OLD_KEY = "pas-a-pas.brouillon.v1";
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
      function term(k, label = glossary[k][0].toLowerCase()) {
        return `<button type="button" class="glossary-button" data-term="${k}" aria-haspopup="dialog" aria-controls="term-dialog">${esc(label)}</button>`;
      }
      const glossaryWord = /(indicateurs? d[’']équilibrage|données probantes|données personnelles|décision partagée|formulation culturelle|violentomètre|sondages?|restitution|indicateurs?|biais|consentement|efficacité)/giu;
      const glossaryKeys = { "indicateur d’équilibrage": "balancingIndicator", "indicateurs d’équilibrage": "balancingIndicator", "indicateur d'équilibrage": "balancingIndicator", "indicateurs d'équilibrage": "balancingIndicator", "données probantes": "evidence", "données personnelles": "personalData", "décision partagée": "sharedDecision", "formulation culturelle": "culturalFormulation", violentomètre: "violentometer", sondage: "survey", sondages: "survey", restitution: "feedback", indicateur: "indicator", indicateurs: "indicator", biais: "bias", consentement: "consent", efficacité: "efficacy" };
      function linkGlossary(text) {
        return String(text).split(glossaryWord).map((part) => {
          const key = glossaryKeys[part.toLocaleLowerCase("fr")];
          return key ? term(key, part) : esc(part);
        }).join("");
      }
      function fresh() {
        return {
          version: 2,
          catalogRevision: 3,
          step: 0,
          clarifyPart: 0,
          context: "other",
          scale: "personal",
          scaleChosen: false,
          reviewScale: false,
          reviewContext: false,
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
        meterIndex = null;
      function hasWriting() {
        return Object.entries(state.fields).some(([key, value]) => key !== "trial" && String(value).trim()) || state.options.some((option) => option.text.trim());
      }
      function hasPlan() {
        return Boolean(state.fields.action.trim());
      }
      function updateRecapShortcut() {
        const shortcut = $("#recap-shortcut");
        shortcut.hidden = !hasWriting();
        shortcut.textContent = hasPlan() ? "Voir mon plan ↗" : "Voir mes réponses ↗";
      }
      const legacyContextMap = {
        personal: { daily: "daily", study: "study", work: "work", health: "health" },
        shared: { couple: "couple", family: "family", work: "other" },
        organization: { work: "coordination" },
        public: { collective: "mobility" },
      };
      const currentContext = () => contextCatalog[state.scale][state.context];
      const violenceRouteForContext = () => {
        const related = state.scale === "shared" ? {
          couple: "couple",
          sibling: "sibling",
          peers: "peers",
          colleague: "colleague",
        }[state.context] : null;
        return related ? `#violences-${related}` : "#violences";
      };
      function selectScale(scale) {
        if (!Object.hasOwn(scales, scale)) return;
        const changed = state.scale !== scale;
        if (changed && hasWriting()) {
          state.reviewScale = true;
          state.reviewContext = true;
        }
        state.scale = scale;
        state.scaleChosen = true;
        state.step = 0;
        state.clarifyPart = 0;
        if (!Object.hasOwn(contextCatalog[scale], state.context)) {
          state.context = "other";
          if (hasWriting()) state.reviewContext = true;
        }
      }
      function validateDraft(raw) {
        if (
          !raw ||
          ![1, 2].includes(raw.version) ||
          !Array.isArray(raw.options) ||
          raw.options.length < 1 ||
          raw.options.length > 8
        )
          throw Error("invalid");
        const clean = fresh();
        if (raw.version === 2 && !Object.hasOwn(scales, raw.scale)) throw Error("invalid");
        clean.scale = Object.hasOwn(scales, raw.scale) ? raw.scale : "personal";
        if (raw.version === 1) {
          if (!Object.hasOwn(contexts, raw.context)) throw Error("invalid");
          clean.context = legacyContextMap[clean.scale][raw.context] || "other";
          clean.reviewContext = true;
        } else {
          if (!Object.hasOwn(contextCatalog[clean.scale], raw.context)) throw Error("invalid");
          clean.context = raw.context;
          clean.reviewContext = raw.reviewContext === true || (raw.catalogRevision !== 3 && clean.scale === "shared" && clean.context === "colleague");
        }
        clean.scaleChosen = raw.scaleChosen === true;
        clean.reviewScale = raw.reviewScale === true;
        clean.step =
          Number.isInteger(raw.step) && raw.step >= 0 && raw.step < 6
            ? raw.step
            : 0;
        clean.clarifyPart = Number.isInteger(raw.clarifyPart) && raw.clarifyPart >= 0 && raw.clarifyPart <= 2 ? raw.clarifyPart : 0;
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
        clean.options = raw.options.map((o, i) => {
          if (!o || typeof o.text !== "string") throw Error("invalid");
          const id = i + 1;
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
        if (raw.version === 1) {
          clean.reviewContext = Object.entries(clean.fields).some(([key, value]) => key !== "trial" && value.trim()) || clean.options.some((option) => option.text.trim());
          if (clean.reviewContext) {
            clean.step = 0;
            clean.clarifyPart = 0;
          }
        }
        return clean;
      }
      try {
        const saved = localStorage.getItem(KEY);
        let restored = false;
        let restoredFromV2 = false;
        if (saved) {
          try {
            state = validateDraft(JSON.parse(saved));
            restored = true;
            restoredFromV2 = true;
          } catch (e) {
            /* A damaged v2 draft must not hide a valid v1 draft. */
          }
        }
        if (!restored) {
          const old = localStorage.getItem(OLD_KEY);
          if (old) {
            state = validateDraft(JSON.parse(old));
            restored = true;
            try {
              localStorage.setItem(KEY, JSON.stringify(state));
              localStorage.removeItem(OLD_KEY);
            } catch (e) {
              /* Keep the readable v1 draft if writing the migrated copy fails. */
            }
          }
        }
        if (restored) {
          remember = true;
          nextId = state.options.length + 1;
          if (restoredFromV2 && localStorage.getItem(OLD_KEY)) {
            try { localStorage.removeItem(OLD_KEY); } catch (e) { /* Keep the readable draft. */ }
          }
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
          ? "Brouillon gardé dans ce navigateur. Rien n’est envoyé."
          : "Rien n’est envoyé.";
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
      function example(text, label = "", visible = false) {
        const content = `<div class="example${visible ? " example-visible" : ""}"><small>Exemple fictif · ${esc(currentContext().label)}</small><p>${esc(text)}</p></div>`;
        return visible ? content : `<details class="example-help"><summary${label ? ` aria-label="Voir un exemple : ${esc(label)}"` : ""}>Voir un exemple</summary>${content}</details>`;
      }
      function field(key, label, hint = "", type = "textarea", ex = "", visibleExample = false, beforeInput = "") {
        const val = state.fields[key] || "",
          id = "field-" + key;
        return `<div class="field"><label class="label" for="${id}">${label}</label>${hint ? `<p class="hint field-hint" id="hint-${key}">${linkGlossary(hint)}</p>` : ""}${ex ? example(ex, label, visibleExample) : ""}${beforeInput}${type === "textarea" ? `<textarea id="${id}" data-field="${key}" maxlength="6000" placeholder="Je note ma réponse…"${hint ? ` aria-describedby="hint-${key}"` : ""}>${esc(val)}</textarea>` : `<input id="${id}" data-field="${key}" type="${type}" value="${esc(val)}"${type === "text" ? ' maxlength="6000" placeholder="Je note ma réponse…"' : ""}${hint ? ` aria-describedby="hint-${key}"` : ""}>`}</div>`;
      }
      function renderSteps() {
        const workflow = workflows[state.scale];
        const links = stepNames
          .map(
            (s, i) =>
              `<li><button class="step-link" data-step="${i}"${i === state.step ? ' aria-current="step"' : ""}><span class="step-num">${i + 1}</span><span class="step-text"><b>${s[0]}</b><small>${workflow.steps[i]}</small></span></button></li>`,
          )
          .join("");
        $("#steps").innerHTML = links;
        $("#mobile-steps").innerHTML = links;
        $("#mobile-step-summary").textContent = `Étape ${state.step + 1} sur ${stepNames.length} · ${stepNames[state.step][0]} — ${workflow.steps[state.step]}`;
      }
      function renderStep(focus = false) {
        hideTooltip();
        renderSteps();
        updateRecapShortcut();
        const c = currentContext(),
          i = state.step,
          workflow = workflows[state.scale];
        const titles = workflow.titles;
        const leads = workflow.leads;
        let body = "";
        if (i === 0) {
          const scaleButtons = Object.entries(scales).map(([key, [label, description]]) => `<button class="scale-option" type="button" data-scale="${key}" aria-pressed="${state.scale === key}"><strong>${label}</strong><span>${description}</span></button>`).join("");
          const scaleChoice = state.scaleChosen
            ? `<div class="selected-level" id="selected-level"><span class="tag">Niveau choisi</span><strong>${scales[state.scale][0]}</strong><span>${scales[state.scale][1]}</span></div><details class="change-level" id="change-level"><summary>Changer de niveau</summary><div class="details-body"><div class="scale-options">${scaleButtons}</div></div></details>`
            : `<fieldset><legend>Je choisis le niveau de mon problème</legend><div class="scale-options">${scaleButtons}</div></fieldset>`;
          const contextOptions = Object.entries(contextCatalog[state.scale]).map(([key, value]) => `<option value="${key}"${state.context === key ? " selected" : ""}>${esc(value.label)}</option>`).join("");
          const reviewNotice = state.reviewScale ? `<div class="notice amber section-gap" role="status"><strong>J’ai changé de niveau.</strong>Mes réponses sont restées. Je les relirai pour vérifier qu’elles correspondent encore à cette situation.</div>` : "";
          const reviewContext = state.reviewContext ? '<div class="notice amber section-gap" id="context-review" role="status"><strong>Je vérifie mon contexte.</strong>Mes réponses sont restées. Le contexte ou ses exemples ont changé ; je relis ce que j’ai écrit avant de continuer.</div>' : "";
          const safetyLink = state.scale === "personal" && state.context === "health" ? ' <a href="#securite">Voir les possibilités d’aide →</a>' : (state.scale === "personal" && state.context === "boundaries") || state.scale === "shared" ? ` <a href="${violenceRouteForContext()}">${violenceRouteForContext() === "#violences" ? "Choisir des repères de violence" : "Voir les repères pour cette relation"} →</a>` : "";
          body = `${scaleChoice}${reviewNotice}<div class="context-pick section-gap"><label class="label" for="context-select">Quelle situation ressemble le plus à la mienne ?</label><select id="context-select" aria-describedby="context-description context-focus">${contextOptions}</select><p class="hint" id="context-description">${linkGlossary(c.description)}</p><p class="hint" id="context-focus"><strong>À vérifier ici :</strong> ${linkGlossary(c.focus)}</p>${c.caution ? `<div class="notice amber context-caution"><strong>Point de vigilance</strong>${linkGlossary(c.caution)}${safetyLink}</div>` : ""}</div>${reviewContext}<fieldset class="section-gap"><legend>Est-ce que je me sens en sécurité pour réfléchir ?</legend><div class="choice-stack">${[
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
            )}</div></fieldset>${state.safety === "danger" ? `<div class="notice red section-gap"><strong>Ma sécurité passe avant l’exercice.</strong>Je peux chercher de l’aide maintenant.<div class="button-row section-gap"><a class="btn danger" href="#securite">Voir les possibilités d’aide →</a><a class="btn" href="${violenceRouteForContext()}">Repérer une violence</a></div></div>` : state.safety === "unsure" ? `<div class="notice amber section-gap"><strong>La peur, les menaces ou le contrôle méritent de l’aide.</strong> <a href="${violenceRouteForContext()}">Voir les repères de violence</a> ou <a href="#securite">chercher de l’aide</a>.</div>` : `<p class="hint" style="margin-top:12px">Peur, menaces ou contrôle ? <a href="${violenceRouteForContext()}">Voir les repères de sécurité</a>.</p>`}`;
        }
        if (i === 1) {
          const prompts = [
            ["situation", workflow.fields[0], c.prompts?.[0] || workflow.fields[1], c.examples?.situation || workflow.examples?.[0]],
            ["goal", workflow.fields[2], c.prompts?.[1] || workflow.fields[3], c.examples?.goal || workflow.examples?.[1]],
            ["obstacle", workflow.fields[4], c.prompts?.[2] || workflow.fields[5], c.examples?.obstacle || workflow.examples?.[2]],
          ];
          const [key, label, hint, sample] = prompts[state.clarifyPart];
          const contextCheck = state.clarifyPart === 0
            ? `<details class="context-check"><summary>${esc(workflow.contextCheckTitle)}</summary><div class="details-body"><p>${linkGlossary(workflow.contextCheck)}</p><p class="hint">Je peux noter ici ce qui m’aide à comprendre la situation, ou passer.</p><p class="source-note">Ces questions sont des pistes à adapter à ma situation. <a href="#ref-41">[41]</a> <a href="#ref-42">[42]</a></p></div></details>`
            : "";
          body = `<p class="question-progress">Question ${state.clarifyPart + 1} sur 3 · Je peux passer si je ne sais pas encore.</p>` +
            (state.clarifyPart === 0 && (state.reviewScale || state.reviewContext) ? '<div class="notice amber section-gap"><strong>Je relis mes réponses.</strong> Le niveau, le contexte ou les exemples ont changé ; mes réponses sont restées dans le brouillon.</div>' : "") +
            (state.clarifyPart === 0 && (state.scale === "organization" || state.scale === "public") ? '<div class="notice section-gap"><strong>Je ne porte pas seul un problème collectif.</strong>Je peux identifier les personnes concernées et les décisions à prendre. Je demande l’accord avant de parler au nom d’autres personnes.</div>' : "") +
            field(key, label, hint, "textarea", sample, true, contextCheck) +
            (state.clarifyPart === 2 ? `<details class="optional-fields"${["emotion", "control", "outside"].some((k) => state.fields[k]) ? " open" : ""}><summary>Préciser ce que je ressens et ce que je peux changer (facultatif)</summary><div class="details-body">${field("emotion", "Ce que je ressens", "Quelques mots suffisent.", "text")}${field("control", "Ce sur quoi je peux agir", "Même demander de l’aide est une action possible.", "textarea", c.examples?.control)}${field("outside", "Ce qui ne dépend pas de moi", "Ne pas pouvoir tout changer ne signifie pas être responsable du problème.", "textarea", c.examples?.outside)}</div></details><details class="section-gap"${state.energy === "pause" ? " open" : ""}><summary>Je peux faire une pause ou demander de l’aide</summary><div class="details-body"><p>Je peux m’arrêter ici et reprendre plus tard. Je peux aussi demander à une personne de confiance de rester avec moi pendant que je réfléchis.</p><div class="button-row"><button class="btn small" data-action="pause">Je fais une pause</button><a class="btn small" href="#securite">Où trouver une aide extérieure ?</a></div>${state.energy === "pause" ? '<p class="hint" role="status">Ma pause est choisie. Je peux reprendre avec le bouton Continuer.</p>' : ""}</div></details>` : "");
        }
        if (i === 2) {
          const ideaExamples = c.examples?.ideas || workflow.ideas || [];
          body = `<p class="hint">${linkGlossary(workflow.idea)}</p><div class="section-gap" id="ideas">${state.options.map((o, j) => `<div class="field"><div class="option-head"><label class="label" for="idea-${o.id}">Piste ${j + 1}</label>${state.options.length > 1 ? `<button class="remove" data-remove="${o.id}" aria-label="Retirer la piste ${j + 1}">Retirer</button>` : ""}</div>${j < 3 && ideaExamples[j] ? example(ideaExamples[j], "Piste " + (j + 1), j === 0) : ""}<textarea id="idea-${o.id}" data-option="${o.id}" data-prop="text" maxlength="6000" placeholder="Je pourrais…">${esc(o.text)}</textarea></div>`).join("")}</div><button class="btn" data-action="add"${state.options.length >= 8 ? " disabled" : ""}>+ Ajouter une piste</button>`;
        }
        if (i === 3) {
          const options = state.options.filter((o) => o.text.trim());
          const ideaExamples = c.examples?.ideas || workflow.ideas || [];
          const comparison = c.examples?.comparison || workflow.comparison || [];
          body = options.length
            ? `${options.map((o, j) => `<article class="option-card${state.chosen === o.id ? " selected" : ""}"><h3>${j + 1}. ${esc(o.text)}</h3><details${o.plus || o.minus ? " open" : ""}><summary>Comparer les avantages et les limites</summary><div class="details-body"><div class="field-row"><div><label class="label" for="plus-${o.id}">Ce qu’elle peut apporter</label><textarea id="plus-${o.id}" data-option="${o.id}" data-prop="plus" maxlength="6000" placeholder="Bénéfice attendu, besoin respecté…">${esc(o.plus)}</textarea></div><div><label class="label" for="minus-${o.id}">Contraintes et risques</label><textarea id="minus-${o.id}" data-option="${o.id}" data-prop="minus" maxlength="6000" placeholder="Temps, coût, énergie, sécurité…">${esc(o.minus)}</textarea></div></div></div></details><button class="btn ${state.chosen === o.id ? "primary" : ""} section-gap" data-choose="${o.id}" aria-pressed="${state.chosen === o.id}">${state.chosen === o.id ? "✓ Option choisie" : "Choisir cette option"}</button></article>`).join("")}<details><summary>Un exemple de comparaison</summary><div class="details-body"><p><strong>Exemple fictif :</strong> ${esc(ideaExamples[0] || "Une piste à essayer.")}</p><p><strong>Apport possible :</strong> ${esc(comparison[0] || "Je note ce qu’elle pourrait apporter.")}</p><p><strong>Limite :</strong> ${esc(comparison[1] || "Je note ce qui pourrait bloquer.")}</p></div></details><details><summary>J’hésite entre plusieurs pistes</summary><div class="details-body"><p>${linkGlossary(workflow.compare)}</p><p>Si les conséquences sont importantes, je peux demander un avis adapté avant d’agir.</p></div></details>`
            : `<div class="notice amber"><strong>Je n’ai pas encore noté de piste.</strong>Je reviens à l’étape Imaginer pour en ajouter une.<div class="button-row section-gap"><button class="btn" data-step="2">Imaginer une piste →</button></div></div>`;
        }
        if (i === 4) {
          const chosen = state.options.find((o) => o.id === state.chosen);
          const when = {
            personal: ["Quand et où vais-je agir ?", "Demain matin, chez moi, pendant dix minutes."],
            shared: ["Quand puis-je proposer cet essai ?", "À notre prochain échange, si chacun souhaite en parler."],
            organization: ["Quand et où le test aura-t-il lieu ?", "Lors de la prochaine réunion d’équipe, sur un seul dossier."],
            public: ["Quand et auprès de qui faire cette démarche ?", "Lors de la prochaine permanence du service concerné."],
          }[state.scale];
          body = `<div class="notice"><strong>Ma piste choisie</strong>${chosen ? esc(chosen.text) : "Je n’ai pas encore choisi de piste. Je peux revenir à l’étape précédente."}</div>${chosen ? firstStepDecisionDiagram(state.scale) : ""}<div class="section-gap">${field("action", workflow.action[0], workflow.action[1], "textarea", c.examples?.action || workflow.actionExamples?.[0], true)}${field("when", when[0], "", "text", when[1])}${field("measure", workflow.action[2], workflow.action[3], "textarea", c.examples?.measure || workflow.actionExamples?.[1])}<details class="optional-fields"${["support", "backup", "reviewDate"].some((k) => state.fields[k]) ? " open" : ""}><summary>Prévoir de l’aide, un obstacle ou une date de bilan (facultatif)</summary><div class="details-body">${field("support", "Qui ou quoi peut m’aider ?", "", "textarea", c.examples?.support)}${field("backup", "Si ça bloque, que pourrai-je faire ?", "Je prévois une autre action simple et sûre.", "textarea", c.examples?.backup)}${field("reviewDate", "Quand ferai-je le point ?", "Une date pour ma fiche, sans rappel automatique.", "date")}</div></details></div>`;
        }
        if (i === 5) {
          body = `<fieldset><legend>Où en suis-je de mon action ?</legend><div class="choice-stack">${[
            ["notyet", "Je n’ai pas encore essayé"],
            ["yes", "J’ai essayé"],
            ["partly", "J’ai essayé en partie"],
            ["no", "Je n’ai pas pu essayer"],
          ]
            .map(
              ([k, v]) =>
                `<button class="pill" data-trial="${k}" aria-pressed="${state.fields.trial === k}">${v}</button>`,
            )
            .join(
              "",
            )}</div></fieldset>${state.fields.trial === "notyet" ? `<div class="notice section-gap"><strong>Je peux garder mon plan pour plus tard.</strong>Je remplirai le bilan après l’essai. Je n’ai pas à inventer un résultat.<div class="button-row section-gap"><a class="btn" href="#recap">Voir mon plan →</a></div></div>` : `<div class="section-gap">${field("result", "Ce qui s’est réellement passé", "Même si je n’ai fait qu’une partie.", "textarea", c.examples?.result)}${state.fields.measure ? `<div class="example" style="margin-bottom:22px"><small>Le progrès que j’espérais</small><p>${esc(state.fields.measure)}</p></div>` : ""}${field("learning", "Ce que j’en retiens", "Qu’est-ce qui a aidé ? Qu’est-ce qui manque ou reste difficile ?", "textarea", "L’action était faisable, mais j’avais besoin d’une information supplémentaire.")}${field("next", "Ce que je souhaite faire ensuite", "Continuer, ajuster, demander de l’aide ou faire une pause.", "textarea", "Réduire le prochain pas et demander l’information manquante.")}</div>`}`;
        }
        const selectedTool = i === 1 && c.tool ? c.tool : workflow.tools[i];
        if (selectedTool) {
          const [name, description, source] = selectedTool;
          body += `<details class="section-gap"><summary>Outil utile ici : ${esc(name)}</summary><div class="details-body"><p>${linkGlossary(description)}</p><p class="source-note">Pourquoi ce repère ? <a href="${esc(source)}">Voir la source et ses limites</a>.</p></div></details>`;
        }
        $("#step-container").innerHTML =
          `<div class="step-topline"><span class="tag">${String(i + 1).padStart(2, "0")} / ${String(6).padStart(2, "0")} · ${stepNames[i][0]}</span><div class="progress" role="progressbar" aria-label="Position dans le parcours" aria-valuenow="${i + 1}" aria-valuemin="1" aria-valuemax="6"><span style="width:${((i + 1) / 6) * 100}%"></span></div></div><h2 id="step-title" tabindex="-1">${titles[i]}</h2>${leads[i] ? `<p class="step-lead">${linkGlossary(leads[i])}</p>` : ""}<div class="step-content">${body}</div><div class="footer-actions"><button class="btn" data-action="back"${i === 0 ? " hidden" : ""}>← ${i === 1 && state.clarifyPart > 0 ? "Question précédente" : "Retour"}</button>${i === 0 ? '<span class="step-meta">Je peux ajuster mon choix plus tard</span>' : ""}<button class="btn primary" data-action="next">${i === 5 ? "Voir mon bilan" : i === 4 ? "Voir mon plan" : i === 1 && state.clarifyPart < 2 ? "Question suivante" : "Continuer"} <span aria-hidden="true">→</span></button></div>`;
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
        if (i > 0 && !state.scaleChosen) {
          state.step = 0;
          renderStep(true);
          toast("Choisissez d’abord le niveau du problème.");
          $(".scale-option")?.focus();
          return;
        }
        const destination = Math.max(0, Math.min(5, i));
        if (destination === 1 && state.step !== 1) state.clarifyPart = 0;
        state.step = destination;
        persist();
        $("#mobile-step-picker").open = false;
        const alreadyHere = !$("#outil").hidden;
        history.replaceState(null, "", "#outil");
        if (!alreadyHere) route();
        renderStep(true);
      }
      function goNext() {
        if (state.step === 0 && !state.scaleChosen) {
          toast("Choisissez d’abord le niveau du problème.");
          $(".scale-option")?.focus();
          return;
        }
        if (state.step === 1) {
          if (state.clarifyPart < 2) {
            state.clarifyPart++;
            persist();
            renderStep(true);
            return;
          }
          state.reviewScale = false;
          state.reviewContext = false;
        }
        if (state.step === 4 && !state.fields.action.trim()) {
          toast("Je note un premier pas concret, même petit, pour préparer mon plan.");
          $("#field-action")?.focus();
          return;
        }
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
        $("#recap .page-heading h1").textContent = hasPlan() ? planTitle : "Mes réponses";
        $("#recap-actions").hidden = !hasWriting();
        $("#recap-review").hidden = !hasPlan();
        $("#recap-privacy").hidden = !hasWriting();
        $("#recap-note").hidden = !hasPlan();
        if (!hasWriting()) {
          $("#recap-content").innerHTML = '<article class="card padded empty-recap"><h2>Ma fiche est encore vide</h2><p>Je commence par choisir le niveau et le contexte de mon problème. Mes réponses apparaîtront ici au fur et à mesure.</p><button class="btn primary section-gap" data-step="0">Commencer l’exercice →</button></article>';
          return;
        }
        const f = state.fields,
          c = currentContext(),
          choice = state.options.find((o) => o.id === state.chosen);
        const dd = (k, v) => v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : "";
        const block = (title, idx, content) =>
          `<article class="card recap-section"><h3>${title}<button class="text-button no-print" data-step="${idx}">Modifier</button></h3><dl>${content}</dl></article>`;
        const situation = dd("Contexte", c.label) + dd("Niveau", scales[state.scale][0]) +
          dd("Les faits", f.situation) + dd("Mon but", f.goal) + dd("Mon obstacle", f.obstacle) +
          dd("Mon ressenti", f.emotion) + dd("Ma marge de manœuvre", f.control) +
          dd("Ce qui ne dépend pas de moi", f.outside);
        const ideas = state.options.filter((o) => o.text.trim()).map((o, j) =>
          dd("Piste " + (j + 1), o.text) + dd("Bénéfices envisagés", o.plus) +
          dd("Contraintes et risques", o.minus)).join("");
        const action = dd("Action", f.action) + dd("Quand et où", f.when) +
          dd("Appui", f.support) + dd("Si ça bloque", f.backup) +
          dd("Signe de progrès", f.measure) +
          dd("Date du bilan", f.reviewDate ? formatDate(f.reviewDate) : "");
        const trial = f.trial !== "notyet" ? {
          yes: "Essayé", partly: "Essayé en partie", no: "Je n’ai pas pu",
        }[f.trial] : "";
        const review = dd("Statut", trial) + dd("Résultat", f.result) +
          dd("Ce que j’en retiens", f.learning) + dd("Prochaine étape", f.next);
        $("#recap-content").innerHTML = [
          [f.situation || f.goal || f.obstacle || f.emotion || f.control || f.outside, "1. Ma situation", 1, situation],
          [ideas, "2. Mes options", 2, ideas],
          [choice?.text, "3. Mon choix", 3, dd("Option retenue", choice?.text)],
          [action, "4. Mon premier pas", 4, action],
          [review, "5. Mon bilan", 5, review],
        ].filter(([show]) => show).map(([, title, idx, content]) => block(title, idx, content)).join("");
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
          `<article class="card padded"><h3>${v[0]}</h3><p>${v[1]}</p><div class="say">${v[2]}</div><p>${v[3]}</p>${["couple", "young", "work"].includes($("#support-context").value) ? `<a href="${$("#support-context").value === "couple" ? "#violences-couple" : "#violences"}" class="text-button">Explorer les repères de violence →</a>` : ""}</article>`;
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
        $("#violence-empty").hidden = Boolean(d);
        $("#violence-meter-layout").hidden = !d;
        $("#violence-return").hidden = !state.scaleChosen;
        if (!d) {
          $("#violence-context-note").textContent = "";
          $("#meter").replaceChildren();
          $("#meter-detail").replaceChildren();
          return;
        }
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
          .replace(/harcèlement moral au travail/g, term("workHarassment"))
          .replace(/contrôle coercitif/g, term("coercion"))
          .replace(/consentement/g, term("consent"))
          .replace(/asymétrie pédagogique/g, term("power"));
      }
      function renderMeterDetail() {
        const d = violenceData[$("#violence-context").value];
        if (!d) return;
        if (meterIndex === null) {
          $("#meter-detail").innerHTML = '<h3>Quel comportement me questionne ?</h3><p>Je peux choisir un exemple dans la liste. Rien n’est déduit de ma relation avant ce choix.</p><p class="source-note">Ces exemples ne classent pas une personne ou une relation. Je peux demander de l’aide dès qu’un fait m’inquiète.</p>';
          $$('[data-meter]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
          return;
        }
        const v = d.items[meterIndex];
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
        const scaleMatch = /^outil-(personal|shared|organization|public)$/.exec(hash);
        const violenceMatch = /^violences-([a-z]+)$/.exec(hash);
        const violenceKey = violenceMatch && Object.hasOwn(violenceData, violenceMatch[1]) ? violenceMatch[1] : null;
        if (scaleMatch) {
          selectScale(scaleMatch[1]);
          persist();
        }
        if (hash === "violences" || violenceKey) {
          $("#violence-context").value = violenceKey || "";
          meterIndex = null;
          renderMeter();
        }
        const page = hash.startsWith("ref-")
          ? "bibliographie"
          : scaleMatch ? "outil"
          : violenceKey ? "violences"
          : [
                "accueil",
                "outil",
                "soutenir",
                "groupe",
                "proche",
                "violences",
                "comprendre",
                "bibliographie",
                "securite",
                "recap",
              ].includes(hash)
            ? hash
            : "accueil";
        const keepViolenceChoiceFocus = page === "violences" && document.activeElement === $("#violence-context");
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
        if (page === "groupe") renderGroup();
        const title = {
          accueil: "Choisir un parcours",
          outil: "Mon problème",
          soutenir: "Soutenir quelqu’un",
          groupe: "Aider un groupe",
          proche: "Comment aider un proche ?",
          violences: "Repérer les violences",
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
        } else if (!keepViolenceChoiceFocus) {
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
          selectScale(a.dataset.startScale);
          persist();
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
        if (el.dataset.field || el.dataset.option) updateRecapShortcut();
      });
      document.addEventListener("change", (e) => {
        if (e.target.id !== "context-select") return;
        if (!Object.hasOwn(contextCatalog[state.scale], e.target.value)) return;
        if (state.context === e.target.value) return;
        state.context = e.target.value;
        state.reviewContext = hasWriting();
        persist();
        renderStep();
        $("#context-select").focus();
      });
      document.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.step !== undefined) {
          changeStep(Number(b.dataset.step));
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
          selectScale(b.dataset.scale);
          history.replaceState(null, "", "#outil-" + state.scale);
          persist();
          renderStep();
          $("#selected-level").setAttribute("tabindex", "-1");
          $("#selected-level").focus();
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
            if (state.step === 1 && state.clarifyPart > 0) {
              state.clarifyPart--;
              persist();
              renderStep(true);
            } else changeStep(state.step - 1);
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
                  localStorage.removeItem(OLD_KEY);
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
            localStorage.removeItem(OLD_KEY);
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
        const key = $("#violence-context").value;
        if (key && !Object.hasOwn(violenceData, key)) return;
        const target = key ? `#violences-${key}` : "#violences";
        if (location.hash === target) {
          meterIndex = null;
          renderMeter();
        } else location.hash = target;
      });
      // Brief hint on hover/focus; a deliberate activation opens the detailed definition.
      let tooltipOwner = null,
        tipTimer = null,
        tooltipSuppressed = null,
        termOpener = null;
      function showTooltip(b) {
        const k = b.dataset.term;
        if (!glossary[k] || tooltipSuppressed === b || $("#term-dialog").open) return;
        clearTimeout(tipTimer);
        if (tooltipOwner && tooltipOwner !== b)
          tooltipOwner.removeAttribute("aria-describedby");
        tooltipOwner = b;
        const tip = $("#tooltip");
        tip.textContent = glossaryHelp[k][0];
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
      function openTerm(b) {
        const k = b.dataset.term;
        if (!glossary[k]) return;
        tooltipSuppressed = b;
        hideTooltip();
        termOpener = b;
        const info = glossaryHelp[k];
        $("#term-title").textContent = glossary[k][0];
        $("#term-brief").textContent = info[0];
        $("#term-detail").textContent = glossary[k][1];
        $("#term-example").textContent = info[1];
        $("#term-source").href = "#ref-" + info[2];
        $("#term-dialog").showModal();
        $("#term-close").focus();
      }
      $("#term-close").addEventListener("click", () => $("#term-dialog").close());
      $("#term-dialog").addEventListener("click", (e) => {
        if (e.target === $("#term-dialog")) $("#term-dialog").close();
      });
      $("#term-dialog").addEventListener("close", () => {
        if (termOpener?.isConnected && !termOpener.closest("[hidden]")) termOpener.focus();
        termOpener = null;
      });
      $("#term-source").addEventListener("click", () => $("#term-dialog").close());
      document.addEventListener("mouseover", (e) => {
        const b = e.target.closest("[data-term]");
        if (b) showTooltip(b);
        if (e.target.closest("#tooltip")) clearTimeout(tipTimer);
      });
      document.addEventListener("mouseout", (e) => {
        if (!$("#term-dialog").open && e.target.closest("[data-term]") === tooltipSuppressed) tooltipSuppressed = null;
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
        if (b) openTerm(b);
        else if (!e.target.closest("#tooltip")) hideTooltip();
      });
      document.addEventListener("focusout", (e) => {
        if (!$("#term-dialog").open && e.target === tooltipSuppressed) tooltipSuppressed = null;
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (!$("#term-dialog").open) tooltipSuppressed = tooltipOwner;
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
      $("#glossary-list").innerHTML = `<div class="glossary-index">${Object.entries(glossary)
        .map(([key, [label]]) => `<p><button type="button" class="glossary-button" data-term="${key}" aria-haspopup="dialog" aria-controls="term-dialog">${esc(label)}</button> — ${esc(glossaryHelp[key][0])}</p>`)
        .join("")}</div>`;
      $$(".glossary-button").forEach((b) => {
        b.setAttribute("aria-haspopup", "dialog");
        b.setAttribute("aria-controls", "term-dialog");
      });
      updatePrivacy();
      renderStep();
      renderSupport();
      $("#support-relation").addEventListener("change", renderNeedGuidance);
      renderNeedGuidance();
      $("#violence-context").innerHTML = '<option value="">Choisir une relation</option>' + violenceGroups
        .map(([group, options]) => `<optgroup label="${esc(group)}">${options.map(([key, label]) => `<option value="${esc(key)}">${esc(label)}</option>`).join("")}</optgroup>`)
        .join("");
      renderMeter();
      initGroup();
      route();
