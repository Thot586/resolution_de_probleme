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
          prompt: "Je note ce qui peut changer, qui peut décider et qui consulter.",
          example: "Dans une association, le bureau peut modifier les horaires de permanence après avoir écouté les bénévoles.",
          refs: [23, 25],
        },
        {
          short: "Écouter",
          title: "Comment comprendre les besoins ?",
          intro: "Je regarde ce qui est déjà connu. Puis je choisis avec le groupe la méthode la plus légère qui répond à une question utile.",
          points: [
            "Quelle question devra éclairer la décision ?",
            "Qui invite-t-on ? La langue, l’horaire ou le format risquent-ils d’exclure quelqu’un ?",
            "Avant de recueillir des données, j’explique leur usage et je demande l’accord des participants.",
          ],
          note: "La question à éclairer, la méthode choisie et les personnes à écouter",
          prompt: {
            conversation: "Je note une question à poser au groupe et qui inviter à la discussion.",
            interviews: "Je note une question commune et quels points de vue rencontrer volontairement.",
            survey: "Je note la décision à éclairer, qui inviter à répondre et qui lira les réponses.",
            existing: "Je note les données à consulter et ce qu’elles ne racontent peut-être pas.",
          },
          example: {
            conversation: "Je propose aux bénévoles : « Qu’est-ce qui rend un créneau difficile à assurer ? »",
            interviews: "Je propose des entretiens courts à des bénévoles aux disponibilités différentes, avec leur accord.",
            survey: "Je propose trois questions courtes aux 12 bénévoles et précise qui pourra lire leurs réponses.",
            existing: "Je regarde les créneaux non pourvus du trimestre, puis je demande ce que ce tableau ne montre pas.",
          },
          refs: [23, 25, 26],
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
          prompt: {
            conversation: "Je note les thèmes entendus, les avis divergents et qui n’a pas pu parler.",
            interviews: "Je note les thèmes communs et différents, sans attribuer de propos à une personne.",
            survey: "Je note le nombre d’invités et de répondants, puis ce que les réponses montrent ou non.",
            existing: "Je note ce que les données décrivent, leur date et les informations manquantes.",
          },
          example: {
            conversation: "Huit bénévoles ont parlé ; quatre étaient absents. Deux difficultés reviennent, mais leur avis manque.",
            interviews: "Les entretiens évoquent les transports et les changements tardifs ; ils ne représentent pas tout le groupe.",
            survey: "Huit réponses sur 12 invitations ; cinq citent le samedi. Cela décrit les répondants, pas tout le groupe.",
            existing: "Le tableau montre trois créneaux non pourvus ; il ne dit pas pourquoi ils le sont.",
          },
          refs: [23, 26],
        },
        {
          short: "Restituer",
          title: "Les personnes se reconnaissent-elles dans le résultat ?",
          intro: "Je rends les constats au groupe avant de fixer une solution. Je laisse une place aux corrections et aux désaccords.",
          points: [
            "Je présente quelques constats clairs, avec leurs limites, dans une langue et un format compréhensibles, sans dévoiler de réponse identifiable.",
            "Je demande : « Qu’avons-nous mal compris ? Qu’est-ce qui manque ? »",
            "J’explique ce qui sera décidé ensuite, par qui, et quand le groupe saura ce qui a été retenu ou écarté, avec les raisons.",
          ],
          note: "Le retour prévu au groupe, les corrections et les questions encore ouvertes",
          prompt: "Je note ce que je rendrai au groupe, sous quelle forme, comment recueillir ses corrections et la date du prochain retour.",
          example: "Je partage trois constats sans citation reconnaissable, dans le format convenu, puis demande : « Qu’avons-nous oublié ? »",
          refs: [23, 25, 27],
        },
        {
          short: "Choisir",
          title: "Quel changement voulons-nous essayer ?",
          intro: "Le groupe choisit une priorité et compare plusieurs réponses possibles avant de retenir un essai.",
          points: [
            "Quel changement serait utile pour qui, et à quelle échéance ?",
            "Quelles pistes viennent des personnes concernées ? Pour chacune, quels bénéfices espérés, moyens nécessaires et limites ?",
            "Qui profiterait ou supporterait le coût de chaque piste ? Quels désaccords et effets indésirables faut-il examiner ?",
          ],
          note: "La priorité, les pistes comparées, les raisons du choix et un signe de progrès",
          prompt: "Je note les pistes possibles, leurs bénéfices et contraintes, puis le choix motivé du groupe.",
          example: "Les bénévoles comparent un planning plus précoce et une rotation des samedis. Ils choisissent le planning ; signe de progrès : moins de créneaux non pourvus.",
          refs: [22, 23, 25, 48],
        },
        {
          short: "Tester",
          title: "Quel petit essai pouvons-nous faire ?",
          intro: "Je prépare avec les personnes concernées un essai limité, autorisé et réversible. Nous décidons à l’avance ce que nous observerons.",
          points: [
            "Qui fait quoi, quand et avec quels moyens ? Qui donne son accord ?",
            "Quel signe montrera un progrès, et quelle charge ou quel effet gênant surveillerons-nous ?",
            "Si l’essai ne convient pas, comment l’arrêter ou le modifier ?",
          ],
          note: "L’essai, les responsabilités, les mesures et les conditions d’arrêt",
          prompt: "Je note qui valide l’essai, sa durée, un signe de progrès, un effet gênant à surveiller et une condition d’arrêt.",
          example: "Le bureau autorise quatre semaines d’essai. Une personne note les créneaux non pourvus ; le groupe peut arrêter si la charge augmente.",
          refs: [22],
        },
        {
          short: "Suivre",
          title: "Qu’avons-nous appris ?",
          intro: "Nous comparons ce qui était attendu à ce qui s’est passé, y compris la charge créée, puis décidons de continuer, modifier ou arrêter.",
          points: [
            "Qu’a-t-on observé avant et après l’essai ? Pour quelles personnes, et avec quelles limites d’interprétation ?",
            "Qu’est-ce qui a aidé, manqué ou causé un effet inattendu ?",
            "Quand et comment expliquer aux participants la décision finale et les raisons du choix ?",
          ],
          note: "Le bilan, la décision prise et la date du prochain retour au groupe",
          prompt: "Je note les observations, leurs limites et quand le groupe décidera de continuer, modifier ou arrêter.",
          example: "Deux créneaux restent non pourvus, contre trois avant. Le groupe vérifie aussi si la charge s’est déplacée.",
          refs: [22, 23, 25, 48],
        },
      ];
      const groupMethods = {
        conversation: "Une discussion suffit parfois pour un petit groupe. Je vérifie que chacun peut y participer librement et je propose une autre façon de répondre si nécessaire.",
        interviews: "Je rencontre volontairement des personnes aux situations différentes, dans un format qui leur convient. Je note les thèmes sans attribuer les propos à une personne identifiable.",
        survey: "Je teste que les questions et leur langue sont comprises par les personnes sollicitées. Je note combien ont été invités et combien ont répondu ; je ne généralise pas au-delà du groupe consulté.",
        existing: "Je vérifie la date, la définition et les lacunes des données déjà disponibles. Je les confronte à ce que vivent les personnes concernées.",
      };
      let groupIndex = 0;
      let groupMethod = "conversation";
      const groupNotes = Array(groupStages.length).fill("");

      function updateGroupNoteGuide() {
        const stage = groupStages[groupIndex];
        const forMethod = (text) => typeof text === "string" ? text : text[groupMethod];
        document.querySelector("#group-note-prompt").textContent = forMethod(stage.prompt);
        document.querySelector("#group-note-example").textContent = forMethod(stage.example);
      }

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
        updateGroupNoteGuide();
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
          updateGroupNoteGuide();
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
