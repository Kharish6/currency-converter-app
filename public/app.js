const amountInput =
  document.getElementById(
    "amount"
  );

const fromCurrency =
  document.getElementById(
    "fromCurrency"
  );

const toCurrency =
  document.getElementById(
    "toCurrency"
  );

const output =
  document.getElementById(
    "output"
  );

const result =
  document.getElementById(
    "result"
  );

const rateLine =
  document.getElementById(
    "rateLine"
  );

const resultMeta =
  document.getElementById(
    "resultMeta"
  );

const errorBox =
  document.getElementById(
    "error"
  );

const currencyGrid =
  document.getElementById(
    "currencyGrid"
  );

const currencySearch =
  document.getElementById(
    "currencySearch"
  );

const currencyCount =
  document.getElementById(
    "currencyCount"
  );

const swapButton =
  document.getElementById(
    "swap"
  );

const refreshButton =
  document.getElementById(
    "refreshRate"
  );


let currencies = [];

let debounceTimer = null;

let currentRequest = null;


/* =========================================
   CURRENCY SYMBOLS
========================================= */

const symbols = {

  USD: "$",

  EUR: "€",

  GBP: "£",

  INR: "₹",

  JPY: "¥",

  CNY: "¥",

  AUD: "A$",

  CAD: "C$",

  CHF: "CHF",

  SGD: "S$",

  HKD: "HK$",

  KRW: "₩",

  NZD: "NZ$",

  AED: "د.إ",

  BRL: "R$",

  ZAR: "R",

  SEK: "kr",

  NOK: "kr",

  DKK: "kr",

  PLN: "zł",

  TRY: "₺",

  RUB: "₽",

  MXN: "$",

  THB: "฿",

  MYR: "RM",

  IDR: "Rp",

  PHP: "₱"

};


/* =========================================
   ERROR
========================================= */

function showError(message) {

  errorBox.textContent =
    message;

  errorBox.hidden =
    !message;

}


/* =========================================
   FORMAT NUMBER
========================================= */

function formatNumber(value) {

  /*
   * We use Number only for display.
   *
   * The actual financial calculation is
   * performed by Decimal.js on the backend.
   */

  const number =
    Number(value);


  if (
    Number.isFinite(number)
  ) {

    return new Intl.NumberFormat(
      "en-IN",
      {
        maximumFractionDigits: 8
      }
    ).format(number);

  }


  return value;

}


/* =========================================
   FORMAT CURRENCY
========================================= */

function formatCurrency(
  value,
  code
) {

  return (
    `${formatNumber(value)} ${code}`
  );

}


/* =========================================
   POPULATE DROPDOWNS
========================================= */

function populateDropdowns() {

  const options =
    currencies
      .map(currency => {

        return `
          <option value="${currency.code}">
            ${currency.code} — ${currency.name}
          </option>
        `;

      })
      .join("");


  fromCurrency.innerHTML =
    options;

  toCurrency.innerHTML =
    options;


  /*
   * Default:
   *
   * INR → USD
   */

  const hasINR =
    currencies.some(
      currency =>
        currency.code === "INR"
    );


  const hasUSD =
    currencies.some(
      currency =>
        currency.code === "USD"
    );


  if (hasINR) {

    fromCurrency.value =
      "INR";

  }


  if (hasUSD) {

    toCurrency.value =
      "USD";

  }

}


/* =========================================
   CURRENCY GRID
========================================= */

function renderCurrencyGrid(
  searchTerm = ""
) {

  const query =
    searchTerm
      .trim()
      .toLowerCase();


  const filtered =
    currencies.filter(
      currency => {

        return (

          currency.code
            .toLowerCase()
            .includes(query)

          ||

          currency.name
            .toLowerCase()
            .includes(query)

        );

      }
    );


  currencyCount.textContent =
    query
      ? `${filtered.length} of ${currencies.length}`
      : `${currencies.length} currencies`;


  if (!filtered.length) {

    currencyGrid.innerHTML = `

      <div class="empty-state">

        <strong>
          No currencies found
        </strong>

        <span>
          Try another currency name or ISO code.
        </span>

      </div>

    `;

    return;

  }


  currencyGrid.innerHTML =
    filtered
      .map(currency => {

        const symbol =
          currency.symbol ||
          symbols[currency.code] ||
          currency.code;


        return `

          <button
            class="currency-item"
            type="button"
            data-code="${currency.code}"
          >

            <span class="currency-symbol">
              ${symbol}
            </span>


            <span class="currency-details">

              <strong>
                ${currency.code}
              </strong>

              <small>
                ${currency.name}
              </small>

            </span>


            <span class="currency-arrow">
              →
            </span>

          </button>

        `;

      })
      .join("");

}


/* =========================================
   CONVERT
========================================= */

async function convert() {

  const amount =
    amountInput.value.trim();

  const base =
    fromCurrency.value;

  const quote =
    toCurrency.value;


  /*
   * Don't send the request until
   * currencies have loaded.
   */

  if (!base || !quote) {

    return;

  }


  /*
   * Validate amount.
   */

  if (!amount) {

    result.textContent =
      "—";

    output.textContent =
      "—";

    rateLine.textContent =
      "Enter an amount to convert.";

    resultMeta.textContent =
      "Waiting for amount";

    return;

  }


  if (
    !/^(?:\d+\.?\d*|\.\d+)$/.test(
      amount
    )
  ) {

    showError(
      "Enter a valid amount."
    );

    return;

  }


  showError("");


  /*
   * Cancel previous request.
   */

  if (currentRequest) {

    currentRequest.abort();

  }


  currentRequest =
    new AbortController();


  result.textContent =
    "Loading…";

  output.textContent =
    "Loading…";

  rateLine.textContent =
    "Fetching latest available rate…";

  resultMeta.textContent =
    "Please wait";


  try {

    const response =
      await fetch(
        "/api/convert",
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              amount,

              base,

              quote

            }),

          signal:
            currentRequest.signal

        }
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
          "Conversion failed."
      );

    }


    const converted =
      formatCurrency(
        data.result,
        data.quote
      );


    /*
     * Converted amount
     */

    result.textContent =
      converted;


    output.textContent =
      converted;


    /*
     * Rate
     */

    rateLine.textContent =
      `1 ${data.base} = ${data.rate} ${data.quote}`;


    /*
     * Rate date
     */

    resultMeta.textContent =
      `Reference rate date: ${data.date}`;


  } catch (error) {

    if (
      error.name ===
      "AbortError"
    ) {

      return;

    }


    console.error(
      error
    );


    result.textContent =
      "—";

    output.textContent =
      "—";

    rateLine.textContent =
      "Unable to retrieve the exchange rate.";

    resultMeta.textContent =
      "Please try again.";


    showError(
      error.message ||
        "Something went wrong."
    );

  }

}


/* =========================================
   AUTO CONVERSION
========================================= */

amountInput.addEventListener(
  "input",
  () => {

    clearTimeout(
      debounceTimer
    );


    debounceTimer =
      setTimeout(
        convert,
        400
      );

  }
);


/* =========================================
   DROPDOWN CHANGE
========================================= */

fromCurrency.addEventListener(
  "change",
  convert
);


toCurrency.addEventListener(
  "change",
  convert
);


/* =========================================
   SWAP
========================================= */

swapButton.addEventListener(
  "click",
  () => {

    const oldFrom =
      fromCurrency.value;


    fromCurrency.value =
      toCurrency.value;


    toCurrency.value =
      oldFrom;


    convert();

  }
);


/* =========================================
   REFRESH
========================================= */

refreshButton.addEventListener(
  "click",
  convert
);


/* =========================================
   SEARCH
========================================= */

currencySearch.addEventListener(
  "input",
  event => {

    renderCurrencyGrid(
      event.target.value
    );

  }
);


/* =========================================
   CURRENCY CARD
========================================= */

currencyGrid.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "[data-code]"
      );


    if (!button) {

      return;

    }


    const code =
      button.dataset.code;


    /*
     * Selecting a currency from
     * the grid changes FROM.
     */

    fromCurrency.value =
      code;


    /*
     * Don't allow same currency
     * accidentally if possible.
     */

    if (
      toCurrency.value === code
    ) {

      const alternative =
        currencies.find(
          currency =>
            currency.code !== code
        );


      if (alternative) {

        toCurrency.value =
          alternative.code;

      }

    }


    convert();

  }
);


/* =========================================
   LOAD CURRENCIES
========================================= */

async function loadCurrencies() {

  try {

    currencyCount.textContent =
      "Loading…";


    const response =
      await fetch(
        "/api/currencies"
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.error ||
          "Unable to load currencies."
      );

    }


    /*
     * The backend returns:
     *
     * [
     *   {
     *     code: "INR",
     *     name: "Indian Rupee",
     *     symbol: "₹"
     *   }
     * ]
     */

    if (
      !Array.isArray(data)
    ) {

      throw new Error(
        "Invalid currency response."
      );

    }


    currencies =
      data
        .filter(currency => {

          return (

            currency &&

            /^[A-Z]{3}$/.test(
              currency.code || ""
            ) &&

            currency.name

          );

        })
        .sort(
          (a, b) =>
            a.code.localeCompare(
              b.code
            )
        );


    if (
      !currencies.length
    ) {

      throw new Error(
        "No currencies available."
      );

    }


    /*
     * Populate dropdowns.
     */

    populateDropdowns();


    /*
     * Render all currencies.
     */

    renderCurrencyGrid();


    /*
     * Initial conversion:
     *
     * 1 INR → USD
     */

    await convert();


  } catch (error) {

    console.error(
      error
    );


    currencyCount.textContent =
      "Unavailable";


    showError(
      error.message ||
        "Unable to load currencies."
    );

  }

}


/* =========================================
   START
========================================= */

loadCurrencies();