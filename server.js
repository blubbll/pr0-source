//copy by Blu, Kau & Nikei

const //imports
  express = require("express"),
  app = express(),
  fs = require("fs"),
  $ = require("node-global-storage"),
  mySqlEasier = require("mysql-easier"),
  sqlstring = require("sqlstring"),
  matomo = require("matomo-tracker");

app.use(express.static("public"));

let m = new matomo(process.env.MATOMO_ID, process.env.MATOMO_INSTANCE);

const mysqape = input => {
  if (!isNaN(input)) return sqlstring.escape(input);
  else
    return sqlstring
      .escape(input)
      .substring(1)
      .slice(0, -1);
};

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
  if (
    req.headers["user-agent"] === process.env.PR0AGENT &&
    req.protocol === "https"
  ) {
    return "upload";
  }
  if (req.originalUrl.split("/")[1] === "welcome") return "app_open";
  if (+req.originalUrl.split("/")[1]) return "visit_source";
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

const host = "https://s0sse.link";

const log = req => {
  const _source = +req.originalUrl.split("/")[1];
  console.debug({
    proto: JSON.parse(req.headers["cf-visitor"]).scheme,
    ua: req.get("User-Agent"),
    type: getType(req),
    IP: req.headers["cf-connecting-ip"]
      ? req.headers["cf-connecting-ip"]
      : req.ip,
    url: `${req.protocol}://${req.headers.host}${req.originalUrl}`,
    referrer: req.headers["referrer"] || "",
    source: _source !== NaN ? _source : ""
  });

  m.track({
    token_auth: process.env.MATOMO_TOKEN,
    cip: req.headers["cf-connecting-ip"]
      ? req.headers["cf-connecting-ip"]
      : req.ip,
    url: `${JSON.parse(req.headers["cf-visitor"]).scheme}://${
      host.split("//")[1]
    }${req.originalUrl}`,
    action_name: `${req.originalUrl} (from log)`,
    ua: `${req.get("User-Agent")}`
  });
};

app.post("/welcome", (req, res) => {
  log(req);
  res.json("yo");
});

class SOOS {
  constructor(obj) {
    this.web = obj.web || "";
    (this.file = obj.file || ""),
      (this.active = obj.active || Buffer.alloc(1, 1)), //Buffer.equals to compare buffers!
      (this.token = obj.token || ""),
      (this.sid = Math.floor(new Date().valueOf() * Math.random()));
  }
}

//save post
app.post("/add", async (req, res) => {
  const reqToken = await tokenResolve(req.body.token);
  if (reqToken) {
    if (req.body.file) {
      const existing = await getSourceDupe(req.body.file);
      if (!existing) {
        const _NEW = new SOOS({
          web: req.body.web,
          file: req.body.file,
          token: reqToken
        });

        while (await getSource(_NEW.sid))
          _NEW.sid = Math.floor(new Date().valueOf() * Math.random());

        const conn = await sourcePool.getConnection(),
          _ = await conn.insert(process.env.DB_SOURCES_TABL, _NEW),
          __ = await conn.done();

        $.set(`SOOS_${_NEW.sid}`, _NEW);
        res.json({
          status: "ok",
          msg: "Soße hinzugefügt!",
          data: `http://${host.split("//")[1]}/${_NEW.sid}`
        });
      } else res.json({ status: "nok", msg: "Quelldatei bereits eingefügt." });
    } else res.json({ status: "nok", msg: "Quelldatei darf nicht leer sein." });
  } else res.json({ status: "nok", msg: "Inkorrektes Token." });
});

//save post
app.patch("/edit", async (req, res) => {
  const ID = req.body.id;
  const reqToken = await tokenResolve(req.body.token);
  if (reqToken) {
    const SOOS = $.get(`SOOS_${ID}`) || (await getSource(ID));
    if (SOOS) {
      if (await tokenBelong(reqToken, SOOS)) {
        SOOS.active = Buffer.alloc(1, 1);
        SOOS.web = req.body.web;
        const conn = await sourcePool.getConnection(),
          _ = conn.upsert(process.env.DB_SOURCES_TABL, SOOS),
          __ = conn.done();

        $.set(`SOOS_${ID}`, SOOS);

        res.json({ status: "ok", msg: "Soße aktualisiert!" });
      } else
        res.json({ status: "nok", msg: "Token & Soße passen nicht zusammen" });
    } else res.json({ status: "nok", msg: "soße nicht gefunden" });
  } else res.json({ status: "nok", msg: "inkorrektes token" });
});

//delete id
app.delete("/edit", async (req, res) => {
  const ID = req.body.id;
  const reqToken = await tokenResolve(req.body.token);
  if (reqToken) {
    const SOOS = $.get(`SOOS_${ID}`) || (await getSource(ID));
    if (SOOS) {
      if (await tokenBelong(reqToken, SOOS)) {
        SOOS.active = Buffer.alloc(1, 0);
        const conn = await sourcePool.getConnection(),
          _ = conn.upsert(process.env.DB_SOURCES_TABL, SOOS),
          __ = conn.done();
        $.set(`SOOS_${ID}`, SOOS);
        res.json({ status: "ok", msg: "Soße deaktiviert!" });
      } else
        res.json({ status: "nok", msg: "Token & Soße passen nicht zusammen." });
    } else res.json({ status: "nok", msg: "soße nicht gefunden." });
  } else res.json({ status: "nok", msg: "Inkorrektes token." });
  res.end();
});

//CONCEPT4 ✓
//-> /x
app.all("/:id", async (req, res) => {
  const ID = !isNaN(req.params.id) ? req.params.id : void 0;

  let SOOS = $.get(`SOOS_${ID}`);

  if (ID && !SOOS) SOOS = $.set(`SOOS_${ID}`, await getSource(ID));

  //self request via edit-preflight
  if (isSelf(req)) {
    return res.json(
      SOOS && SOOS.active[0] !== 1
        ? { status: "ok", url: SOOS.web }
        : { status: "nok", msg: `soße ${ID} nicht gefunden.` }
    );
  }

  ID && SOOS && SOOS.active[0] && SOOS.web
    ? [res.redirect(isUpload(req) ? SOOS.file : SOOS.web)] //link found, redirect to link
    : //entry not found, check if path is number...
      res.write(
        fs
          .readFileSync(`${__dirname}/views/index.html`, "utf8")
          .replace(/{{host}}/g, host)
          .replace(
            "{{from}}",
            `/${SOOS && !SOOS.web ? 302 : isNaN(+ID) ? 204 : 404}`
          ) //if path is number but not found, notify client about 404, else about invalid serverside path
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
        data.sort((a, b) => {
          return a.created - b.created || `${a}`.localeCompare(b);
        });
        console.log("got data.");
        return resolve(data);
      });
      conn.done();
    });

//resolve token to ID
const tokenResolve = async token => {
  const conn = await sourcePool.getConnection(),
    data = await conn.query(
      `select * from ${process.env.DB_TOKENS_TABL} where token = "${mysqape(
        token
      )}";`
    ),
    _ = conn.done();
  return data.length ? data[0].id : void 0;
};

//does a token belong to src
const tokenBelong = async (token, soos) => {
  const conn = await sourcePool.getConnection(),
    data = await conn.query(
      `select * from ${process.env.DB_SOURCES_TABL} where id = ${
        soos.id
      } AND token = "${mysqape(token)}";`
    ),
    _ = conn.done();
  if (data.length) return true;
  else return false;
};

const getSource = async id => {
  if (!id) return void 0;
  const conn = await sourcePool.getConnection(),
    data = await conn.query(
      `select * from ${process.env.DB_SOURCES_TABL} where sid = ${mysqape(id)};`
    ),
    _ = conn.done();
  if (data.length) return data[0];
  else return void 0;
};

const getSourceDupe = async direct => {
  const conn = await sourcePool.getConnection(),
    data = await conn.query(
      `select * from ${process.env.DB_SOURCES_TABL} where file = "${mysqape(
        direct
      )}"`
    ),
    _ = conn.done();
  if (data.length) return data[0];
  else return void 0;
};

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

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log(
    `Soßenapp läuft auf port ${listener.address().port} (app is running)`
  );
});
