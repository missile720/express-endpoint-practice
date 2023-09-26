const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();

require("dotenv").config();

const port = process.env.PORT || 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

app.use(async function (req, res, next) {
  try {
    req.db = await pool.getConnection();
    req.db.connection.config.namedPlaceholders = true;

    await req.db.query(`SET SESSION sql_mode = "TRADITIONAL"`);
    await req.db.query(`SET time_zone = '-8:00'`);

    await next();

    req.db.release();
  } catch (err) {
    console.log(err);

    if (req.db) req.db.release();
    throw err;
  }
});

app.use(cors());

app.use(express.json());

app.get("/cars", async function (req, res) {
  try {
    const cars = await req.db.query(`SELECT * FROM car`);

    res.json({
      success: true,
      message: "Cars retrieved successfully",
      data: cars[0],
    });
    console.log(cars[0]);
  } catch (err) {
    res.json({ success: false, message: err.message, data: null });
  }
});

app.use(async function (req, res, next) {
  try {
    console.log("Middleware after the get /cars");

    await next();
  } catch (err) {}
});

app.post("/car", async function (req, res) {
  try {
    const { make, model, year } = req.body;

    const query = await req.db.query(
      `INSERT INTO car (make, model, year) 
       VALUES (:make, :model, :year)`,
      {
        make,
        model,
        year,
      }
    );

    res.json({
      success: true,
      message: "Car successfully created",
      data: null,
    });
  } catch (err) {
    res.json({ success: false, message: err, data: null });
  }
});

app.delete("/car/:id", async function (req, res) {
  try {
    let id = req.params.id;

    const query = await req.db.query(
      `UPDATE car
      SET deleted_flag = 1
      WHERE id = ?`,
      [id]
    );

    res.json("success");
  } catch (err) {
    res.json({ success: false, message: err, data: null });
  }
});

app.put("/car/:id", async function (req, res) {
  try {
    const id = req.params.id;
    const { make, model, year } = req.body;

    if (!make && !model && !year) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update", data: null });
    }

    const updateFields = {};

    if (make) {
      updateFields.make = make;
    }

    if (model) {
      updateFields.model = model;
    }

    if (year) {
      updateFields.year = year;
    }

    const query = await req.db.query("UPDATE car SET ? WHERE id = ?", [
      updateFields,
      id,
    ]);

    if (query.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Car not found", data: null });
    }

    res.json({
      success: true,
      message: "Car updated successfully",
      data: null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, data: null });
  }
});

app.listen(port, () =>
  console.log(`212 API Example listening on http://localhost:${port}`)
);
