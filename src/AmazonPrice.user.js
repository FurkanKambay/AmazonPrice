// ==UserScript==
// @name          AmazonPrice
// @description   Converts Amazon item prices to your local currency.
// @icon          https://raw.githubusercontent.com/FurkanKambay/AmazonPrice/master/src/icon.png
// @version       0.1.0
// @include       *://*.amazon.*/*p/*
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_xmlhttpRequest
// ==/UserScript==
// @ts-check
/// <reference path="greasemonkey.d.ts" />

var currencyRate;
const priceRegex = /\d{0,3}([,\.])?(?:\d{3})?[,\.]\d{2}/;
const ext = window.location.host.match(/amazon\.(.+)/)[1];

(function () {
    'use strict';
    console.log("AmazonPrice started.");

    if (!navigator.onLine) {
        console.error("There is no internet connection! Cannot continue.");
        return;
    }
    if (!document.querySelector("#price")) {
        console.error("There is no price information! Cannot continue.");
        return;
    }
    const siteCurr = {
        "com.au": "AUD", // See issue #2 "Book prices"
        "com.br": "BRL", // ddmDeliveryMessage
        "ca": "CAD", // fast-track-message
        "cn": "CNY", // 
        "fr": "EUR", // ddmDeliveryMessage
        "de": "EUR", // ddmDeliveryMessage
        "in": "INR", // no price 
        "it": "EUR", // ddmDeliveryMessage
        "jp": "JPY", // 
        "com.mx": "MXN", // fast-track-message: Este artículo no se envía a
        "nl": "EUR", // See issue #2 "Book prices"
        "es": "EUR", // ddmDeliveryMessage
        "co.uk": "GBP", // ddmDeliveryMessage
        "com": "USD" // fast-track-message: This item does not ship to
    }[ext];

    console.log("Getting the currency rate.");
    GM_xmlhttpRequest({
        method: "GET",
        url: "https://api.fixer.io/latest?base=" + siteCurr,
        onload: function (response) {
            let rates = JSON.parse(response.responseText).rates;
            let localCurr = GM_getValue("currency");
            while (!localCurr || !rates.hasOwnProperty(localCurr))
                localCurr = prompt("Please enter your local currency code (e.g. EUR):");
            GM_setValue("currency", localCurr);
            currencyRate = rates[localCurr];
            writeFinalPrice();
        }
    });
})();

function writeFinalPrice() {
    'use strict';
    let theOne = document.querySelector("#priceblock_ourprice") ||
        document.querySelector("#priceblock_dealprice") ||
        document.querySelector("#priceblock_saleprice");
    let priceText = theOne.textContent.match(priceRegex);
    let price = parseFloat(priceText[0].replace(priceText[1], '').replace(',', '.'));
    let shippingPrice = 0;
    let priceMessage = "Local Price:";

    if (ext === "com") {
        document.querySelector("#priceblock_ourprice");
        var shippingText = document.getElementById(theOne.id.substr(11).concat("_shippingmessage")).textContent;
        if (shippingText) {
            shippingPrice = parseFloat(shippingText.match(priceRegex)[0]);
            priceMessage = "Final Price:";
        }
    }

    let totalRow = document.querySelector('#price tbody').appendChild(document.createElement("tr"));

    let desc = totalRow.insertCell(),
        val = totalRow.insertCell();
    desc.className = "a-color-secondary a-size-large a-text-right a-nowrap";
    val.className = "a-span12 a-color-price a-size-large";
    desc.textContent = priceMessage;
    console.log(currencyRate);
    console.log(price);
    console.log(shippingPrice);
    val.textContent = (currencyRate * (price + shippingPrice)).toFixed(2) + " ₺";

    let delivery = document.querySelector("#fast-track-message") || document.querySelector("#ddmDeliveryMessage");

    let canDeliver = // exceptions in colo-error rule, then common pattern
        ext === 'co.uk' && delivery.textContent.includes('can be') ||
        ext === 'com.mx' && !delivery.textContent.includes('no se envía') ||
        !delivery.querySelector("span.a-color-error");

    if (!canDeliver)
        val.classList.add("a-text-strike");
}