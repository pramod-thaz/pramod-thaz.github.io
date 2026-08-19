/* =========================================================================
 * paywall.js — Gumroad client-side gate for the CFA Level 3 Notes book.
 *
 * Injected into every generated page by scripts/inject_paywall.py and
 * loaded synchronously before the closing </body> tag.
 *
 * Rules (per page):
 *   - No marker                         -> whole page is gated
 *   - <!-- PAYWALL --> or
 *     <!-- PAYWALL product=KEY -->      -> content ABOVE the marker is free,
 *                                         content BELOW is gated
 *     at the END of the file            -> nothing after marker => file is
 *                                         free (no gate box shown)
 *   - index.html / introduction.html /
 *     license.html / 404.html           -> always free, never gated
 *
 * Unlock flow: POST licence to Gumroad's public verify endpoint
 * (product_id + license_key, increment_uses_count=false so the seller's
 * per-license "uses" counter is not inflated). On success the unlock is
 * persisted to localStorage and later visits reveal content instantly
 * without re-verifying.
 *
 * NOTE: this is client-side only — it is friction-level protection, not
 * DRM. View-source / disabled-JS bypass it. That is accepted for this
 * static-hosted (GitHub Pages) site.
 * ========================================================================= */
(function () {
  "use strict";

  /* ---- config ---------------------------------------------------------- */
  var PRODUCTS = {
    pmpack: {
      name: "2026 CFA Level 3 | Complete Notes",
      permalink: "cfal3prep",                       // gumroad slug (purchase URL)
      buyURL: "https://domarp.gumroad.com/l/cfal3prep",
      product_id: "QSypDt2Z2O2g18tDvTjDyA==",        // from Gumroad Content > License key block
      price: "$29"
    }
    /* add future packs here, e.g.
    , cfal2: { name: "...", permalink: "...", buyURL: "...", product_id: "...", price: "..." }
    */
  };
  var DEFAULT_PRODUCT = "pmpack";
  var STORAGE_PREFIX = "cfa3.paywall.";
  var FREE_PAGES = ["index.html", "introduction.html", "license.html", "404.html"];
  var VERIFY_URL = "https://api.gumroad.com/v2/licenses/verify";

  /* ---- helpers --------------------------------------------------------- */
  function productFrom(commentText) {
    var m = /\bproduct\s*=\s*"?([a-zA-Z0-9_-]+)"?/.exec(commentText || "" || "");
    var key = m ? m[1] : DEFAULT_PRODUCT;
    return PRODUCTS[key] ? key : DEFAULT_PRODUCT;
  }

  function findMarkers(root) {
    var out = [];
    var w = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT, {
      acceptNode: function (n) {
        return /PAYWALL/.test(n.nodeValue || "")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });
    var n;
    while ((n = w.nextNode())) out.push(n);
    return out;
  }

  // Every element inside `main` that appears AFTER `marker` in doc order.
  // Constrained to the content container so page-level tags (e.g. the injected
  // <script> just before </body>) are never counted as gated content.
  function elementsAfter(marker) {
    var out = [];
    var root = document.querySelector("main") || document.body;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
    var seen = false;
    var n;
    while ((n = w.nextNode())) {
      if (!seen) {
        if (n.nodeType === 8 && n === marker) seen = true;
      } else if (n.nodeType === 1) {
        out.push(n);
      }
    }
    return out;
  }

  function allElements(root) {
    var out = [];
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    var n;
    while ((n = w.nextNode())) out.push(n);
    return out;
  }

  function load(key) {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_PREFIX + key) || "null");
    } catch (e) {
      return null;
    }
  }

  function save(key, val) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
    } catch (e) {}
  }

  /* ---- page setup ------------------------------------------------------ */
  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (FREE_PAGES.indexOf(page) !== -1) return;

  var main = document.querySelector("main") || document.body;
  var markers = findMarkers(main);

  var productKey = markers.length ? productFrom(markers[0].nodeValue) : DEFAULT_PRODUCT;
  var product = PRODUCTS[productKey] || PRODUCTS[DEFAULT_PRODUCT];

  var gated = markers.length ? elementsAfter(markers[0]) : allElements(main);

  // Marker at the end of the file => free page, show everything, no gate box.
  if (markers.length && gated.length === 0) return;

  /* ---- lock / reveal ---------------------------------------------------- */
  var gateBox = null;

  function buildGate() {
    var box = document.createElement("div");
    box.setAttribute("data-cfa3-gate", "1");
    box.style.cssText =
      "max-width:560px;margin:2.5rem auto;padding:1.75rem 1.5rem;text-align:center;" +
      "border:1px solid rgba(120,130,150,.35);border-radius:12px;" +
      "background:rgba(120,130,150,.08);font-family:inherit;color:inherit;";

    var hl = document.createElement("p");
    hl.style.cssText = "margin:0 0 .35rem;font-weight:600;font-size:1.05rem;";
    hl.textContent = "This section is part of the paid notes.";
    box.appendChild(hl);

    var sub = document.createElement("p");
    sub.style.cssText = "margin:0 0 .5rem;opacity:.85;font-size:.9rem;";
    sub.textContent = product.name + " \u2014 " + product.price;
    box.appendChild(sub);

    var buy = document.createElement("a");
    buy.href = product.buyURL;
    buy.target = "_blank";
    buy.rel = "noopener";
    buy.textContent = "Buy on Gumroad";
    buy.style.cssText =
      "display:inline-block;margin:.5rem 0 .9rem;padding:.55rem 1.1rem;border-radius:8px;" +
      "background:#2563eb;color:#fff;text-decoration:none;font-weight:600;font-size:.92rem;";
    box.appendChild(buy);

    var or = document.createElement("p");
    or.style.cssText = "margin:0 0 .4rem;font-size:.8rem;opacity:.7;";
    or.textContent = "Already bought it? Enter your license key:";
    box.appendChild(or);

    var keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.placeholder = "XXXX-XXXX-XXXX-XXXX";
    keyInput.autocomplete = "off";
    keyInput.spellcheck = false;
    keyInput.style.cssText =
      "width:100%;box-sizing:border-box;padding:.55rem .7rem;border-radius:8px;" +
      "border:1px solid rgba(120,130,150,.45);background:transparent;color:inherit;font:inherit;font-size:.9rem;";
    box.appendChild(keyInput);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Unlock";
    btn.style.cssText =
      "display:block;width:100%;margin-top:.55rem;padding:.55rem;border:0;border-radius:8px;" +
      "background:rgba(120,130,150,.22);color:inherit;font:inherit;font-weight:600;font-size:.92rem;cursor:pointer;";
    box.appendChild(btn);

    var msg = document.createElement("p");
    msg.style.cssText = "margin:.55rem 0 0;font-size:.8rem;min-height:1em;color:inherit;opacity:.85;";
    box.appendChild(msg);

    var note = document.createElement("p");
    note.style.cssText = "margin:.7rem 0 0;font-size:.72rem;opacity:.6;";
    note.textContent =
      "Your key is in the receipt email from your purchase, your Gumroad download page, " +
      "or the \u201cAlready bought this?\u201d link on the product page.";
    box.appendChild(note);

    return { box: box, input: keyInput, msg: msg, btn: btn };
  }

  function lock() {
    gated.forEach(function (el) {
      el.style.display = "none";
      el.setAttribute("data-cfa3-hidden", "1");
    });
    var ui = buildGate();
    gateBox = ui.box;
    var ref = gated.length ? gated[0] : main.firstChild;
    main.insertBefore(ui.box, ref);

    ui.btn.addEventListener("click", function () {
      unlock(ui);
    });
    ui.input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") unlock(ui);
    });
    ui.input.focus();
  }

  function reveal(clear) {
    if (gateBox && gateBox.parentNode) gateBox.parentNode.removeChild(gateBox);
    gated.forEach(function (el) {
      el.style.display = "";
      el.removeAttribute("data-cfa3-hidden");
    });
    if (clear) {
      try { localStorage.removeItem(STORAGE_PREFIX + productKey); } catch (e) {}
    }
  }

  function unlock(ui) {
    var key = (ui.input.value || "").trim();
    if (!key) {
      ui.msg.textContent = "Enter your license key, then press Unlock.";
      return;
    }
    ui.btn.disabled = true;
    ui.msg.textContent = "Verifying\u2026";
    fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: new URLSearchParams({
        product_id: product.product_id,
        license_key: key,
        increment_uses_count: "false"
      }).toString()
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        ui.btn.disabled = false;
        if (data && data.success && data.purchase) {
          if (data.purchase.refunded || data.purchase.chargebacked) {
            ui.msg.textContent = "This license was refunded or charged back.";
            return;
          }
          save(productKey, { key: key, at: Date.now(), verified: true });
          ui.msg.textContent = "Unlocked \u2014 enjoy the notes!";
          window.setTimeout(function () { reveal(); }, 250);
        } else {
          ui.msg.textContent =
            "That key doesn't match this product. Check the purchase receipt email, " +
            "or use the \u201cAlready bought this?\u201d link on the product page.";
        }
      })
      .catch(function () {
        ui.btn.disabled = false;
        ui.msg.textContent = "Couldn't reach Gumroad \u2014 check your connection and retry.";
      });
  }

  /* ---- boot ------------------------------------------------------------ */
  var stored = load(productKey);
  if (stored && stored.verified) {
    reveal();
  } else {
    lock();
  }
})();