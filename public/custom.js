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
  };

  //sync activ enav link
  const syncNavlinks = (href) =>{
  for (const _link of $$("header-content navlink")) {
       
        _link.setAttribute(
          "active",
          _link.getAttribute("href") === href ? true : false
        );
      }
  
  }
  //get current path
  const getPath = () => {
    return $(`view[path="/${location.href.split("/")[3]}"]`) //does path exist as view
      ? `/${location.href.split("/")[3]}` //go to that view
      : $("meta[name=from]") //else get server->client path
          .getAttribute("value")
          .replace("{{from}}", "") ||
          `/${location.href.split("/")[3]}` ||
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
