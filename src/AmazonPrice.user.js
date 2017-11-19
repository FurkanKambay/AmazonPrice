// ==UserScript==
// @name          AmazonPrice
// @namespace     https://github.com/FurkanKambay/AmazonPrice
// @version       0.4.0
// @description   Converts Amazon item prices to your local currency.
// @copyright     2017, FurkanKambay (https://github.com/FurkanKambay)
// @license       MIT; https://github.com/FurkanKambay/AmazonPrice/blob/master/LICENSE
// @icon          https://raw.githubusercontent.com/FurkanKambay/AmazonPrice/master/src/icon.png
// @homepageURL   https://github.com/FurkanKambay/AmazonPrice
// @supportURL    https://github.com/FurkanKambay/AmazonPrice/issues
// @include       *://*.amazon.*/*p/*
// @grant         GM_xmlhttpRequest
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_log
// ==/UserScript==

// @ts-check
/// <reference path="greasemonkey.d.ts" />

const $ = id => document.getElementById(id);

var rates;
var toCurr;
const priceRegex = /\d{0,3}([,\.])?(?:\d{3})?[,\.]\d{2}/;
const ext = window.location.host.match(/amazon\.(.+)/)[1];

(function () {
    'use strict';
    GM_log("AmazonPrice started.");

    if (!navigator.onLine) {
        GM_log("There is no internet connection! Cannot continue.");
        return;
    }
    if (!document.getElementById("price")) {
        GM_log("There is no price information! Cannot continue.");
        return;
    }

    const siteCurr = {
        "com.au": "AUD", // See issue #2 "Book prices"
        "com.br": "BRL",
        "ca": "CAD",
        "cn": "CNY",
        "fr": "EUR",
        "de": "EUR",
        "in": "INR", // no price
        "it": "EUR",
        "jp": "JPY",
        "com.mx": "MXN",
        "nl": "EUR", // See issue #2 "Book prices"
        "es": "EUR",
        "co.uk": "GBP",
        "com": "USD"
    }[ext];

    GM_log("Getting the currency rate.");
    GM_xmlhttpRequest({
        method: "GET",
        url: "https://api.fixer.io/latest?base=" + siteCurr,
        onload: response => {
            rates = JSON.parse(response.responseText).rates;
            rates[siteCurr] = 1;
            GM_log(rates);
            getCurrency();
            writeFinalPrice();
        }
    });
})();

function writeFinalPrice() {
    'use strict';

    let theOne = $("priceblock_ourprice") || $("priceblock_dealprice") || $("priceblock_saleprice"),
        priceText = theOne.textContent.match(priceRegex),
        price = parseFloat(priceText[0].replace(priceText[1], '').replace(',', '.')),
        shippingPrice = 0,
        priceMessage = "Local Price:";

    if (ext == "com") {
        let shippingText = $(theOne.id.substr(11).concat("_shippingmessage")).textContent.trim();
        if (shippingText) {
            shippingPrice = parseFloat(shippingText.match(priceRegex)[0]);
            priceMessage = "Final Price:";
        }
    }

    let totalRow = document.querySelector("#price tbody").appendChild(document.createElement("tr"));
    let desc = totalRow.insertCell(),
        val = totalRow.insertCell();

    desc.className = "a-color-secondary a-size-large a-text-right a-nowrap";
    desc.textContent = priceMessage;

    val.className = "a-span12 a-color-price a-size-large";
    val.appendChild(document.createTextNode((rates[toCurr] * (price + shippingPrice)).toFixed(2).concat(" ")));
    let currSymbol = val.appendChild(document.createElement("span"));

    currSymbol.setAttribute("style", "text-decoration: underline dotted;");
    currSymbol.onclick = ev => {
        GM_setValue("currency", null);
        getCurrency();
        totalRow.remove();
        writeFinalPrice();
    };
    currSymbol.textContent = toCurr;

    let delivery = $("ddmDeliveryMessage") || $("fast-track-message");
    if (ext == "com" ? delivery.textContent.includes("does not") :
        ext == "com.mx" ? delivery.textContent.includes("no se envía") :
        delivery.querySelector("span.a-color-error"))
        val.classList.add("a-text-strike");
}

function getCurrency() {
    toCurr = GM_getValue("currency");
    if (!toCurr) {
        while (!rates.hasOwnProperty(toCurr))
            toCurr = prompt("Please enter your local currency code (e.g. EUR):").toUpperCase();
        GM_setValue("currency", toCurr);
    }
}