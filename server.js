//copy by Blu, Kau & Nikei

const //imports
  express = require("express"),
  app = express(),
  fs = require("fs"),
  $ = require("node-global-storage"),
  mySqlEasier = require("mysql-easier"),
  shortid = require("shortid"),
  atob = require("atob"),
  btoa = require("btoa");

app.use(express.static("public"));

//UPLOADING
const isUpload = req => {
  return getType(req) === "upload";
};
//SELFINFO
const isSelf = req => {
  return getType(req) === "self";
};

const getType = req => {
  if (req.headers["self"] !== void 0 && req.headers["self"] == "true") {
    return "self";
  }
  if (req.headers["referer"] !== void 0 && req.protocol !== "https") {
    return "upload";
  }
  return "visit";
};

//try to get real ip
app.set("trust proxy", true);

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

// Parse JSON bodies (as sent by API clients)
app.use(express.json({ extended: true }));

// https://expressjs.com/en/starter/basic-routing.html
app.get("/", (req, res) => {
  res.write(
    fs
      .readFileSync(`${__dirname}/views/index.html`, "utf8")
      .replace(/{{host}}/g, host)
  ) && res.end();
});

const host = "https://s0ße.link/";

const log = req => {
  const _soos = +req.originalUrl.split("/")[1];

  console.debug({
    proto: JSON.parse(req.headers["cf-visitor"]).scheme,
    type: getType(req),
    IP: req.headers["cf-connecting-ip"]
      ? req.headers["cf-connecting-ip"]
      : req.ip,
    url: `${req.protocol}://${req.headers.host}${req.originalUrl}`,
    soos: _soos !== NaN ? _soos : 404
  });
};

app.post("/welcome", (req, res) => {
  //if(getType(req) === "visit" && isNaN(+req.originalUrl) && req.headers["cf-visitor"] && JSON.parse(req.headers["cf-visitor"]).scheme === "http"){ //upgrade cf directs
  //  res.redirect(`https://${req.headers.host}${req.originalUrl}`);
  //}
  log(req);
  res.json("yo");
});

//save post
app.patch("/edit", (req, res) => {
  const ID = req.body;

  console.log(ID);

  if (ID) {
  }

  res.end();
});

//delete id
app.delete("/edit", async (req, res) => {
  const ID = req.body.id;

  const reqToken = await tokenGet(req.body.token);
  if (reqToken) {
    const SOOS = $.get(`SOOS_${ID}`) || (await getSource(ID));
    if (SOOS) {
      if (await tokenBelong(reqToken, SOOS)) {
        SOOS.active = false;
        const conn = await sourcePool.getConnection(),
          _ = conn.upsert(process.env.DB_SOURCES_TABL, SOOS),
          __ = conn.done();
        $.set(`SOOS_${ID}`, SOOS);
      } else
        res.json({ status: "nok", msg: "Token & Soße passen nicht zusammen" });
    } else res.json({ status: "nok", msg: "soße nicht gefunden" });
  } else res.json({ status: "nok", msg: "inkorrektes token" });

  //$.set(`SOOS_${ID}`, await getSource(ID)

  res.end();
});

//CONCEPT4 ✓
//-> /x
app.all("/:id", async (req, res) => {
  const ID = !isNaN(req.params.id) ? req.params.id : void 0;

  let SOOS = $.get(`SOOS_${ID}`);
  if (ID && !SOOS) SOOS = $.set(`SOOS_${ID}`, await getSource(ID));

  if (isSelf(req)) {
    return res.json(
      SOOS && SOOS.disabled !== [1]
        ? { status: "ok", url: SOOS.web }
        : { status: "nok" }
    );
  }

  ID && SOOS
    ? [res.redirect(isUpload(req) ? SOOS.file : SOOS.web)] //link found, redirect to link
    : //entry not found, check if path is number...
      res.write(
        fs
          .readFileSync(`${__dirname}/views/index.html`, "utf8")
          .replace(/{{host}}/g, host)
          .replace("{{from}}", `/${isNaN(+ID) ? 204 : 404}`) //if path is number but not found, notify client about 404, else about invalid serverside path
      ) && res.end();
  log(req);
});

app.get("/*", (req, res) => {
  res.write(
    fs
      .readFileSync(`${__dirname}/views/index.html`, "utf8")
      .replace(/{{host}}/g, host)
      .replace("{{from}}", "/400") //how did we get here lol
  ) && res.end();
});

const sourcePool = $.set(
    "sourcePool",
    mySqlEasier.createPool({
      host: process.env.DB_SOURCES_HOST,
      user: process.env.DB_SOURCES_USER,
      password: process.env.DB_SOURCES_PASS,
      database: process.env.DB_SOURCES_NAME
    })
  ),
  getSources = async () =>
    new Promise(async (resolve, reject) => {
      let data;
      const conn = await sourcePool.getConnection();
      conn.getAll("sources").then(_data => {
        data = _data;
        console.log(_data);
        data.sort((a, b) => {
          return a.created - b.created || `${a}`.localeCompare(b);
        });
        console.log("got data.");
        return resolve(data);
      });
      conn.done();
    });

//is app toke nvalid
const tokenGet = async token => {
  const conn = await sourcePool.getConnection(),
    data = await conn.query(
      `select * from ${process.env.DB_TOKENS_TABL} where token = "${token}"`
    ),
    _ = conn.done();
  return data.length ? data[0].token : void 0;
};

//does a token belong to src
const tokenBelong = async (token, soos) => {
  const conn = await sourcePool.getConnection(),
    data = await conn.query(
      `select * from ${process.env.DB_SOURCES_TABL} where id = "${soos.id}" AND token = "${token}"`
    ),
    _ = conn.done();
  if (data.length) return true;
  else return false;
};

const getSource = async id => {
  const conn = await sourcePool.getConnection(),
    data = await conn.query(
      `select * from ${process.env.DB_SOURCES_TABL} where sid = "${id}"`
    ),
    _ = conn.done();
  if (data.length) return data[0];
  else return void 0;
};

(async () => {
  //console.log((await getSource("1588182495145")).active[0] === 1);
  console.log((await getSource("1588182495145")).token);
})();

const tokenPool = $.set(
    "tokenPool",
    mySqlEasier.createPool({
      host: process.env.DB_TOKENS_HOST,
      user: process.env.DB_TOKENS_USER,
      password: process.env.DB_TOKENS_PASS,
      database: process.env.DB_TOKENS_NAME
    })
  ),
  getTOKENS = async () =>
    new Promise(async (resolve, reject) => {
      let data;
      const conn = await tokenPool.getConnection();
      conn.getAll("TOKENS").then(_data => {
        data = _data;
        data.sort((a, b) => {
          return a.name.length - b.name.length || a.localeCompare(b);
        });
        console.log("got data.");
        return resolve(data);
      });
      conn.done();
    });

app.patch("/", (req, res) => {
  console.log(req.query.token);
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
