// #region UserScript Metadata
// ==UserScript==
// @name          AmazonPrice
// @namespace     https://github.com/FurkanKambay/AmazonPrice
// @version       0.6
// @description   Converts Amazon item prices to your local currency.
// @author        Furkan Kambay
// @copyright     2017, FurkanKambay (https://github.com/FurkanKambay)
// @license       MIT; https://github.com/FurkanKambay/AmazonPrice/blob/master/LICENSE
// @icon          https://raw.githubusercontent.com/FurkanKambay/AmazonPrice/master/src/icon.png
// @homepageURL   https://github.com/FurkanKambay/AmazonPrice
// @supportURL    https://github.com/FurkanKambay/AmazonPrice/issues
// @include       *://*.amazon.*/dp/*
// @include       *://*.amazon.*/*/dp/*
// @include       *://*.amazon.*/gp/product/*
// @include       *://*.amazon.*/gp/buy/spc/handlers/index.html
// @grant         GM_xmlhttpRequest
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_deleteValue
// @grant         GM_log
// ==/UserScript==
// #endregion
// #region
/// <reference path='greasemonkey.d.ts' />
// @ts-check
'use strict'
GM_log('AmazonPrice started')
// #endregion

// #region Start
const ext = window.location.host.match(/amazon\.(.+)/)[1]
const fromCurrency =
  {
    ca: 'CAD',
    cn: 'CNY',
    'co.uk': 'GBP',
    com: 'USD',
    'com.au': 'AUD',
    'com.br': 'BRL',
    'com.mx': 'MXN',
    in: 'INR',
    jp: 'JPY'
  }[ext] || 'EUR'
let rates, toCurrency
;(function() {
  let storedJson = GM_getValue('rates')
  let today = new Date()
  let then

  // fixer.io updates every weekday at 4PM CET
  // (storedJson && (stored data shows that last update was today ||
  //  last update was Friday && last update was earlier than 3d15h - Friday UTC to Monday 4PM CET in milliseconds))
  if (
    storedJson &&
    (today.toDateString() ===
      (then = new Date(storedJson.date)).toDateString() ||
      (then.getDay() === 5 && today.valueOf() - then.valueOf() < 313200000))
  ) {
    setRates(storedJson)
  } else {
    GM_log('Getting the currency rates...')
    GM_xmlhttpRequest({
      method: 'GET',
      url: 'http://api.fixer.io/latest',
      onload: response => {
        GM_log('Currency rates came through')
        let data = JSON.parse(response.responseText)
        data.rates['EUR'] = 1
        GM_setValue('rates', data)
        setRates(data)
      },
      onerror: err => GM_log(err.responseText)
    })
  }
})()

function setRates(data) {
  rates = data.rates
  getCurrency()
  determinePrice()
}
// #endregion

// #region Price Operations
/**
 * Determines the total price and calls appendPrice function.
 */
function determinePrice() {
  if (location.pathname == '/gp/buy/spc/handlers/index.html') {
    let price = parsePrice($('.grand-total-price').innerText)
  } else {
    let priceTable = $('#price table')
    let priceBlock =
      id('priceblock_ourprice') ||
      id('priceblock_dealprice') ||
      id('priceblock_saleprice')
    let priceMessage = 'Local Price:'
    let price = 0
    let shippingPrice = 0

    if (priceTable) {
      let shippingMessage = id(
        priceBlock.id.substr(11).concat('_shippingmessage')
      )
      if (shippingMessage) {
        shippingPrice = parsePrice(shippingMessage.innerText)
        priceMessage = 'Final Price:'
      }
    }

    priceTable =
      priceTable ||
      $('#buybox table') ||
      id('buyBoxInner') ||
      id('actualPriceValue')

    // Audible price: "Buy with 1-Click$20.40"
    // document.querySelectorAll('#buybox h5')[1].innerText
    priceBlock =
      priceBlock ||
      id('buyNewSection') ||
      id('buybox').$('tr.kindle-price') || // $('#buybox tr.kindle-price')
      id('actualPriceValue')

    price = parsePrice(priceBlock.innerText)
    appendPrice(priceTable, priceMessage, price + shippingPrice)
  }
}

/**
 * Appends the price information to the page.
 * @param {HTMLElement} table Element to which append the price.
 * @param {string} description Price description.
 * @param {number} value Total price.
 */
function appendPrice(table, description, value) {
  GM_log('Appending price')
  // let priceTable = $('#price table') || $('#buybox table')
  let wrap = ''
  let totalRow, desc, val

  if (table) {
    totalRow = table.querySelector('tbody').insertRow()
    desc = totalRow.insertCell()
    val = totalRow.insertCell()
    wrap = 'a-nowrap'
  } else {
    totalRow = id('buyBoxInner').appendChild(document.createElement('div'))
    desc = totalRow.appendChild(document.createElement('span'))
    val = totalRow.appendChild(document.createElement('span'))
    description += ' '
  }

  desc.className = 'a-text-right a-color-secondary a-size-large ' + wrap
  desc.textContent = description

  val.className = 'a-span12 a-color-price a-size-large'
  val.textContent = (rates[toCurrency] / rates[fromCurrency] * value)
    .toFixed(2)
    .concat(' ')
  let currSymbol = val.appendChild(document.createElement('span'))

  currSymbol.style.textDecoration = 'underline dotted'
  currSymbol.title = 'Change currency'
  currSymbol.textContent = toCurrency
  currSymbol.onclick = e => resetCurrency(totalRow)

  if (table) desc.classList.add('a-nowrap')

  let delivery = id('ddmDeliveryMessage') || id('fast-track-message')
  if (
    delivery &&
    (ext === 'com'
      ? delivery.textContent.includes('does not')
      : ext === 'com.mx'
        ? delivery.textContent.includes('no se envía')
        : delivery.querySelector('span.a-color-error'))
  ) {
    val.classList.add('a-text-strike')
  }
}
// #endregion

// #region Helpers
/**
 * Resets currency setting and gets currency code from the user.
 * @param {HTMLTableRowElement} priceRow Table row element to be replaced.
 */
function resetCurrency(priceRow) {
  GM_deleteValue('currency')
  getCurrency()
  priceRow.remove()
  determinePrice()
}

/**
 * Gets currency code from the user and sets the setting.
 */
function getCurrency() {
  toCurrency = GM_getValue('currency')
  if (toCurrency) return

  while (
    !rates.hasOwnProperty(
      (toCurrency = window
        .prompt('Please enter your local currency code (e.g. EUR):')
        .toUpperCase())
    )
  );
  GM_setValue('currency', toCurrency)
}

/**
 * Returns the price from the text.
 * @param {string} text Price with any surrounding text.
 * @returns {number}
 */
function parsePrice(text) {
  let priceMatch = text.match(/\d{0,3}([,.])?(?:\d{3})?[,.]\d{2}/)
  return priceMatch
    ? parseFloat(priceMatch[0].replace(priceMatch[1], '').replace(',', '.'))
    : 0
}

/**
 * @param {string} elementId
 * @returns {HTMLElement}
 */
function id(elementId) {
  return document.getElementById(elementId)
}

/**
 * @param {string} selectors
 * @returns {HTMLElement}
 */
function $(selectors) {
  return document.querySelector(selectors)
}
// #endregion
