      // <choice-group> : un choix unique présenté en cartes ou en pastilles, construit avec de vrais boutons radio
      // (clavier, lecteur d'écran et formulaires natifs). Même interface qu'un <select> : value, change, focus().
      // Ses enfants <option> et <optgroup> décrivent les choix ; render(groupes, valeur) les remplace.
      //   <choice-group name="x" variant="cards|segmented" aria-labelledby="…" aria-describedby="…" value="a">
      // Option fold : une fois un choix fait, la liste se replie en une ligne « Relation choisie : … Changer ».
      // (attributs summary-label et placeholder), pour que ce qui suit le choix reste à portée de main sur téléphone.
      //     <optgroup label="Titre"><option value="a" data-hint="Aide courte">Libellé</option></optgroup>
      //   </choice-group>
      class ChoiceGroup extends HTMLElement {
        static #serial = 0;
        connectedCallback() {
          if (this.dataset.built) return;
          const groups = [];
          const read = (option) => ({ value: option.value, label: option.textContent.trim(), hint: option.dataset.hint || "" });
          let loose = null;
          for (const child of [...this.children]) {
            if (child.tagName === "OPTGROUP") {
              groups.push({ label: child.label, items: [...child.querySelectorAll("option")].filter((o) => o.value).map(read) });
              loose = null;
            } else if (child.tagName === "OPTION" && child.value) {
              if (!loose) groups.push((loose = { label: "", items: [] }));
              loose.items.push(read(child));
            }
          }
          this.addEventListener("change", () => this.#sync(true));
          this.render(groups, this.getAttribute("value") || "");
        }
        render(groups, value = "") {
          const name = this.getAttribute("name") || this.id || `choice-${ChoiceGroup.#serial}`;
          const serial = ++ChoiceGroup.#serial;
          const variant = this.getAttribute("variant") || "cards";
          this.dataset.built = "1";
          this.setAttribute("role", "radiogroup");
          this.classList.add("choice-set", `is-${variant}`);
          const element = (tag, className, text) => {
            const node = document.createElement(tag);
            if (className) node.className = className;
            if (text) node.textContent = text;
            return node;
          };
          const sections = groups.map((group, g) => {
            const grid = element("div", "choice-grid");
            group.items.forEach((item, i) => {
              const label = element("label", "choice");
              const input = element("input");
              input.type = "radio";
              input.name = name;
              input.value = item.value;
              input.checked = String(item.value) === String(value);
              const body = element("span", "choice-body");
              const mark = element("span", "choice-mark");
              mark.setAttribute("aria-hidden", "true");
              const text = element("span", "choice-text");
              text.append(element("span", "choice-title", item.label));
              if (item.hint) {
                const hint = element("span", "choice-hint", item.hint);
                hint.id = `${name}-${serial}-${g}-${i}-hint`;
                input.setAttribute("aria-describedby", hint.id);
                text.append(hint);
              }
              body.append(mark, text);
              label.append(input, body);
              grid.append(label);
            });
            if (!group.label) return grid;
            const set = element("fieldset", "choice-fieldset");
            set.append(element("legend", "choice-legend", group.label), grid);
            return set;
          });
          if (!this.hasAttribute("fold")) {
            this.replaceChildren(...sections);
            return;
          }
          const details = element("details", "choice-fold");
          const summary = element("summary", "choice-summary");
          const label = element("span", "choice-summary-label", this.getAttribute("summary-label") || "");
          const current = element("strong", "choice-summary-value");
          const action = element("span", "choice-summary-action", "Changer");
          summary.append(label, current, action);
          // Tant qu'aucun choix n'est fait, la liste reste ouverte : l'en-tête n'est pas un bouton.
          summary.addEventListener("click", (event) => {
            if (!this.querySelector("input:checked")) event.preventDefault();
          });
          const body = element("div", "choice-fold-body");
          body.append(...sections);
          details.append(summary, body);
          this.replaceChildren(details);
          this.#sync(true);
        }
        #sync(close) {
          const details = this.querySelector(":scope > .choice-fold");
          if (!details) return;
          const checked = this.querySelector("input:checked");
          const text = checked ? checked.closest(".choice").querySelector(".choice-title").textContent : this.getAttribute("placeholder") || "";
          details.querySelector(".choice-summary-value").textContent = text;
          details.classList.toggle("is-empty", !checked);
          if (!checked) details.open = true;
          else if (close) {
            const hadFocus = this.hasFocus;
            details.open = false;
            if (hadFocus) details.querySelector("summary").focus();
          }
        }
        get value() {
          return this.querySelector("input:checked")?.value ?? "";
        }
        set value(next) {
          const inputs = [...this.querySelectorAll("input")];
          const target = inputs.find((input) => input.value === String(next));
          inputs.forEach((input) => (input.checked = input === target));
          this.#sync(true);
        }
        focus(options) {
          const details = this.querySelector(":scope > .choice-fold");
          if (details && !details.open) return details.querySelector("summary").focus(options);
          (this.querySelector("input:checked") || this.querySelector("input"))?.focus(options);
        }
        get hasFocus() {
          return this.contains(document.activeElement);
        }
      }
      customElements.define("choice-group", ChoiceGroup);
