      // Le brouillon : forme de l'état d'un problème, validation et migration des anciens brouillons (v1 -> v2).
      // Fonctions pures, sans DOM : elles se testent dans Node (tests/unit.spec.cjs).
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
      const legacyContextMap = {
        personal: { daily: "daily", study: "study", work: "work", health: "health" },
        shared: { couple: "couple", family: "family", work: "other" },
        organization: { work: "coordination" },
        public: { collective: "mobility" },
      };
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
