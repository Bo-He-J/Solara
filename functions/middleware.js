// functions/middleware.js
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const isProtected = url.pathname.startsWith("/protected");

  // 读取 Cookie
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = Object.fromEntries(cookieHeader
    .split(";")
    .map(part => part.trim().split("="))
    .filter(parts => parts.length === 2)
    .map(([k, v]) => [decodeURIComponent(k), decodeURIComponent(v)])
  );
  const isAuthorized = cookies.solara_auth === "yes";

  // 如果是受保护路径且未授权，返回登录界面
  if (isProtected && !isAuthorized) {
    return new Response(renderLoginPage(), {
      status: 200,
      headers: { "Content-Type": "text/html" }
    });
  }

  // 已授权，继续后续处理
  if (typeof next === "function") {
    return next();
  }

  // 兜底返回
  return new Response("OK", { status: 200 });
}

// 登录页模板（嵌入简易登录界面）
function renderLoginPage() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Protected Access</title>
  <style>
    body { font-family: Arial, sans-serif; background:#f6f7fb; display:flex; height:100vh; align-items:center; justify-content:center; }
    .panel { background:#fff; padding:24px; border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,.15); width:360px; }
    input { width:100%; padding:12px; margin-top:8px; }
    button { width:100%; padding:12px; margin-top:12px; cursor:pointer; }
    #err { color:#d00; display:none; }
  </style>
</head>
<body>
  <div class="panel">
    <h3>请输入访问口令</h3>
    <input id="pwd" type="password" placeholder="口令" />
    <div id="err">口令错误，请重试</div>
    <button id="loginBtn">登录</button>
  </div>
  <script>
    (async () => {
      document.getElementById('loginBtn').addEventListener('click', async () => {
        const password = document.getElementById('pwd').value;
        const form = new URLSearchParams();
        form.append('password', password);

        const res = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString()
        });

        if (res.ok) {
          window.location.reload();
        } else {
          document.getElementById('err').style.display = 'block';
        }
      });
    })();
  </script>
</body>
</html>`;
}
