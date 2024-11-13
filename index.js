//Dependencies
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cookieParser = require("cookie-parser");
const ejsMate = require("ejs-mate");
var jwt = require("jsonwebtoken");
const Str_Random = require("./generate_random_string.js");
require("dotenv").config({
  path: "/.env",
});
require("dotenv/config");

//App Setup
app.use(cookieParser());
app.use(express.urlencoded());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "static")));
app.use(bodyParser.urlencoded({ extended: true }));

const port = process.env.PORT || 8000;
const SECRET_KEY = String(Str_Random(32));

// Declare database
const db = new sqlite3.Database(
  path.join(__dirname, "blind-sql-injection.db"),
  function (error) {
    if (error) {
      return console.error(error.message);
    } else {
      console.log("Connection with Database has been established.");
    }
  }
);

//Create tables for users and books
function createUsersTable() {
  db.exec(`
        DROP TABLE IF EXISTS users;
        CREATE TABLE users
        (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            password TEXT
        );

      DROP TABLE IF EXISTS books;
        CREATE TABLE books
    (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bookTitle TEXT,
          bookType TEXT,
          bookPrice TEXT,
          bookAvailableQuantity INTEGER
    );
  `);
}

//Insert a user account
function insertRow(username, password) {
  db.run("INSERT INTO users (username, password) VALUES (?, ?)", [
    username,
    password,
  ]);
  console.log("Data Inserted Successfully.");
}

//Insert a book
function insertBook(bookTitle, bookType, bookPrice, bookAvailableQuantity) {
  db.run(
    "INSERT INTO books (bookTitle, bookType, bookPrice, bookAvailableQuantity) VALUES (?, ?, ?, ?)",
    [bookTitle, bookType, bookPrice, bookAvailableQuantity]
  );
  console.log("Data Inserted Successfully.");
}

//Setup database
function setupdb() {
  createUsersTable();
  insertRow("Angel_Mendoza", Str_Random(12));
  insertRow("Theodore_Alletez", Str_Random(12));
  insertRow("Lucas_Allen", Str_Random(12));
  insertBook("The Enchanted Forest", "Fantasy", 15.99, 12);
  insertBook("Quantum Paradoxes", "Science", 22.5, 0);
  insertBook("Culinary Wonders", "Cooking", 29.99, 7);
  insertBook("The Silent Night", "Horror", 9.99, 3);
  insertBook("Historical Journeys", "History", 18.75, 15);
  insertBook("The Code Breaker", "Technology", 35.0, 5);
  insertBook("Gardens of Tomorrow", "Gardening", 12.95, 9);
  insertBook("Mindful Living", "Self-Help", 14.99, 20);
  insertBook("Through the Lens", "Photography", 45.0, 2);
  insertBook("The Last Frontier", "Adventure", 17.5, 8);
}

//Start database
setupdb();

//Routes
app.get("/", async function (req, res) {
  try {
    //Get id from request params
    let id = req.query.id;

    //Get token from request object
    token = req.cookies.JWT;

    //flag to be used for UI implementation
    if (!token) {
      hasToken = false;
    } else {
      hasToken = true;
    }

    //flag to check if the requested book information was found
    found = false;

    //if there is a supplied id try to find requested book info
    if (id) {
      const result = await new Promise(async function (res, rej) {
        db.get(
          `SELECT bookTitle, bookType FROM books WHERE id='${id}'`,
          function (e, r) {
            if (e) {
              rej(e.message);
            } else {
              res(r);
            }
          }
        );
      }).catch(function (e) {
        return res.render("search", {
          found_book: found,
          message: "Book not found with selected ID",
          tokenFound: hasToken,
        });
      });

      //if a book is found with the supplied id return info
      if (result) {
        found = true;
        return res.render("search", {
          found_book: found,
          message: "Book found with selected ID",
          tokenFound: hasToken,
        });
      } else {
        return res.render("search", {
          found_book: found,
          message: "Book not found with selected ID",
          tokenFound: hasToken,
        });
      }
    } else {
      return res.render("search", {
        found_book: found,
        message: "",
        tokenFound: hasToken,
      });
    }
  } catch (e) {
    return res.render("search", {
      message: "Book not found with selected ID",
      found_book: found,
      tokenFound: hasToken,
    });
  }
});

app.get("/login", async function (req, res) {
  try {
    return res.render("login");
  } catch (e) {
    return res.send("Error while loading the page");
  }
});

app.post("/login", async function (req, res, next) {
  try {
    //Get supplied credentials from the request body
    let username = req.body.username;
    let password = req.body.password;

    sql = `SELECT * FROM users WHERE username= ? AND password= ?`;
    const result = await new Promise(async function (res, rej) {
      db.get(sql, [username, password], function (e, r) {
        if (e) {
          rej(e.message);
        } else {
          res(r);
        }
      });
    }).catch(function (e) {
      return res.redirect("/forbidden");
    });

    //if user record found generate JWT token
    if (result) {
      let token_data = {
        username: result.username,
      };
      token = jwt.sign(token_data, SECRET_KEY, { expiresIn: "1h" });
      res.cookie("JWT", token);
      return res.redirect("/home");
    } else {
      return res.send("Invalid credentials submitted");
    }
  } catch (e) {
    res.send("Error while performing the login process");
  }
});

app.get("/home", function (req, res) {
  try {
    try {
      //Get token from request object
      token = req.cookies.JWT;

      //If no token found redirect to login page
      if (!token) {
        return res.redirect("/");
      }

      //Verify tokens signature
      var data = jwt.verify(token, SECRET_KEY);
    } catch (err) {
      return res.send("Missing valid JWT token");
    }

    //if token is valid render home page
    if (data) {
      return res.render("home");
    } else {
      return res.send("Missing valid JWT token");
    }
  } catch (err) {
    return res.send("Missing valid JWT token");
  }
});

app.get("/forbidden", function (req, res) {
  return res.render("forbidden");
});

app.get("/logout", function (req, res) {
  res.clearCookie("JWT");
  return res.redirect("/");
});

app.get("*", function (req, res) {
  return res.redirect("/");
});

//Start App
app.listen(port, function () {
  console.log(`Serving on Port ${port}`);
});
