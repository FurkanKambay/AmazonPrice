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
"use strict";

GM_log("AmazonPrice started.");
if (document.getElementById("price")) {
    var $ = id => document.getElementById(id),
        rates,
        toCurr,
        priceRegex = /\d{0,3}([,\.])?(?:\d{3})?[,\.]\d{2}/,
        ext = window.location.host.match(/amazon\.(.+)/)[1],
        extCurrencies = {
            "com": "USD",
            "com.au": "AUD", // See issue #2 "Book prices"
            "com.br": "BRL",
            "com.mx": "MXN",
            "co.uk": "GBP",
            "ca": "CAD",
            "es": "EUR",
            "it": "EUR",
            "fr": "EUR",
            "de": "EUR",
            "nl": "EUR", // See issue #2 "Book prices"
            "in": "INR", // no price
            "jp": "JPY",
            "cn": "CNY"
        }[ext];
    sendXHR();
} else GM_log("There is no price information! Cannot continue.");

function sendXHR() {
    GM_log("Getting the currency rates.");
    GM_xmlhttpRequest({
        method: "GET",
        url: "https://api.fixer.io/latest?base=" + extCurrencies,
        onload: response => {
            rates = JSON.parse(response.responseText).rates;
            rates[extCurrencies] = 1;
            getCurrency();
            determinePrice();
        },
        onerror: err => GM_log(err.responseText)
    });
}

function getCurrency() {
    if (!(toCurr = GM_getValue("currency"))) {
        while (!rates.hasOwnProperty(toCurr))
            toCurr = prompt("Please enter your local currency code (e.g. EUR):").toUpperCase();
        GM_setValue("currency", toCurr);
    }
}

function determinePrice() {
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

    appendPrice(priceMessage, price + shippingPrice);
}

function appendPrice(priceDesc, priceVal) {
    let totalRow = document.querySelector("#price tbody").appendChild(document.createElement("tr")),
        desc = totalRow.insertCell(),
        val = totalRow.insertCell();

    desc.className = "a-color-secondary a-size-large a-text-right a-nowrap";
    desc.textContent = priceDesc;

    val.className = "a-span12 a-color-price a-size-large";
    val.textContent = (rates[toCurr] * priceVal).toFixed(2).concat(" ");
    let currSymbol = val.appendChild(document.createElement("span"));

    currSymbol.style.textDecoration = "underline dotted";
    currSymbol.title = "Change currency";
    currSymbol.onclick = e => resetCurrency(totalRow);
    currSymbol.textContent = toCurr;

    let delivery = $("ddmDeliveryMessage") || $("fast-track-message");
    if (ext == "com" ? delivery.textContent.includes("does not") :
        ext == "com.mx" ? delivery.textContent.includes("no se envía") :
        delivery.querySelector("span.a-color-error"))
        val.classList.add("a-text-strike");
}

function resetCurrency(priceRow) {
    GM_setValue("currency", null);
    getCurrency();
    priceRow.remove();
    determinePrice();
}
