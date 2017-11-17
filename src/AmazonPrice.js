/// <reference path="@types-chrome/index.d.ts" />
console.log("AmazonPrice started.");
if (select("#price")) {
    var ext = window.location.hostname.substr(11);
    var currency = ext === 'com' ? 'USD' : ext === 'co.uk' ? 'GBP' : 'EUR';
    var priceRegex = /\d{1,5}\.\d{2}/;
    var currencyRate;

    if (navigator.onLine) {
        console.log("Getting currency rate.");
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                currencyRate = JSON.parse(xhr.responseText).rates.TRY;
                writeFinalPrice();
            }
        };

        xhr.open('GET', "https://api.fixer.io/latest?symbols=TRY&base=" + currency, async = true);
        xhr.send();
    } else console.error("No internet connection! Cannot continue.");
}

function writeFinalPrice() {
    var theOne = select("#priceblock_ourprice") || select("#priceblock_dealprice") || select("#priceblock_saleprice");
    var price = parseFloat(theOne.innerText.replace(',', '.').match(priceRegex)[0]);
    var shippingPrice = 0;
    var priceMessage = "TL Price:";

    if (ext === "com") {
        var shippingText = document.getElementById(theOne.id.replace("priceblock_", '') + "_shippingmessage").innerText;
        if (shippingText) {
            shippingPrice = parseFloat(shippingText.match(priceRegex)[0]);
            priceMessage = "Final Price:";
        }
    }

    var totalRow = select('#price tbody').appendChild(document.createElement("tr"));

    var desc = totalRow.insertCell();
    desc.className = "a-color-secondary a-size-large a-text-right a-nowrap";
    desc.textContent = priceMessage;

    var val = totalRow.insertCell();
    val.className = "a-span12 a-color-price a-size-large";
    val.textContent = (currencyRate * (price + shippingPrice)).toFixed(2) + " TL";

    var deliveryMsg = (select("#fast-track-message") || select("#ddmDeliveryMessage")).innerText;

    var canDeliver =
        ext === 'com' && deliveryMsg.includes('ships') ||
        deliveryMsg.endsWith('Details') ||
        deliveryMsg.endsWith('Ayrıntılar') ||
        deliveryMsg.endsWith('Ver detalles') ||
        deliveryMsg.endsWith('Dettagli');

    if (!canDeliver)
        val.classList.add("a-text-strike");
}

function select(selectors) {
    return document.querySelector(selectors);
}

function selectAll(selectors) {
    return document.querySelectorAll(selectors);
}