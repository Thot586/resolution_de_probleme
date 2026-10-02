      // A facilitator's planning notes stay in memory. The tool never collects survey responses.
      const groupStages = [
        {
          short: "Cadrer",
          title: "Qui participe et qui décide ?",
          intro: "Je vérifie avec le groupe ce qui peut vraiment changer avant de demander des témoignages.",
          points: [
            "Qui est touché, et qui risque de ne pas être entendu ?",
            "Quelle décision le groupe peut-il prendre ? Qui doit autoriser ou financer la suite ?",
            "Comment chacun peut-il participer librement, sans risque inutile ?",
          ],
          note: "Le périmètre, les personnes à associer et la décision possible",
          refs: [23, 25],
        },
        {
          short: "Écouter",
          title: "Comment comprendre les besoins ?",
          intro: "Je regarde ce qui est déjà connu. Puis je choisis avec le groupe la méthode la plus légère qui répond à une question utile.",
          points: [
            "Quelle question devra éclairer la décision ?",
            "Qui invite-t-on, et qui peut manquer parmi les réponses ?",
            "Avant de recueillir des données, j’explique leur usage et je demande l’accord des participants.",
          ],
          note: "La question à éclairer, la méthode choisie et les personnes à écouter",
          refs: [23, 26],
        },
        {
          short: "Analyser",
          title: "Que montrent les informations ?",
          intro: "Je sépare les faits, les récits, les hypothèses et ce que les données ne permettent pas de conclure.",
          points: [
            "Pour un sondage, combien de personnes ont été invitées et combien ont répondu ?",
            "Les absents et les réponses différentes changent-ils l’interprétation ?",
            "Une différence observée ne prouve pas à elle seule qu’une action en est la cause.",
          ],
          note: "Les constats solides, les désaccords et les limites des données",
          refs: [23, 26],
        },
        {
          short: "Restituer",
          title: "Les personnes se reconnaissent-elles dans le résultat ?",
          intro: "Je rends les constats au groupe avant de fixer une solution. Je laisse une place aux corrections et aux désaccords.",
          points: [
            "Je présente quelques constats clairs, avec leurs limites, sans dévoiler de réponse identifiable.",
            "Je demande : « Qu’avons-nous mal compris ? Qu’est-ce qui manque ? »",
            "J’explique ce qui sera décidé ensuite, par qui, et quand le groupe aura un retour.",
          ],
          note: "Le retour prévu au groupe, les corrections et les questions encore ouvertes",
          refs: [23, 25, 27],
        },
        {
          short: "Choisir",
          title: "Quel changement voulons-nous essayer ?",
          intro: "Le groupe choisit une priorité. Je relie un objectif observable aux pistes proposées et aux contraintes réelles.",
          points: [
            "Quel changement serait utile pour qui, et à quelle échéance ?",
            "Quelles pistes viennent des personnes concernées, et quelles autres options existent ?",
            "Quels moyens, autorisations, effets indésirables et désaccords faut-il examiner ?",
          ],
          note: "Une priorité, un signe de progrès et les pistes à comparer",
          refs: [22, 23, 25],
        },
        {
          short: "Tester",
          title: "Quel petit essai pouvons-nous faire ?",
          intro: "Je prépare avec les personnes concernées un essai limité, autorisé et réversible avant une mise en œuvre plus large.",
          points: [
            "Qui fait quoi, quand et avec quels moyens ? Qui donne son accord ?",
            "Qu’espérons-nous observer, et quels effets gênants surveiller ?",
            "Si l’essai ne convient pas, comment l’arrêter ou le modifier ?",
          ],
          note: "L’essai, les responsabilités, les mesures et les conditions d’arrêt",
          refs: [22],
        },
        {
          short: "Suivre",
          title: "Qu’avons-nous appris ?",
          intro: "Je compare ce qui était attendu à ce qui s’est passé, puis le groupe décide de continuer, modifier ou arrêter.",
          points: [
            "Qu’a-t-on observé avant et après l’essai ? Pour quelles personnes ?",
            "Qu’est-ce qui a aidé, manqué ou causé un effet inattendu ?",
            "Quand et comment rendre la décision finale aux participants ?",
          ],
          note: "Le bilan, la décision prise et la date du prochain retour au groupe",
          refs: [22, 23, 25],
        },
      ];
      const groupMethods = {
        conversation: "Une discussion suffit parfois pour un petit groupe. Je donne aussi la parole aux personnes discrètes ; les absents restent à prendre en compte.",
        interviews: "Je rencontre des personnes aux situations différentes. Je note les thèmes sans attribuer les propos à une personne identifiable.",
        survey: "Je teste quelques questions neutres et compréhensibles. Je note combien ont été invités et combien ont répondu ; je ne généralise pas au-delà du groupe consulté.",
        existing: "Je vérifie la date, la définition et les lacunes des données déjà disponibles. Je les confronte à ce que vivent les personnes concernées.",
      };
      let groupIndex = 0;
      let groupMethod = "conversation";
      const groupNotes = Array(groupStages.length).fill("");

      function renderGroupPlan() {
        const box = document.querySelector("#group-plan-content");
        box.replaceChildren();
        const written = groupNotes.map((note, i) => [note.trim(), i]).filter(([note]) => note);
        if (!written.length) {
          const empty = document.createElement("p");
          empty.textContent = "Je n’ai pas encore noté de décision. Je peux utiliser le parcours sans écrire.";
          box.append(empty);
        } else {
          const list = document.createElement("ol");
          list.className = "group-plan-list";
          for (const [note, i] of written) {
            const item = document.createElement("li");
            const heading = document.createElement("strong");
            const body = document.createElement("p");
            heading.textContent = groupStages[i].short + " · " + groupStages[i].title;
            body.textContent = note;
            item.append(heading, body);
            list.append(item);
          }
          box.append(list);
        }
        document.querySelector("#group-clear").disabled = !written.length;
      }

      function renderGroup(focus = false) {
        const stage = groupStages[groupIndex];
        document.querySelector("#group-stage-select").value = String(groupIndex);
        document.querySelector("#group-progress-label").textContent = `${groupIndex + 1} / ${groupStages.length} · ${stage.short}`;
        const progress = document.querySelector("#group-progress");
        progress.setAttribute("aria-valuenow", String(groupIndex + 1));
        progress.innerHTML = `<span style="width:${((groupIndex + 1) / groupStages.length) * 100}%"></span>`;
        const title = document.querySelector("#group-step-title");
        title.textContent = stage.title;
        document.querySelector("#group-step-intro").innerHTML = linkGlossary(stage.intro);
        const guidance = document.querySelector("#group-guidance");
        const list = document.createElement("ul");
        for (const point of stage.points) {
          const item = document.createElement("li");
          item.innerHTML = linkGlossary(point);
          list.append(item);
        }
        guidance.replaceChildren(list);
        document.querySelector("#group-method-box").hidden = groupIndex !== 1;
        document.querySelector("#group-method").value = groupMethod;
        document.querySelector("#group-method-hint").innerHTML = linkGlossary(groupMethods[groupMethod]);
        document.querySelector("#group-note-label").textContent = stage.note + " (facultatif)";
        document.querySelector("#group-note").value = groupNotes[groupIndex];
        const source = document.querySelector("#group-step-source");
        source.replaceChildren(document.createTextNode("Repères : "));
        for (const number of stage.refs) {
          const link = document.createElement("a");
          link.href = `#ref-${number}`;
          link.textContent = `[${number}]`;
          source.append(link, document.createTextNode(" "));
        }
        document.querySelector("#group-back").hidden = groupIndex === 0;
        document.querySelector("#group-next").textContent = groupIndex === groupStages.length - 1 ? "Voir mon plan →" : "Étape suivante →";
        renderGroupPlan();
        if (focus) {
          title.focus({ preventScroll: true });
          title.scrollIntoView({ block: "start", behavior: "instant" });
        }
      }

      function initGroup() {
        const selector = document.querySelector("#group-stage-select");
        for (const [i, stage] of groupStages.entries()) {
          const option = document.createElement("option");
          option.value = String(i);
          option.textContent = `${i + 1}. ${stage.short}`;
          selector.append(option);
        }
        selector.addEventListener("change", () => { groupIndex = Number(selector.value); renderGroup(true); });
        document.querySelector("#group-method").addEventListener("change", (event) => {
          groupMethod = event.target.value;
          document.querySelector("#group-method-hint").innerHTML = linkGlossary(groupMethods[groupMethod]);
        });
        document.querySelector("#group-note").addEventListener("input", (event) => {
          groupNotes[groupIndex] = event.target.value;
          renderGroupPlan();
        });
        document.querySelector("#group-back").addEventListener("click", () => { groupIndex -= 1; renderGroup(true); });
        document.querySelector("#group-next").addEventListener("click", () => {
          if (groupIndex < groupStages.length - 1) { groupIndex += 1; renderGroup(true); }
          else {
            const plan = document.querySelector("#group-plan");
            plan.open = true;
            plan.querySelector("summary").focus();
            plan.scrollIntoView({ block: "start", behavior: "instant" });
          }
        });
        document.querySelector("#group-download").addEventListener("click", () => {
          const lines = ["PLAN DE TRAVAIL · AIDER UN GROUPE", "Méthode d’écoute envisagée : " + document.querySelector(`#group-method option[value="${groupMethod}"]`).textContent, ""];
          groupStages.forEach((stage, i) => lines.push(`${i + 1}. ${stage.title}\n${groupNotes[i].trim() || "À préciser avec le groupe."}\n`));
          download("plan-groupe-pas-a-pas.txt", lines.join("\n"), "text/plain;charset=utf-8");
        });
        document.querySelector("#group-clear").addEventListener("click", () => {
          confirmAction("Effacer mes notes ?", "Les notes de ce parcours seront effacées de cette page.", () => {
            groupNotes.fill("");
            document.querySelector("#group-note").value = "";
            renderGroupPlan();
          }, "Effacer");
        });
        renderGroup();
      }
