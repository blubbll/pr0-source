//copy by Blu, Kau, Nikei
const //selectors
  $ = document.querySelector.bind(document),
  $$ = document.querySelectorAll.bind(document);

console.clear();

const app = {};
{
  //set active view
  const setActiveView = path => {
    console.debug("active view was set to", path);

    for (const _view of $$("view")) {
      _view.setAttribute(
        "active",
        _view.getAttribute("path") === path ? true : false
      );
    }

    switch (path) {
      case "/add":
        {
          $("input[name=addDirect]").value = "";
          $("input[name=addWeb]").value = "";
        }
        break;
      case "/edit":
        {
          $("input[name=editID]").value = "";
          $("input[name=editWeb]").value = "";
          $("input[name=editWeb]").disabled = false;
        }
        break;
    }
  };

  app.add = () => {
    fetch(location.href, {
      body: JSON.stringify({
        token: $("input[name=appToken]").value,
        file: $("input[name=addDirect]").value,
        web: $("input[name=addWeb]").value
      }),
      headers: {
        "CONTENT-TYPE": "application/json" //wichtig lol
      },
      method: "POST"
    })
      .then(res => res.json())
      .then(json => {
        if (json.status === "ok") {
          prompt(json.msg, json.data);
        } else alert(json.msg);
      });
    return false; //form
  };

  //get app id on fetchy
  app.gedit = elem => {
    const fill = url => {};
    //fix domain to id
    if (elem.value.includes("//")) elem.value = +elem.value.split("/")[3];
    const f = fetch(`/${elem.value}`, { headers: { self: true } })
      .then(res => res.json())
      .then(json => {
        $("input[name=editWeb]").disabled = false;
        $("input[name=editWeb]").focus();
        $("input[name=editWeb]").value = json.url || "";
      });
  };

  app.edit = () => {
    fetch(location.href, {
      body: JSON.stringify({
        id: $("input[name=editID]").value,
        token: $("input[name=appToken]").value,
        web: $("input[name=editWeb]").value
      }),
      headers: {
        "CONTENT-TYPE": "application/json" //wichtig lol
      },
      method: "PATCH"
    })
      .then(res => res.json())
      .then(json => {
        if (json.status === "ok") {
          alert(json.msg);
        } else alert(json.msg);
      });
    return false; //form
  };

  app.checkDelete = () => {
    if (confirm("echt?")) {
      fetch(location.href, {
        body: JSON.stringify({
          id: $("input[name=editID]").value,
          token: $("input[name=appToken]").value
        }),
        headers: {
          "CONTENT-TYPE": "application/json" //wichtig lol
        },
        method: "DELETE"
      })
        .then(res => res.json())
        .then(json => {
          if (json.status === "ok") {
            alert(json.msg);
          } else alert(json.msg);
        });
    }
    return false; //form
  };

  //update token
  app.updateToken = () => {
    localStorage.setItem("token", $("input[name=appToken]").value);
    alert("token changed");
  };

  //sync activ enav link
  const syncNavlinks = href => {
    for (const _link of $$("header-content navlink")) {
      _link.setAttribute(
        "active",
        _link.getAttribute("href") === href ? true : false
      );
    }
  };
  //get current path
  const getPath = () => {
    const splut = `/${location.href.split("/")[3].split(":")[0]}`;
    return $(`view[path="${splut}"]`) //does path exist as view
      ? splut //go to that view
      : $("meta[name=from]") //else get server->client path
          .getAttribute("value")
          .replace("{{from}}", "") ||
          splut ||
          "/";
  };

  window.onload = () => {
    {
      fetch("/welcome", { method: "POST" });
      const path = getPath();
      console.debug("Coming from path", path);
      if ($(`view[path="/${location.href.split("/")[3]}"]`)) {
        app.path = path;
      }
      setActiveView(path);
      syncNavlinks(path);

      //sync setToken
      $("input[name=appToken]").value = localStorage.getItem("token");

      if (path === "/msg" && location.href.includes("/msg:")) {
        $("view[path='/msg']").innerText = $("meta[name=msg]").getAttribute(
          "value"
        );
      }
    }
  };

  window.onpopstate = event => {
    const path = getPath();
    setActiveView(path);
    app.path = path;
  };

  for (const link of $$("navlink")) {
    link.addEventListener("click", () => {
      const href = link.getAttribute("href");

      if (app.path === href) return;
      console.debug("Navigating to path", href);

      if ($(`view[path="${href}"]`)) {
        setActiveView(`/${href.split("/")[1]}`);
        history.pushState(null, null, href);
        app.path = href;
      } else {
        console.warn("Couldn't navigate to path", href);

        history.pushState(null, null, href);
        location.reload(true);
      }

      syncNavlinks(href);
    });
  }
}
