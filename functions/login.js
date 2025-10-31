// functions/login.js
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 解析表单数据
  let password = '';
  try {
    const formData = await request.formData();
    password = formData.get('password') || '';
  } catch (e) {
    // 兼容性处理：如果无法以 form-data 解析，尝试读取 body 为 x-www-form-urlencoded
    const text = await request.text();
    const params = new URLSearchParams(text);
    password = params.get('password') || '';
  }

  const CFP_PASSWORD = env.CFP_PASSWORD || '';

  if (password === CFP_PASSWORD) {
    // 认证成功，设置一个简单的 token（初始版本，生产应替换为签名 token）
    const tokenValue = 'yes';
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `solara_auth=${tokenValue}; HttpOnly; Secure; Path=/; SameSite=Lax`
      }
    });
  } else {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
