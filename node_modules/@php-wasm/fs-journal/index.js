import { __private__dont__use as u } from "@php-wasm/universal";
import { Semaphore as T, joinPaths as c, basename as y } from "@php-wasm/util";
import { logger as d } from "@php-wasm/logger";
function g(t, n, e = () => {
}) {
  function o() {
    n = b(n);
    const r = t[u].FS, l = R(r, (a) => {
      if (a.path.startsWith(n))
        e(a);
      else if (a.operation === "RENAME" && a.toPath.startsWith(n))
        for (const f of m(
          t,
          a.path,
          a.toPath
        ))
          e(f);
    }), s = {};
    for (const [a] of Object.entries(l))
      s[a] = r[a];
    function p() {
      for (const [a, f] of Object.entries(l))
        r[a] = function(...E) {
          return f(...E), s[a].apply(this, E);
        };
    }
    function h() {
      for (const [a, f] of Object.entries(s))
        t[u].FS[a] = f;
    }
    t[u].journal = {
      bind: p,
      unbind: h
    }, p();
  }
  t.addEventListener("runtime.initialized", o), t[u] && o();
  function i() {
    t[u].journal.unbind(), delete t[u].journal;
  }
  return t.addEventListener("runtime.beforeExit", i), function() {
    return t.removeEventListener("runtime.initialized", o), t.removeEventListener("runtime.beforeExit", i), t[u].journal.unbind();
  };
}
const R = (t, n = () => {
}) => ({
  write(e) {
    n({
      operation: "WRITE",
      path: e.path,
      nodeType: "file"
    });
  },
  truncate(e) {
    let o;
    typeof e == "string" ? o = t.lookupPath(e, {
      follow: !0
    }).node : o = e, n({
      operation: "WRITE",
      path: t.getPath(o),
      nodeType: "file"
    });
  },
  unlink(e) {
    n({
      operation: "DELETE",
      path: e,
      nodeType: "file"
    });
  },
  mknod(e, o) {
    t.isFile(o) && n({
      operation: "CREATE",
      path: e,
      nodeType: "file"
    });
  },
  mkdir(e) {
    n({
      operation: "CREATE",
      path: e,
      nodeType: "directory"
    });
  },
  rmdir(e) {
    n({
      operation: "DELETE",
      path: e,
      nodeType: "directory"
    });
  },
  rename(e, o) {
    try {
      const i = t.lookupPath(e, {
        follow: !0
      }), r = t.lookupPath(o, {
        parent: !0
      }).path;
      n({
        operation: "RENAME",
        nodeType: t.isDir(i.node.mode) ? "directory" : "file",
        path: i.path,
        toPath: c(r, y(o))
      });
    } catch {
    }
  }
});
function w(t, n) {
  t[u].journal.unbind();
  try {
    for (const e of n)
      e.operation === "CREATE" ? e.nodeType === "file" ? t.writeFile(e.path, " ") : t.mkdir(e.path) : e.operation === "DELETE" ? e.nodeType === "file" ? t.unlink(e.path) : t.rmdir(e.path) : e.operation === "WRITE" ? t.writeFile(e.path, e.data) : e.operation === "RENAME" && t.mv(e.path, e.toPath);
  } finally {
    t[u].journal.bind();
  }
}
function* m(t, n, e) {
  if (t.isDir(n)) {
    yield {
      operation: "CREATE",
      path: e,
      nodeType: "directory"
    };
    for (const o of t.listFiles(n))
      yield* m(
        t,
        c(n, o),
        c(e, o)
      );
  } else
    yield {
      operation: "CREATE",
      path: e,
      nodeType: "file"
    }, yield {
      operation: "WRITE",
      nodeType: "file",
      path: e
    };
}
function b(t) {
  return t.replace(/\/$/, "").replace(/\/\/+/g, "/");
}
function I(t) {
  let n = t;
  for (; ; ) {
    const e = {};
    for (let o = n.length - 1; o >= 0; o--)
      for (let i = o - 1; i >= 0; i--) {
        const r = k(n[o], n[i]);
        if (r === "none")
          continue;
        const l = n[o], s = n[i];
        if (l.operation === "RENAME" && s.operation === "RENAME") {
          d.warn(
            "[FS Journal] Normalizing a double rename is not yet supported:",
            {
              current: l,
              last: s
            }
          );
          continue;
        }
        (s.operation === "CREATE" || s.operation === "WRITE") && (l.operation === "RENAME" ? r === "same_node" ? (e[i] = [], e[o] = [
          {
            ...s,
            path: l.toPath
          },
          ...e[o] || []
        ]) : r === "descendant" && (e[i] = [], e[o] = [
          {
            ...s,
            path: c(
              l.toPath,
              s.path.substring(
                l.path.length
              )
            )
          },
          ...e[o] || []
        ]) : l.operation === "WRITE" && r === "same_node" ? e[i] = [] : l.operation === "DELETE" && r === "same_node" && (e[i] = [], s.operation === "CREATE" && (e[o] = [])));
      }
    if (Object.keys(e).length === 0)
      return n;
    n = n.flatMap((o, i) => i in e ? e[i] : [o]);
  }
}
function k(t, n) {
  const e = t.path, o = t.operation !== "WRITE" && t.nodeType === "directory", i = n.operation !== "WRITE" && n.nodeType === "directory", r = n.operation === "RENAME" ? n.toPath : n.path;
  return r === e ? "same_node" : i && e.startsWith(r + "/") ? "ancestor" : o && r.startsWith(e + "/") ? "descendant" : "none";
}
async function L(t, n) {
  const o = n.filter(
    (i) => i.operation === "WRITE"
  ).map((i) => j(t, i));
  return await Promise.all(o), n;
}
const A = new T({ concurrency: 15 });
async function j(t, n) {
  const e = await A.acquire();
  try {
    n.data = await t.readFileAsBuffer(n.path);
  } catch (o) {
    d.warn(
      `Journal failed to hydrate a file on flush: the path ${n.path} no longer exists`
    ), d.error(o);
  }
  e();
}
export {
  L as hydrateUpdateFileOps,
  g as journalFSEvents,
  I as normalizeFilesystemOperations,
  w as replayFSJournal
};
//# sourceMappingURL=index.js.map
