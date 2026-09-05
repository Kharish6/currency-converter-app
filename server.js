const express = require("express");
const path = require("path");
const Decimal = require("decimal.js");

const app = express();

const PORT = process.env.PORT || 3000;
const API_BASE = "https://api.frankfurter.dev/v2";


// =====================================================
// Middleware
// =====================================================

app.disable("x-powered-by");

app.use(express.json());

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


// =====================================================
// Health Check
// =====================================================

app.get("/health", (req, res) => {

  res.json({
    status: "UP",
    service: "currency-converter",
    timestamp: new Date().toISOString()
  });

});


// =====================================================
// Helper - Fetch JSON from Frankfurter
// =====================================================

async function fetchFromProvider(url) {

  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, 10000);


  try {

    const response =
      await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json"
        }
      });


    if (!response.ok) {

      throw new Error(
        `Provider returned HTTP ${response.status}`
      );

    }


    return await response.json();

  } finally {

    clearTimeout(timeout);

  }

}


// =====================================================
// GET /api/currencies
//
// Returns all currencies supported by Frankfurter.
//
// Example:
//
// [
//   {
//     code: "INR",
//     name: "Indian Rupee",
//     symbol: "₹"
//   }
// ]
// =====================================================

app.get(
  "/api/currencies",
  async (req, res) => {

    try {

      const data =
        await fetchFromProvider(
          `${API_BASE}/currencies`
        );


      if (!Array.isArray(data)) {

        throw new Error(
          "Unexpected currency response."
        );

      }


      const currencies =
        data
          .map(item => {

            return {

              code:
                item.iso_code,

              name:
                item.name,

              symbol:
                item.symbol || ""

            };

          })
          .filter(item => {

            return (
              /^[A-Z]{3}$/.test(
                item.code || ""
              ) &&
              item.name
            );

          })
          .sort((a, b) => {

            return a.code.localeCompare(
              b.code
            );

          });


      res.setHeader(
        "Cache-Control",
        "public, max-age=3600"
      );


      res.json(currencies);

    } catch (error) {

      console.error(
        "Currency error:",
        error.message
      );


      res.status(502).json({

        error:
          "Unable to load currencies."

      });

    }

  }
);


// =====================================================
// GET /api/rates?base=INR
//
// Returns all latest published rates for a base currency.
//
// Example:
//
// /api/rates?base=INR
//
// Response:
//
// {
//   base: "INR",
//   date: "...",
//   rates: {
//      USD: "...",
//      EUR: "..."
//   }
// }
// =====================================================

app.get(
  "/api/rates",
  async (req, res) => {

    const base =
      String(
        req.query.base || ""
      ).toUpperCase();


    if (
      !/^[A-Z]{3}$/.test(base)
    ) {

      return res.status(400).json({

        error:
          "Invalid base currency."

      });

    }


    try {

      const data =
        await fetchFromProvider(
          `${API_BASE}/rates?base=${base}`
        );


      if (!Array.isArray(data)) {

        throw new Error(
          "Unexpected rates response."
        );

      }


      const rates = {};


      for (
        const item of data
      ) {

        if (
          item.quote &&
          item.rate !== undefined
        ) {

          rates[item.quote] =
            String(item.rate);

        }

      }


      // Same currency conversion.
      rates[base] = "1";


      res.json({

        base,

        date:
          data[0]?.date ||
          new Date()
            .toISOString()
            .slice(0, 10),

        rates

      });

    } catch (error) {

      console.error(
        "Rates error:",
        error.message
      );


      res.status(502).json({

        error:
          "Unable to retrieve exchange rates."

      });

    }

  }
);


// =====================================================
// POST /api/convert
//
// Example:
//
// {
//   "amount": "20000000",
//   "base": "INR",
//   "quote": "USD"
// }
// =====================================================

app.post(
  "/api/convert",
  async (req, res) => {

    const amountText =
      String(
        req.body?.amount ?? ""
      ).trim();


    const base =
      String(
        req.body?.base || ""
      ).toUpperCase();


    const quote =
      String(
        req.body?.quote || ""
      ).toUpperCase();


    // ---------------------------------------------------
    // Validate currency codes
    // ---------------------------------------------------

    if (
      !/^[A-Z]{3}$/.test(base) ||
      !/^[A-Z]{3}$/.test(quote)
    ) {

      return res.status(400).json({

        error:
          `Invalid currency code. Base=${base}, Quote=${quote}`

      });

    }


    // ---------------------------------------------------
    // Validate amount
    // ---------------------------------------------------

    if (
      !/^(?:\d+\.?\d*|\.\d+)$/.test(
        amountText
      )
    ) {

      return res.status(400).json({

        error:
          "Enter a valid non-negative amount."

      });

    }


    try {

      const amount =
        new Decimal(
          amountText
        );


      let rate =
        new Decimal(1);


      let date =
        new Date()
          .toISOString()
          .slice(0, 10);


      // -------------------------------------------------
      // Same currency
      // -------------------------------------------------

      if (base !== quote) {

        const data =
          await fetchFromProvider(
            `${API_BASE}/rate/${base}/${quote}`
          );


        if (
          data.rate === undefined ||
          data.rate === null
        ) {

          throw new Error(
            "Exchange rate was not returned."
          );

        }


        rate =
          new Decimal(
            String(data.rate)
          );


        date =
          data.date ||
          date;

      }


      // -------------------------------------------------
      // Accurate financial calculation
      // -------------------------------------------------

      const converted =
        amount.times(rate);


      res.json({

        amount:
          amount.toString(),

        base,

        quote,

        rate:
          rate.toString(),

        result:
          converted.toString(),

        date

      });

    } catch (error) {

      console.error(
        "Conversion error:",
        error.message
      );


      res.status(502).json({

        error:
          "Unable to retrieve exchange rate."

      });

    }

  }
);


// =====================================================
// 404 Handler
// =====================================================

app.use(
  (req, res) => {

    res.status(404).json({

      error:
        "Endpoint not found."

    });

  }
);


// =====================================================
// Start Server
// =====================================================

const server =
  app.listen(
    PORT,
    () => {

      console.log("");
      console.log(
        "=========================================="
      );

      console.log(
        " Currency Converter"
      );

      console.log(
        "=========================================="
      );

      console.log(
        ` Server: http://localhost:${PORT}`
      );

      console.log(
        ` Health: http://localhost:${PORT}/health`
      );

      console.log(
        "=========================================="
      );

      console.log("");

    }
  );


// =====================================================
// Graceful Shutdown
// =====================================================

function shutdown(signal) {

  console.log(
    `${signal} received. Shutting down...`
  );


  server.close(() => {

    console.log(
      "Server stopped."
    );

    process.exit(0);

  });

}


process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);