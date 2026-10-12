export function initUsers(ctx) {
  async function initAuth() {
    let { data: { session } } = await ctx.supabaseClient.auth.getSession();
    if (!session) {
      const { data } = await ctx.supabaseClient.auth.refreshSession();
      session = data?.session || null;
    }
    if (session) {
      ctx.currentUser = session.user;
      await ctx.handlers.onLogin();
    }

    ctx.supabaseClient.auth.onAuthStateChange(async (_event, sessionUpdate) => {
      if (sessionUpdate) {
        ctx.currentUser = sessionUpdate.user;
        await ctx.handlers.onLogin();
      } else {
        ctx.handlers.onLogout();
      }
    });
  }

  async function handleLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const msg = document.getElementById('auth-msg');

    if (!email || !password) {
      msg.textContent = 'Introduce email y contraseña.';
      ctx.ui.showSyncReminder('Falta email o contraseña.', 'error');
      return;
    }
    msg.textContent = 'Conectando...';

    try {
      const { error: loginError } = await ctx.supabaseClient.auth.signInWithPassword({ email, password });
      if (!loginError) {
        msg.textContent = '';
        ctx.ui.showSyncReminder('Sesión iniciada.', 'success');
        return;
      }

      const { error: signUpError } = await ctx.supabaseClient.auth.signUp({ email, password });
      if (signUpError) {
        const authText = signUpError.message.includes('already registered')
          ? 'Usuario ya registrado. Revisa contraseña.'
          : `Error: ${signUpError.message}`;
        msg.textContent = authText;
        ctx.ui.showSyncReminder(authText, 'error', 6200);
      } else {
        msg.textContent = 'Cuenta creada. Si pide confirmación, revisa tu email.';
        ctx.ui.showSyncReminder('Cuenta creada. Revisa tu email si te pide confirmación.', 'info', 5200);
      }
    } catch (error) {
      const text = ctx.notifyError('Error de autenticación', error);
      msg.textContent = text;
    }
  }

  async function handleLogout() {
    await ctx.supabaseClient.auth.signOut();
  }

  ctx.users = {
    initAuth,
    handleLogin,
    handleLogout
  };
}
