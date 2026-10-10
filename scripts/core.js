      // Noyau maison, sans dépendance. Deux outils :
      //  1. un gabarit qui échappe par défaut : html`<p>${texte}</p>` ; raw() marque un fragment de confiance ;
      //  2. un état réactif : un effet lit l'état, et se rejoue tout seul quand ce qu'il a lu change.
      // L'idée : un écran est une fonction de l'état. On change l'état ; l'écran suit, sans appel de rendu à la main.
      // Rien ici ne touche au DOM : ces fonctions se testent dans Node (tests/unit.spec.cjs).

      // ---- Gabarit qui échappe par défaut
      const esc = (value) =>
        String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
      class RawHtml {
        constructor(text) {
          this.text = text;
        }
        toString() {
          return this.text;
        }
      }
      const raw = (text) => new RawHtml(String(text ?? ""));
      const fragment = (value) =>
        value instanceof RawHtml ? value.text : Array.isArray(value) ? value.map(fragment).join("") : value === null || value === undefined || value === false ? "" : esc(value);
      const html = (strings, ...values) => new RawHtml(strings.reduce((out, chunk, i) => out + chunk + (i < values.length ? fragment(values[i]) : ""), ""));

      // ---- État réactif (objets simples et tableaux, en profondeur)
      const ITERATE = Symbol("iterate");
      const subscriptions = new WeakMap(); // objet brut -> Map(clé -> Set(effets))
      const proxyOf = new WeakMap(); // objet brut -> son proxy
      const rawOf = new WeakMap(); // proxy -> objet brut
      let activeEffect = null;
      let batchDepth = 0;
      let effectCount = 0;
      const queued = new Set();

      // Objet simple : prototype nul, ou prototype dont le prototype est nul (vrai aussi pour un objet venu d'une autre fenêtre ou d'un autre contexte).
      const isPlain = (value) => {
        if (value === null || typeof value !== "object") return false;
        if (Array.isArray(value)) return true;
        const proto = Object.getPrototypeOf(value);
        return proto === null || Object.getPrototypeOf(proto) === null;
      };

      function track(target, key) {
        if (!activeEffect) return;
        let keys = subscriptions.get(target);
        if (!keys) subscriptions.set(target, (keys = new Map()));
        let effects = keys.get(key);
        if (!effects) keys.set(key, (effects = new Set()));
        effects.add(activeEffect);
        activeEffect.sources.add(effects);
      }
      function trigger(target, keys) {
        const map = subscriptions.get(target);
        if (!map) return;
        const affected = new Set();
        for (const key of keys) (map.get(key) || []).forEach((effect) => affected.add(effect));
        // Ordre de création : un écran déduit d'un autre se rejoue après lui.
        [...affected].sort((a, b) => a.id - b.id).forEach(schedule);
      }
      function schedule(effect) {
        if (effect === activeEffect || effect.stopped) return; // un effet qui écrit ce qu'il lit ne se rappelle pas lui-même
        if (effect.onChange) effect.onChange();
        else if (batchDepth > 0) queued.add(effect);
        else rerun(effect);
      }
      function rerun(effect) {
        try {
          effect.run();
        } catch (error) {
          // L'écriture qui a déclenché l'effet doit se terminer ; l'erreur, elle, reste visible.
          queueMicrotask(() => {
            throw error;
          });
        }
      }
      function flush() {
        while (queued.size) {
          const waiting = [...queued].sort((a, b) => a.id - b.id);
          queued.clear();
          waiting.forEach((effect) => !effect.stopped && rerun(effect));
        }
      }

      function reactive(target) {
        if (!isPlain(target) || rawOf.has(target)) return target;
        const known = proxyOf.get(target);
        if (known) return known;
        const proxy = new Proxy(target, {
          get(object, key, receiver) {
            const value = Reflect.get(object, key, receiver);
            if (typeof key === "symbol") return value;
            track(object, key);
            return isPlain(value) ? reactive(value) : value;
          },
          has(object, key) {
            track(object, key);
            return Reflect.has(object, key);
          },
          ownKeys(object) {
            track(object, ITERATE);
            return Reflect.ownKeys(object);
          },
          set(object, key, value) {
            const stored = rawOf.get(value) || value; // jamais de proxy rangé dans l'objet brut
            const existed = Object.hasOwn(object, key);
            const previous = object[key];
            const previousLength = Array.isArray(object) ? object.length : 0;
            Reflect.set(object, key, stored);
            if (!existed) {
              trigger(object, Array.isArray(object) ? [key, "length", ITERATE] : [key, ITERATE]);
            } else if (!Object.is(previous, stored)) {
              const keys = [key];
              if (Array.isArray(object) && key === "length") {
                // Un tableau raccourci : les cases supprimées changent aussi.
                for (const tracked of subscriptions.get(object)?.keys() || []) if (/^\d+$/.test(String(tracked)) && Number(tracked) >= stored && Number(tracked) < previousLength) keys.push(tracked);
              }
              trigger(object, keys);
            }
            return true;
          },
          deleteProperty(object, key) {
            const existed = Object.hasOwn(object, key);
            const done = Reflect.deleteProperty(object, key);
            if (existed) trigger(object, [key, ITERATE]);
            return done;
          },
        });
        proxyOf.set(target, proxy);
        rawOf.set(proxy, target);
        return proxy;
      }

      // Exécute fn, la rejoue quand ce qu'elle a lu change. Renvoie une fonction qui l'arrête.
      // Piège : un effet ne suit que ce qu'il LIT. Lire l'état avant de tester le DOM, pas après : un effet qui sort sans avoir rien lu
      // (« l'élément n'existe pas encore ») ne se rejouera jamais.
      function effect(fn) {
        const running = { id: ++effectCount, sources: new Set(), stopped: false, onChange: null };
        running.run = () => {
          running.sources.forEach((set) => set.delete(running));
          running.sources.clear();
          const previous = activeEffect;
          activeEffect = running;
          try {
            return fn();
          } finally {
            activeEffect = previous;
          }
        };
        running.run();
        return () => {
          running.stopped = true;
          running.sources.forEach((set) => set.delete(running));
          running.sources.clear();
        };
      }
      // Valeur dérivée : calculée à la demande, gardée tant que ce qu'elle lit ne change pas.
      function computed(getter) {
        const box = {};
        let value;
        let dirty = true;
        const inner = { id: ++effectCount, sources: new Set(), stopped: false };
        inner.run = () => {
          inner.sources.forEach((set) => set.delete(inner));
          inner.sources.clear();
          const previous = activeEffect;
          activeEffect = inner;
          try {
            return getter();
          } finally {
            activeEffect = previous;
          }
        };
        inner.onChange = () => {
          if (!dirty) {
            dirty = true;
            trigger(box, ["value"]);
          }
        };
        return {
          get value() {
            track(box, "value");
            if (dirty) {
              value = inner.run();
              dirty = false;
            }
            return value;
          },
        };
      }
      // Regroupe des écritures : les effets concernés ne se rejouent qu'une fois, à la fin.
      function batch(fn) {
        batchDepth++;
        try {
          return fn();
        } finally {
          batchDepth--;
          if (batchDepth === 0) flush();
        }
      }
      // Lit sans s'abonner : pour un effet qui ne doit pas se rejouer à cause de cette lecture.
      function untracked(fn) {
        const previous = activeEffect;
        activeEffect = null;
        try {
          return fn();
        } finally {
          activeEffect = previous;
        }
      }
