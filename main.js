/* ==========================================================================
   WMLab · home · comportamiento
   1. Menú en celular
   2. Selector de WhatsApp (S1)
   3. Enlaces de WhatsApp (W1, W2, W3) y aviso M6
   4. Calculadora
   5. Imágenes: usa el archivo si existe; si no, dibuja la textura de puntos
   ========================================================================== */
(function () {
  "use strict";

  var WA_NUMBER = "573003651080";
  var MSG = {
    w1: "Hola, Santiago. Vengo de tu sitio. Hay una tarea que me gustaría resolver: ",
    w2: "Hola, Santiago. Vengo de tu sitio. Sé que la IA puede servirme, pero no sé cómo aplicarla en mi negocio.\nMe dedico a: "
  };
  function waUrl(text) { return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(text); }

  /* ---------- 1. Menú en celular ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var list = document.getElementById("nav-list");
  if (toggle && list) {
    toggle.addEventListener("click", function () {
      var open = list.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    list.addEventListener("click", function (e) {
      if (e.target.closest("a")) { list.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); }
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".nav")) { list.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---------- 2. Selector (S1) ---------- */
  var sheet = document.getElementById("selector");
  var opener = null;
  function closeSheet() { if (sheet.open) sheet.close(); }
  document.querySelectorAll("[data-open-selector]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      opener = btn;
      if (typeof sheet.showModal === "function") sheet.showModal();
      else location.href = waUrl(MSG.w1);
    });
  });
  sheet.addEventListener("close", function () { if (opener) opener.focus(); });
  sheet.querySelector("[data-close-selector]").addEventListener("click", closeSheet);
  // Tocar fuera del panel
  sheet.addEventListener("click", function (e) {
    var r = sheet.getBoundingClientRect();
    var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) closeSheet();
  });
  // Deslizar hacia abajo en el celular
  var startY = null;
  sheet.addEventListener("touchstart", function (e) { startY = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener("touchmove", function (e) {
    if (startY !== null && e.touches[0].clientY - startY > 70) { startY = null; closeSheet(); }
  }, { passive: true });
  sheet.addEventListener("touchend", function () { startY = null; });

  /* ---------- 3. WhatsApp y aviso M6 ---------- */
  document.querySelectorAll('[data-wa="w1"]').forEach(function (a) { a.href = waUrl(MSG.w1); });
  document.querySelectorAll('[data-wa="w2"]').forEach(function (a) { a.href = waUrl(MSG.w2); });

  var toast = document.getElementById("toast");
  var toastTimer;
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="https://wa.me/"]');
    if (!a) return;
    closeSheet();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.hidden = false;
      toastTimer = setTimeout(function () { toast.hidden = true; }, 9000);
    }, 1500);
  });

  /* ---------- 4. Calculadora ---------- */
  // Días hábiles reales de un trabajador en Colombia, 2026 (se revisa cada enero):
  // 261 días de lunes a viernes − 19 festivos − 15 de vacaciones = 227 días trabajados.
  var FACTOR = { dia: 227, semana: 45, mes: 11.25 };
  var HOURS_PER_DAY = 8.4; // 42 horas semanales en 5 días
  var FREQ_TXT = { dia: "al día", semana: "a la semana", mes: "al mes" };
  var DEFAULTS = { tarea: "Revisar y responder el correo", tiempo: "40", unidad: "min", veces: "1", frecuencia: "dia" };
  var ERR = {
    tarea: "Escribe la tarea para poder mostrarte el resultado.",
    tiempo: "Escribe cuánto tarda, solo con números. Por ejemplo: 40.",
    veces: "Escribe cuántas veces la haces, solo con números. Por ejemplo: 3.",
    zero: "Usa un número mayor que cero."
  };

  var form = document.getElementById("calc");
  if (form) {
    var el = {
      tarea: document.getElementById("c-tarea"),
      tiempo: document.getElementById("c-tiempo"),
      unidad: document.getElementById("c-unidad"),
      veces: document.getElementById("c-veces"),
      frecuencia: document.getElementById("c-frecuencia"),
      result: document.getElementById("c-result"),
      wa: document.getElementById("c-wa"),
      reset: document.getElementById("c-reset")
    };
    var nf1 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
    var nf0 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

    function parseNum(s) {
      var t = String(s).trim().replace(",", ".");
      if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
      return Number(t);
    }
    function check(name) {
      if (name === "tarea") return el.tarea.value.trim() ? "" : ERR.tarea;
      var n = parseNum(el[name].value);
      if (isNaN(n)) return ERR[name];
      if (n <= 0) return ERR.zero;
      return "";
    }
    function setError(name, msg) {
      var field = form.querySelector('[data-field="' + name + '"]');
      var help = field.querySelector(".help");
      field.classList.toggle("is-error", !!msg);
      el[name].setAttribute("aria-invalid", msg ? "true" : "false");
      help.textContent = msg || help.getAttribute("data-help");
    }
    function escapeHtml(s) {
      return s.replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
    }
    function plural(n, one, many) { return n === 1 ? one : many; }

    function compute() {
      if (check("tarea") || check("tiempo") || check("veces")) return; // conserva el último cálculo válido
      var tarea = el.tarea.value.trim();
      var t = parseNum(el.tiempo.value);
      var v = parseNum(el.veces.value);
      var unit = el.unidad.value;
      var freq = el.frecuencia.value;

      var hoursEach = unit === "min" ? t / 60 : t;
      var hours = hoursEach * v * FACTOR[freq];
      var days = hours / HOURS_PER_DAY;
      var h = Math.round(hours);
      var d = Math.round(days);

      var tiempoTxt = nf1.format(t) + " " + (unit === "min" ? plural(t, "minuto", "minutos") : plural(t, "hora", "horas"));
      var vecesTxt = nf1.format(v) + " " + FREQ_TXT[freq];
      var horasTxt = h < 1 ? "menos de 1 hora al año" : nf0.format(h) + " " + plural(h, "hora", "horas") + " al año";
      var diasTxt = days < 0.5 ? "Menos de un día de trabajo." : (d === 1 ? "Cerca de un día de trabajo." : "Unos " + nf0.format(d) + " días de trabajo.");

      el.result.innerHTML = escapeHtml(tarea) + ": " + tiempoTxt + " por vez, " + vecesTxt + ", son <strong>" + horasTxt + "</strong>. " + diasTxt;

      var tareaLow = tarea.charAt(0).toLowerCase() + tarea.slice(1);
      var w3 = "Hola, Santiago. Hice la cuenta en tu calculadora: " + tareaLow + " me toma " + horasTxt + ".\nLo que más me pesa de esto es: ";
      el.wa.href = waUrl(w3);
    }

    ["tarea", "tiempo", "veces"].forEach(function (name) {
      el[name].addEventListener("input", function () {
        if (el[name].getAttribute("aria-invalid") === "true" && !check(name)) setError(name, "");
        compute();
      });
      el[name].addEventListener("blur", function () { setError(name, check(name)); });
    });
    el.unidad.addEventListener("change", compute);
    el.frecuencia.addEventListener("change", compute);
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    el.reset.addEventListener("click", function () {
      Object.keys(DEFAULTS).forEach(function (k) { el[k].value = DEFAULTS[k]; });
      ["tarea", "tiempo", "veces"].forEach(function (n) { setError(n, ""); });
      compute();
    });
    compute();
  }

  /* ---------- 5. Imágenes y textura de puntos ---------- */
  var NS = "http://www.w3.org/2000/svg";
  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function clamp(v) { return Math.max(0, Math.min(1, v)); }

  // Cada modo devuelve la "masa" (0 a 1) en un punto; el tamaño del punto sale de ahí.
  var MASS = {
    hero: function (x, y) {        // cordilleras que entran desde la derecha
      var far = 0.40 - 0.14 * Math.sin(x * 3.0 + 0.6) - 0.05 * Math.sin(x * 9.0 + 1.0);
      var near = 0.64 - 0.12 * Math.sin(x * 4.2 + 2.4) - 0.04 * Math.cos(x * 13.0);
      var m = 0;
      if (y > far) m = 0.25 + 0.30 * clamp((y - far) * 3);
      if (y > near) m = 0.55 + 0.45 * clamp((y - near) * 5);
      return clamp(m * clamp((x - 0.04) * 1.7));
    },
    "frame-l": function (x, y) {   // masa orgánica pegada al borde izquierdo
      var edge = 0.62 + 0.18 * Math.sin(y * 5.2 + 0.4) + 0.08 * Math.sin(y * 13.0);
      return clamp((edge - x) * 2.4);
    },
    "frame-r": function (x, y) {   // espejo, con otro ritmo
      var edge = 0.62 + 0.16 * Math.sin(y * 4.4 + 2.2) + 0.09 * Math.cos(y * 11.0);
      return clamp((x - (1 - edge)) * 2.4);
    },
    portrait: function (x, y) {    // silueta abstracta mientras llega la foto
      var head = 1 - Math.hypot((x - 0.5) / 0.20, (y - 0.36) / 0.17);
      var body = y > 0.58 ? 1 - Math.abs(x - 0.5) / (0.18 + (y - 0.58) * 0.9) : 0;
      return clamp(Math.max(head, body) * 1.6) * 0.85 + 0.06;
    }
  };

  function drawDots(box) {
    var mode = box.getAttribute("data-halftone");
    var fn = MASS[mode];
    var w = box.clientWidth, h = box.clientHeight;
    if (!fn || !w || !h) return;
    var dark = mode.indexOf("frame") === 0;
    var cell = parseFloat(css("--dot-cell")) || 9;
    var ink = dark ? css("--color-block-muted") : css("--color-texture");
    var accent = css("--color-texture-accent");
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    var pInk = "", pAcc = "";
    var acx = w * 0.74, acy = h * 0.56, ar = Math.min(w, h) * 0.13;
    for (var y = 0, row = 0; y <= h + cell; y += cell * 0.866, row++) {
      for (var x = (row % 2) * cell / 2; x <= w + cell; x += cell) {
        var r = cell * 0.52 * Math.pow(fn(x / w, y / h), 0.85);
        if (r < 0.45) continue;
        var c = "M" + (x - r).toFixed(1) + " " + y.toFixed(1) + "a" + r.toFixed(2) + " " + r.toFixed(2) + " 0 1 0 " + (2 * r).toFixed(2) + " 0a" + r.toFixed(2) + " " + r.toFixed(2) + " 0 1 0 " + (-2 * r).toFixed(2) + " 0";
        var dx = x - acx, dy = y - acy;
        if (mode === "hero" && dx * dx + dy * dy < ar * ar) pAcc += c; else pInk += c;
      }
    }
    [[pInk, ink], [pAcc, accent]].forEach(function (p) {
      if (!p[0]) return;
      var path = document.createElementNS(NS, "path");
      path.setAttribute("d", p[0]); path.setAttribute("fill", p[1]);
      svg.appendChild(path);
    });
    box.replaceChildren(svg);
  }

  var boxes = Array.prototype.slice.call(document.querySelectorAll("[data-halftone]"));
  var useDots = [];
  boxes.forEach(function (box) {
    var src = box.getAttribute("data-src");
    if (!src) { useDots.push(box); return; }
    var img = new Image();
    img.onload = function () {
      img.alt = box.getAttribute("data-alt") || "";
      img.decoding = "async";
      box.replaceChildren(img);
      box.removeAttribute("data-halftone");
      // Si el llamado final tiene imagen, el marco derecho sobra
      if (box.classList.contains("closing-art-l")) {
        box.style.width = "100%";
        var right = document.querySelector(".closing-art-r");
        if (right) right.remove();
      }
    };
    img.onerror = function () { drawDots(box); useDots.push(box); };
    img.src = src;
  });
  function redraw() { useDots.forEach(function (b) { if (b.isConnected && b.hasAttribute("data-halftone")) drawDots(b); }); }
  redraw();
  var rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(redraw, 150); });
})();
